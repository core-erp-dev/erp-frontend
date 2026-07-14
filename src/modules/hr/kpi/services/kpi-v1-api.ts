import { api } from '@/lib/axios';
import {
  ApiResponse,
  PaginatedResponse,
  CorporateKpiResponse,
  CreateCorporateKpiRequest,
  UpdateCorporateKpiRequest,
  KpiTaskResponse,
  CreateTaskChangeRequest,
  UpdateTaskChangeRequest,
  DeleteTaskChangeRequest,
  TaskFilterParams,
  KpiTaskChangeRequestResponse,
  TaskChangeApprovalRequest,
  KpiReportResponse,
  CreateKpiReportRequest,
  UpdateKpiReportRequest,
  ReportApprovalRequest,
  ReportAmendRequest,
  KpiReportApprovalResponse,
  KpiPendingCountResponse,
  ReportFilterParams,
  KpiDashboardResponse,
  DashboardFilterParams,
  AssignableUserPosition,
} from '../types';

// ============================================================================
// Corporate KPI
// ============================================================================

export const corporateKpiApi = {
  getAll: async (periodYear?: number): Promise<CorporateKpiResponse[]> => {
    const response = await api.get<ApiResponse<CorporateKpiResponse[]>>(
      '/api/v1/kpi/corporate',
      { params: { periodYear } },
    );
    return response.data.data;
  },

  getTree: async (periodYear?: number): Promise<CorporateKpiResponse[]> => {
    const response = await api.get<ApiResponse<CorporateKpiResponse[]>>(
      '/api/v1/kpi/corporate/tree',
      { params: { periodYear } },
    );
    return response.data.data;
  },

  getById: async (id: string): Promise<CorporateKpiResponse> => {
    const response = await api.get<ApiResponse<CorporateKpiResponse>>(
      `/api/v1/kpi/corporate/${id}`,
    );
    return response.data.data;
  },

  create: async (data: CreateCorporateKpiRequest): Promise<CorporateKpiResponse> => {
    const response = await api.post<ApiResponse<CorporateKpiResponse>>(
      '/api/v1/kpi/corporate',
      data,
    );
    return response.data.data;
  },

  update: async (id: string, data: UpdateCorporateKpiRequest): Promise<CorporateKpiResponse> => {
    const response = await api.put<ApiResponse<CorporateKpiResponse>>(
      `/api/v1/kpi/corporate/${id}`,
      data,
    );
    return response.data.data;
  },

  softDelete: async (id: string): Promise<void> => {
    await api.patch(`/api/v1/kpi/corporate/${id}/delete`);
  },

  restore: async (id: string): Promise<CorporateKpiResponse> => {
    const response = await api.post<ApiResponse<CorporateKpiResponse>>(
      `/api/v1/kpi/corporate/${id}/restore`,
    );
    return response.data.data;
  },

  activate: async (id: string): Promise<CorporateKpiResponse> => {
    const response = await api.patch<ApiResponse<CorporateKpiResponse>>(
      `/api/v1/kpi/corporate/${id}/activate`,
    );
    return response.data.data;
  },
};

// ============================================================================
// KPI Tasks
// ============================================================================

export const kpiTaskApi = {
  getTasks: async (params?: TaskFilterParams): Promise<PaginatedResponse<KpiTaskResponse>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<KpiTaskResponse>>>(
      '/api/v1/kpi/tasks',
      { params },
    );
    return response.data.data;
  },

  getById: async (id: string): Promise<KpiTaskResponse> => {
    const response = await api.get<ApiResponse<KpiTaskResponse>>(
      `/api/v1/kpi/tasks/${id}`,
    );
    return response.data.data;
  },

  getSubordinates: async (id: string): Promise<KpiTaskResponse[]> => {
    const response = await api.get<ApiResponse<KpiTaskResponse[]>>(
      `/api/v1/kpi/tasks/${id}/subordinates`,
    );
    return response.data.data;
  },

  submitCreateRequest: async (data: CreateTaskChangeRequest): Promise<KpiTaskChangeRequestResponse> => {
    const response = await api.post<ApiResponse<KpiTaskChangeRequestResponse>>(
      '/api/v1/kpi/tasks/create-requests',
      data,
    );
    return response.data.data;
  },

  submitUpdateRequest: async (id: string, data: UpdateTaskChangeRequest): Promise<KpiTaskChangeRequestResponse> => {
    const response = await api.post<ApiResponse<KpiTaskChangeRequestResponse>>(
      `/api/v1/kpi/tasks/${id}/update-requests`,
      data,
    );
    return response.data.data;
  },

  submitDeleteRequest: async (id: string, data: DeleteTaskChangeRequest): Promise<KpiTaskChangeRequestResponse> => {
    const response = await api.post<ApiResponse<KpiTaskChangeRequestResponse>>(
      `/api/v1/kpi/tasks/${id}/delete-requests`,
      data,
    );
    return response.data.data;
  },
};

