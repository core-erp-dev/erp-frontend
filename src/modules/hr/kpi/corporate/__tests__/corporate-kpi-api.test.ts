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

/* ── create ── */

describe('create', () => {
  it('calls POST /api/v1/corporate-kpis with Aspect payload', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { status: 201, message: 'OK', data: mockNode } satisfies ApiResponse<CorporateKpiNode>,
    });

    const result = await corporateKpiApi.create({
      code: 'FIN',
      name: 'Financial',
      nodeType: 'ASPECT',
      year: 2026,
      parentId: null,
      unit: null,
      targetValue: null,
      description: null,
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/corporate-kpis', {
      code: 'FIN',
      name: 'Financial',
      nodeType: 'ASPECT',
      year: 2026,
      parentId: null,
      unit: null,
      targetValue: null,
      description: null,
    });
    expect(result).toEqual(mockNode);
  });

  it('calls POST with Indicator payload including parent/unit/target', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { status: 201, message: 'OK', data: { ...mockNode, id: 'ind-1', nodeType: 'INDICATOR' as const } } satisfies ApiResponse<CorporateKpiNode>,
    });

    const result = await corporateKpiApi.create({
      code: 'F01',
      name: 'Revenue',
      nodeType: 'INDICATOR',
      year: 2026,
      parentId: 'asp-1',
      unit: '%',
      targetValue: 10.5,
      description: null,
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/corporate-kpis', {
      code: 'F01',
      name: 'Revenue',
      nodeType: 'INDICATOR',
      year: 2026,
      parentId: 'asp-1',
      unit: '%',
      targetValue: 10.5,
      description: null,
    });
    expect(result).toEqual(expect.objectContaining({ id: 'ind-1' }));
  });

  it('unwraps ApiResponse.data', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { status: 201, message: 'OK', data: mockNode } satisfies ApiResponse<CorporateKpiNode>,
    });
    const result = await corporateKpiApi.create({
      code: 'FIN', name: 'Financial', nodeType: 'ASPECT', year: 2026,
      parentId: null, unit: null, targetValue: null, description: null,
    });
    expect(result).toEqual(mockNode);
  });

  it('propagates backend errors', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('Code already exists'));
    await expect(corporateKpiApi.create({
      code: 'FIN', name: 'Financial', nodeType: 'ASPECT', year: 2026,
      parentId: null, unit: null, targetValue: null, description: null,
    })).rejects.toThrow('Code already exists');
  });
});

/* ── update ── */

describe('update', () => {
  it('calls PUT /api/v1/corporate-kpis/{id} with Aspect payload', async () => {
    mockedApi.put.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: mockNode } satisfies ApiResponse<CorporateKpiNode>,
    });

    const result = await corporateKpiApi.update('asp-1', {
      code: 'FIN',
      name: 'Financial',
      parentId: null,
      unit: null,
      targetValue: null,
      description: null,
    });

    expect(mockedApi.put).toHaveBeenCalledWith('/api/v1/corporate-kpis/asp-1', {
      code: 'FIN',
      name: 'Financial',
      parentId: null,
      unit: null,
      targetValue: null,
      description: null,
    });
    expect(result).toEqual(mockNode);
  });

  it('excludes nodeType and year from update payload', async () => {
    mockedApi.put.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: mockNode } satisfies ApiResponse<CorporateKpiNode>,
    });

    const payload = {
      code: 'FIN',
      name: 'Financial',
      parentId: null,
      unit: null,
      targetValue: null,
      description: null,
    };
    await corporateKpiApi.update('asp-1', payload);

    // Verify nodeType and year are NOT sent
    const callArg = mockedApi.put.mock.calls[0][1] as Record<string, unknown>;
    expect(callArg).not.toHaveProperty('nodeType');
    expect(callArg).not.toHaveProperty('year');
  });

  it('propagates backend errors', async () => {
    mockedApi.put.mockRejectedValueOnce(new Error('Not found'));
    await expect(corporateKpiApi.update('bad-id', { code: 'X', name: 'X', parentId: null, unit: null, targetValue: null, description: null })).rejects.toThrow('Not found');
  });
});

/* ── lifecycle ── */

describe('changeStatus', () => {
  it('calls PATCH /api/v1/corporate-kpis/{id}/status', async () => {
    mockedApi.patch.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: mockNode } satisfies ApiResponse<CorporateKpiNode>,
    });
    const result = await corporateKpiApi.changeStatus('asp-1', { status: 'ACTIVE' });
    expect(mockedApi.patch).toHaveBeenCalledWith('/api/v1/corporate-kpis/asp-1/status', { status: 'ACTIVE' });
    expect(result).toEqual(mockNode);
  });

  it('propagates backend errors', async () => {
    mockedApi.patch.mockRejectedValueOnce(new Error('Cannot activate'));
    await expect(corporateKpiApi.changeStatus('bad-id', { status: 'ACTIVE' })).rejects.toThrow('Cannot activate');
  });
});

describe('deleteNode', () => {
  it('calls PATCH /api/v1/corporate-kpis/{id}/delete', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { status: 200, message: 'Deleted' } });
    await corporateKpiApi.deleteNode('asp-1');
    expect(mockedApi.patch).toHaveBeenCalledWith('/api/v1/corporate-kpis/asp-1/delete');
  });
});

describe('restoreNode', () => {
  it('calls POST /api/v1/corporate-kpis/{id}/restore', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: mockNode } satisfies ApiResponse<CorporateKpiNode>,
    });
    const result = await corporateKpiApi.restoreNode('asp-1');
    expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/corporate-kpis/asp-1/restore');
    expect(result).toEqual(mockNode);
  });
});
