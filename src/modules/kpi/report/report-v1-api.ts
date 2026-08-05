import { api } from '@/lib/axios';
import { extractErrorMessage } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import { assertReportScope } from '@/modules/kpi/shared/scope.types';
import type { KpiReportScope } from '@/modules/kpi/shared/scope.types';
import type {
  KpiReportResponse,
  SubmitReportPayload,
  RejectReportPayload,
} from './report-v1.types';

/**
 * KPI Report V1 client — 6 functions covering T12–T17.
 *
 * Backend: KpiReportController.
 * Every scoped call explicitly sends `scope` (the backend has no default).
 * Report approve/reject remain SEPARATE operations (T16/T17) — unlike Activity
 * requests, the backend exposes no unified Report decision endpoint.
 * T18 (admin reviewer reassignment) belongs to the admin client (P5).
 */
export const reportV1Api = {
  /* ── T13: scoped list ── */

  getReports: async (scope: KpiReportScope): Promise<KpiReportResponse[]> => {
    assertReportScope(scope, 'GET /api/v1/kpi-reports');
    const response = await api.get<ApiResponse<KpiReportResponse[]>>('/api/v1/kpi-reports', {
      params: { scope },
    });
    return response.data.data;
  },

  /* ── T12: submission (multipart) ── */

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

  /* ── T14: detail ── */

  getReportById: async (reportId: string): Promise<KpiReportResponse> => {
    const response = await api.get<ApiResponse<KpiReportResponse>>(`/api/v1/kpi-reports/${reportId}`);
    return response.data.data;
  },

  /* ── T15: evidence (inline binary) ── */

  getEvidence: async (reportId: string): Promise<Blob> => {
    const response = await api.get<Blob>(`/api/v1/kpi-reports/${reportId}/evidence`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /* ── T16/T17: stored-reviewer decisions (separate) ── */

  approveReport: async (reportId: string): Promise<KpiReportResponse> => {
    const response = await api.patch<ApiResponse<KpiReportResponse>>(
      `/api/v1/kpi-reports/${reportId}/approve`,
    );
    return response.data.data;
  },

  rejectReport: async (reportId: string, payload: RejectReportPayload): Promise<KpiReportResponse> => {
    const response = await api.patch<ApiResponse<KpiReportResponse>>(
      `/api/v1/kpi-reports/${reportId}/reject`,
      payload,
    );
    return response.data.data;
  },
};

/** Error extractor (read). */
export function extractReportV1Error(error: unknown): string {
  return extractErrorMessage(error, 'Failed to load report data.');
}
