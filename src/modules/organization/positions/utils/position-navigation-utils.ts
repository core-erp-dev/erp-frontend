/**
 * Deterministic return-targets for the Position Create/Edit pages.
 *
 * `window.history.length` is NOT reliable proof of the previous entry. The
 * calling page marks its origin with an explicit query param:
 *
 * - `from=list`   → the previous entry is the list page (Add Position from
 *                   the list header) → `back()` is safe.
 * - `from=detail` → the previous entry is the Detail page (Edit action, or
 *                   "Tambah Jabatan Bawahan" from Detail) → `back()` is safe.
 * - otherwise     → deep link / refresh / unknown origin → fall back to a
 *                   deterministic target via `router.replace()`.
 */

export function resolveCreateReturn(
  fromParam: string | null,
): 'back' | { replace: string } {
  if (fromParam === 'list' || fromParam === 'detail') {
    return 'back';
  }
  return { replace: '/organization/positions' };
}

export function resolveEditReturn(
  fromParam: string | null,
  positionId: string,
): 'back' | { replace: string } {
  if (fromParam === 'detail') {
    return 'back';
  }
  return { replace: `/organization/positions/${positionId}` };
}
