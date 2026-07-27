import { api } from '@/lib/axios';
import { extractErrorMessage } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import type {
  KpiReportResponse,
  SubmitReportPayload,
  RejectReportPayload,
} from './report.types';

/**
 * KPI Report API.
 * Backend: KpiReportController
 * Base: /api/v1/kpi-reports
 */
export const reportApi = {
  /* ── Submission (POST multipart) ── */

  submitReport: async (
    payload: SubmitReportPayload,
    evidenceFile: File,
  ): Promise<KpiReportResponse> => {
    const formData = new FormData();

    const jsonBlob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    formData.append('report', jsonBlob);
    formData.append('evidence', evidenceFile);

    const response = await api.post<ApiResponse<KpiReportResponse>>(
      '/api/v1/kpi-reports',
      formData,
    );
    return response.data.data;
  },

  /* ── Reads ── */

  getMyReports: async (): Promise<KpiReportResponse[]> => {
    const response = await api.get<ApiResponse<KpiReportResponse[]>>('/api/v1/kpi-reports/my');
    return response.data.data;
  },

  getReportsToReview: async (): Promise<KpiReportResponse[]> => {
    const response = await api.get<ApiResponse<KpiReportResponse[]>>('/api/v1/kpi-reports/to-review');
    return response.data.data;
  },

  getReportById: async (id: string): Promise<KpiReportResponse> => {
    const response = await api.get<ApiResponse<KpiReportResponse>>(`/api/v1/kpi-reports/${id}`);
    return response.data.data;
  },

  getEvidence: async (id: string): Promise<Blob> => {
    const response = await api.get<Blob>(`/api/v1/kpi-reports/${id}/evidence`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /* ── Review mutations ── */

  approveReport: async (id: string): Promise<KpiReportResponse> => {
    const response = await api.patch<ApiResponse<KpiReportResponse>>(
      `/api/v1/kpi-reports/${id}/approve`,
    );
    return response.data.data;
  },

  rejectReport: async (id: string, payload: RejectReportPayload): Promise<KpiReportResponse> => {
    const response = await api.patch<ApiResponse<KpiReportResponse>>(
      `/api/v1/kpi-reports/${id}/reject`,
      payload,
    );
    return response.data.data;
  },
};

/** Error extractor (read). */
export function extractReportError(error: unknown): string {
  return extractErrorMessage(error, 'Failed to load report data.');
}