// ============================================================================
// Task Change Requests
// ============================================================================

export const taskChangeRequestApi = {
  list: async (
    status?: string,
    page = 1,
    size = 10,
  ): Promise<PaginatedResponse<KpiTaskChangeRequestResponse>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<KpiTaskChangeRequestResponse>>>(
      '/api/v1/kpi/task-change-requests',
      { params: { status, page, size } },
    );
    return response.data.data;
  },

  getById: async (id: string): Promise<KpiTaskChangeRequestResponse> => {
    const response = await api.get<ApiResponse<KpiTaskChangeRequestResponse>>(
      `/api/v1/kpi/task-change-requests/${id}`,
    );
    return response.data.data;
  },

  approve: async (id: string, data: TaskChangeApprovalRequest): Promise<KpiTaskChangeRequestResponse> => {
    const response = await api.patch<ApiResponse<KpiTaskChangeRequestResponse>>(
      `/api/v1/kpi/task-change-requests/${id}/approve`,
      data,
    );
    return response.data.data;
  },

  reject: async (id: string, data: TaskChangeApprovalRequest): Promise<KpiTaskChangeRequestResponse> => {
    const response = await api.patch<ApiResponse<KpiTaskChangeRequestResponse>>(
      `/api/v1/kpi/task-change-requests/${id}/reject`,
      data,
    );
    return response.data.data;
  },
};

// ============================================================================
// KPI Reports
// ============================================================================

export const kpiReportApi = {
  getReports: async (params?: ReportFilterParams): Promise<PaginatedResponse<KpiReportResponse>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<KpiReportResponse>>>(
      '/api/v1/kpi/reports',
      { params },
    );
    return response.data.data;
  },

  getById: async (id: string): Promise<KpiReportResponse> => {
    const response = await api.get<ApiResponse<KpiReportResponse>>(
      `/api/v1/kpi/reports/${id}`,
    );
    return response.data.data;
  },

  getPendingCount: async (): Promise<KpiPendingCountResponse> => {
    const response = await api.get<ApiResponse<KpiPendingCountResponse>>(
      '/api/v1/kpi/reports/pending-count',
    );
    return response.data.data;
  },

  create: async (data: CreateKpiReportRequest): Promise<KpiReportResponse> => {
    const response = await api.post<ApiResponse<KpiReportResponse>>(
      '/api/v1/kpi/reports',
      data,
    );
    return response.data.data;
  },

  update: async (id: string, data: UpdateKpiReportRequest): Promise<KpiReportResponse> => {
    const response = await api.put<ApiResponse<KpiReportResponse>>(
      `/api/v1/kpi/reports/${id}`,
      data,
    );
    return response.data.data;
  },

  approveReport: async (reportId: string, data: ReportApprovalRequest): Promise<KpiReportApprovalResponse> => {
    const response = await api.put<ApiResponse<KpiReportApprovalResponse>>(
      `/api/v1/kpi/reports/${reportId}/approval`,
      { ...data, reportId },
    );
    return response.data.data;
  },

  amendReport: async (reportId: string, data: ReportAmendRequest): Promise<KpiReportApprovalResponse> => {
    const response = await api.put<ApiResponse<KpiReportApprovalResponse>>(
      `/api/v1/kpi/reports/${reportId}/amend`,
      data,
    );
    return response.data.data;
  },
};

// ============================================================================
// KPI Dashboard
// ============================================================================

export const kpiDashboardApi = {
  getDashboard: async (params?: DashboardFilterParams): Promise<KpiDashboardResponse> => {
    const response = await api.get<ApiResponse<KpiDashboardResponse>>(
      '/api/v1/kpi/dashboard',
      { params },
    );
    return response.data.data;
  },
};

// ============================================================================
// Assignable User Positions (P0A)
// ============================================================================

export const kpiAssignableApi = {
  getAssignableUserPositions: async (search?: string): Promise<AssignableUserPosition[]> => {
    const response = await api.get<ApiResponse<AssignableUserPosition[]>>(
      '/api/v1/kpi/assignable-user-positions',
      { params: search ? { search } : {} },
    );
    return response.data.data;
  },
};
