export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  settings?: OrganizationSettings;
}

export interface OrganizationSettings {
  default_language?: string;
  timezone?: string;
  theme?: 'light' | 'dark' | 'system';
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  invited_by?: string;
  joined_at: string;
  invited_at?: string;
  status: 'active' | 'invited' | 'suspended';
}

export interface OrganizationInvite {
  id: string;
  organization_id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  invited_by: string;
  token: string;
  expires_at: string;
  created_at: string;
  accepted_at?: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
}

export interface SharedDashboard {
  id: string;
  organization_id: string;
  dashboard_id: string;
  shared_by: string;
  share_type: 'public' | 'private' | 'organization';
  share_token?: string;
  permissions: SharePermissions;
  expires_at?: string;
  created_at: string;
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
  action: string;
  resource_type: string;
  resource_id: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}
