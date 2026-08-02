import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
  AdminCreateActivityRequest,
  AdminReassignApproverRequest,
  AdminReassignReviewerRequest,
  KpiActivityResponse,
  KpiActivityChangeRequestResponse,
} from '@/modules/kpi/activity/activity-v1.types';
import type { KpiReportResponse } from '@/modules/kpi/report/report-v1.types';

/**
 * KPI administrative client — 3 implemented endpoints (T9/T10/T18).
 *
 * T11 (`PATCH /api/v1/admin/kpi-activities/{id}`) is deliberately NOT
 * implemented: it requires `expectedVersion` and no response DTO exposes a
 * `version` (contract blocker, plan §15.2). No version is fabricated.
 *
 * Access is action-level: T9/T10 require `kpi_activity:manage`; T18 requires
 * `kpi_report:manage` (both enforced by backend @PreAuthorize).
 */
export const kpiAdminV1Api = {
  /** T9 — administrative Activity-request approver reassignment (stuck-request recovery). */
  adminReassignApprover: async (
    requestId: string,
    body: AdminReassignApproverRequest,
  ): Promise<KpiActivityChangeRequestResponse> => {
    const response = await api.patch<ApiResponse<KpiActivityChangeRequestResponse>>(
      `/api/v1/admin/kpi-activity-requests/${requestId}/approver`,
      body,
    );
    return response.data.data;
  },

  /** T10 — administrative Activity create for anyone (no approval flow). */
  adminCreateActivity: async (body: AdminCreateActivityRequest): Promise<KpiActivityResponse> => {
    const response = await api.post<ApiResponse<KpiActivityResponse>>(
      '/api/v1/admin/kpi-activities',
      body,
    );
    return response.data.data;
  },

  /** T18 — administrative Report reviewer reassignment (stuck-report recovery). */
  adminReassignReportReviewer: async (
    reportId: string,
    body: AdminReassignReviewerRequest,
  ): Promise<KpiReportResponse> => {
    const response = await api.patch<ApiResponse<KpiReportResponse>>(
      `/api/v1/admin/kpi-reports/${reportId}/reviewer`,
      body,
    );
    return response.data.data;
  },
};
