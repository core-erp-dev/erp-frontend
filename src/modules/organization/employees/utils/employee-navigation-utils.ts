/**
 * Deterministic return-target for the Edit Employee page.
 *
 * `window.history.length` is NOT a reliable proof that the previous entry is
 * the employee Detail page (the history may contain Create, another detail, or
 * any other page). Instead, the Detail page marks the origin with an explicit
 * `?from=detail` query param when it pushes the Edit page:
 *
 * - `from=detail`  → the previous entry is the Detail page (opened via the
 *                    Detail's Edit action) → `router.back()` is safe.
 * - otherwise      → deep link / refresh / unknown origin → fall back to the
 *                    related Detail page with `router.replace()` (never lands
 *                    on Create or an arbitrary page).
 */
export function resolveEditReturn(
  fromParam: string | null,
  employeeId: string,
): 'back' | { replace: string } {
  if (fromParam === 'detail') {
    return 'back';
  }
  return { replace: `/organization/employees/${employeeId}` };
}
