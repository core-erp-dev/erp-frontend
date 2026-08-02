/**
 * KPI admin client contract tests (T9/T10/T18).
 * T11 (admin activity update) is deliberately absent — it requires
 * `expectedVersion` and no response DTO exposes a version (plan §15.2).
 */
import { api } from '@/lib/axios';
import { kpiAdminV1Api } from '../kpi-admin-v1-api';
import type { ApiResponse } from '@/types/api';
import type { KpiActivityResponse, KpiActivityChangeRequestResponse } from '@/modules/kpi/activity/activity-v1.types';
import type { KpiReportResponse } from '@/modules/kpi/report/report-v1.types';

jest.mock('@/lib/axios');
const mockedApi = jest.mocked(api);

const activity: KpiActivityResponse = {
  id: 'act-1', parentId: null, parentActivityName: null,
  corporateKpiId: 'ck-1', corporateKpiName: 'CK', corporateKpiCode: 'C1',
  assignedToUserPositionId: 'up-1', assignedToUserName: 'A', assignedToPositionName: 'P1',
  activityName: 'A1', description: null, unit: '%', targetValue: 100,
  periodYear: 2026, periodMonth: 6, status: 'ACTIVE', realizedValue: 0,
  progressPercent: 0, version: 3, createdAt: '', updatedAt: '',
};

const request: KpiActivityChangeRequestResponse = {
  id: 'req-1', requestType: 'CREATE', status: 'PENDING', activityId: null,
  parentId: null, parentActivityName: null, corporateKpiId: 'ck-1',
  corporateKpiName: 'CK', assignedToUserPositionId: 'up-2',
  assignedToUserName: 'B', activityName: 'A2', description: null, unit: '%',
  targetValue: 10, periodYear: 2026, periodMonth: 7, requestedByUser: 'u-1',
  requestedByUserName: 'A', approverUserId: 'u-2', approverUserName: 'C',
  reviewedBy: null, reviewedAt: null, rejectionReason: null,
  cancellationReason: null, createdAt: '', updatedAt: '',
};

const report: KpiReportResponse = {
  id: 'rep-1', activityId: 'act-1', activityName: 'A1', unit: '%',
  activityTargetValue: 100, submittedByUserPositionId: 'up-1',
  submittedByUserName: 'A', submittedByPositionName: 'P1',
  reviewerUserId: 'u-2', reviewerUserName: 'C',
  reviewerUserPositionId: null, reviewerPositionName: null,
  reportDate: '2026-06-15', executionDescription: 'done', realizedValue: 40,
  note: null, status: 'PENDING', reviewedBy: null, reviewedAt: null,
  rejectionReason: null, evidenceOriginalFilename: 'e.jpg',
  evidenceContentType: 'image/jpeg', evidenceFileSize: 1024,
  createdAt: '', updatedAt: '',
};

const wrap = <T>(data: T): ApiResponse<T> => ({ status: 200, message: 'ok', data });

describe('kpiAdminV1Api.adminReassignApprover (T9)', () => {
  it('PATCH /api/v1/admin/kpi-activity-requests/{id}/approver with user + reason', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: wrap(request) });
    const result = await kpiAdminV1Api.adminReassignApprover('req-1', {
      newApproverUserId: 'u-9', reason: 'stuck request',
    });
    expect(mockedApi.patch).toHaveBeenCalledWith('/api/v1/admin/kpi-activity-requests/req-1/approver', {
      newApproverUserId: 'u-9', reason: 'stuck request',
    });
    expect(result.id).toBe('req-1');
  });
});

describe('kpiAdminV1Api.adminCreateActivity (T10)', () => {
  it('POST /api/v1/admin/kpi-activities with assignee, root fields and reason', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: wrap(activity) });
    await kpiAdminV1Api.adminCreateActivity({
      assignedToUserPositionId: 'up-1',
      corporateKpiId: 'ck-1', periodYear: 2026, periodMonth: 6,
      activityName: 'A1', unit: '%', targetValue: 100, reason: 'audit',
    });
    expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/admin/kpi-activities', {
      assignedToUserPositionId: 'up-1',
      corporateKpiId: 'ck-1', periodYear: 2026, periodMonth: 6,
      activityName: 'A1', unit: '%', targetValue: 100, reason: 'audit',
    });
  });
});

describe('kpiAdminV1Api.adminReassignReportReviewer (T18)', () => {
  it('PATCH /api/v1/admin/kpi-reports/{id}/reviewer with user + reason', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: wrap(report) });
    const result = await kpiAdminV1Api.adminReassignReportReviewer('rep-1', {
      newReviewerUserId: 'u-9', reason: 'stuck report',
    });
    expect(mockedApi.patch).toHaveBeenCalledWith('/api/v1/admin/kpi-reports/rep-1/reviewer', {
      newReviewerUserId: 'u-9', reason: 'stuck report',
    });
    expect(result.id).toBe('rep-1');
  });
});

describe('kpiAdminV1Api.adminUpdateActivity (T11)', () => {
  it('PATCH /api/v1/admin/kpi-activities/{id} sending the authoritative version as expectedVersion', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: wrap(activity) });
    await kpiAdminV1Api.adminUpdateActivity('act-1', {
      action: 'UPDATE',
      reason: 'audit correction',
      expectedVersion: activity.version, // 3 — the persisted version from KpiActivityResponse
      activityName: 'A1 v2',
      unit: '%',
      targetValue: 120,
    });
    expect(mockedApi.patch).toHaveBeenCalledWith('/api/v1/admin/kpi-activities/act-1', {
      action: 'UPDATE',
      reason: 'audit correction',
      expectedVersion: 3,
      activityName: 'A1 v2',
      unit: '%',
      targetValue: 120,
    });
  });

  it('sends only REASSIGN fields for action=REASSIGN (no UPDATE-only proposal fields)', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: wrap(activity) });
    await kpiAdminV1Api.adminUpdateActivity('act-1', {
      action: 'REASSIGN',
      reason: 'reassign',
      expectedVersion: activity.version,
      assignedToUserPositionId: 'up-9',
    });
    const body = mockedApi.patch.mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect(body).toEqual({
      action: 'REASSIGN',
      reason: 'reassign',
      expectedVersion: 3,
      assignedToUserPositionId: 'up-9',
    });
    expect(body).not.toHaveProperty('activityName');
  });
});

describe('kpiAdminV1Api surface', () => {
  it('exposes exactly the four administrative client functions (T9/T10/T11/T18)', () => {
    const surface = kpiAdminV1Api as Record<string, unknown>;
    expect(typeof surface.adminReassignApprover).toBe('function');
    expect(typeof surface.adminCreateActivity).toBe('function');
    expect(typeof surface.adminUpdateActivity).toBe('function');
    expect(typeof surface.adminReassignReportReviewer).toBe('function');
  });
});
