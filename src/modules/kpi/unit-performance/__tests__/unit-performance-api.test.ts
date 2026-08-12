/**
 * Unit Performance API contract tests.
 * Verifies exact method/path for the computed rows, the participant registry
 * (create WITHOUT a global weight), and the central weight-matrix endpoints
 * (GET ?year= and atomic PUT ?year=).
 */
import { api } from '@/lib/axios';
import { unitPerformanceApi } from '../unit-performance-api';
import type { ApiResponse } from '@/types/api';
import type { UnitPerformanceRow, UnitPerformanceWeightMatrix } from '../unit-performance.types';

jest.mock('@/lib/axios');
const mockedApi = jest.mocked(api);

const row: UnitPerformanceRow = {
  id: 'up-1',
  organizationUnitId: 'ou-1',
  unitCode: 'U1',
  unitName: 'Umum & Administrasi',
  weight: null,
  realization: 15,
  performance: 50,
  status: 'OK',
};

const matrix: UnitPerformanceWeightMatrix = {
  year: 2026,
  units: [{ id: 'up-1', organizationUnitId: 'ou-1', unitCode: 'U1', unitName: 'Umum' }],
  indicators: [{ id: 'ind-1', code: 'IND_01', name: 'ROE', aspectName: 'ASP_01' }],
  weights: [{ indicatorId: 'ind-1', unitPerformanceId: 'up-1', weight: 100 }],
  totals: { 'ind-1': 100 },
  complete: true,
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
  it('POSTs organizationUnitId only — no global weight', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { status: 201, message: 'OK', data: row } satisfies ApiResponse<UnitPerformanceRow>,
    });

    const result = await unitPerformanceApi.create({ organizationUnitId: 'ou-1' });

    expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/unit-performances', {
      organizationUnitId: 'ou-1',
    });
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

describe('weight matrix', () => {
  it('GETs the matrix for the year', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: matrix } satisfies ApiResponse<UnitPerformanceWeightMatrix>,
    });

    const result = await unitPerformanceApi.getWeightMatrix(2026);

    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/unit-performances/weight-matrix', {
      params: { year: 2026 },
    });
    expect(result).toEqual(matrix);
  });

  it('PUTs the whole matrix for the year', async () => {
    mockedApi.put.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: matrix } satisfies ApiResponse<UnitPerformanceWeightMatrix>,
    });

    const payload = { weights: [{ indicatorId: 'ind-1', unitPerformanceId: 'up-1', weight: 100 }] };
    const result = await unitPerformanceApi.saveWeightMatrix(2026, payload);

    expect(mockedApi.put).toHaveBeenCalledWith(
      '/api/v1/unit-performances/weight-matrix',
      payload,
      { params: { year: 2026 } },
    );
    expect(result).toEqual(matrix);
  });
});
