/**
 * KPI Overview (Dashboard) tests — V1 scopes.
 * Covers: authenticated-only rendering, exact scoped endpoint usage,
 * to-review Activity requests gated on kpi_activity:approve, metric
 * calculation, and empty state.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import KpiOverviewPage from '@/app/(main)/kpi/page';
import { activityV1Api } from '@/modules/kpi/activity/activity-v1-api';
import { reportV1Api } from '@/modules/kpi/report/report-v1-api';
import { corporateKpiApi } from '@/modules/kpi/corporate/corporate-kpi-api';
import { averageProgress, targetReachedCount } from '@/modules/kpi/overview/use-overview-data';
import type { KpiActivityResponse } from '@/modules/kpi/activity/activity-v1.types';
import type { KpiReportResponse } from '@/modules/kpi/report/report-v1.types';

/* ── Mock dependencies ── */

jest.mock('@/modules/kpi/activity/activity-v1-api');
const mockedActivityApi = jest.mocked(activityV1Api);

jest.mock('@/modules/kpi/report/report-v1-api');
const mockedReportApi = jest.mocked(reportV1Api);

jest.mock('@/modules/kpi/corporate/corporate-kpi-api');
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

const sampleReport: KpiReportResponse = {
  id: 'rep-1', activityId: 'act-1', activityName: 'Increase Revenue',
  unit: 'IDR', activityTargetValue: 1000000,
  submittedByUserPositionId: 'up-1', submittedByUserName: 'John Doe', submittedByPositionName: 'Staff',
  reviewerUserId: 'u-2', reviewerUserName: 'Jane Man',
  reviewerUserPositionId: null, reviewerPositionName: null,
  reportDate: '2026-06-15', executionDescription: 'Executed plan A', realizedValue: 500000,
  note: null, status: 'PENDING', reviewedBy: null,
  reviewedAt: null, rejectionReason: null,
  evidenceOriginalFilename: 'photo.jpg', evidenceContentType: 'image/jpeg', evidenceFileSize: 102400,
  createdAt: '2026-06-15T10:00:00', updatedAt: '2026-06-15T10:00:00',
};

beforeEach(() => {
  mockPermissions = {};
  jest.clearAllMocks();
  mockedActivityApi.getActivities.mockResolvedValue([]);
  mockedActivityApi.getRequests.mockResolvedValue([]);
  mockedReportApi.getReports.mockResolvedValue([]);
  mockedCorpKpiApi.getTreeByYear.mockResolvedValue([]);
});

describe('KPI Overview (Dashboard) — V1 scopes', () => {
  it('renders for a user with NO KPI permissions (responsibility-based, authenticated-only)', async () => {
    render(<KpiOverviewPage />);
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(document.body.textContent ?? '').not.toMatch(/Access Denied/i);
  });

  it('fetches activities with scope=mine and reports with mine + to-review scopes', async () => {
    mockedActivityApi.getActivities.mockResolvedValue([sampleActivity]);
    mockedReportApi.getReports.mockResolvedValue([sampleReport]);
    render(<KpiOverviewPage />);
    await screen.findByRole('heading', { name: 'Dashboard' });
    expect(mockedActivityApi.getActivities).toHaveBeenCalledWith('mine');
    expect(mockedReportApi.getReports).toHaveBeenCalledWith('mine');
    expect(mockedReportApi.getReports).toHaveBeenCalledWith('to-review');
  });

  it('does NOT fetch to-review activity requests without kpi_activity:approve', async () => {
    render(<KpiOverviewPage />);
    await screen.findByRole('heading', { name: 'Dashboard' });
    expect(mockedActivityApi.getRequests).not.toHaveBeenCalled();
  });

  it('fetches to-review activity requests for kpi_activity:approve holders', async () => {
    mockPermissions = { 'kpi_activity:approve': true };
    render(<KpiOverviewPage />);
    await screen.findByRole('heading', { name: 'Dashboard' });
    expect(mockedActivityApi.getRequests).toHaveBeenCalledWith('to-review');
  });

  it('does not call the Corporate KPI endpoint without corporate_kpi:read', async () => {
    render(<KpiOverviewPage />);
    await screen.findByRole('heading', { name: 'Dashboard' });
    expect(mockedCorpKpiApi.getTreeByYear).not.toHaveBeenCalled();
  });
});

describe('overview metric helpers', () => {
  it('computes average progress', () => {
    const a = { ...sampleActivity, progressPercent: 50 };
    const b = { ...sampleActivity, id: 'act-2', progressPercent: 100 };
    expect(averageProgress([a, b])).toBe(75);
  });

  it('counts target-reached activities', () => {
    const a = { ...sampleActivity, progressPercent: 100 };
    const b = { ...sampleActivity, id: 'act-2', progressPercent: 40 };
    expect(targetReachedCount([a, b])).toBe(1);
  });
});
