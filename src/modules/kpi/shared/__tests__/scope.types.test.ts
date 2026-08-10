/**
 * Scope model tests — every scoped V1 list endpoint must receive an explicit
 * `scope`; the backend has no default and returns 400 for missing/invalid
 * values (rule: never rely on a backend default).
 */
import {
  ACTIVITY_SCOPES,
  REQUEST_SCOPES,
  REPORT_SCOPES,
  assertActivityScope,
  assertRequestScope,
  assertReportScope,
  MissingScopeError,
} from '../scope.types';

describe('scope model', () => {
  it('defines exactly the backend scopes', () => {
    expect(ACTIVITY_SCOPES).toEqual(['mine', 'subordinates', 'all', 'superior']);
    expect(REQUEST_SCOPES).toEqual(['mine', 'to-review']);
    expect(REPORT_SCOPES).toEqual(['mine', 'to-review']);
  });

  it('accepts valid activity scopes', () => {
    for (const scope of ACTIVITY_SCOPES) {
      const value: string | undefined = scope;
      expect(() => assertActivityScope(value, 'GET /kpi-activities')).not.toThrow();
    }
  });

  it('rejects missing activity scope with MissingScopeError', () => {
    expect(() => assertActivityScope(undefined, 'GET /kpi-activities')).toThrow(MissingScopeError);
  });

  it('rejects unknown activity scope', () => {
    expect(() => assertActivityScope('everyone', 'GET /kpi-activities')).toThrow(MissingScopeError);
  });

  it('rejects missing request and report scopes', () => {
    expect(() => assertRequestScope(undefined, 'GET /kpi-activity-requests')).toThrow(MissingScopeError);
    expect(() => assertReportScope(undefined, 'GET /kpi-reports')).toThrow(MissingScopeError);
  });

  it('accepts to-review scopes', () => {
    expect(() => assertRequestScope('to-review', 'GET /kpi-activity-requests')).not.toThrow();
    expect(() => assertReportScope('to-review', 'GET /kpi-reports')).not.toThrow();
  });
});
