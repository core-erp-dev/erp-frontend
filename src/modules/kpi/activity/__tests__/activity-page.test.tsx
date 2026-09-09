import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ActivityWorkspace } from '@/modules/kpi/activity/activity-workspace';

const routerPush = jest.fn();
const fetchMy = jest.fn();
const fetchAll = jest.fn();
const fetchSubordinates = jest.fn();
const fetchRequests = jest.fn();
let positionError: string | null = null;
let positions: Array<{ positionId: string; positionName: string; userPositionId: string; userId: string; isPrimary: boolean }> = [];
let tableProps: Record<string, unknown> = {};

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: routerPush, replace: jest.fn(), back: jest.fn() }) }));
jest.mock('@/hooks/use-permission', () => ({
  usePermission: () => ({ hasPerm: () => false, hasAnyPerm: () => true }),
}));
jest.mock('@/modules/kpi/shared/acting-position-selector', () => ({
  useMyPositions: () => ({ positions, isLoading: false, error: positionError }),
}));
jest.mock('@/modules/kpi/activity/use-activity-data', () => ({
  useActivityData: () => ({
    myActivities: [], myPagination: null, isLoadingMy: false, myError: null, fetchMyActivities: fetchMy,
    allActivities: [], allPagination: null, isLoadingAll: false, allError: null, fetchAllActivities: fetchAll,
    subordinatesActivities: [], subordinatesPagination: null, isLoadingSubordinates: false, subordinatesError: null, fetchSubordinatesActivities: fetchSubordinates,
    myRequests: [], myRequestsPagination: null, isLoadingRequests: false, requestsError: null, fetchMyRequests: fetchRequests,
  }),
}));
jest.mock('@/modules/kpi/activity/activity-table', () => ({
  ActivityTable: (props: Record<string, unknown>) => { tableProps = props; return <div data-testid="activity-table" />; },
}));
jest.mock('@/modules/kpi/activity/request-table', () => ({ RequestTable: () => null }));
jest.mock('@/modules/kpi/activity/activity-change-modal', () => ({ ActivityChangeModal: () => null }));
jest.mock('@/modules/kpi/admin/admin-reassign-activity-modal', () => ({ AdminReassignActivityModal: () => null }));

describe('Activity workspace simplified position flow', () => {
  beforeEach(() => {
    positions = [];
    positionError = null;
    tableProps = {};
    window.history.replaceState({}, '', '/kpi/activities/mine');
    jest.clearAllMocks();
  });

  it('shows one always-visible personal CTA and no position panel', () => {
    positions = [{ positionId: 'position-a', positionName: 'A', userPositionId: 'assignment-a', userId: 'u', isPrimary: true }];
    render(<ActivityWorkspace view="my-activities" />);
    expect(screen.getByRole('button', { name: 'Ajukan Aktivitas' })).toBeInTheDocument();
    expect(screen.queryByText(/Pilih posisi aktif/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Coba Lagi/i)).not.toBeInTheDocument();
    expect(fetchMy).toHaveBeenCalled();
    expect(fetchMy).toHaveBeenCalledWith(expect.objectContaining({
      periodYear: new Date().getFullYear(),
      periodMonth: new Date().getMonth() + 1,
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Ajukan Aktivitas' }));
    expect(routerPush).toHaveBeenCalledWith('/kpi/activities/mine/create');
  });

  it('passes the selected URL period to the activity list query', () => {
    window.history.replaceState({}, '', '/kpi/activities/mine?year=2025&month=2');
    positions = [{ positionId: 'position-a', positionName: 'A', userPositionId: 'assignment-a', userId: 'u', isPrimary: true }];

    render(<ActivityWorkspace view="my-activities" />);

    expect(fetchMy).toHaveBeenCalledWith(expect.objectContaining({
      periodYear: 2025,
      periodMonth: 2,
    }));
  });

  it('does not show the clear-filter button when only the activity period changes', () => {
    window.history.replaceState({}, '', '/kpi/activities/mine?year=2025&month=2');
    positions = [{ positionId: 'position-a', positionName: 'A', userPositionId: 'assignment-a', userId: 'u', isPrimary: true }];

    render(<ActivityWorkspace view="my-activities" />);

    expect(screen.queryByRole('button', { name: 'Hapus filter' })).not.toBeInTheDocument();
  });

  it('shows all my requests by default and sorts them newest first', () => {
    render(<ActivityWorkspace view="my-requests" />);

    expect(fetchRequests).toHaveBeenCalledWith(expect.objectContaining({
      periodYear: undefined,
      periodMonth: undefined,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    }));
  });

  it('keeps the clear-filter button hidden when my requests only have a period', () => {
    window.history.replaceState({}, '', '/kpi/activities/my-requests?year=2025&month=2');

    render(<ActivityWorkspace view="my-requests" />);

    expect(fetchRequests).toHaveBeenCalledWith(expect.objectContaining({
      periodYear: 2025,
      periodMonth: 2,
    }));
    expect(screen.queryByRole('button', { name: 'Hapus filter' })).not.toBeInTheDocument();
  });

  it('keeps the personal CTA visible but disabled without an active position', () => {
    render(<ActivityWorkspace view="my-activities" />);
    expect(screen.getByRole('button', { name: 'Ajukan Aktivitas' })).toBeDisabled();
  });

  it('loads subordinate activities without requiring a position filter and routes its only CTA', () => {
    positions = [{ positionId: 'position-a', positionName: 'A', userPositionId: 'assignment-a', userId: 'u', isPrimary: true }];
    render(<ActivityWorkspace view="subordinates" />);
    expect(fetchSubordinates).toHaveBeenCalledWith(undefined, expect.any(Object));
    expect(screen.getByRole('button', { name: 'Ajukan Aktivitas Bawahan' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Ajukan Aktivitas$/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ajukan Aktivitas Bawahan' }));
    expect(routerPush).toHaveBeenCalledWith('/kpi/activities/subordinate/create');
  });

  it('does not turn a position-source error into a table error', () => {
    positionError = 'Posisi gagal dimuat';
    render(<ActivityWorkspace view="my-activities" />);
    expect(tableProps.error).toBeNull();
  });

  it('passes every active assignment to ownership checks', () => {
    positions = [
      { positionId: 'position-a', positionName: 'A', userPositionId: 'assignment-a', userId: 'u', isPrimary: true },
      { positionId: 'position-b', positionName: 'B', userPositionId: 'assignment-b', userId: 'u', isPrimary: false },
    ];
    render(<ActivityWorkspace view="my-activities" />);
    expect(tableProps.ownAssignmentUserPositionIds).toEqual(['assignment-a', 'assignment-b']);
  });
});
