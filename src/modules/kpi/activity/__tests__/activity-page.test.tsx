/**
 * KPI Activities page tests — V1 workspace.
 * Proves: authenticated-only page access, scoped views, `all` view gated on
 * read_all|manage, T10 admin button gated on manage, and the ABSENCE of an
 * Approval/To Review tab (approval lives only on /kpi/approvals).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import KpiActivitiesPage from '@/app/(main)/kpi/activities/page';

type PermSet = Record<string, boolean>;

let mockPermissions: PermSet = {};

jest.mock('@/hooks/use-permission', () => ({
  usePermission: () => {
    const perms = mockPermissions;
    const permList = Object.keys(perms).filter((k) => perms[k]);
    return {
      hasPerm: (p: string) => perms[p] ?? false,
      hasAnyPerm: (...ps: string[]) => ps.some((p) => perms[p] ?? false),
      hasAllPerms: (...ps: string[]) => ps.every((p) => perms[p] ?? false),
      permissions: permList,
    };
  },
}));

jest.mock('@/modules/kpi/activity/use-activity-data', () => ({
  useActivityData: () => ({
    myActivities: [], isLoadingMy: false, myError: null, fetchMyActivities: jest.fn(),
    allActivities: [], isLoadingAll: false, allError: null, fetchAllActivities: jest.fn(),
    myRequests: [], isLoadingRequests: false, requestsError: null, fetchMyRequests: jest.fn(),
    fetchActivityDetail: jest.fn(), fetchRequestDetail: jest.fn(), isLoadingDetail: false,
  }),
}));

/* Sub-components are exercised by their own suites — null here keeps the page test focused. */
jest.mock('@/modules/kpi/activity/activity-table', () => ({ ActivityTable: () => null }));
jest.mock('@/modules/kpi/activity/request-table', () => ({ RequestTable: () => null }));
jest.mock('@/modules/kpi/activity/kpi-activity-detail-modal', () => ({ KpiActivityDetailModal: () => null }));
jest.mock('@/modules/kpi/admin/admin-create-activity-modal', () => ({ AdminCreateActivityModal: () => null }));

function allText(): string {
  return document.body.textContent ?? '';
}

describe('KPI Activities page — V1 workspace', () => {
  beforeEach(() => {
    mockPermissions = {};
  });

  it('renders for a user with NO activity permissions (responsibility-based access)', () => {
    render(<KpiActivitiesPage />);
    expect(screen.getByRole('heading', { name: 'KPI Activities' })).toBeInTheDocument();
    expect(allText()).not.toMatch(/Access Denied/i);
  });

  it('shows My Activities and My Requests views for any authenticated user', () => {
    render(<KpiActivitiesPage />);
    expect(allText()).toMatch(/My Activities/);
    expect(allText()).toMatch(/My Requests/);
  });

  it('does NOT render an Approval / To Review tab (approval lives on /kpi/approvals)', () => {
    render(<KpiActivitiesPage />);
    expect(allText()).not.toMatch(/Approvals/);
    expect(allText()).not.toMatch(/To Review/);
  });

  it('does not show All Activities without read_all or manage', () => {
    render(<KpiActivitiesPage />);
    expect(allText()).not.toMatch(/All Activities/);
  });

  it('shows the All Activities view for kpi_activity:read_all holders', () => {
    mockPermissions = { 'kpi_activity:read_all': true };
    render(<KpiActivitiesPage />);
    expect(allText()).toMatch(/All Activities/);
  });

  it('shows the All Activities view for kpi_activity:manage holders', () => {
    mockPermissions = { 'kpi_activity:manage': true };
    render(<KpiActivitiesPage />);
    expect(allText()).toMatch(/All Activities/);
  });

  it('shows the T10 admin create button only for kpi_activity:manage', () => {
    const { unmount } = render(<KpiActivitiesPage />);
    expect(allText()).not.toMatch(/Admin Create Activity/);
    unmount();

    mockPermissions = { 'kpi_activity:manage': true };
    render(<KpiActivitiesPage />);
    expect(allText()).toMatch(/Admin Create Activity/);
  });

  it('does not gate the page on obsolete codes (kpi_activity:read absent is fine)', () => {
    mockPermissions = { 'kpi_activity:request': true };
    render(<KpiActivitiesPage />);
    expect(allText()).not.toMatch(/Access Denied/i);
  });
});
