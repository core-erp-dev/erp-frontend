/**
 * Unit Performance API contract tests.
 * Verifies exact method/path, ApiResponse unwrapping, and the monthly/yearly
 * parameter shape (month omitted = yearly, month present = monthly).
 */
import { api } from '@/lib/axios';
import { unitPerformanceApi } from '../unit-performance-api';
import type { ApiResponse } from '@/types/api';
import type { UnitPerformanceRow } from '../unit-performance.types';

jest.mock('@/lib/axios');
const mockedApi = jest.mocked(api);

const row: UnitPerformanceRow = {
  id: 'up-1',
  organizationUnitId: 'ou-1',
  unitCode: 'U1',
  unitName: 'Umum & Administrasi',
  weight: 30,
  realization: 15,
  performance: 50,
  status: 'OK',
};

describe('getPerformance', () => {
  it('calls GET with year only for the yearly view (month omitted)', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: [row] } satisfies ApiResponse<UnitPerformanceRow[]>,
    });

    const result = await unitPerformanceApi.getPerformance(2026);

    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/unit-performances', {
      params: { year: 2026 },
    });
    expect(result).toEqual([row]);
  });

  it('adds the month parameter for the monthly view', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: [row] } satisfies ApiResponse<UnitPerformanceRow[]>,
    });

    await unitPerformanceApi.getPerformance(2026, 6);

    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/unit-performances', {
      params: { year: 2026, month: 6 },
    });
  });
});

describe('create', () => {
  it('POSTs organizationUnitId + weight (percentage points)', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { status: 201, message: 'OK', data: row } satisfies ApiResponse<UnitPerformanceRow>,
    });

    const result = await unitPerformanceApi.create({ organizationUnitId: 'ou-1', weight: 30 });

    expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/unit-performances', {
      organizationUnitId: 'ou-1',
      weight: 30,
    });
    expect(result).toEqual(row);
  });
});

describe('update', () => {
  it('PUTs weight only (unit identity comes from the config row)', async () => {
    mockedApi.put.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: row } satisfies ApiResponse<UnitPerformanceRow>,
    });

    const result = await unitPerformanceApi.update('up-1', { weight: 35 });

    expect(mockedApi.put).toHaveBeenCalledWith('/api/v1/unit-performances/up-1', { weight: 35 });
    expect(result).toEqual(row);
  });
});

describe('delete', () => {
  it('PATCHes the soft-delete endpoint', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { status: 200, message: 'OK', data: null } });

    await unitPerformanceApi.delete('up-1');

    expect(mockedApi.patch).toHaveBeenCalledWith('/api/v1/unit-performances/up-1/delete');
  });
});
