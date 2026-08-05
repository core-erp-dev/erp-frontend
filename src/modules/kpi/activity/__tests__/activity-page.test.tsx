/**
 * KPI Activities workspace tests — split navigation (2026-08-06).
 *
 * Each submenu route mounts `<ActivityWorkspace view=... />`:
 *   - my-activities → scope=mine (default route /kpi/activities/mine)
 *   - all-activities → scope=all, gated on read_all|manage (Access Denied otherwise)
 *   - subordinates → scope=subordinates&actingPositionId= (explicit acting Position)
 *   - my-requests → requests?scope=mine
 * Proves: per-view dataset wiring, T10/T11/T4 gates, exact-assignment
 * ownership, Position-failure resilience, the ABSENCE of the legacy tab
 * toggle, and no Approval/To Review surface on any Activity view.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ActivityWorkspace } from '@/modules/kpi/activity/activity-workspace';

type PermSet = Record<string, boolean>;

let mockPermissions: PermSet = {};
let mockPositions: { positionId: string; positionName: string; userPositionId: string; userId: string; isPrimary: boolean }[] = [];
let mockPositionsError: string | null = null;

const fetchMy = jest.fn();
const fetchAll = jest.fn();
const fetchSubordinates = jest.fn();
const fetchRequests = jest.fn();

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
    myActivities: [], isLoadingMy: false, myError: null, fetchMyActivities: fetchMy,
    allActivities: [], isLoadingAll: false, allError: null, fetchAllActivities: fetchAll,
    subordinatesActivities: [], isLoadingSubordinates: false, subordinatesError: null,
    subordinatesActingPositionId: null, fetchSubordinatesActivities: fetchSubordinates,
    myRequests: [], isLoadingRequests: false, requestsError: null, fetchMyRequests: fetchRequests,
    fetchActivityDetail: jest.fn(), fetchRequestDetail: jest.fn(), isLoadingDetail: false,
    submitCreateRequest: jest.fn(), submitChangeRequest: jest.fn(),
  }),
}));

/* Acting-Position source: controllable; the panel exposes a pick button that
 * triggers the workspace's onChange with the first/second position id. */
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

describe('Activity workspace — My Activities view (scope=mine)', () => {
  beforeEach(() => {
    mockPermissions = {};
    mockPositions = [];
    mockPositionsError = null;
    tableProps = {};
    jest.clearAllMocks();
  });

  it('renders for a user with NO activity permissions (responsibility-based access)', () => {
    render(<ActivityWorkspace view="my-activities" />);
    expect(screen.getByRole('heading', { name: 'My Activities' })).toBeInTheDocument();
    expect(allText()).not.toMatch(/Access Denied/i);
  });

  it('fetches scope=mine on mount', () => {
    render(<ActivityWorkspace view="my-activities" />);
    expect(fetchMy).toHaveBeenCalledTimes(1);
  });

  it('does NOT render the legacy tab toggle nor an Approval surface', () => {
    render(<ActivityWorkspace view="my-activities" />);
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(allText()).not.toMatch(/Approvals/);
    expect(allText()).not.toMatch(/To Review/);
    expect(allText()).not.toMatch(/All Activities/);
  });

  it('shows the T10 admin create button only for kpi_activity:manage', () => {
    const { unmount } = render(<ActivityWorkspace view="my-activities" />);
    expect(allText()).not.toMatch(/Admin Create Activity/);
    unmount();

    mockPermissions = { 'kpi_activity:manage': true };
    render(<ActivityWorkspace view="my-activities" />);
    expect(allText()).toMatch(/Admin Create Activity/);
  });

  it('gates the T4 root-request button on kpi_activity:root_request AND an explicit acting Position', () => {
    mockPermissions = { 'kpi_activity:root_request': true };
    const { unmount } = render(<ActivityWorkspace view="my-activities" />);
    const disabledButton = screen.getByRole('button', { name: /Request Activity/ });
    expect(disabledButton).toBeDisabled();
    unmount();

    mockPositions = [
      { positionId: 'pos-1', positionName: 'Manager', userPositionId: 'up-1', userId: 'u-1', isPrimary: true },
    ];
    render(<ActivityWorkspace view="my-activities" />);
    fireEvent.click(screen.getByText('choose-pos-1'));
    expect(screen.getByRole('button', { name: /Request Activity/ })).toBeEnabled();
  });

  it('does NOT show the root-request button without kpi_activity:root_request, even with a position', () => {
    mockPositions = [
      { positionId: 'pos-1', positionName: 'Manager', userPositionId: 'up-1', userId: 'u-1', isPrimary: true },
    ];
    render(<ActivityWorkspace view="my-activities" />);
    fireEvent.click(screen.getByText('choose-pos-1'));
    expect(allText()).not.toMatch(/Request Activity/);
  });

  it('wires exact-assignment ownership: ownAssignmentUserPositionId = the selected Position userPositionId', () => {
    mockPositions = [
      { positionId: 'pos-1', positionName: 'Manager', userPositionId: 'up-7', userId: 'u-1', isPrimary: true },
    ];
    render(<ActivityWorkspace view="my-activities" />);
    fireEvent.click(screen.getByText('choose-pos-1'));
    expect(tableProps.ownAssignmentUserPositionId).toBe('up-7');
    expect(tableProps.ownAssignmentUserPositionId).not.toBe('pos-1');
  });

  it('passes the T11 admin-edit capability only to kpi_activity:manage holders', () => {
    const { unmount } = render(<ActivityWorkspace view="my-activities" />);
    expect(tableProps.canAdminEdit).toBe(false);
    unmount();

    mockPermissions = { 'kpi_activity:manage': true };
    render(<ActivityWorkspace view="my-activities" />);
    expect(tableProps.canAdminEdit).toBe(true);
  });

  it('keeps ordinary reads visible when Position loading fails (recoverable error panel)', () => {
    mockPositionsError = 'Failed to load your active positions.';
    render(<ActivityWorkspace view="my-activities" />);
    expect(screen.getByText(/Failed to load your active positions/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'My Activities' })).toBeInTheDocument();
    expect(allText()).not.toMatch(/Access Denied/i);
  });

  it('does not gate the view on obsolete codes (kpi_activity:request absent is fine)', () => {
    mockPermissions = { 'kpi_activity:request': true };
    render(<ActivityWorkspace view="my-activities" />);
    expect(allText()).not.toMatch(/Access Denied/i);
  });
});

