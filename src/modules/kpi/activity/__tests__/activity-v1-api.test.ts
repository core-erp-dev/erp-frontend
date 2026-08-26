/**
 * Activity V1 client contract tests (T1/T2/T6/T7/T8).
 * Verifies exact method/path/query/body: `scope` and pagination are sent,
 * actingPositionId only for `subordinates`, and the unified decision body discriminated
 * (APPROVE never sends rejectionReason; REJECT requires it).
 */
import { api } from '@/lib/axios';
import { activityV1Api } from '../activity-v1-api';
import type { ApiResponse } from '@/types/api';
import type { KpiActivityResponse, KpiActivityChangeRequestResponse } from '../activity-v1.types';

jest.mock('@/lib/axios');
const mockedApi = jest.mocked(api);

const activity: KpiActivityResponse = {
  id: 'act-1', parentId: null, parentActivityName: null,
  corporateKpiId: 'ck-1', corporateKpiName: 'CK', corporateKpiCode: 'C1',
  assignedToUserPositionId: 'up-1', assignedToUserName: 'A', assignedToPositionName: 'P1',
  activityName: 'A1', description: null, unit: '%', targetValue: 100,
  periodYear: 2026, periodMonth: 6, status: 'ACTIVE', realizedValue: 50,
  progressPercent: 50, version: 3, createdAt: '', updatedAt: '',
};

const request: KpiActivityChangeRequestResponse = {
  id: 'req-1', requestType: 'CREATE', status: 'PENDING', activityId: null,
  parentId: null, parentActivityName: null, corporateKpiId: 'ck-1',
  corporateKpiName: 'CK', assignedToUserPositionId: 'up-2',
  assignedToUserName: 'B', activityName: 'A2', description: null, unit: '%',
  targetValue: 10, periodYear: 2026, periodMonth: 7, requestedByUser: 'u-1',
  requestedByUserName: 'A',
  reviewedBy: null, reviewedAt: null, rejectionReason: null,
  cancellationReason: null, createdAt: '', updatedAt: '',
};

const wrap = <T>(data: T): ApiResponse<T> => ({ status: 200, message: 'ok', data });

describe('activityV1Api.getActivities (T1)', () => {
  it('GET /api/v1/kpi-activities with scope=mine', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: wrap([activity]) });
    const result = await activityV1Api.getActivities('mine');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-activities', { params: { scope: 'mine', page: 1, size: 100, sortBy: 'activityName', sortDirection: 'asc' } });
    expect(result).toEqual([activity]);
  });

  it('sends actingPositionId only for scope=subordinates', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: wrap([]) });
    await activityV1Api.getActivities('subordinates', 'pos-1');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-activities', {
      params: { scope: 'subordinates', actingPositionId: 'pos-1', page: 1, size: 100, sortBy: 'activityName', sortDirection: 'asc' },
    });
  });

  it('sends actingPositionId for scope=superior (self-child parent source)', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: wrap([]) });
    await activityV1Api.getActivities('superior', 'pos-1');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-activities', {
      params: { scope: 'superior', actingPositionId: 'pos-1', page: 1, size: 100, sortBy: 'activityName', sortDirection: 'asc' },
    });
  });

  it('never sends actingPositionId for scope=all', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: wrap([]) });
    await activityV1Api.getActivities('all', 'pos-1');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-activities', { params: { scope: 'all', page: 1, size: 100, sortBy: 'activityName', sortDirection: 'asc' } });
  });

  it('sends the active server-side page, filters, search, and sort', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: wrap({ content: [activity], page: 2, size: 10, totalElements: 17, totalPages: 2, last: true }) });
    await activityV1Api.getActivitiesPage('all', undefined, {
      page: 2, size: 10, search: 'laporan', status: 'ACTIVE', sortBy: 'createdAt', sortDirection: 'desc',
    });
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-activities', {
      params: { scope: 'all', page: 2, size: 10, search: 'laporan', status: 'ACTIVE', sortBy: 'createdAt', sortDirection: 'desc' },
    });
  });

  it('sends positionId as a filter without actingPositionId', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: wrap({ content: [activity], page: 1, size: 10, totalElements: 1, totalPages: 1, last: true }) });
    await activityV1Api.getActivitiesPage('subordinates', undefined, {
      page: 1, size: 10, search: '', status: '', positionId: 'pos-1', sortBy: 'activityName', sortDirection: 'asc',
    });
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-activities', {
      params: { scope: 'subordinates', positionId: 'pos-1', page: 1, size: 10, sortBy: 'activityName', sortDirection: 'asc' },
    });
  });

  it('throws MissingScopeError when scope is missing (no backend default)', async () => {
    await expect(activityV1Api.getActivities(undefined as never)).rejects.toThrow('scope is required');
  });
});

