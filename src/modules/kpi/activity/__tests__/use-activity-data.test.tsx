/**
 * useActivityData tests — subordinates isolation and mutation classification.
 *
 * Proves:
 *   - `fetchSubordinatesActivities` always sends an explicit scope plus the
 *     acting Position, and switching Position replaces the list (data from
 *     one Position never mixes with another);
 *   - `submitCreateRequest`/`submitChangeRequest` classify recoverable
 *     conflicts (already-processed, version-conflict, duplicate-pending)
 *     instead of surfacing a generic error.
 */
import { act, renderHook } from '@testing-library/react';
import { api } from '@/lib/axios';
import { useActivityData } from '../use-activity-data';
import type { ApiResponse } from '@/types/api';
import type { KpiActivityResponse, KpiActivityChangeRequestResponse } from '../activity-v1.types';

jest.mock('@/lib/axios');
const mockedApi = jest.mocked(api);

const wrap = <T,>(data: T): ApiResponse<T> => ({ status: 200, message: 'ok', data });

const activityA: KpiActivityResponse = {
  id: 'act-a', parentId: null, parentActivityName: null,
  corporateKpiId: 'ck-1', corporateKpiName: 'CK', corporateKpiCode: 'C1',
  assignedToUserPositionId: 'up-a', assignedToUserName: 'A', assignedToPositionName: 'P-A',
  activityName: 'A', description: null, unit: '%', targetValue: 10,
  periodYear: 2026, periodMonth: 6, status: 'ACTIVE', realizedValue: 0,
  progressPercent: 0, version: 1, createdAt: '', updatedAt: '',
};

const activityB: KpiActivityResponse = {
  ...activityA,
  id: 'act-b', activityName: 'B', assignedToUserPositionId: 'up-b',
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

/** Axios-like rejection with a backend detail message. */
function backendError(detail: string) {
  return { response: { data: { detail } } };
}

describe('useActivityData — subordinates scope', () => {
  it('always sends scope=subordinates + actingPositionId and isolates data per Position', async () => {
    mockedApi.get
      .mockResolvedValueOnce({ data: wrap([activityA]) })
      .mockResolvedValueOnce({ data: wrap([activityB]) });

    const { result } = renderHook(() => useActivityData());

    await act(async () => {
      await result.current.fetchSubordinatesActivities('pos-A');
    });
    expect(mockedApi.get).toHaveBeenLastCalledWith('/api/v1/kpi-activities', {
      params: { scope: 'subordinates', actingPositionId: 'pos-A', page: 1, size: 100, sortBy: 'activityName', sortDirection: 'asc' },
    });
    expect(result.current.subordinatesActingPositionId).toBe('pos-A');
    expect(result.current.subordinatesActivities.map((a) => a.id)).toEqual(['act-a']);

    // Switching Position refetches and REPLACES the list — no mixing.
    await act(async () => {
      await result.current.fetchSubordinatesActivities('pos-B');
    });
    expect(mockedApi.get).toHaveBeenLastCalledWith('/api/v1/kpi-activities', {
      params: { scope: 'subordinates', actingPositionId: 'pos-B', page: 1, size: 100, sortBy: 'activityName', sortDirection: 'asc' },
    });
    expect(result.current.subordinatesActingPositionId).toBe('pos-B');
    expect(result.current.subordinatesActivities.map((a) => a.id)).toEqual(['act-b']);
    expect(result.current.subordinatesActivities.some((a) => a.id === 'act-a')).toBe(false);
  });
});

describe('useActivityData — server-side all activities pagination', () => {
  it('replaces rows and preserves filtered total metadata from the backend', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: wrap({
      content: [activityA], page: 2, size: 10, totalElements: 17, totalPages: 2, last: true,
    }) });

    const { result } = renderHook(() => useActivityData());
    await act(async () => {
      await result.current.fetchAllActivities({
        page: 2, size: 10, search: 'A', status: 'ACTIVE', sortBy: 'createdAt', sortDirection: 'desc',
      });
    });

    expect(mockedApi.get).toHaveBeenLastCalledWith('/api/v1/kpi-activities', {
      params: { scope: 'all', page: 2, size: 10, search: 'A', status: 'ACTIVE', sortBy: 'createdAt', sortDirection: 'desc' },
    });
    expect(result.current.allActivities.map((a) => a.id)).toEqual(['act-a']);
    expect(result.current.allPagination?.totalElements).toBe(17);
    expect(result.current.allPagination?.totalPages).toBe(2);
  });
});

