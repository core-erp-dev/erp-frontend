/**
 * Explicit scope model for KPI Activity & Reporting V1.
 *
 * Every scoped list endpoint requires an explicit `scope` query parameter —
 * the frontend must never rely on a backend default (backend returns 400 for
 * missing/invalid scope). These types make a missing scope a compile error.
 */

export type KpiActivityScope = 'mine' | 'subordinates' | 'all' | 'superior';
export type KpiRequestScope = 'mine' | 'to-review';
export type KpiReportScope = 'mine' | 'to-review';

export const ACTIVITY_SCOPES: readonly KpiActivityScope[] = ['mine', 'subordinates', 'all', 'superior'] as const;
export const REQUEST_SCOPES: readonly KpiRequestScope[] = ['mine', 'to-review'] as const;
export const REPORT_SCOPES: readonly KpiReportScope[] = ['mine', 'to-review'] as const;

/** Thrown when a scoped call is attempted without an explicit scope value. */
export class MissingScopeError extends Error {
  constructor(endpoint: string) {
    super(`A scope is required for ${endpoint} — the backend has no default scope.`);
    this.name = 'MissingScopeError';
  }
}

/** Guards that a raw string is a valid activity scope; throws otherwise. */
export function assertActivityScope(value: string | undefined, endpoint: string): asserts value is KpiActivityScope {
  if (!value || !ACTIVITY_SCOPES.includes(value as KpiActivityScope)) {
    throw new MissingScopeError(endpoint);
  }
}

/** Guards that a raw string is a valid request scope; throws otherwise. */
export function assertRequestScope(value: string | undefined, endpoint: string): asserts value is KpiRequestScope {
  if (!value || !REQUEST_SCOPES.includes(value as KpiRequestScope)) {
    throw new MissingScopeError(endpoint);
  }
}

/** Guards that a raw string is a valid report scope; throws otherwise. */
export function assertReportScope(value: string | undefined, endpoint: string): asserts value is KpiReportScope {
  if (!value || !REPORT_SCOPES.includes(value as KpiReportScope)) {
    throw new MissingScopeError(endpoint);
  }
}
