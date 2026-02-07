export type MemberRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type InviteRole = 'admin' | 'editor' | 'viewer';
export type MemberStatus = 'active' | 'invited' | 'suspended';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type ShareType = 'public' | 'private' | 'organization';
export type ActivityAction =
  | 'workspace.created'
  | 'workspace.updated'
  | 'workspace.deleted'
  | 'member.invited'
  | 'member.joined'
  | 'member.removed'
  | 'member.role_changed'
  | 'dashboard.shared'
  | 'dashboard.unshared'
  | 'opportunity.created'
  | 'opportunity.updated'
  | 'opportunity.deleted'
  | 'journal.created'
  | 'settings.updated';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  settings?: OrganizationSettings;
}

export interface OrganizationSettings {
  default_language?: string;
  timezone?: string;
  theme?: 'light' | 'dark' | 'system';
  allow_public_sharing?: boolean;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: MemberRole;
  invited_by?: string;
  joined_at: string;
  invited_at?: string;
  status: MemberStatus;
  user_profile?: {
    full_name: string | null;
    email?: string;
  };
}

export interface OrganizationInvite {
  id: string;
  organization_id: string;
  email: string;
  role: InviteRole;
  invited_by: string;
  token: string;
  expires_at: string;
  created_at: string;
  accepted_at?: string;
  status: InviteStatus;
}

export interface SharedDashboard {
  id: string;
  organization_id: string;
  dashboard_type: string;
  title: string;
  shared_by: string;
  share_type: ShareType;
  share_token?: string;
  permissions: SharePermissions;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SharePermissions {
  can_view: boolean;
  can_edit: boolean;
  can_comment: boolean;
  can_share: boolean;
}

export interface ActivityLog {
  id: string;
  organization_id: string;
  user_id: string;
  action: ActivityAction;
  resource_type: string;
  resource_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  user_profile?: {
    full_name: string | null;
  };
}

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Visualizador',
};

export const ROLE_PERMISSIONS: Record<MemberRole, {
  canInvite: boolean;
  canRemoveMembers: boolean;
  canEditSettings: boolean;
  canShareDashboards: boolean;
  canEdit: boolean;
  canView: boolean;
}> = {
  owner: { canInvite: true, canRemoveMembers: true, canEditSettings: true, canShareDashboards: true, canEdit: true, canView: true },
  admin: { canInvite: true, canRemoveMembers: true, canEditSettings: true, canShareDashboards: true, canEdit: true, canView: true },
  editor: { canInvite: false, canRemoveMembers: false, canEditSettings: false, canShareDashboards: true, canEdit: true, canView: true },
  viewer: { canInvite: false, canRemoveMembers: false, canEditSettings: false, canShareDashboards: false, canEdit: false, canView: true },
};
