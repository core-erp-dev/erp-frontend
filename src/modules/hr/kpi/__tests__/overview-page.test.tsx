/**
 * KPI Overview page tests — P4.
 * Covers permission-aware visibility, endpoint usage, metric calculation,
 * partial failure, and empty state.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import KpiOverviewPage from '@/app/(main)/hr/kpi/page';
import { activityApi } from '@/modules/hr/kpi/activity/activity-api';
import { reportApi } from '@/modules/hr/kpi/report/report-api';
import { corporateKpiApi } from '@/modules/hr/kpi/corporate/corporate-kpi-api';
import type { KpiActivityResponse, KpiActivityChangeRequestResponse } from '@/modules/hr/kpi/activity/activity.types';
import type { KpiReportResponse } from '@/modules/hr/kpi/report/report.types';
import type { CorporateKpiNode } from '@/modules/hr/kpi/corporate/corporate-kpi.types';

/* ── Mock dependencies ── */

jest.mock('@/modules/hr/kpi/activity/activity-api');
const mockedActivityApi = jest.mocked(activityApi);

jest.mock('@/modules/hr/kpi/report/report-api');
const mockedReportApi = jest.mocked(reportApi);

jest.mock('@/modules/hr/kpi/corporate/corporate-kpi-api');
const mockedCorpKpiApi = jest.mocked(corporateKpiApi);

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

jest.mock('@heroui/react', () => {
  const actual = jest.requireActual('@heroui/react');
  return {
    ...actual,
    toast: { success: jest.fn(), danger: jest.fn(), warning: jest.fn(), info: jest.fn() },
  };
});

/* ── Sample data ── */

const sampleActivity: KpiActivityResponse = {
  id: 'act-1', parentId: null, parentActivityName: null,
  corporateKpiId: 'ck-1', corporateKpiName: 'Revenue', corporateKpiCode: 'REV',
  assignedToUserPositionId: 'up-1', assignedToUserName: 'John Doe', assignedToPositionName: 'Staff',
  activityName: 'Increase Revenue', description: null,
  unit: 'IDR', targetValue: 1000000, periodYear: 2026, periodMonth: 6,
  status: 'ACTIVE', realizedValue: 500000, progressPercent: 50,
  createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00',
};

const sampleCompleted: KpiActivityResponse = {
  ...sampleActivity, id: 'act-2', activityName: 'Reduce Cost', realizedValue: 1000000, progressPercent: 100,
};

const sampleReport: KpiReportResponse = {
  id: 'rep-1', activityId: 'act-1', activityName: 'Increase Revenue',
  unit: 'IDR', activityTargetValue: 1000000,
  submittedByUserPositionId: 'up-1', submittedByUserName: 'John Doe', submittedByPositionName: 'Staff',
  reviewerUserPositionId: 'up-2', reviewerUserName: 'Jane Man', reviewerPositionName: 'Manager',
  reportDate: '2026-06-15', executionDescription: 'Executed plan A', realizedValue: 500000,
  note: null, status: 'PENDING', reviewedBy: null,
  reviewedAt: null, rejectionReason: null,
  evidenceOriginalFilename: 'photo.jpg', evidenceContentType: 'image/jpeg', evidenceFileSize: 102400,
  createdAt: '2026-06-15T10:00:00', updatedAt: '2026-06-15T10:00:00',
};

const samplePendingRequest: KpiActivityChangeRequestResponse = {
  id: 'req-1', requestType: 'CREATE', status: 'PENDING',
  activityId: null, parentId: null, parentActivityName: null,
  corporateKpiId: 'ck-1', corporateKpiName: 'Revenue',
  assignedToUserPositionId: 'up-2', assignedToUserName: 'Jane Man',
  activityName: 'New Activity', description: null, unit: 'IDR',
  targetValue: 500000, periodYear: 2026, periodMonth: 7,
  requestedByUser: 'user-1', requestedByUserName: 'John Doe',
  reviewedBy: null, reviewedAt: null, rejectionReason: null,
  cancellationReason: null, createdAt: '2026-06-16T00:00:00', updatedAt: '2026-06-16T00:00:00',
};