describe('activityV1Api.getActivityById (T2)', () => {
  it('GET /api/v1/kpi-activities/{id} with optional actingPositionId', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: wrap(activity) });
    await activityV1Api.getActivityById('act-1', 'pos-1');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-activities/act-1', { params: { actingPositionId: 'pos-1' } });
  });

  it('omits params when no actingPositionId', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: wrap(activity) });
    await activityV1Api.getActivityById('act-1');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-activities/act-1', { params: undefined });
  });
});

describe('activityV1Api.getRequests (T6)', () => {
  it('GET /api/v1/kpi-activity-requests with scope=mine', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: wrap([request]) });
    const result = await activityV1Api.getRequests('mine');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-activity-requests', {
      params: { scope: 'mine', page: 1, size: 100, sortBy: 'createdAt', sortDirection: 'desc' },
    });
    expect(result).toEqual([request]);
  });

  it('GET with scope=to-review', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: wrap([]) });
    await activityV1Api.getRequests('to-review');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-activity-requests', {
      params: { scope: 'to-review', page: 1, size: 100, sortBy: 'createdAt', sortDirection: 'desc' },
    });
  });

  it('sends the active server-side request page, search, status, and sort', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: wrap({
      content: [request], page: 2, size: 10, totalElements: 11, totalPages: 2, last: true,
    }) });
    await activityV1Api.getRequestsPage('mine', {
      page: 2, size: 10, search: 'laporan', status: 'REJECTED', sortBy: 'createdAt', sortDirection: 'desc',
    });
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-activity-requests', {
      params: {
        scope: 'mine', page: 2, size: 10, search: 'laporan', status: 'REJECTED',
        sortBy: 'createdAt', sortDirection: 'desc',
      },
    });
  });
});

describe('activityV1Api.getRequestById (T7)', () => {
  it('GET /api/v1/kpi-activity-requests/{id}', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: wrap(request) });
    const result = await activityV1Api.getRequestById('req-1');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-activity-requests/req-1');
    expect(result.id).toBe('req-1');
  });
});

describe('activityV1Api.decideRequest (T8 — unified decision)', () => {
  it('PATCH /api/v1/kpi-activity-requests/{id}/decision with APPROVE and NO rejectionReason', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: wrap(request) });
    await activityV1Api.decideRequest('req-1', { decision: 'APPROVE' });
    expect(mockedApi.patch).toHaveBeenCalledWith('/api/v1/kpi-activity-requests/req-1/decision', { decision: 'APPROVE' });
  });

  it('PATCH with REJECT and required rejectionReason', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: wrap(request) });
    await activityV1Api.decideRequest('req-1', { decision: 'REJECT', rejectionReason: 'not valid' });
    expect(mockedApi.patch).toHaveBeenCalledWith('/api/v1/kpi-activity-requests/req-1/decision', {
      decision: 'REJECT', rejectionReason: 'not valid',
    });
  });
});

