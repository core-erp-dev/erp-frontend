import { api } from '@/lib/axios';
import { extractErrorMessage } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import type {
  KpiActivityResponse,
  KpiActivityChangeRequestResponse,
  AssignableUserPositionResponse,
  CreateRootActivityPayload,
  CreateChildActivityPayload,
  UpdateKpiActivityPayload,
  CancelKpiActivityPayload,
} from './activity.types';

/**
 * KPI Activity API.
 * Backend: KpiActivityController, KpiActivityChangeRequestController
 */
export const activityApi = {
  /* ── Activity reads (P2.1) ── */

  getMyActivities: async (): Promise<KpiActivityResponse[]> => {
    const response = await api.get<ApiResponse<KpiActivityResponse[]>>('/api/v1/kpi-activities/my');
    return response.data.data;
  },

  getManagedActivities: async (): Promise<KpiActivityResponse[]> => {
    const response = await api.get<ApiResponse<KpiActivityResponse[]>>('/api/v1/kpi-activities/managed');
    return response.data.data;
  },

  getOwnedActivities: async (): Promise<KpiActivityResponse[]> => {
    const response = await api.get<ApiResponse<KpiActivityResponse[]>>('/api/v1/kpi-activities/owned');
    return response.data.data;
  },

  getActivityById: async (id: string): Promise<KpiActivityResponse> => {
    const response = await api.get<ApiResponse<KpiActivityResponse>>(`/api/v1/kpi-activities/${id}`);
    return response.data.data;
  },

  /* ── Request reads (P2.1) ── */

  getMyRequests: async (): Promise<KpiActivityChangeRequestResponse[]> => {
    const response = await api.get<ApiResponse<KpiActivityChangeRequestResponse[]>>('/api/v1/kpi-activity-requests/my');
    return response.data.data;
  },

  getRequestById: async (id: string): Promise<KpiActivityChangeRequestResponse> => {
    const response = await api.get<ApiResponse<KpiActivityChangeRequestResponse>>(`/api/v1/kpi-activity-requests/${id}`);
    return response.data.data;
  },

  /* ── Assignable UserPositions (P2.2) ── */

  getAssignableUserPositionsForRoot: async (): Promise<AssignableUserPositionResponse[]> => {
    const response = await api.get<ApiResponse<AssignableUserPositionResponse[]>>('/api/v1/kpi-activities/assignable-user-positions');
    return response.data.data;
  },

  getAssignableUserPositionsForChild: async (parentActivityId: string): Promise<AssignableUserPositionResponse[]> => {
    const response = await api.get<ApiResponse<AssignableUserPositionResponse[]>>(`/api/v1/kpi-activities/${parentActivityId}/assignable-user-positions`);
    return response.data.data;
  },

  /* ── Request mutations (P2.2) ── */

  submitRootCreate: async (payload: CreateRootActivityPayload): Promise<KpiActivityChangeRequestResponse> => {
    const response = await api.post<ApiResponse<KpiActivityChangeRequestResponse>>('/api/v1/kpi-activity-requests/root-create', payload);
    return response.data.data;
  },

  submitChildCreate: async (payload: CreateChildActivityPayload): Promise<KpiActivityChangeRequestResponse> => {
    const response = await api.post<ApiResponse<KpiActivityChangeRequestResponse>>('/api/v1/kpi-activity-requests/child-create', payload);
    return response.data.data;
  },

  submitUpdate: async (payload: UpdateKpiActivityPayload): Promise<KpiActivityChangeRequestResponse> => {
    const response = await api.post<ApiResponse<KpiActivityChangeRequestResponse>>('/api/v1/kpi-activity-requests/update', payload);
    return response.data.data;
  },

  submitCancel: async (payload: CancelKpiActivityPayload): Promise<KpiActivityChangeRequestResponse> => {
    const response = await api.post<ApiResponse<KpiActivityChangeRequestResponse>>('/api/v1/kpi-activity-requests/cancel', payload);
    return response.data.data;
  },

  /* ── Approval endpoints (P2.3) ── */

  getPendingRequests: async (): Promise<KpiActivityChangeRequestResponse[]> => {
    const response = await api.get<ApiResponse<KpiActivityChangeRequestResponse[]>>('/api/v1/kpi-activity-requests/pending');
    return response.data.data;
  },

  approveRequest: async (id: string): Promise<KpiActivityChangeRequestResponse> => {
    const response = await api.patch<ApiResponse<KpiActivityChangeRequestResponse>>(`/api/v1/kpi-activity-requests/${id}/approve`);
    return response.data.data;
  },

  rejectRequest: async (id: string, payload: { rejectionReason: string }): Promise<KpiActivityChangeRequestResponse> => {
    const response = await api.patch<ApiResponse<KpiActivityChangeRequestResponse>>(`/api/v1/kpi-activity-requests/${id}/reject`, payload);
    return response.data.data;
  },
};

/** Error extractor (read). */
export function extractActivityError(error: unknown): string {
  return extractErrorMessage(error, 'Failed to load activity data.');
}
