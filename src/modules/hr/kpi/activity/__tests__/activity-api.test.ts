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

/* ── P2.2 ── Assignable UserPositions ── */

describe('getAssignableUserPositionsForRoot', () => {
  it('calls GET /api/v1/kpi-activities/assignable-user-positions', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: [{ userPositionId: 'up-1', userId: 'u-1', userFullName: 'Test', positionId: 'p-1', positionName: 'Manager', isPrimary: true, isSelf: true }] },
    });
    const result = await activityApi.getAssignableUserPositionsForRoot();
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-activities/assignable-user-positions');
    expect(result).toHaveLength(1);
    expect(result[0].userFullName).toBe('Test');
  });
});

describe('getAssignableUserPositionsForChild', () => {
  it('calls GET /api/v1/kpi-activities/{parentId}/assignable-user-positions', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: [] },
    });
    const result = await activityApi.getAssignableUserPositionsForChild('parent-1');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-activities/parent-1/assignable-user-positions');
    expect(result).toEqual([]);
  });
});

/* ── P2.2 ── Root Create ── */

describe('submitRootCreate', () => {
  const payload = {
    corporateKpiId: 'ck-1',
    assignedToUserPositionId: 'up-1',
    activityName: 'Test Activity',
    unit: '%',
    targetValue: 15,
    periodYear: 2026,
    periodMonth: 3,
  };

  it('calls POST /api/v1/kpi-activity-requests/root-create with correct payload', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { status: 201, message: 'Created', data: { id: 'req-1', requestType: 'CREATE', status: 'PENDING' } },
    });
    const result = await activityApi.submitRootCreate(payload);
    expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/kpi-activity-requests/root-create', payload);
    expect(result.status).toBe('PENDING');
  });

  it('does not include parentActivityId in payload', () => {
    const keys = Object.keys(payload);
    expect(keys).not.toContain('parentActivityId');
  });
});

/* ── P2.2 ── Child Create ── */

describe('submitChildCreate', () => {
  const payload = {
    parentActivityId: 'parent-1',
    assignedToUserPositionId: 'up-2',
    activityName: 'Child Activity',
    unit: 'units',
    targetValue: 10,
  };

  it('calls POST /api/v1/kpi-activity-requests/child-create with correct payload', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { status: 201, message: 'Created', data: { id: 'req-2', requestType: 'CREATE', status: 'PENDING' } },
    });
    const result = await activityApi.submitChildCreate(payload);
    expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/kpi-activity-requests/child-create', payload);
    expect(result.status).toBe('PENDING');
  });

  it('excludes inherited fields corporateKpiId, periodYear, periodMonth', () => {
    const keys = Object.keys(payload);
    expect(keys).not.toContain('corporateKpiId');
    expect(keys).not.toContain('periodYear');
    expect(keys).not.toContain('periodMonth');
  });
});

/* ── P2.2 ── Update ── */

describe('submitUpdate', () => {
  const payload = {
    activityId: 'act-1',
    activityName: 'Updated Name',
    description: 'Updated description',
    unit: '%',
    targetValue: 20,
  };

  it('calls POST /api/v1/kpi-activity-requests/update with correct payload', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { status: 201, message: 'Created', data: { id: 'req-3', requestType: 'UPDATE', status: 'PENDING' } },
    });
    const result = await activityApi.submitUpdate(payload);
    expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/kpi-activity-requests/update', payload);
    expect(result.requestType).toBe('UPDATE');
  });

  it('excludes immutable fields', () => {
    const keys = Object.keys(payload);
    expect(keys).not.toContain('parentActivityId');
    expect(keys).not.toContain('corporateKpiId');
    expect(keys).not.toContain('assignedToUserPositionId');
    expect(keys).not.toContain('periodYear');
    expect(keys).not.toContain('periodMonth');
  });

  it('description is always sent as string', () => {
    expect(payload).toHaveProperty('description');
    expect(typeof payload.description).toBe('string');
  });
});

/* ── P2.2 ── Cancel ── */

describe('submitCancel', () => {
  const payload = { activityId: 'act-1', cancellationReason: 'No longer needed' };

  it('calls POST /api/v1/kpi-activity-requests/cancel with correct payload', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { status: 201, message: 'Created', data: { id: 'req-4', requestType: 'CANCEL', status: 'PENDING' } },
    });
    const result = await activityApi.submitCancel(payload);
    expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/kpi-activity-requests/cancel', payload);
    expect(result.requestType).toBe('CANCEL');
  });

  it('has exactly activityId and cancellationReason', () => {
    const keys = Object.keys(payload);
    expect(keys).toEqual(['activityId', 'cancellationReason']);
  });
});

/* ── P2.2 ── Error propagation ── */

describe('P2.2 error propagation', () => {
  it('submitRootCreate propagates errors', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('Corporate KPI must be an ACTIVE INDICATOR'));
    await expect(activityApi.submitRootCreate({
      corporateKpiId: 'bad', assignedToUserPositionId: 'up', activityName: 'x', unit: '%', targetValue: 1, periodYear: 2026, periodMonth: 1,
    })).rejects.toThrow('Corporate KPI must be an ACTIVE INDICATOR');
  });
});