const sampleCorpKpiNode: CorporateKpiNode = {
  id: 'ind-1', parentId: 'asp-1', parentName: 'Financial',
  code: 'REV', name: 'Revenue', nodeType: 'INDICATOR',
  year: 2026, unit: 'IDR', targetValue: 10000000000,
  status: 'ACTIVE', description: null, deletedAt: null,
  createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00',
  children: [],
};

const ASPECT_NODE_ALL: PermSet = {
  'corporate_kpi:read': true,
  'kpi_activity:read': true,
  'kpi_activity:request': true,
  'kpi_activity:root_request': true,
  'kpi_activity:approve': true,
  'kpi_report:read': true,
  'kpi_report:review': true,
};

/* ── Setup ── */

beforeEach(() => {
  jest.clearAllMocks();
  mockPermissions = {};
  mockedActivityApi.getMyActivities.mockResolvedValue([]);
  mockedActivityApi.getManagedActivities.mockResolvedValue([]);
  mockedActivityApi.getOwnedActivities.mockResolvedValue([]);
  mockedActivityApi.getPendingRequests.mockResolvedValue([]);
  mockedReportApi.getMyReports.mockResolvedValue([]);
  mockedReportApi.getReportsToReview.mockResolvedValue([]);
  mockedCorpKpiApi.getTreeByYear.mockResolvedValue([]);
});

/* ── Tests ── */

describe('permission-aware group visibility', () => {
  it('shows no groups when user lacks all KPI permissions', async () => {
    mockPermissions = {};
    render(<KpiOverviewPage />);
    expect(screen.getByTitle('Access Denied')).toBeInTheDocument();
  });

  it('shows Activities group when user has read', async () => {
    mockPermissions = { 'kpi_activity:read': true };
    render(<KpiOverviewPage />);
    expect(await screen.findByText('Activities')).toBeInTheDocument();
  });

  it('shows Pending Actions when user has approve', async () => {
    mockPermissions = { 'kpi_activity:read': true, 'kpi_activity:approve': true };
    render(<KpiOverviewPage />);
    expect(await screen.findByText('Pending Actions')).toBeInTheDocument();
  });

  it('hides Pending Actions without approve or review', async () => {
    mockPermissions = { 'kpi_activity:read': true };
    render(<KpiOverviewPage />);
    await screen.findByText('Activities');
    expect(screen.queryByText('Pending Actions')).not.toBeInTheDocument();
  });

  it('shows Recent Reports when user has report read', async () => {
    mockPermissions = { 'kpi_report:read': true };
    render(<KpiOverviewPage />);
    expect(await screen.findByText('Recent Reports')).toBeInTheDocument();
  });

  it('shows Corporate KPI when user has corp kpi read', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiOverviewPage />);
    expect(await screen.findByText('Corporate KPI')).toBeInTheDocument();
  });
});