describe('useActivityData — superior scope (self-child parent source)', () => {
  it('always sends scope=superior + actingPositionId and replaces data per Position', async () => {
    mockedApi.get
      .mockResolvedValueOnce({ data: wrap([activityA]) })
      .mockResolvedValueOnce({ data: wrap([activityB]) });

    const { result } = renderHook(() => useActivityData());

    await act(async () => {
      await result.current.fetchSuperiorActivities('pos-A');
    });
    expect(mockedApi.get).toHaveBeenLastCalledWith('/api/v1/kpi-activities', {
      params: { scope: 'superior', actingPositionId: 'pos-A', page: 1, size: 100, sortBy: 'activityName', sortDirection: 'asc' },
    });
    expect(result.current.superiorActivities.map((a) => a.id)).toEqual(['act-a']);

    // Switching Position refetches and REPLACES the list — no mixing.
    await act(async () => {
      await result.current.fetchSuperiorActivities('pos-B');
    });
    expect(result.current.superiorActivities.map((a) => a.id)).toEqual(['act-b']);
    expect(result.current.superiorActivities.some((a) => a.id === 'act-a')).toBe(false);
  });
});

describe('useActivityData — mutation classification (T4/T5)', () => {
  it('submitCreateRequest success returns success without a conflict', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: wrap(request) });
    const { result } = renderHook(() => useActivityData());
    const outcome = await act(async () => result.current.submitCreateRequest({
      assignedToUserPositionId: 'up-2',
      actingPositionId: 'pos-1',
      corporateKpiId: 'ck-1',
      periodYear: 2026,
      periodMonth: 6,
      activityName: 'A2',
      unit: '%',
      targetValue: 10,
    }));
    expect(outcome).toEqual({ success: true, conflict: null, message: null });
  });

  it('classifies an already-processed failure as a recoverable conflict', async () => {
    mockedApi.post.mockRejectedValueOnce(backendError('Request has already been processed'));
    const { result } = renderHook(() => useActivityData());
    const outcome = await act(async () => result.current.submitChangeRequest('act-1', {
      requestType: 'UPDATE',
      actingPositionId: 'pos-1',
      activityName: 'X',
      description: null,
      unit: '%',
      targetValue: 5,
    }));
    expect(outcome.success).toBe(false);
    expect(outcome.conflict?.kind).toBe('already-processed');
    expect(outcome.conflict?.refetch).toBe(true);
  });

  it('classifies a version conflict as recoverable', async () => {
    mockedApi.post.mockRejectedValueOnce(backendError('Activity was modified by another user'));
    const { result } = renderHook(() => useActivityData());
    const outcome = await act(async () => result.current.submitChangeRequest('act-1', {
      requestType: 'UPDATE',
      actingPositionId: 'pos-1',
      activityName: 'X',
      description: null,
      unit: '%',
      targetValue: 5,
    }));
    expect(outcome.conflict?.kind).toBe('version-conflict');
  });

  it('classifies a duplicate-pending failure as recoverable', async () => {
    mockedApi.post.mockRejectedValueOnce(backendError('A pending update or cancel request already exists'));
    const { result } = renderHook(() => useActivityData());
    const outcome = await act(async () => result.current.submitChangeRequest('act-1', {
      requestType: 'UPDATE',
      actingPositionId: 'pos-1',
      activityName: 'X',
      description: null,
      unit: '%',
      targetValue: 5,
    }));
    expect(outcome.conflict?.kind).toBe('duplicate-pending');
  });

  it('keeps generic failures as plain messages (no fabricated conflict)', async () => {
    mockedApi.post.mockRejectedValueOnce(backendError('Corporate KPI indicator is not active'));
    const { result } = renderHook(() => useActivityData());
    const outcome = await act(async () => result.current.submitCreateRequest({
      assignedToUserPositionId: 'up-2',
      actingPositionId: 'pos-1',
      corporateKpiId: 'ck-1',
      periodYear: 2026,
      periodMonth: 6,
      activityName: 'A2',
      unit: '%',
      targetValue: 10,
    }));
    expect(outcome.success).toBe(false);
    expect(outcome.conflict).toBeNull();
    expect(outcome.message).toContain('not active');
  });
});
