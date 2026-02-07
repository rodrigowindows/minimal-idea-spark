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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Authenticate user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { organization_id, email, role }: InviteRequest = await req.json();

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
      .select('id')
      .eq('organization_id', organization_id)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvite) {
      return new Response(
        JSON.stringify({ error: 'An invite is already pending for this email' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    // In production, send email via Resend/SendGrid/etc
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
  } catch (error) {
    console.error('[invite-member] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
