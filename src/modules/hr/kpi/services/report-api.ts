import { api } from '@/lib/axios';
import {
  KpiReport,
  CreateReportRequest,
  UpdateReportRequest,
  ReportApprovalRequest,
  ReportAmendRequest,
  ReportFilterParams,
  ReportApprovalResponse,
  PendingCountResponse,
  PerformanceSummaryResponse,
  PerformanceFilterParams,
  ApiResponse,
  PaginatedResponse,
} from '../types';

export const kpiReportApi = {
  getReports: async (params?: ReportFilterParams): Promise<PaginatedResponse<KpiReport>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<KpiReport>>>(
      '/api/v1/kpi/reports',
      { params },
    );
    return response.data.data;
  },

  getReportById: async (id: string): Promise<KpiReport> => {
    const response = await api.get<ApiResponse<KpiReport>>(
      `/api/v1/kpi/reports/${id}`,
    );
    return response.data.data;
  },

  createReport: async (data: CreateReportRequest, file?: File): Promise<KpiReport> => {
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    if (file) {
      formData.append('file', file);
    }
    const response = await api.post<ApiResponse<KpiReport>>(
      '/api/v1/kpi/reports',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.data;
  },

  updateReport: async (id: string, data: UpdateReportRequest, file?: File): Promise<KpiReport> => {
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    if (file) {
      formData.append('file', file);
    }
    const response = await api.put<ApiResponse<KpiReport>>(
      `/api/v1/kpi/reports/${id}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.data;
  },

  approveReport: async (id: string, data: ReportApprovalRequest): Promise<ReportApprovalResponse> => {
    const response = await api.put<ApiResponse<ReportApprovalResponse>>(
      `/api/v1/kpi/reports/${id}/approval`,
      data,
    );
    return response.data.data;
  },

  amendReport: async (id: string, data: ReportAmendRequest): Promise<ReportApprovalResponse> => {
    const response = await api.put<ApiResponse<ReportApprovalResponse>>(
      `/api/v1/kpi/reports/${id}/amend`,
      data,
    );
    return response.data.data;
  },

  getPendingCount: async (): Promise<PendingCountResponse> => {
    const response = await api.get<ApiResponse<PendingCountResponse>>(
      '/api/v1/kpi/reports/pending-count',
    );
    return response.data.data;
  },

  getPerformance: async (params?: PerformanceFilterParams): Promise<PerformanceSummaryResponse> => {
    const response = await api.get<ApiResponse<PerformanceSummaryResponse>>(
      '/api/v1/kpi/performance',
      { params },
    );
    return response.data.data;
  },
};
