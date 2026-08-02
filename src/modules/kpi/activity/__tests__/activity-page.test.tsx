/**
 * KPI Activities page tests — V1 workspace with acting-Position workflows.
 *
 * Proves: authenticated-only page access, scoped views, `all` gated on
 * read_all|manage, T10/T11 admin tools gated on `kpi_activity:manage`,
 * T4 root-request gated on `kpi_activity:root_request` AND an explicit acting
 * Position, subordinates gated on selection, the exact-assignment ownership
 * wiring (`ownAssignmentUserPositionId` = the selected Position's
 * `userPositionId`), Position-loading failures never hiding reads, and the
 * ABSENCE of an Approval/To Review tab.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import KpiActivitiesPage from '@/app/(main)/kpi/activities/page';

type PermSet = Record<string, boolean>;

let mockPermissions: PermSet = {};
let mockPositions: { positionId: string; positionName: string; userPositionId: string; userId: string; isPrimary: boolean }[] = [];
let mockPositionsError: string | null = null;

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
    subordinatesActivities: [], isLoadingSubordinates: false, subordinatesError: null,
    subordinatesActingPositionId: null, fetchSubordinatesActivities: jest.fn(),
    myRequests: [], isLoadingRequests: false, requestsError: null, fetchMyRequests: jest.fn(),
    fetchActivityDetail: jest.fn(), fetchRequestDetail: jest.fn(), isLoadingDetail: false,
    submitCreateRequest: jest.fn(), submitChangeRequest: jest.fn(),
  }),
}));

/* Acting-Position source: controllable; the panel exposes a pick button that
 * triggers the page's onChange with the first/second position id. */
jest.mock('@/modules/kpi/shared/acting-position-selector', () => ({
  useMyPositions: () => ({
    positions: mockPositions,
    isLoading: false,
    error: mockPositionsError,
    refetch: jest.fn(),
  }),
  ActingPositionPanel: ({ positions, error, onRetry, onChange }: {
    positions: { positionId: string }[];
    error: string | null;
    onRetry: () => void;
    onChange: (id: string) => void;
  }) => (
    <div data-testid="acting-position-panel">
      {error ? (
        <>
          <span>{error}</span>
          <button type="button" onClick={onRetry}>Retry</button>
        </>
      ) : positions.length === 0 ? (
        <span>You have no active Position</span>
      ) : (
        <>
          <span>{positions[0].positionId}</span>
          <button type="button" onClick={() => onChange(positions[0].positionId)}>choose-pos-1</button>
          {positions[1] && (
            <button type="button" onClick={() => onChange(positions[1].positionId)}>choose-pos-2</button>
          )}
        </>
      )}
    </div>
  ),
  ActingPositionSelector: () => null,
}));

/* Capturing ActivityTable mock: exposes the admin-edit and ownership wiring. */
let tableProps: Record<string, unknown> = {};
jest.mock('@/modules/kpi/activity/activity-table', () => ({
  ActivityTable: (props: Record<string, unknown>) => {
    tableProps = props;
    return <div data-testid="activity-table" />;
  },
}));
jest.mock('@/modules/kpi/activity/request-table', () => ({ RequestTable: () => null }));
jest.mock('@/modules/kpi/activity/kpi-activity-detail-modal', () => ({ KpiActivityDetailModal: () => null }));
jest.mock('@/modules/kpi/admin/admin-create-activity-modal', () => ({ AdminCreateActivityModal: () => null }));
jest.mock('@/modules/kpi/admin/admin-update-activity-modal', () => ({ AdminUpdateActivityModal: () => null }));
jest.mock('@/modules/kpi/activity/activity-request-modal', () => ({ ActivityRequestModal: () => null }));
jest.mock('@/modules/kpi/activity/activity-change-modal', () => ({ ActivityChangeModal: () => null }));

function allText(): string {
  return document.body.textContent ?? '';
}

