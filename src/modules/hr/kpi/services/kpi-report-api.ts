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
    // Backend @ModelAttribute expects individual form fields, not a JSON wrapper
    formData.append('taskId', data.taskId);
    formData.append('reportDate', data.reportDate);
    formData.append('description', data.description);
    formData.append('dailyTarget', String(data.dailyTarget));
    formData.append('dailyRealization', String(data.dailyRealization));
    if (data.unit) {
      formData.append('unit', data.unit);
    }
    if (file) {
      formData.append('evidence', file); // Backend expects 'evidence', not 'file'
    }
    // Do NOT set Content-Type header — axios/browser will set multipart boundary automatically
    const response = await api.post<ApiResponse<KpiReport>>(
      '/api/v1/kpi/reports',
      formData,
    );
    return response.data.data;
  },

  updateReport: async (id: string, data: UpdateReportRequest, file?: File): Promise<KpiReport> => {
    const formData = new FormData();
    if (data.reportDate) formData.append('reportDate', data.reportDate);
    if (data.description) formData.append('description', data.description);
    if (data.dailyTarget != null) formData.append('dailyTarget', String(data.dailyTarget));
    if (data.dailyRealization != null) formData.append('dailyRealization', String(data.dailyRealization));
    if (data.unit) formData.append('unit', data.unit);
    if (file) {
      formData.append('evidence', file); // Backend expects 'evidence', not 'file'
    }
    const response = await api.put<ApiResponse<KpiReport>>(
      `/api/v1/kpi/reports/${id}`,
      formData,
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