describe('Activity workspace — All Activities view (scope=all, read_all|manage)', () => {
  beforeEach(() => {
    mockPermissions = {};
    mockPositions = [];
    jest.clearAllMocks();
  });

  it('shows Access Denied without read_all or manage and does not fetch', () => {
    render(<ActivityWorkspace view="all-activities" />);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(fetchAll).not.toHaveBeenCalled();
  });

  it('renders and fetches scope=all for kpi_activity:read_all holders', () => {
    mockPermissions = { 'kpi_activity:read_all': true };
    render(<ActivityWorkspace view="all-activities" />);
    expect(screen.getByRole('heading', { name: 'All Activities' })).toBeInTheDocument();
    expect(fetchAll).toHaveBeenCalledTimes(1);
    expect(allText()).not.toMatch(/Access Denied/i);
  });

  it('renders for kpi_activity:manage holders too (manage implies the all scope)', () => {
    mockPermissions = { 'kpi_activity:manage': true };
    render(<ActivityWorkspace view="all-activities" />);
    expect(screen.getByRole('heading', { name: 'All Activities' })).toBeInTheDocument();
    expect(fetchAll).toHaveBeenCalledTimes(1);
  });
});

describe('Activity workspace — Subordinate view (scope=subordinates + actingPositionId)', () => {
  beforeEach(() => {
    mockPermissions = {};
    mockPositions = [];
    jest.clearAllMocks();
  });

  it('shows the acting-position prompt and does not fetch without a selection', () => {
    render(<ActivityWorkspace view="subordinates" />);
    expect(screen.getByText(/Select an acting position above/i)).toBeInTheDocument();
    expect(fetchSubordinates).not.toHaveBeenCalled();
  });

  it('fetches scope=subordinates with the selected acting Position id', () => {
    mockPositions = [
      { positionId: 'pos-9', positionName: 'Manager', userPositionId: 'up-9', userId: 'u-1', isPrimary: true },
    ];
    render(<ActivityWorkspace view="subordinates" />);
    fireEvent.click(screen.getByText('choose-pos-1'));
    expect(fetchSubordinates).toHaveBeenCalledWith('pos-9');
  });
});

describe('Activity workspace — My Request view (requests?scope=mine)', () => {
  beforeEach(() => {
    mockPermissions = {};
    mockPositions = [];
    jest.clearAllMocks();
  });

  it('renders with its own title and fetches the submitted-request history', () => {
    render(<ActivityWorkspace view="my-requests" />);
    expect(screen.getByRole('heading', { name: 'My Request' })).toBeInTheDocument();
    expect(fetchRequests).toHaveBeenCalledTimes(1);
    expect(allText()).not.toMatch(/Access Denied/i);
  });
});
