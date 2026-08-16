/**
 * usePositionData — loading & request-race guards.
 *
 * Proves:
 *   - a stale (slower) response never overwrites the result of a newer
 *     request, and never ends the newer request's loading state;
 *   - loading is active while a request is in flight and ends with the
 *     latest response.
 */
import { act, renderHook } from '@testing-library/react';
import { api } from '@/lib/axios';
import { usePositionData } from '../use-position-data';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type { Position } from '../../types';

jest.mock('@/lib/axios');
const mockedApi = jest.mocked(api);

// Stable searchParams reference — Next's useSearchParams returns a stable
// object per navigation; without this, the filters memo would change every
// render and refetch in a loop.
const searchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => searchParams,
}));

const wrap = <T,>(data: T): ApiResponse<T> => ({ status: 200, message: 'ok', data });

const positionA: Position = {
  id: 'pos-a', positionCode: 'A-001', positionName: 'Jabatan A',
  description: null, parentId: null, parentName: null, positionLevel: 1,
  organizationUnit: null, unitName: null, isActive: true, deletedAt: null,
  children: [], assignedUsers: [],
};
const positionB: Position = { ...positionA, id: 'pos-b', positionCode: 'B-001', positionName: 'Jabatan B' };

const pageOf = (content: Position[]): PaginatedResponse<Position> => ({
  content, page: 1, size: 10, totalElements: content.length, totalPages: 1, last: true,
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

describe('usePositionData — loading & request race', () => {
  it('drops stale responses and keeps the newest data + loading state', async () => {
    const slow = deferred<{ data: ApiResponse<PaginatedResponse<Position>> }>();
    let listCalls = 0;
    mockedApi.get.mockImplementation((url: string) => {
      if (String(url).includes('/tree')) {
        return Promise.resolve({ data: wrap({ tree: [] }) });
      }
      listCalls += 1;
      if (listCalls === 1) return slow.promise; // initial fetch — stays pending
      return Promise.resolve({ data: wrap(pageOf([positionB])) }); // refresh — fast
    });

    const { result } = renderHook(() => usePositionData());

    // Initial request in flight → loading on, no data yet.
    expect(result.current.isLoading).toBe(true);
    expect(result.current.positions).toEqual([]);

    // Newer request (refresh) resolves first.
    await act(async () => {
      await result.current.refreshTable();
    });
    expect(result.current.positions.map((p) => p.id)).toEqual(['pos-b']);
    expect(result.current.isLoading).toBe(false);

    // Stale initial response arrives late — must NOT overwrite newer data.
    await act(async () => {
      slow.resolve({ data: wrap(pageOf([positionA])) });
    });
    expect(result.current.positions.map((p) => p.id)).toEqual(['pos-b']);
    expect(result.current.isLoading).toBe(false);
  });

  it('keeps loading active until the latest request settles', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (String(url).includes('/tree')) {
        return Promise.resolve({ data: wrap({ tree: [] }) });
      }
      return Promise.resolve({ data: wrap(pageOf([positionA])) });
    });

    const { result } = renderHook(() => usePositionData());
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await result.current.refreshTable();
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.positions.map((p) => p.id)).toEqual(['pos-a']);
  });
});
