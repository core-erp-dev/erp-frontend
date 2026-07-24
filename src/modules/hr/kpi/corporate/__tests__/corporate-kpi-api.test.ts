/**
 * Corporate KPI API contract tests — P1.1 read-only methods.
 * Verifies exact method/path, ApiResponse unwrapping, and error propagation.
 */
import { api } from '@/lib/axios';
import { corporateKpiApi } from '../corporate-kpi-api';
import type { ApiResponse } from '@/types/api';
import type { CorporateKpiNode } from '../corporate-kpi.types';

jest.mock('@/lib/axios');
const mockedApi = jest.mocked(api);

/* ── Sample data ── */

const mockNode: CorporateKpiNode = {
  id: 'a1b2c3d4-...',
  parentId: null,
  parentName: null,
  code: 'FIN',
  name: 'Financial',
  nodeType: 'ASPECT',
  year: 2026,
  unit: null,
  targetValue: null,
  status: 'ACTIVE',
  description: null,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
  children: [],
};

/* ── getTreeByYear ── */

describe('getTreeByYear', () => {
  it('calls GET /api/v1/corporate-kpis/tree with year parameter', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: [mockNode] } satisfies ApiResponse<CorporateKpiNode[]>,
    });

    const result = await corporateKpiApi.getTreeByYear(2026);

    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/corporate-kpis/tree', {
      params: { year: 2026 },
    });
    expect(result).toEqual([mockNode]);
  });

  it('unwraps ApiResponse.data', async () => {
    const payload: ApiResponse<CorporateKpiNode[]> = {
      status: 200,
      message: 'KPIs fetched',
      data: [mockNode],
    };
    mockedApi.get.mockResolvedValueOnce({ data: payload });

    const result = await corporateKpiApi.getTreeByYear(2026);

    expect(result).toEqual([mockNode]);
  });

  it('propagates backend errors', async () => {
    const error = new Error('Network Error');
    mockedApi.get.mockRejectedValueOnce(error);

    await expect(corporateKpiApi.getTreeByYear(2026)).rejects.toThrow('Network Error');
  });
});

/* ── getDeleted ── */

describe('getDeleted', () => {
  it('calls GET /api/v1/corporate-kpis/deleted', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: [mockNode] } satisfies ApiResponse<CorporateKpiNode[]>,
    });

    const result = await corporateKpiApi.getDeleted();

    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/corporate-kpis/deleted');
    expect(result).toEqual([mockNode]);
  });

  it('unwraps ApiResponse.data', async () => {
    const payload: ApiResponse<CorporateKpiNode[]> = {
      status: 200,
      message: 'OK',
      data: [mockNode],
    };
    mockedApi.get.mockResolvedValueOnce({ data: payload });

    const result = await corporateKpiApi.getDeleted();

    expect(result).toEqual([mockNode]);
  });

  it('propagates backend errors', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Not found'));

    await expect(corporateKpiApi.getDeleted()).rejects.toThrow('Not found');
  });
});

/* ── No unsupported methods ── */

it('does not implement getById', () => {
  expect((corporateKpiApi as Record<string, unknown>).getById).toBeUndefined();
});

it('does not implement create, update, delete, restore, changeStatus', () => {
  const apiObj = corporateKpiApi as Record<string, unknown>;
  expect(apiObj.create).toBeUndefined();
  expect(apiObj.update).toBeUndefined();
  expect(apiObj.delete).toBeUndefined();
  expect(apiObj.restore).toBeUndefined();
  expect(apiObj.changeStatus).toBeUndefined();
});
