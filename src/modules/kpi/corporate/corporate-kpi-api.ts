import { api } from '@/lib/axios';
import { extractErrorMessage } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import type {
  CloseConfigurationRequest,
  CorporateConfigurationDefinition,
  CorporateConfigurationSummary,
  CorporateKpiHistoryEntry,
  CorporateKpiNode,
  CorporateKpiResultResponse,
  CreateConfigurationRequest,
  DefinitionApplyRequest,
  DefinitionApplyResult,
  MutationResult,
  NodeRestoreResult,
  Paginated,
  ReopenConfigurationRequest,
  VariableValueUpsertRequest,
} from './corporate-kpi.types';

/**
 * Corporate KPI API — configuration aggregate (WP6). The legacy node CRUD was
 * replaced by the annual configuration surface; `/tree` remains as the light
 * selector for KPI Activities.
 */
export const corporateKpiApi = {
  /* ── Legacy read surface (Activity selector + recycle bin) ── */

  getTreeByYear: async (year: number): Promise<CorporateKpiNode[]> => {
    const response = await api.get<ApiResponse<CorporateKpiNode[]>>(
      '/api/v1/corporate-kpis/tree',
      { params: { year } },
    );
    return response.data.data;
  },

  getDeleted: async (params: {
    year?: number;
    type?: string;
    search?: string;
    page?: number;
    size?: number;
  }): Promise<Paginated<CorporateKpiNode>> => {
    const response = await api.get<ApiResponse<Paginated<CorporateKpiNode>>>(
      '/api/v1/corporate-kpis/deleted',
      { params },
    );
    return response.data.data;
  },

  /* ── Configuration aggregate ── */

  createConfiguration: async (
    payload: CreateConfigurationRequest,
  ): Promise<CorporateConfigurationSummary> => {
    const response = await api.post<ApiResponse<CorporateConfigurationSummary>>(
      '/api/v1/corporate-kpis/configurations',
      payload,
    );
    return response.data.data;
  },

  listConfigurations: async (year?: number): Promise<CorporateConfigurationSummary[]> => {
    const response = await api.get<ApiResponse<CorporateConfigurationSummary[]>>(
      '/api/v1/corporate-kpis/configurations',
      { params: year != null ? { year } : {} },
    );
    return response.data.data;
  },

  getConfiguration: async (id: string): Promise<CorporateConfigurationDefinition> => {
    const response = await api.get<ApiResponse<CorporateConfigurationDefinition>>(
      `/api/v1/corporate-kpis/configurations/${id}`,
    );
    return response.data.data;
  },

  applyDefinition: async (
    id: string,
    payload: DefinitionApplyRequest,
  ): Promise<DefinitionApplyResult> => {
    const response = await api.put<ApiResponse<DefinitionApplyResult>>(
      `/api/v1/corporate-kpis/configurations/${id}/definition`,
      payload,
    );
    return response.data.data;
  },

  deleteNode: async (
    configurationId: string,
    nodeId: string,
    version: number,
  ): Promise<MutationResult> => {
    const response = await api.delete<ApiResponse<MutationResult>>(
      `/api/v1/corporate-kpis/configurations/${configurationId}/nodes/${nodeId}`,
      { params: { version } },
    );
    return response.data.data;
  },

  activate: async (configurationId: string, version: number): Promise<MutationResult> => {
    const response = await api.post<ApiResponse<MutationResult>>(
      `/api/v1/corporate-kpis/configurations/${configurationId}/activate`,
      null,
      { params: { version } },
    );
    return response.data.data;
  },

  close: async (configurationId: string, payload: CloseConfigurationRequest): Promise<MutationResult> => {
    const response = await api.post<ApiResponse<MutationResult>>(
      `/api/v1/corporate-kpis/configurations/${configurationId}/close`,
      payload,
    );
    return response.data.data;
  },

  reopen: async (configurationId: string, payload: ReopenConfigurationRequest): Promise<MutationResult> => {
    const response = await api.post<ApiResponse<MutationResult>>(
      `/api/v1/corporate-kpis/configurations/${configurationId}/reopen`,
      payload,
    );
    return response.data.data;
  },

  restoreNode: async (nodeId: string, version: number): Promise<NodeRestoreResult> => {
    const response = await api.post<ApiResponse<NodeRestoreResult>>(
      `/api/v1/corporate-kpis/${nodeId}/restore`,
      null,
      { params: { version } },
    );
    return response.data.data;
  },

  /* ── Values / results / history ── */

  upsertValues: async (
    configurationId: string,
    month: number,
    payload: VariableValueUpsertRequest,
  ): Promise<MutationResult> => {
    const response = await api.put<ApiResponse<MutationResult>>(
      `/api/v1/corporate-kpis/configurations/${configurationId}/values/${month}`,
      payload,
    );
    return response.data.data;
  },

  getValues: async (
    configurationId: string,
    month: number,
  ): Promise<{ month: number; version: number; entries: { variableCode: string; value: number | null }[] }> => {
    const response = await api.get<ApiResponse<{ month: number; version: number; entries: { variableCode: string; value: number | null }[] }>>(
      `/api/v1/corporate-kpis/configurations/${configurationId}/values/${month}`,
    );
    return response.data.data;
  },

  getResults: async (
    configurationId: string,
    params: { month?: number; fromMonth?: number; toMonth?: number },
  ): Promise<CorporateKpiResultResponse> => {
    const response = await api.get<ApiResponse<CorporateKpiResultResponse>>(
      `/api/v1/corporate-kpis/configurations/${configurationId}/results`,
      { params },
    );
    return response.data.data;
  },

  getHistory: async (configurationId: string): Promise<CorporateKpiHistoryEntry[]> => {
    const response = await api.get<ApiResponse<CorporateKpiHistoryEntry[]>>(
      `/api/v1/corporate-kpis/configurations/${configurationId}/history`,
    );
    return response.data.data;
  },
};

/** Is this error a 409 optimistic-locking conflict (stale version)? */
export function isVersionConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 409
  );
}

/** Read-error wrapper. */
export function extractKpiError(error: unknown): string {
  return extractErrorMessage(error, 'Failed to load Corporate KPIs.');
}
