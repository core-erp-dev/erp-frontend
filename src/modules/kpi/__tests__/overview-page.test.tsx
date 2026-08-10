/**
 * KPI Overview (Dashboard) tests — V1 scopes.
 * Covers: authenticated-only rendering, greeting + active position chip,
 * exact scoped endpoint usage, to-review Activity requests gated on
 * kpi_activity:approve, ACTIVE-year Corporate KPI resolution (never the
 * assumed current calendar year), permission-based quick actions, metric
 * helpers, and empty states.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import KpiOverviewPage from '@/app/(main)/kpi/page';
import { activityV1Api } from '@/modules/kpi/activity/activity-v1-api';
import { reportV1Api } from '@/modules/kpi/report/report-v1-api';
import { corporateKpiApi } from '@/modules/kpi/corporate/corporate-kpi-api';
import { corporateKpiStructuresApi } from '@/modules/kpi/corporate/corporate-kpi-structures-api';
import { getMyPositions } from '@/modules/kpi/shared/my-positions';
import {
  averageProgress,
  countIndicatorNodes,
  pickActiveYear,
} from '@/modules/kpi/overview/use-overview-data';
import type { KpiActivityResponse } from '@/modules/kpi/activity/activity-v1.types';
import type { KpiActivityChangeRequestResponse } from '@/modules/kpi/activity/activity-v1.types';
import type { KpiReportResponse } from '@/modules/kpi/report/report-v1.types';
import type { CorporateKpiNode } from '@/modules/kpi/corporate/corporate-kpi.types';
import type { CorporateKpiStructure } from '@/modules/kpi/corporate/corporate-kpi.types';
import type { MyPositionResponse } from '@/modules/kpi/shared/my-positions';

/* ── Mock dependencies ── */

jest.mock('@/modules/kpi/activity/activity-v1-api');
const mockedActivityApi = jest.mocked(activityV1Api);

jest.mock('@/modules/kpi/report/report-v1-api');
const mockedReportApi = jest.mocked(reportV1Api);

jest.mock('@/modules/kpi/corporate/corporate-kpi-api');
const mockedCorpKpiApi = jest.mocked(corporateKpiApi);

jest.mock('@/modules/kpi/corporate/corporate-kpi-structures-api');
const mockedStructuresApi = jest.mocked(corporateKpiStructuresApi);

jest.mock('@/modules/kpi/shared/my-positions', () => ({
  getMyPositions: jest.fn(),
}));
const mockedGetMyPositions = jest.mocked(getMyPositions);

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

jest.mock('@/store/auth-store', () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      user: { username: 'John Doe', email: 'john@doe.com', roles: [], permissions: [] },
      accessToken: 'token',
      isInitializing: false,
    }),
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

const samplePosition: MyPositionResponse = {
  id: 'up-1', userId: 'u-1', userName: 'John Doe', userEmail: 'john@doe.com',
  positionId: 'pos-1', positionName: 'Staff', positionCode: 'STF',
  startDate: null, endDate: null, isPrimary: true, isActive: true,
  assignedBy: null, createdAt: '2026-01-01T00:00:00',
};

function makeStructure(year: number, status: CorporateKpiStructure['status']): CorporateKpiStructure {
  return {
    id: `struct-${year}`, year, status,
    activatedAt: status === 'ACTIVE' ? `2026-01-01T00:00:00` : null,
    activatedBy: null, deletedAt: null,
    createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00',
  };
}

function makeIndicator(id: string): CorporateKpiNode {
  return {
    id, structureId: 'struct-2025', parentId: null, parentName: null,
    code: `IND-${id}`, name: `Indicator ${id}`, nodeType: 'INDICATOR', year: 2025,
    description: null, displayOrder: 1, formula: null, assessmentRules: null,
    weight: null, targetScore: null, formulaResult: null, actualScore: null,
    actualResult: null, targetResult: null, calculationStatus: null,
    calculationError: null, totalWeight: null, remainingWeight: null,
    weightComplete: null, deletedAt: null,
    createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00',
    children: [],
  };
}

beforeEach(() => {
  mockPermissions = {};
  jest.clearAllMocks();
  mockedActivityApi.getActivities.mockResolvedValue([]);
  mockedActivityApi.getRequests.mockResolvedValue([]);
  mockedReportApi.getReports.mockResolvedValue([]);
  mockedCorpKpiApi.getTreeByYear.mockResolvedValue([]);
  mockedGetMyPositions.mockResolvedValue([]);
});

/** Wait until the dashboard finishes loading (the HeroUI mock Spinner is gone). */
async function waitForLoaded(): Promise<void> {
  await waitFor(() => {
    expect(document.body.querySelector('[data-mock="Spinner"]')).toBeNull();
  });
}

