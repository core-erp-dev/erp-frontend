/**
 * KPI Approvals page tests — centralized approval queue (2026-08-05).
 *
 * Proves: page guard = exactly `kpi_activity:approve` (Access Denied without
 * it); the company-wide PENDING queue renders for an approve holder; requests
 * the actor created are visible but NOT actionable (buttons disabled via the
 * scope=mine id set); there is no reassign trigger anywhere (T9 UI removed).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import KpiApprovalsPage from '@/app/(main)/kpi/approvals/page';
import type { KpiActivityChangeRequestResponse } from '@/modules/kpi/activity/activity-v1.types';

type PermSet = Record<string, boolean>;

let mockPermissions: PermSet = {};
let mockToReview: KpiActivityChangeRequestResponse[] = [];
let mockMyRequests: KpiActivityChangeRequestResponse[] = [];

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

jest.mock('@/modules/kpi/activity/use-approval-data', () => ({
  useApprovalData: () => ({
    toReview: mockToReview,
    isLoading: false,
    error: null,
    fetchToReview: jest.fn().mockResolvedValue(undefined),
    isDeciding: false,
    decide: jest.fn().mockResolvedValue(true),
    recoverable: null,
    clearRecoverable: jest.fn(),
  }),
}));

/* useActivityData powers both the self-processing UX (myRequests ids) and the
 * always-mounted KpiActivityDetailModal — stub it with controllable data. */
jest.mock('@/modules/kpi/activity/use-activity-data', () => ({
  useActivityData: () => ({
    myActivities: [], isLoadingMy: false, myError: null, fetchMyActivities: jest.fn(),
    allActivities: [], isLoadingAll: false, allError: null, fetchAllActivities: jest.fn(),
    subordinatesActivities: [], isLoadingSubordinates: false, subordinatesError: null,
    subordinatesActingPositionId: null, fetchSubordinatesActivities: jest.fn(),
    myRequests: mockMyRequests, isLoadingRequests: false, requestsError: null,
    fetchMyRequests: jest.fn().mockResolvedValue(undefined),
    fetchActivityDetail: jest.fn(), fetchRequestDetail: jest.fn(), isLoadingDetail: false,
    submitCreateRequest: jest.fn(), submitChangeRequest: jest.fn(),
  }),
}));

function pendingRequest(id: string, requestedByUser: string, requestedByUserName: string): KpiActivityChangeRequestResponse {
  return {
    id, requestType: 'CREATE', status: 'PENDING', activityId: null,
    parentId: null, parentActivityName: null, corporateKpiId: 'ck-1',
    corporateKpiName: 'CK', assignedToUserPositionId: 'up-2',
    assignedToUserName: 'B', activityName: `Activity ${id}`, description: null, unit: '%',
    targetValue: 10, periodYear: 2026, periodMonth: 7, requestedByUser,
    requestedByUserName,
    reviewedBy: null, reviewedAt: null, rejectionReason: null,
    cancellationReason: null, createdAt: '2026-08-01T10:00:00', updatedAt: '2026-08-01T10:00:00',
  };
}

describe('KPI Approvals page — centralized approval queue', () => {
  beforeEach(() => {
    mockPermissions = {};
    mockToReview = [];
    mockMyRequests = [];
  });

  it('shows Access Denied without kpi_activity:approve (manage does NOT grant the queue)', () => {
    mockPermissions = { 'kpi_activity:manage': true };
    render(<KpiApprovalsPage />);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('No pending requests in the company queue.')).not.toBeInTheDocument();
  });

  it('renders the company-wide queue for an approve holder', () => {
    mockPermissions = { 'kpi_activity:approve': true };
    mockToReview = [
      pendingRequest('req-a', 'user-staff-a', 'Staff A'),
      pendingRequest('req-b', 'user-staff-b', 'Staff B'),
    ];
    render(<KpiApprovalsPage />);
    expect(screen.getByText('Activity req-a')).toBeInTheDocument();
    expect(screen.getByText('Activity req-b')).toBeInTheDocument();
    // Queue column shows the requester, not an assigned approver
    expect(screen.getByText('Staff A')).toBeInTheDocument();
    expect(screen.queryByText('Assigned Approver')).not.toBeInTheDocument();
  });

  it('disables approve/reject on requests the actor created (visible but not actionable)', () => {
    mockPermissions = { 'kpi_activity:approve': true };
    mockMyRequests = [pendingRequest('req-own', 'user-staff-a', 'Staff A')];
    mockToReview = [
      pendingRequest('req-own', 'user-staff-a', 'Staff A'),
      pendingRequest('req-other', 'user-staff-b', 'Staff B'),
    ];
    render(<KpiApprovalsPage />);

    const ownApprove = screen.getByRole('button', { name: 'You cannot approve your own request' });
    const ownReject = screen.getByRole('button', { name: 'You cannot reject your own request' });
    expect(ownApprove).toBeDisabled();
    expect(ownReject).toBeDisabled();

    const otherApprove = screen.getByRole('button', { name: 'Approve' });
    const otherReject = screen.getByRole('button', { name: 'Reject' });
    expect(otherApprove).not.toBeDisabled();
    expect(otherReject).not.toBeDisabled();
  });

  it('shows the empty state for an empty queue', () => {
    mockPermissions = { 'kpi_activity:approve': true };
    render(<KpiApprovalsPage />);
    expect(screen.getByText('No pending requests in the company queue.')).toBeInTheDocument();
  });

  it('exposes no reassign-approver action anywhere (T9 UI removed)', () => {
    mockPermissions = { 'kpi_activity:approve': true, 'kpi_activity:manage': true };
    mockToReview = [pendingRequest('req-a', 'user-staff-a', 'Staff A')];
    render(<KpiApprovalsPage />);
    expect(screen.queryByRole('button', { name: 'Reassign approver' })).not.toBeInTheDocument();
    expect(screen.queryByText('Reassign Approver')).not.toBeInTheDocument();
  });
});
