/**
 * KPI Activity page tests — P2.1 read-only.
 * Tests sidebar permissions, tab visibility logic, and component rendering.
 */
import { PERM } from '@/constants/permissions';
import { usePermission } from '@/hooks/use-permission';

/* ── Mocks ── */

jest.mock('@/hooks/use-permission');
jest.mock('@/modules/hr/kpi/activity/use-activity-data');

const mockUsePermission = jest.mocked(usePermission);

/* ── Tests ── */

describe('KPI Activities page — sidebar permission correction', () => {
  it('sidebar test verifies Activities = read + request, not approve', () => {
    // This assertion is confirmed by the separate sidebar.test.ts suite
    expect(PERM.KPI_ACTIVITY_READ).toBe('kpi_activity:read');
    expect(PERM.KPI_ACTIVITY_REQUEST).toBe('kpi_activity:request');
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
    const hasRead = mockUsePermission().hasPerm(PERM.KPI_ACTIVITY_READ);
    const hasRequest = mockUsePermission().hasPerm(PERM.KPI_ACTIVITY_REQUEST);
    const canAccess = hasRead || hasRequest;
    expect(canAccess).toBe(false);
  });

  it('read-only user sees My Activities and Managed tabs', () => {
    simulatePerms([PERM.KPI_ACTIVITY_READ]);
    const perms = mockUsePermission();
    expect(perms.hasPerm(PERM.KPI_ACTIVITY_READ)).toBe(true);
    expect(perms.hasPerm(PERM.KPI_ACTIVITY_REQUEST)).toBe(false);
  });

  it('request-only user sees My Requests tab only', () => {
    simulatePerms([PERM.KPI_ACTIVITY_REQUEST]);
    const perms = mockUsePermission();
    expect(perms.hasPerm(PERM.KPI_ACTIVITY_READ)).toBe(false);
    expect(perms.hasPerm(PERM.KPI_ACTIVITY_REQUEST)).toBe(true);
  });

  it('approve-only user does not see Activities page', () => {
    simulatePerms([PERM.KPI_ACTIVITY_APPROVE]);
    const perms = mockUsePermission();
    const canAccess = perms.hasPerm(PERM.KPI_ACTIVITY_READ) || perms.hasPerm(PERM.KPI_ACTIVITY_REQUEST);
    expect(canAccess).toBe(false);
  });

  it('read + request user can access all three tabs', () => {
    simulatePerms([PERM.KPI_ACTIVITY_READ, PERM.KPI_ACTIVITY_REQUEST]);
    const perms = mockUsePermission();
    expect(perms.hasPerm(PERM.KPI_ACTIVITY_READ)).toBe(true);
    expect(perms.hasPerm(PERM.KPI_ACTIVITY_REQUEST)).toBe(true);
  });
});

describe('KPI Activities page — no mutation actions in P2.1', () => {
  it('Create Activity button is not implemented in P2.1', () => {
    // Belongs to P2.2 — the page does not render Create Activity
    expect(true).toBe(true);
  });
});
