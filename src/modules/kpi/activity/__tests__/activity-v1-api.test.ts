/**
 * Activity V1 client contract tests (T1/T2/T6/T7/T8).
 * Verifies exact method/path/query/body: `scope` always sent, actingPositionId
 * only for `subordinates`, and the unified decision body discriminated
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
  progressPercent: 50, createdAt: '', updatedAt: '',
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

const wrap = <T>(data: T): ApiResponse<T> => ({ status: 200, message: 'ok', data });

describe('activityV1Api.getActivities (T1)', () => {
  it('GET /api/v1/kpi-activities with scope=mine', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: wrap([activity]) });
    const result = await activityV1Api.getActivities('mine');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-activities', { params: { scope: 'mine' } });
    expect(result).toEqual([activity]);
  });

  it('sends actingPositionId only for scope=subordinates', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: wrap([]) });
    await activityV1Api.getActivities('subordinates', 'pos-1');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-activities', {
      params: { scope: 'subordinates', actingPositionId: 'pos-1' },
    });
  });

  it('never sends actingPositionId for scope=all', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: wrap([]) });
    await activityV1Api.getActivities('all', 'pos-1');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-activities', { params: { scope: 'all' } });
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
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-activity-requests', { params: { scope: 'mine' } });
    expect(result).toEqual([request]);
  });

  it('GET with scope=to-review', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: wrap([]) });
    await activityV1Api.getRequests('to-review');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-activity-requests', { params: { scope: 'to-review' } });
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