describe('KPI Activities page — V1 workspace with acting-Position workflows', () => {
  beforeEach(() => {
    mockPermissions = {};
    mockPositions = [];
    mockPositionsError = null;
    tableProps = {};
  });

  it('renders for a user with NO activity permissions (responsibility-based access)', () => {
    render(<KpiActivitiesPage />);
    expect(screen.getByRole('heading', { name: 'KPI Activities' })).toBeInTheDocument();
    expect(allText()).not.toMatch(/Access Denied/i);
  });

  it('does NOT render an Approval / To Review tab (approval lives on /kpi/approvals)', () => {
    render(<KpiActivitiesPage />);
    expect(allText()).not.toMatch(/Approvals/);
    expect(allText()).not.toMatch(/To Review/);
  });

  it('shows My Activities, Subordinates and My Requests views for any authenticated user', () => {
    render(<KpiActivitiesPage />);
    expect(allText()).toMatch(/My Activities/);
    expect(allText()).toMatch(/Subordinates/);
    expect(allText()).toMatch(/My Requests/);
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

  it('shows the T10 admin create button only for kpi_activity:manage', () => {
    const { unmount } = render(<KpiActivitiesPage />);
    expect(allText()).not.toMatch(/Admin Create Activity/);
    unmount();

    mockPermissions = { 'kpi_activity:manage': true };
    render(<KpiActivitiesPage />);
    expect(allText()).toMatch(/Admin Create Activity/);
  });

  it('gates the T4 root-request button on kpi_activity:root_request AND an explicit acting Position', () => {
    mockPermissions = { 'kpi_activity:root_request': true };
    const { unmount } = render(<KpiActivitiesPage />);
    // Rendered (permission granted) but DISABLED until a Position is chosen.
    const disabledButton = screen.getByRole('button', { name: /Request Activity/ });
    expect(disabledButton).toBeDisabled();
    unmount();

    mockPositions = [
      { positionId: 'pos-1', positionName: 'Manager', userPositionId: 'up-1', userId: 'u-1', isPrimary: true },
    ];
    render(<KpiActivitiesPage />);
    fireEvent.click(screen.getByText('choose-pos-1'));
    expect(screen.getByRole('button', { name: /Request Activity/ })).toBeEnabled();
  });

  it('does NOT show the root-request button without kpi_activity:root_request, even with a position', () => {
    mockPositions = [
      { positionId: 'pos-1', positionName: 'Manager', userPositionId: 'up-1', userId: 'u-1', isPrimary: true },
    ];
    render(<KpiActivitiesPage />);
    fireEvent.click(screen.getByText('choose-pos-1'));
    expect(allText()).not.toMatch(/Request Activity/);
  });

  it('wires exact-assignment ownership: ownAssignmentUserPositionId = the selected Position userPositionId', () => {
    mockPositions = [
      { positionId: 'pos-1', positionName: 'Manager', userPositionId: 'up-7', userId: 'u-1', isPrimary: true },
    ];
    render(<KpiActivitiesPage />);
    fireEvent.click(screen.getByText('choose-pos-1'));
    expect(tableProps.ownAssignmentUserPositionId).toBe('up-7');
    // The Position id (acting identity) is NEVER used as the assignment id.
    expect(tableProps.ownAssignmentUserPositionId).not.toBe('pos-1');
  });

  it('passes the T11 admin-edit capability only to kpi_activity:manage holders', () => {
    const { unmount } = render(<KpiActivitiesPage />);
    expect(tableProps.canAdminEdit).toBe(false);
    unmount();

    mockPermissions = { 'kpi_activity:manage': true };
    render(<KpiActivitiesPage />);
    expect(tableProps.canAdminEdit).toBe(true);
  });

  it('keeps ordinary reads visible when Position loading fails (recoverable error panel)', () => {
    mockPositionsError = 'Failed to load your active positions.';
    render(<KpiActivitiesPage />);
    expect(screen.getByText(/Failed to load your active positions/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'KPI Activities' })).toBeInTheDocument();
    expect(allText()).not.toMatch(/Access Denied/i);
  });

  it('does not gate the page on obsolete codes (kpi_activity:request absent is fine)', () => {
    mockPermissions = { 'kpi_activity:request': true };
    render(<KpiActivitiesPage />);
    expect(allText()).not.toMatch(/Access Denied/i);
  });
});
