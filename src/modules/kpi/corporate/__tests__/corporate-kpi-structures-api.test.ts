/**
 * Corporate KPI structure API contract tests.
 * Verifies exact method/path, ApiResponse unwrapping, and error propagation
 * for the yearly lifecycle aggregate endpoints.
 */
import { api } from '@/lib/axios';
import { corporateKpiStructuresApi } from '../corporate-kpi-structures-api';
import type { ApiResponse } from '@/types/api';
import type { CorporateKpiStructure } from '../corporate-kpi.types';

jest.mock('@/lib/axios');
const mockedApi = jest.mocked(api);

const mockStructure: CorporateKpiStructure = {
  id: 'struct-2026',
  year: 2026,
  status: 'DRAFT',
  activatedAt: null,
  activatedBy: null,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
};

describe('corporateKpiStructuresApi.list', () => {
  it('calls GET /api/v1/corporate-kpi-structures and unwraps', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: [mockStructure] } satisfies ApiResponse<CorporateKpiStructure[]>,
    });

    const result = await corporateKpiStructuresApi.list();

    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/corporate-kpi-structures');
    expect(result).toEqual([mockStructure]);
  });

  it('propagates backend errors', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'));
    await expect(corporateKpiStructuresApi.list()).rejects.toThrow('Network Error');
  });
});

describe('corporateKpiStructuresApi.getById', () => {
  it('calls GET /api/v1/corporate-kpi-structures/{id}', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: mockStructure } satisfies ApiResponse<CorporateKpiStructure>,
    });

    const result = await corporateKpiStructuresApi.getById('struct-2026');

    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/corporate-kpi-structures/struct-2026');
    expect(result).toEqual(mockStructure);
  });
});

describe('corporateKpiStructuresApi.create', () => {
  it('POSTs {year} to /api/v1/corporate-kpi-structures', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { status: 201, message: 'OK', data: mockStructure } satisfies ApiResponse<CorporateKpiStructure>,
    });

    const result = await corporateKpiStructuresApi.create({ year: 2026 });

    expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/corporate-kpi-structures', { year: 2026 });
    expect(result).toEqual(mockStructure);
  });

  it('propagates backend errors', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('A Corporate KPI structure already exists for this year'));
    await expect(corporateKpiStructuresApi.create({ year: 2026 }))
      .rejects.toThrow('A Corporate KPI structure already exists for this year');
  });
});

describe('corporateKpiStructuresApi.changeStatus', () => {
  it('PATCHes /api/v1/corporate-kpi-structures/{id}/status', async () => {
    mockedApi.patch.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: { ...mockStructure, status: 'ACTIVE' } } satisfies ApiResponse<CorporateKpiStructure>,
    });

    const result = await corporateKpiStructuresApi.changeStatus('struct-2026', { status: 'ACTIVE' });

    expect(mockedApi.patch).toHaveBeenCalledWith('/api/v1/corporate-kpi-structures/struct-2026/status', { status: 'ACTIVE' });
    expect(result).toEqual(expect.objectContaining({ status: 'ACTIVE' }));
  });

  it('propagates backend errors', async () => {
    mockedApi.patch.mockRejectedValueOnce(new Error('Cannot activate the Corporate KPI structure'));
    await expect(corporateKpiStructuresApi.changeStatus('struct-2026', { status: 'ACTIVE' }))
      .rejects.toThrow('Cannot activate the Corporate KPI structure');
  });
});

describe('corporateKpiStructuresApi.deleteStructure', () => {
  it('PATCHes /api/v1/corporate-kpi-structures/{id}/delete', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { status: 200, message: 'Deleted' } });

    await corporateKpiStructuresApi.deleteStructure('struct-2026');

    expect(mockedApi.patch).toHaveBeenCalledWith('/api/v1/corporate-kpi-structures/struct-2026/delete');
  });
});

describe('corporateKpiStructuresApi.restoreStructure', () => {
  it('POSTs /api/v1/corporate-kpi-structures/{id}/restore', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: mockStructure } satisfies ApiResponse<CorporateKpiStructure>,
    });

    const result = await corporateKpiStructuresApi.restoreStructure('struct-2026');

    expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/corporate-kpi-structures/struct-2026/restore');
    expect(result).toEqual(mockStructure);
  });
});