describe('KPI Overview (Dashboard) — V1 scopes', () => {
  it('renders for a user with NO KPI permissions (responsibility-based, authenticated-only)', async () => {
    render(<KpiOverviewPage />);
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Welcome back, John Doe')).toBeInTheDocument();
    expect(document.body.textContent ?? '').not.toMatch(/Access Denied/i);
  });

  it('greets without a position chip when the user has no active position', async () => {
    mockedGetMyPositions.mockResolvedValue([]);
    render(<KpiOverviewPage />);
    await waitForLoaded();
    expect(screen.queryByText('Staff')).not.toBeInTheDocument();
  });

  it('shows the primary active position chip from /users/me/positions', async () => {
    mockedGetMyPositions.mockResolvedValue([samplePosition]);
    render(<KpiOverviewPage />);
    expect(await screen.findByText('Staff')).toBeInTheDocument();
  });

  it('fetches activities scope=mine, reports mine + to-review, and my positions', async () => {
    mockedActivityApi.getActivities.mockResolvedValue([sampleActivity]);
    mockedReportApi.getReports.mockResolvedValue([sampleReport]);
    render(<KpiOverviewPage />);
    await screen.findByRole('heading', { name: 'Dashboard' });
    expect(mockedGetMyPositions).toHaveBeenCalledTimes(1);
    expect(mockedActivityApi.getActivities).toHaveBeenCalledWith('mine');
    expect(mockedReportApi.getReports).toHaveBeenCalledWith('mine');
    expect(mockedReportApi.getReports).toHaveBeenCalledWith('to-review');
  });

  it('does NOT fetch to-review activity requests without kpi_activity:approve', async () => {
    render(<KpiOverviewPage />);
    await waitForLoaded();
    expect(mockedActivityApi.getRequests).not.toHaveBeenCalled();
    expect(screen.queryByText('Activity Approvals')).not.toBeInTheDocument();
  });

  it('fetches to-review activity requests and shows the approvals card for kpi_activity:approve holders', async () => {
    mockPermissions = { 'kpi_activity:approve': true };
    mockedActivityApi.getRequests.mockResolvedValue([
      { id: 'req-1' } as KpiActivityChangeRequestResponse,
    ]);
    render(<KpiOverviewPage />);
    await waitForLoaded();
    expect(mockedActivityApi.getRequests).toHaveBeenCalledWith('to-review');
    expect(screen.getByText('Activity Approvals')).toBeInTheDocument();
  });

  it('does not call the Corporate KPI endpoints without corporate_kpi:read', async () => {
    render(<KpiOverviewPage />);
    await screen.findByRole('heading', { name: 'Dashboard' });
    expect(mockedStructuresApi.list).not.toHaveBeenCalled();
    expect(mockedCorpKpiApi.getTreeByYear).not.toHaveBeenCalled();
  });

  it('resolves the ACTIVE structure with the latest year — never the assumed current year', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    mockedStructuresApi.list.mockResolvedValue([
      makeStructure(2026, 'DRAFT'),
      makeStructure(2025, 'ACTIVE'),
    ]);
    mockedCorpKpiApi.getTreeByYear.mockResolvedValue([
      { ...makeIndicator('ind-1'), parentId: null, children: [] },
      { ...makeIndicator('ind-2'), parentId: null, children: [] },
    ]);
    render(<KpiOverviewPage />);
    expect(await screen.findByText(/Year 2025/)).toBeInTheDocument();
    expect(mockedCorpKpiApi.getTreeByYear).toHaveBeenCalledWith(2025);
    expect(screen.getByText(/2 indicators/)).toBeInTheDocument();
  });

  it('shows a safe empty state when no ACTIVE structure exists (DRAFT is not active)', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    mockedStructuresApi.list.mockResolvedValue([
      makeStructure(2026, 'DRAFT'),
      makeStructure(2024, 'INACTIVE'),
    ]);
    render(<KpiOverviewPage />);
    expect(await screen.findByText('No active Corporate KPI structure.')).toBeInTheDocument();
    expect(mockedCorpKpiApi.getTreeByYear).not.toHaveBeenCalled();
  });

  it('shows permission-based quick actions only', async () => {
    mockPermissions = {
      'kpi_activity:root_request': true,
      'corporate_kpi:read': true,
      'kpi_activity:manage': true,
    };
    render(<KpiOverviewPage />);
    await waitForLoaded();
    expect(screen.getByText('Request Activity')).toBeInTheDocument();
    expect(screen.getByText('Submit Report')).toBeInTheDocument();
    expect(screen.getByText('Enter KPI Values')).toBeInTheDocument();
    expect(screen.getByText('Admin Create Activity')).toBeInTheDocument();
  });

  it('keeps quick actions minimal without elevated permissions', async () => {
    render(<KpiOverviewPage />);
    await waitForLoaded();
    expect(screen.getByText('Submit Report')).toBeInTheDocument();
    expect(screen.queryByText('Request Activity')).not.toBeInTheDocument();
    expect(screen.queryByText('Enter KPI Values')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin Create Activity')).not.toBeInTheDocument();
  });
});

describe('overview metric helpers', () => {
  it('computes average progress', () => {
    const a = { ...sampleActivity, progressPercent: 50 };
    const b = { ...sampleActivity, id: 'act-2', progressPercent: 100 };
    expect(averageProgress([a, b])).toBe(75);
    expect(averageProgress([])).toBeNull();
  });

  it('counts indicator nodes recursively', () => {
    const tree = [
      { ...makeIndicator('ind-1'), children: [] },
      {
        ...makeIndicator('aspect-root'),
        nodeType: 'ASPECT' as const,
        children: [makeIndicator('ind-2')],
      },
    ];
    expect(countIndicatorNodes(tree)).toBe(2);
  });

  it('picks the ACTIVE structure with the latest year, ignoring DRAFT/INACTIVE', () => {
    expect(pickActiveYear([
      { year: 2026, status: 'DRAFT' },
      { year: 2025, status: 'ACTIVE' },
      { year: 2024, status: 'ACTIVE' },
    ])).toBe(2025);
    expect(pickActiveYear([{ year: 2026, status: 'DRAFT' }])).toBeNull();
    expect(pickActiveYear([])).toBeNull();
  });
});
