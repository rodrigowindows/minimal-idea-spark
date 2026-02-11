import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteRequest {
  organization_id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

interface RevokeRequest {
  action: 'revoke';
  invite_id: string;
  organization_id: string;
}

interface ValidateRequest {
  action: 'validate';
  token: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // deno-lint-ignore no-explicit-any
    const supabaseClient: any = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
        db: { schema: 'public' },
      }
    );

    const body = await req.json();

    // Handle revoke action
    if (body.action === 'revoke') {
      return await handleRevoke(supabaseClient, body as RevokeRequest);
    }

    // Handle validate action
    if (body.action === 'validate') {
      return await handleValidate(supabaseClient, body as ValidateRequest);
    }

    // Default: create invite
    return await handleCreateInvite(supabaseClient, req, body as InviteRequest);
  } catch (error) {
    console.error('[invite-member] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleCreateInvite(supabaseClient: any, req: Request, body: InviteRequest) {
  // Authenticate user
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { organization_id, email, role } = body;

  // Validate inputs
  if (!organization_id || !email || !role) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: organization_id, email, role' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!['admin', 'editor', 'viewer'].includes(role)) {
    return new Response(
      JSON.stringify({ error: 'Invalid role. Must be admin, editor, or viewer' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if user has permission to invite (must be owner or admin)
  const { data: member } = await supabaseClient
    .from('organization_members')
    .select('role')
    .eq('organization_id', organization_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!member || !['owner', 'admin'].includes(member.role)) {
    return new Response(
      JSON.stringify({ error: 'Insufficient permissions. Only owners and admins can invite members.' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check for existing pending invite
  const { data: existingInvite } = await supabaseClient
    .from('organization_invites')
    .select('id, expires_at')
    .eq('organization_id', organization_id)
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingInvite) {
    // Auto-expire if past expiration date
    const isExpired = new Date(existingInvite.expires_at) < new Date();
    if (isExpired) {
      await supabaseClient
        .from('organization_invites')
        .update({ status: 'expired' })
        .eq('id', existingInvite.id);
    } else {
      return new Response(
        JSON.stringify({ error: 'An invite is already pending for this email' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // Generate secure invite token
  const token = crypto.randomUUID() + '-' + crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  // Create invite record
  const { data: invite, error: inviteError } = await supabaseClient
    .from('organization_invites')
    .insert({
      organization_id,
      email,
      role,
      invited_by: user.id,
      token,
      expires_at: expiresAt.toISOString(),
      status: 'pending',
    })
    .select()
    .single();

  if (inviteError) throw inviteError;

  // Log the activity
  await supabaseClient.from('activity_logs').insert({
    organization_id,
    user_id: user.id,
    action: 'member.invited',
    resource_type: 'invite',
    resource_id: invite.id,
    metadata: { email, role },
  });

  // Get organization details for the invite link
  const { data: org } = await supabaseClient
    .from('organizations')
    .select('name')
    .eq('id', organization_id)
    .single();

  const origin = req.headers.get('origin') || 'http://localhost:5173';
  const inviteLink = `${origin}/invite/${token}`;

  console.log(`[invite-member] Invite sent to ${email} for org "${org?.name}" - Link: ${inviteLink}`);

  return new Response(
    JSON.stringify({
      success: true,
      invite: {
        id: invite.id,
        email,
        role,
        token,
        invite_link: inviteLink,
        expires_at: expiresAt.toISOString(),
      },
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleRevoke(supabaseClient: any, body: RevokeRequest) {
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { invite_id, organization_id } = body;

  // Check permissions
  const { data: member } = await supabaseClient
    .from('organization_members')
    .select('role')
    .eq('organization_id', organization_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!member || !['owner', 'admin'].includes(member.role)) {
    return new Response(
      JSON.stringify({ error: 'Insufficient permissions' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { error } = await supabaseClient
    .from('organization_invites')
    .update({ status: 'revoked', revoked_at: new Date().toISOString(), revoked_by: user.id })
    .eq('id', invite_id)
    .eq('organization_id', organization_id)
    .eq('status', 'pending');

  if (error) throw error;

  // Log revocation
  await supabaseClient.from('activity_logs').insert({
    organization_id,
    user_id: user.id,
    action: 'invite.revoked',
    resource_type: 'invite',
    resource_id: invite_id,
  });

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleValidate(supabaseClient: any, body: ValidateRequest) {
  const { token } = body;

  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Token is required', valid: false, reason: 'missing_token' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data: invite } = await supabaseClient
    .from('organization_invites')
    .select('*, organizations(name)')
    .eq('token', token)
    .maybeSingle();

  if (!invite) {
    return new Response(
      JSON.stringify({ valid: false, reason: 'not_found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (invite.status === 'accepted') {
    return new Response(
      JSON.stringify({ valid: false, reason: 'already_used' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (invite.status === 'revoked') {
    return new Response(
      JSON.stringify({ valid: false, reason: 'revoked' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (invite.status === 'expired' || new Date(invite.expires_at) < new Date()) {
    // Auto-update status if not already expired
    if (invite.status !== 'expired') {
      await supabaseClient
        .from('organization_invites')
        .update({ status: 'expired' })
        .eq('id', invite.id);
    }
    return new Response(
      JSON.stringify({ valid: false, reason: 'expired' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      valid: true,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        organization_name: invite.organizations?.name,
        expires_at: invite.expires_at,
      },
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
