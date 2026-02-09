import type { ReactNode } from 'react';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { Unauthorized } from '@/components/Unauthorized';
import type { MemberRole } from '@/lib/db/schema-organizations';

interface RequireRoleProps {
  /** Minimum roles allowed (checked via hierarchy: owner > admin > editor > viewer) */
  allowed: MemberRole[];
  children: ReactNode;
  message?: string;
}

const ROLE_HIERARCHY: Record<MemberRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

export function RequireRole({ allowed, children, message }: RequireRoleProps) {
  const { currentRole } = useWorkspaceContext();

  if (allowed.includes(currentRole)) {
    return <>{children}</>;
  }

  return <Unauthorized message={message} />;
}

/** Helper: check if a role has at least the given minimum level */
export function hasMinRole(currentRole: MemberRole, minRole: MemberRole): boolean {
  return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[minRole];
}