describe('unauthorized endpoints are not called', () => {
  it('calls only kpi_activity endpoints with kpi_activity:read', async () => {
    mockPermissions = { 'kpi_activity:read': true };
    render(<KpiOverviewPage />);
    await screen.findByText('Activities');
    expect(mockedActivityApi.getMyActivities).toHaveBeenCalledTimes(1);
    expect(mockedActivityApi.getManagedActivities).toHaveBeenCalledTimes(1);
    expect(mockedActivityApi.getOwnedActivities).not.toHaveBeenCalled();
    expect(mockedActivityApi.getPendingRequests).not.toHaveBeenCalled();
    expect(mockedReportApi.getMyReports).not.toHaveBeenCalled();
    expect(mockedReportApi.getReportsToReview).not.toHaveBeenCalled();
    expect(mockedCorpKpiApi.getTreeByYear).not.toHaveBeenCalled();
  });

  it('calls only owned endpoint with root_request', async () => {
    mockPermissions = { 'kpi_activity:root_request': true };
    render(<KpiOverviewPage />);
    await screen.findByText('Activities');
    expect(mockedActivityApi.getMyActivities).not.toHaveBeenCalled();
    expect(mockedActivityApi.getManagedActivities).not.toHaveBeenCalled();
    expect(mockedActivityApi.getOwnedActivities).toHaveBeenCalledTimes(1);
    expect(mockedActivityApi.getPendingRequests).not.toHaveBeenCalled();
  });

  it('calls approve and review endpoints with matching perms', async () => {
    mockPermissions = { 'kpi_activity:approve': true, 'kpi_report:review': true, 'kpi_activity:read': true };
    render(<KpiOverviewPage />);
    await screen.findByText('Pending Actions');
    expect(mockedActivityApi.getPendingRequests).toHaveBeenCalledTimes(1);
    expect(mockedReportApi.getReportsToReview).toHaveBeenCalledTimes(1);
    expect(mockedReportApi.getMyReports).not.toHaveBeenCalled();
  });
});

describe('metric calculation', () => {
  it('displays average progress correctly', async () => {
    mockPermissions = { 'kpi_activity:read': true };
    mockedActivityApi.getMyActivities.mockResolvedValue([
      { ...sampleActivity, progressPercent: 50 },
      { ...sampleCompleted, progressPercent: 100 },
    ]);
    render(<KpiOverviewPage />);
    // Wait for data to render
    const avgEl = await screen.findByText('75%');
    expect(avgEl).toBeInTheDocument();
  });

  it('shows Target Reached count', async () => {
    mockPermissions = { 'kpi_activity:read': true };
    mockedActivityApi.getMyActivities.mockResolvedValue([
      { ...sampleActivity, progressPercent: 50 },
      { ...sampleCompleted, progressPercent: 100 },
      { ...sampleActivity, id: 'act-4', progressPercent: 100 },
    ]);
    render(<KpiOverviewPage />);
    const trEl = await screen.findByText('target reached');
    expect(trEl).toBeInTheDocument();
    expect(trEl.previousElementSibling?.textContent).toBe('2');
  });
});

describe('partial endpoint failure', () => {
  it('shows inline error for failed section, unaffected sections render', async () => {
    mockPermissions = ASPECT_NODE_ALL;
    mockedActivityApi.getMyActivities.mockRejectedValue(new Error('Network error'));
    mockedActivityApi.getManagedActivities.mockResolvedValue([sampleActivity]);
    mockedActivityApi.getOwnedActivities.mockResolvedValue([sampleActivity]);
    mockedActivityApi.getPendingRequests.mockResolvedValue([samplePendingRequest]);
    mockedReportApi.getMyReports.mockResolvedValue([sampleReport]);
    mockedReportApi.getReportsToReview.mockResolvedValue([]);
    mockedCorpKpiApi.getTreeByYear.mockResolvedValue([sampleCorpKpiNode]);

    render(<KpiOverviewPage />);

    // Wait for all groups to render
    expect(await screen.findByText('Corporate KPI')).toBeInTheDocument();
    expect(screen.getByText('Recent Reports')).toBeInTheDocument();
    expect(screen.getByText('Pending Actions')).toBeInTheDocument();
    expect(screen.getByText('Activities')).toBeInTheDocument();

    // My Activities shows error, but Managed still shows data
    expect(screen.getByText('Could not load this section.')).toBeInTheDocument();
    // Managed Activities still rendered — "1 total" appears multiple times, verify presence
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(3); // managed count, owned count, indicator count, pending count
  });
});

describe('empty state', () => {
  it('shows empty messages when all endpoints return empty', async () => {
    mockPermissions = { ...ASPECT_NODE_ALL };
    // All mocks return [] from beforeEach
    render(<KpiOverviewPage />);

    expect(await screen.findByText('No active Corporate KPI indicators.')).toBeInTheDocument();
    expect(screen.getByText('No reports found.')).toBeInTheDocument();
  });
});
