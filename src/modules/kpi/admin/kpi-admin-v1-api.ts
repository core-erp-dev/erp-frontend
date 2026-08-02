import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
  AdminCreateActivityRequest,
  AdminReassignApproverRequest,
  AdminReassignReviewerRequest,
  AdminUpdateActivityRequest,
  KpiActivityResponse,
  KpiActivityChangeRequestResponse,
} from '@/modules/kpi/activity/activity-v1.types';
import type { KpiReportResponse } from '@/modules/kpi/report/report-v1.types';

/**
 * KPI administrative client — 4 endpoints (T9/T10/T11/T18).
 *
 * Access is action-level: T9/T10/T11 require `kpi_activity:manage`; T18
 * requires `kpi_report:manage` (all enforced by backend @PreAuthorize).
 * T11 sends the Activity's authoritative persisted `version` (exposed on
 * KpiActivityResponse by backend 2a71107) as `expectedVersion` — the client
 * never fabricates or derives a version.
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

  /**
   * T11 — administrative Activity mutation (UPDATE | REASSIGN | CANCEL).
   * `expectedVersion` MUST be the Activity's authoritative persisted `version`
   * from KpiActivityResponse — never fabricated, incremented, or derived.
   */
  adminUpdateActivity: async (
    id: string,
    body: AdminUpdateActivityRequest,
  ): Promise<KpiActivityResponse> => {
    const response = await api.patch<ApiResponse<KpiActivityResponse>>(
      `/api/v1/admin/kpi-activities/${id}`,
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
