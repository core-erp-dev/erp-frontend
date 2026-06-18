import { useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';

/**
 * Shared permission hook — DRY replacement for inline hasPerm definitions.
 * Returns cached `hasPerm` function that checks user permissions.
 */
export function usePermission() {
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);

  const hasPerm = useCallback(
    (perm: string) => permissions.includes(perm),
    [permissions],
  );

  const hasAnyPerm = useCallback(
    (...perms: string[]) => perms.some((p) => permissions.includes(p)),
    [permissions],
  );

  const hasAllPerms = useCallback(
    (...perms: string[]) => perms.every((p) => permissions.includes(p)),
    [permissions],
  );

  return { hasPerm, hasAnyPerm, hasAllPerms, permissions };
}
