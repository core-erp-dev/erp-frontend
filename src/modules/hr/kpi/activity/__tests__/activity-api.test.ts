/**
 * KPI Activity API contract tests — P2.1 read-only methods.
 * Verifies exact method/path, ApiResponse unwrapping, and error propagation.
 */
import { api } from '@/lib/axios';
import { activityApi } from '../activity-api';
import type { ApiResponse } from '@/types/api';
import type { KpiActivityResponse, KpiActivityChangeRequestResponse } from '../activity.types';

jest.mock('@/lib/axios');
const mockedApi = jest.mocked(api);

/* ── Sample data ── */

const mockActivity: KpiActivityResponse = {
  id: 'act-1',
  parentId: null,
  parentActivityName: null,
  corporateKpiId: 'ck-1',
  corporateKpiName: 'Revenue Growth',
  corporateKpiCode: 'FIN-01',
  assignedToUserPositionId: 'up-1',
  assignedToUserName: 'John Manager',
  assignedToPositionName: 'VP Finance',
  activityName: 'Increase Q1 Revenue',
  description: null,
  unit: '%',
  targetValue: 15,
  periodYear: 2026,
  periodMonth: 3,
  status: 'ACTIVE',
  realizedValue: 10.5,
  progressPercent: 70,
  createdAt: '2026-01-15T00:00:00',
  updatedAt: '2026-03-01T00:00:00',
};

const mockRequest: KpiActivityChangeRequestResponse = {
  id: 'req-1',
  requestType: 'CREATE',
  status: 'PENDING',
  activityId: null,
  parentId: null,
  parentActivityName: null,
  corporateKpiId: 'ck-1',
  corporateKpiName: 'Revenue Growth',
  assignedToUserPositionId: 'up-1',
  assignedToUserName: 'John Manager',
  activityName: 'Increase Q1 Revenue',
  description: null,
  unit: '%',
  targetValue: 15,
  periodYear: 2026,
  periodMonth: 3,
  requestedByUser: 'user-1',
  requestedByUserName: 'John Manager',
  reviewedBy: null,
  reviewedAt: null,
  rejectionReason: null,
  cancellationReason: null,
  createdAt: '2026-01-15T00:00:00',
  updatedAt: '2026-01-15T00:00:00',
};

/* ── getMyActivities ── */

describe('getMyActivities', () => {
  it('calls GET /api/v1/kpi-activities/my', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: [mockActivity] } satisfies ApiResponse<KpiActivityResponse[]>,
    });

    const result = await activityApi.getMyActivities();

    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-activities/my');
    expect(result).toEqual([mockActivity]);
  });

  it('unwraps ApiResponse.data', async () => {
    const payload: ApiResponse<KpiActivityResponse[]> = {
      status: 200, message: 'OK', data: [mockActivity],
    };
    mockedApi.get.mockResolvedValueOnce({ data: payload });

    const result = await activityApi.getMyActivities();

    expect(result).toEqual([mockActivity]);
  });

  it('propagates errors', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'));
    await expect(activityApi.getMyActivities()).rejects.toThrow('Network Error');
  });
});

/* ── getManagedActivities ── */

describe('getManagedActivities', () => {
  it('calls GET /api/v1/kpi-activities/managed', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: [mockActivity] } satisfies ApiResponse<KpiActivityResponse[]>,
    });

    const result = await activityApi.getManagedActivities();

    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-activities/managed');
    expect(result).toEqual([mockActivity]);
  });

  it('propagates errors', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Not found'));
    await expect(activityApi.getManagedActivities()).rejects.toThrow('Not found');
  });
});

/* ── getActivityById ── */

describe('getActivityById', () => {
  it('calls GET /api/v1/kpi-activities/{id}', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: mockActivity } satisfies ApiResponse<KpiActivityResponse>,
    });

    const result = await activityApi.getActivityById('act-1');

    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-activities/act-1');
    expect(result).toEqual(mockActivity);
  });

  it('propagates errors', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Not found'));
    await expect(activityApi.getActivityById('bad-id')).rejects.toThrow('Not found');
  });
});

/* ── getMyRequests ── */

describe('getMyRequests', () => {
  it('calls GET /api/v1/kpi-activity-requests/my', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: [mockRequest] } satisfies ApiResponse<KpiActivityChangeRequestResponse[]>,
    });

    const result = await activityApi.getMyRequests();

    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-activity-requests/my');
    expect(result).toEqual([mockRequest]);
  });

  it('propagates errors', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Not found'));
    await expect(activityApi.getMyRequests()).rejects.toThrow('Not found');
  });
});

/* ── getRequestById ── */

describe('getRequestById', () => {
  it('calls GET /api/v1/kpi-activity-requests/{id}', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: mockRequest } satisfies ApiResponse<KpiActivityChangeRequestResponse>,
    });

    const result = await activityApi.getRequestById('req-1');

    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-activity-requests/req-1');
    expect(result).toEqual(mockRequest);
  });

  it('propagates errors', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Not found'));
    await expect(activityApi.getRequestById('bad-id')).rejects.toThrow('Not found');
  });
});
