import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import type { ROLE_PERMISSIONS } from '@/lib/db/schema-organizations';

type PermissionKey = keyof typeof ROLE_PERMISSIONS[keyof typeof ROLE_PERMISSIONS];

/**
 * Hook to check if the current user has a specific permission.
 * Returns { allowed, currentRole } so components can conditionally render
 * or show the Unauthorized component.
 */
export function usePermissionGuard(requiredPermission: PermissionKey) {
  const { permissions, currentRole } = useWorkspaceContext();
  const allowed = permissions[requiredPermission] ?? false;
  return { allowed, currentRole };
}
