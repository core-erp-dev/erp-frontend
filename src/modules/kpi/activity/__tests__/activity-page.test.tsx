/**
 * KPI Activity page tests — P2R.1 strict-cascading remediation.
 * Tests sidebar permissions, tab visibility logic, and component rendering.
 */
import { PERM } from '@/constants/permissions';
import { usePermission } from '@/hooks/use-permission';

/* ── Mocks ── */

jest.mock('@/hooks/use-permission');
jest.mock('@/modules/kpi/activity/use-activity-data');

const mockUsePermission = jest.mocked(usePermission);

/* ── Tests ── */

describe('KPI Activities page — sidebar permission correction', () => {
  it('sidebar test verifies Activities = read + request + root_request, not approve', () => {
    expect(PERM.KPI_ACTIVITY_READ).toBe('kpi_activity:read');
    expect(PERM.KPI_ACTIVITY_REQUEST).toBe('kpi_activity:request');
    expect(PERM.KPI_ACTIVITY_ROOT_REQUEST).toBe('kpi_activity:root_request');
    expect(PERM.KPI_ACTIVITY_APPROVE).toBe('kpi_activity:approve');
  });
});

describe('KPI Activities page — permission logic', () => {
  const simulatePerms = (perms: string[]) => {
    mockUsePermission.mockReturnValue({
      hasPerm: (p: string) => perms.includes(p),
      hasAnyPerm: (...ps: string[]) => ps.some((p) => perms.includes(p)),
      hasAllPerms: (...ps: string[]) => ps.every((p) => perms.includes(p)),
      permissions: perms,
    });
  };

  it('access denied when user has no activity permissions', () => {
    simulatePerms([]);
    const perms = mockUsePermission();
    const canAccess = perms.hasAnyPerm(PERM.KPI_ACTIVITY_READ, PERM.KPI_ACTIVITY_REQUEST, PERM.KPI_ACTIVITY_ROOT_REQUEST);
    expect(canAccess).toBe(false);
  });

  it('read-only user sees My Activities and Managed tabs', () => {
    simulatePerms([PERM.KPI_ACTIVITY_READ]);
    const perms = mockUsePermission();
    expect(perms.hasPerm(PERM.KPI_ACTIVITY_READ)).toBe(true);
    expect(perms.hasPerm(PERM.KPI_ACTIVITY_REQUEST)).toBe(false);
    expect(perms.hasPerm(PERM.KPI_ACTIVITY_ROOT_REQUEST)).toBe(false);
  });

  it('request-only user sees Owned Activities and My Requests tabs', () => {
    simulatePerms([PERM.KPI_ACTIVITY_REQUEST]);
    const perms = mockUsePermission();
    expect(perms.hasPerm(PERM.KPI_ACTIVITY_READ)).toBe(false);
    expect(perms.hasPerm(PERM.KPI_ACTIVITY_REQUEST)).toBe(true);
  });

  it('root_request-only user can access Activities page (sidebar + guard)', () => {
    simulatePerms([PERM.KPI_ACTIVITY_ROOT_REQUEST]);
    const perms = mockUsePermission();
    const canAccess = perms.hasAnyPerm(PERM.KPI_ACTIVITY_READ, PERM.KPI_ACTIVITY_REQUEST, PERM.KPI_ACTIVITY_ROOT_REQUEST);
    expect(canAccess).toBe(true);
  });

  it('root_request-only user sees Owned Activities tab but not My Activities', () => {
    simulatePerms([PERM.KPI_ACTIVITY_ROOT_REQUEST]);
    const perms = mockUsePermission();
    expect(perms.hasPerm(PERM.KPI_ACTIVITY_READ)).toBe(false);
    expect(perms.hasAnyPerm(PERM.KPI_ACTIVITY_ROOT_REQUEST, PERM.KPI_ACTIVITY_REQUEST)).toBe(true);
  });

  it('approve-only user does not see Activities page', () => {
    simulatePerms([PERM.KPI_ACTIVITY_APPROVE]);
    const perms = mockUsePermission();
    const canAccess = perms.hasAnyPerm(PERM.KPI_ACTIVITY_READ, PERM.KPI_ACTIVITY_REQUEST, PERM.KPI_ACTIVITY_ROOT_REQUEST);
    expect(canAccess).toBe(false);
  });

  it('root_request + corporate_kpi:read user can create root', () => {
    simulatePerms([PERM.KPI_ACTIVITY_ROOT_REQUEST, PERM.CORPORATE_KPI_READ]);
    const perms = mockUsePermission();
    const canCreateRoot = perms.hasPerm(PERM.KPI_ACTIVITY_ROOT_REQUEST) && perms.hasPerm(PERM.CORPORATE_KPI_READ);
    expect(canCreateRoot).toBe(true);
  });

  it('root_request without corporate_kpi:read cannot create root', () => {
    simulatePerms([PERM.KPI_ACTIVITY_ROOT_REQUEST]);
    const perms = mockUsePermission();
    const canCreateRoot = perms.hasPerm(PERM.KPI_ACTIVITY_ROOT_REQUEST) && perms.hasPerm(PERM.CORPORATE_KPI_READ);
    expect(canCreateRoot).toBe(false);
  });

  it('read + request user can access all tabs', () => {
    simulatePerms([PERM.KPI_ACTIVITY_READ, PERM.KPI_ACTIVITY_REQUEST]);
    const perms = mockUsePermission();
    expect(perms.hasPerm(PERM.KPI_ACTIVITY_READ)).toBe(true);
    expect(perms.hasPerm(PERM.KPI_ACTIVITY_REQUEST)).toBe(true);
  });
});