describe('activityV1Api.getAssignableAssignees (T3)', () => {
  it('GET /api/v1/kpi-activities/assignable-assignees with actingPositionId only', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: wrap([]) });
    await activityV1Api.getAssignableAssignees('pos-1');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-activities/assignable-assignees', {
      params: { actingPositionId: 'pos-1' },
    });
  });

  it('adds parentId for child create', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: wrap([]) });
    await activityV1Api.getAssignableAssignees('pos-1', 'act-parent');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-activities/assignable-assignees', {
      params: { actingPositionId: 'pos-1', parentId: 'act-parent' },
    });
  });
});

describe('activityV1Api.submitCreateRequest (T4 — root vs child discriminated)', () => {
  it('POST /api/v1/kpi-activity-requests with the exact ROOT body (no parentId key)', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: wrap(request) });
    await activityV1Api.submitCreateRequest({
      assignedToUserPositionId: 'up-2',
      actingPositionId: 'pos-1',
      corporateKpiId: 'ck-1',
      periodYear: 2026,
      periodMonth: 6,
      activityName: 'Root Activity',
      description: 'root desc',
      unit: '%',
      targetValue: 100,
    });
    expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/kpi-activity-requests', {
      assignedToUserPositionId: 'up-2',
      actingPositionId: 'pos-1',
      corporateKpiId: 'ck-1',
      periodYear: 2026,
      periodMonth: 6,
      activityName: 'Root Activity',
      description: 'root desc',
      unit: '%',
      targetValue: 100,
    });
    const body = mockedApi.post.mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect(body).not.toHaveProperty('parentId');
  });

  it('POST with the exact CHILD body (no corporateKpiId/periodYear/periodMonth keys)', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: wrap(request) });
    await activityV1Api.submitCreateRequest({
      assignedToUserPositionId: 'up-2',
      actingPositionId: 'pos-1',
      parentId: 'act-parent',
      activityName: 'Child Activity',
      unit: '%',
      targetValue: 50,
    });
    expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/kpi-activity-requests', {
      assignedToUserPositionId: 'up-2',
      actingPositionId: 'pos-1',
      parentId: 'act-parent',
      activityName: 'Child Activity',
      unit: '%',
      targetValue: 50,
    });
    const body = mockedApi.post.mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect(body).not.toHaveProperty('corporateKpiId');
    expect(body).not.toHaveProperty('periodYear');
    expect(body).not.toHaveProperty('periodMonth');
  });
});

describe('activityV1Api.submitChangeRequest (T5 — UPDATE vs CANCEL discriminated)', () => {
  it('POST /api/v1/kpi-activities/{id}/change-requests with the exact UPDATE body (no cancellationReason)', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: wrap(request) });
    await activityV1Api.submitChangeRequest('act-1', {
      requestType: 'UPDATE',
      actingPositionId: 'pos-1',
      activityName: 'Renamed',
      description: null,
      unit: '%',
      targetValue: 120,
    });
    expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/kpi-activities/act-1/change-requests', {
      requestType: 'UPDATE',
      actingPositionId: 'pos-1',
      activityName: 'Renamed',
      description: null,
      unit: '%',
      targetValue: 120,
    });
    const body = mockedApi.post.mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect(body).not.toHaveProperty('cancellationReason');
  });

  it('POST with the exact CANCEL body — no UPDATE-only fields serialized', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: wrap(request) });
    await activityV1Api.submitChangeRequest('act-1', {
      requestType: 'CANCEL',
      actingPositionId: 'pos-1',
      cancellationReason: 'no longer needed',
    });
    expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/kpi-activities/act-1/change-requests', {
      requestType: 'CANCEL',
      actingPositionId: 'pos-1',
      cancellationReason: 'no longer needed',
    });
    const body = mockedApi.post.mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect(body).not.toHaveProperty('activityName');
    expect(body).not.toHaveProperty('description');
    expect(body).not.toHaveProperty('unit');
    expect(body).not.toHaveProperty('targetValue');
  });
});
