import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  Organization,
  OrganizationMember,
  OrganizationInvite,
  SharedDashboard,
  ActivityLog,
  MemberRole,
  InviteRole,
  ActivityAction,
  ShareType,
  SharePermissions,
} from '@/lib/db/schema-organizations';
import { ROLE_PERMISSIONS } from '@/lib/db/schema-organizations';

const CURRENT_ORG_KEY = 'current_organization_id';
const WORKSPACE_STORAGE_KEY = 'lifeos_workspaces';
const MEMBERS_STORAGE_KEY = 'lifeos_workspace_members';
const INVITES_STORAGE_KEY = 'lifeos_workspace_invites';
const SHARES_STORAGE_KEY = 'lifeos_workspace_shares';
const ACTIVITY_STORAGE_KEY = 'lifeos_workspace_activity';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId(): string {
  return crypto.randomUUID();
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const MOCK_USER_ID = 'mock-user-001';

export function useWorkspace() {
  const [organizations, setOrganizations] = useState<Organization[]>(() =>
    loadFromStorage<Organization[]>(WORKSPACE_STORAGE_KEY, [])
  );
  const [members, setMembers] = useState<OrganizationMember[]>(() =>
    loadFromStorage<OrganizationMember[]>(MEMBERS_STORAGE_KEY, [])
  );
  const [invites, setInvites] = useState<OrganizationInvite[]>(() =>
    loadFromStorage<OrganizationInvite[]>(INVITES_STORAGE_KEY, [])
  );
  const [sharedDashboards, setSharedDashboards] = useState<SharedDashboard[]>(() =>
    loadFromStorage<SharedDashboard[]>(SHARES_STORAGE_KEY, [])
  );
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() =>
    loadFromStorage<ActivityLog[]>(ACTIVITY_STORAGE_KEY, [])
  );
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(() =>
    localStorage.getItem(CURRENT_ORG_KEY)
  );
  const [isLoading, setIsLoading] = useState(false);

  // Auto-create a default workspace if none exists
  useEffect(() => {
    if (organizations.length === 0) {
      const defaultOrg: Organization = {
        id: generateId(),
        name: 'Meu Workspace',
        slug: 'meu-workspace',
        owner_id: MOCK_USER_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        settings: { default_language: 'pt-BR', timezone: 'America/Sao_Paulo' },
      };
      const defaultMember: OrganizationMember = {
        id: generateId(),
        organization_id: defaultOrg.id,
        user_id: MOCK_USER_ID,
        role: 'owner',
        joined_at: new Date().toISOString(),
        status: 'active',
      };
      setOrganizations([defaultOrg]);
      setMembers([defaultMember]);
      setCurrentOrgId(defaultOrg.id);
      localStorage.setItem(CURRENT_ORG_KEY, defaultOrg.id);
      saveToStorage(WORKSPACE_STORAGE_KEY, [defaultOrg]);
      saveToStorage(MEMBERS_STORAGE_KEY, [defaultMember]);
    }
  }, []);

  // Persist on change
  useEffect(() => { saveToStorage(WORKSPACE_STORAGE_KEY, organizations); }, [organizations]);
  useEffect(() => { saveToStorage(MEMBERS_STORAGE_KEY, members); }, [members]);
  useEffect(() => { saveToStorage(INVITES_STORAGE_KEY, invites); }, [invites]);
  useEffect(() => { saveToStorage(SHARES_STORAGE_KEY, sharedDashboards); }, [sharedDashboards]);
  useEffect(() => { saveToStorage(ACTIVITY_STORAGE_KEY, activityLogs); }, [activityLogs]);

  const currentOrg = organizations.find(o => o.id === currentOrgId) || organizations[0] || null;

  const currentMember = members.find(
    m => m.organization_id === currentOrg?.id && m.user_id === MOCK_USER_ID
  );

  const currentRole: MemberRole = currentMember?.role || 'viewer';
  const permissions = ROLE_PERMISSIONS[currentRole];

  const orgMembers = members.filter(m => m.organization_id === currentOrg?.id);
  const orgInvites = invites.filter(i => i.organization_id === currentOrg?.id);
  const orgShares = sharedDashboards.filter(s => s.organization_id === currentOrg?.id);
  const orgActivity = activityLogs
    .filter(a => a.organization_id === currentOrg?.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Log activity
  const logActivity = useCallback((
    action: ActivityAction,
    resourceType: string,
    resourceId?: string,
    metadata?: Record<string, unknown>
  ) => {
    if (!currentOrg) return;
    const entry: ActivityLog = {
      id: generateId(),
      organization_id: currentOrg.id,
      user_id: MOCK_USER_ID,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      metadata,
      created_at: new Date().toISOString(),
    };
    setActivityLogs(prev => [entry, ...prev]);
  }, [currentOrg]);

  // Switch workspace
  const switchOrganization = useCallback((orgId: string) => {
    setCurrentOrgId(orgId);
    localStorage.setItem(CURRENT_ORG_KEY, orgId);
  }, []);

  // Create workspace
  const createOrganization = useCallback((name: string, settings?: Organization['settings']) => {
    const org: Organization = {
      id: generateId(),
      name,
      slug: generateSlug(name),
      owner_id: MOCK_USER_ID,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      settings,
    };
    const member: OrganizationMember = {
      id: generateId(),
      organization_id: org.id,
      user_id: MOCK_USER_ID,
      role: 'owner',
      joined_at: new Date().toISOString(),
      status: 'active',
    };
    setOrganizations(prev => [...prev, org]);
    setMembers(prev => [...prev, member]);
    logActivity('workspace.created', 'organization', org.id, { name });
    return org;
  }, [logActivity]);

  // Update workspace
  const updateOrganization = useCallback((orgId: string, updates: Partial<Pick<Organization, 'name' | 'settings' | 'avatar_url'>>) => {
    setOrganizations(prev => prev.map(o =>
      o.id === orgId ? { ...o, ...updates, updated_at: new Date().toISOString() } : o
    ));
    logActivity('workspace.updated', 'organization', orgId, updates);
  }, [logActivity]);

  // Delete workspace
  const deleteOrganization = useCallback((orgId: string) => {
    setOrganizations(prev => prev.filter(o => o.id !== orgId));
    setMembers(prev => prev.filter(m => m.organization_id !== orgId));
    setInvites(prev => prev.filter(i => i.organization_id !== orgId));
    setSharedDashboards(prev => prev.filter(s => s.organization_id !== orgId));
    setActivityLogs(prev => prev.filter(a => a.organization_id !== orgId));
    if (currentOrgId === orgId) {
      const remaining = organizations.filter(o => o.id !== orgId);
      if (remaining.length > 0) {
        switchOrganization(remaining[0].id);
      }
    }
    logActivity('workspace.deleted', 'organization', orgId);
  }, [currentOrgId, organizations, switchOrganization, logActivity]);

  // Invite member
  const inviteMember = useCallback((email: string, role: InviteRole) => {
    if (!currentOrg) return null;
    const invite: OrganizationInvite = {
      id: generateId(),
      organization_id: currentOrg.id,
      email,
      role,
      invited_by: MOCK_USER_ID,
      token: generateToken(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      status: 'pending',
    };
    setInvites(prev => [...prev, invite]);
    logActivity('member.invited', 'invite', invite.id, { email, role });
    return invite;
  }, [currentOrg, logActivity]);

  // Accept invite (simulate)
  const acceptInvite = useCallback((token: string) => {
    const invite = invites.find(i => i.token === token && i.status === 'pending');
    if (!invite) return false;

    const isExpired = new Date(invite.expires_at) < new Date();
    if (isExpired) {
      setInvites(prev => prev.map(i =>
        i.id === invite.id ? { ...i, status: 'expired' as const } : i
      ));
      return false;
    }

    setInvites(prev => prev.map(i =>
      i.id === invite.id ? { ...i, status: 'accepted' as const, accepted_at: new Date().toISOString() } : i
    ));

    const member: OrganizationMember = {
      id: generateId(),
      organization_id: invite.organization_id,
      user_id: generateId(), // simulated new user
      role: invite.role,
      invited_by: invite.invited_by,
      joined_at: new Date().toISOString(),
      invited_at: invite.created_at,
      status: 'active',
      user_profile: { full_name: invite.email.split('@')[0] },
    };
    setMembers(prev => [...prev, member]);
    logActivity('member.joined', 'member', member.id, { email: invite.email });
    return true;
  }, [invites, logActivity]);

  // Revoke invite
  const revokeInvite = useCallback((inviteId: string) => {
    setInvites(prev => prev.map(i =>
      i.id === inviteId ? { ...i, status: 'revoked' as const } : i
    ));
  }, []);

  // Remove member
  const removeMember = useCallback((memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    setMembers(prev => prev.filter(m => m.id !== memberId));
    logActivity('member.removed', 'member', memberId, { user_id: member.user_id });
  }, [members, logActivity]);

  // Change member role
  const changeMemberRole = useCallback((memberId: string, newRole: MemberRole) => {
    setMembers(prev => prev.map(m =>
      m.id === memberId ? { ...m, role: newRole } : m
    ));
    logActivity('member.role_changed', 'member', memberId, { new_role: newRole });
  }, [logActivity]);

  // Share dashboard
  const shareDashboard = useCallback((
    dashboardType: string,
    title: string,
    shareType: ShareType,
    permissions: SharePermissions,
    expiresAt?: string
  ) => {
    if (!currentOrg) return null;
    const share: SharedDashboard = {
      id: generateId(),
      organization_id: currentOrg.id,
      dashboard_type: dashboardType,
      title,
      shared_by: MOCK_USER_ID,
      share_type: shareType,
      share_token: shareType === 'public' ? generateToken() : undefined,
      permissions,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setSharedDashboards(prev => [...prev, share]);
    logActivity('dashboard.shared', 'dashboard', share.id, { dashboard_type: dashboardType, share_type: shareType });
    return share;
  }, [currentOrg, logActivity]);

  // Unshare dashboard
  const unshareDashboard = useCallback((shareId: string) => {
    setSharedDashboards(prev => prev.filter(s => s.id !== shareId));
    logActivity('dashboard.unshared', 'dashboard', shareId);
  }, [logActivity]);

  // Get shared dashboard by token
  const getSharedByToken = useCallback((token: string): SharedDashboard | null => {
    const share = sharedDashboards.find(s => s.share_token === token);
    if (!share) return null;
    if (share.expires_at && new Date(share.expires_at) < new Date()) return null;
    return share;
  }, [sharedDashboards]);

  return {
    // State
    organizations,
    currentOrg,
    currentOrgId,
    currentRole,
    permissions,
    orgMembers,
    orgInvites,
    orgShares,
    orgActivity,
    isLoading,

    // Actions
    switchOrganization,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    inviteMember,
    acceptInvite,
    revokeInvite,
    removeMember,
    changeMemberRole,
    shareDashboard,
    unshareDashboard,
    getSharedByToken,
    logActivity,
  };
}
