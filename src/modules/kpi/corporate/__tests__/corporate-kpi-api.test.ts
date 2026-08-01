/**
 * Corporate KPI API contract tests — configuration aggregate (WP6).
 * Verifies exact method/path/params, ApiResponse unwrapping, version-bearing
 * mutations, and error propagation.
 */
import { api } from '@/lib/axios';
import { corporateKpiApi, isVersionConflict } from '../corporate-kpi-api';
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
  displayOrder: null,
  weight: null,
  targetScore: null,
  formulaExpression: null,
  configurationId: 'cfg-1',
  configurationStatus: 'ACTIVE',
  recordingStatus: 'OPEN',
  status: 'ACTIVE',
  description: null,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
  children: [],
};

const mockSummary = {
  id: 'cfg-1', year: 2026, configurationStatus: 'DRAFT' as const, recordingStatus: 'OPEN' as const,
  version: 3, closedAt: null, closedBy: null, deletedAt: null, createdAt: '', updatedAt: '',
};

/* ── getTreeByYear (kept for the Activity selector) ── */

describe('getTreeByYear', () => {
  it('calls GET /api/v1/corporate-kpis/tree with year parameter', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: [mockNode] } satisfies ApiResponse<CorporateKpiNode[]>,
    });
    const result = await corporateKpiApi.getTreeByYear(2026);
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/corporate-kpis/tree', { params: { year: 2026 } });
    expect(result).toEqual([mockNode]);
  });
});

/* ── getDeleted (paginated) ── */

describe('getDeleted', () => {
  it('calls GET /api/v1/corporate-kpis/deleted with pagination params', async () => {
    const payload: ApiResponse<{ content: CorporateKpiNode[]; pageNumber: number; pageSize: number; totalElements: number; totalPages: number; first: boolean; last: boolean }> = {
      status: 200, message: 'OK',
      data: { content: [mockNode], pageNumber: 1, pageSize: 10, totalElements: 1, totalPages: 1, first: true, last: true },
    };
    mockedApi.get.mockResolvedValueOnce({ data: payload });
    const result = await corporateKpiApi.getDeleted({ page: 2, size: 25, search: 'FIN' });
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/corporate-kpis/deleted', { params: { page: 2, size: 25, search: 'FIN' } });
    expect(result.content).toEqual([mockNode]);
    expect(result.totalElements).toBe(1);
  });
});

/* ── configuration aggregate ── */

describe('createConfiguration', () => {
  it('calls POST /api/v1/corporate-kpis/configurations', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { status: 201, message: 'OK', data: mockSummary } satisfies ApiResponse<typeof mockSummary>,
    });
    const result = await corporateKpiApi.createConfiguration({ year: 2026, cloneFromYear: 2025 });
    expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/corporate-kpis/configurations', { year: 2026, cloneFromYear: 2025 });
    expect(result).toEqual(mockSummary);
  });
});

describe('listConfigurations', () => {
  it('calls GET with optional year', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { status: 200, message: 'OK', data: [mockSummary] } });
    await corporateKpiApi.listConfigurations(2026);
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/corporate-kpis/configurations', { params: { year: 2026 } });

    mockedApi.get.mockResolvedValueOnce({ data: { status: 200, message: 'OK', data: [] } });
    await corporateKpiApi.listConfigurations();
    expect(mockedApi.get).toHaveBeenLastCalledWith('/api/v1/corporate-kpis/configurations', { params: {} });
  });
});

describe('applyDefinition', () => {
  it('calls PUT /api/v1/corporate-kpis/configurations/{id}/definition with version', async () => {
    const payload = {
      version: 3,
      aspects: [],
      variables: [],
      scoreBands: [],
      performanceBands: [],
      removedEntityIds: ['node-1'],
    };
    mockedApi.put.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: { configurationId: 'cfg-1', version: 4, idMapping: { 'ind-1': 'uuid-1' } } },
    });
    const result = await corporateKpiApi.applyDefinition('cfg-1', payload);
    expect(mockedApi.put).toHaveBeenCalledWith('/api/v1/corporate-kpis/configurations/cfg-1/definition', payload);
    expect(result.version).toBe(4);
    expect(result.idMapping['ind-1']).toBe('uuid-1');
  });
});

describe('activate / deleteNode (version as query param)', () => {
  it('calls POST activate with version param', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: { configurationId: 'cfg-1', version: 4, configurationStatus: 'ACTIVE', recordingStatus: 'OPEN' } },
    });
    await corporateKpiApi.activate('cfg-1', 3);
    expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/corporate-kpis/configurations/cfg-1/activate', null, { params: { version: 3 } });
  });

  it('calls DELETE node with version param', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: { status: 200, message: 'OK', data: {} } });
    await corporateKpiApi.deleteNode('cfg-1', 'node-1', 4);
    expect(mockedApi.delete).toHaveBeenCalledWith('/api/v1/corporate-kpis/configurations/cfg-1/nodes/node-1', { params: { version: 4 } });
  });

  it('calls POST restore with version param', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: { node: mockNode, configurationId: 'cfg-1', version: 5 } },
    });
    const result = await corporateKpiApi.restoreNode('node-1', 4);
    expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/corporate-kpis/node-1/restore', null, { params: { version: 4 } });
    expect(result.version).toBe(5);
  });
});

describe('close / reopen (version in body)', () => {
  it('calls POST close with version + reason', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { status: 200, message: 'OK', data: {} } });
    await corporateKpiApi.close('cfg-1', { version: 4, reason: 'year done' });
    expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/corporate-kpis/configurations/cfg-1/close', { version: 4, reason: 'year done' });
  });

  it('calls POST reopen with version + reason', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { status: 200, message: 'OK', data: {} } });
    await corporateKpiApi.reopen('cfg-1', { version: 5, reason: 'correction' });
    expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/corporate-kpis/configurations/cfg-1/reopen', { version: 5, reason: 'correction' });
  });
});

describe('values / results / history', () => {
  it('calls PUT values/{month} with version + entries', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { status: 200, message: 'OK', data: {} } });
    await corporateKpiApi.upsertValues('cfg-1', 3, {
      version: 6,
      entries: [{ variableCode: 'NET_INCOME', value: 252 }],
    });
    expect(mockedApi.put).toHaveBeenCalledWith('/api/v1/corporate-kpis/configurations/cfg-1/values/3', {
      version: 6,
      entries: [{ variableCode: 'NET_INCOME', value: 252 }],
    });
  });

  it('calls GET results with exclusive window params', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { status: 200, message: 'OK', data: { indicators: [] } } });
    await corporateKpiApi.getResults('cfg-1', { fromMonth: 1, toMonth: 12 });
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/corporate-kpis/configurations/cfg-1/results', {
      params: { fromMonth: 1, toMonth: 12 },
    });
  });

  it('calls GET history', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { status: 200, message: 'OK', data: [] } });
    await corporateKpiApi.getHistory('cfg-1');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/corporate-kpis/configurations/cfg-1/history');
  });
});

/* ── 409 detection ── */

describe('isVersionConflict', () => {
  it('returns true only for HTTP 409', () => {
    expect(isVersionConflict({ response: { status: 409 } })).toBe(true);
    expect(isVersionConflict({ response: { status: 400 } })).toBe(false);
    expect(isVersionConflict(new Error('Network'))).toBe(false);
    expect(isVersionConflict(null)).toBe(false);
  });
});
