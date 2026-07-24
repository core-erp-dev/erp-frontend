import { api } from '@/lib/axios';
import { extractErrorMessage } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import type { KpiActivityResponse, KpiActivityChangeRequestResponse } from './activity.types';

/**
 * KPI Activity API — P2.1 read-only methods.
 * Backend: KpiActivityController, KpiActivityChangeRequestController
 */
export const activityApi = {
  /* ── Activity reads ── */

  getMyActivities: async (): Promise<KpiActivityResponse[]> => {
    const response = await api.get<ApiResponse<KpiActivityResponse[]>>('/api/v1/kpi-activities/my');
    return response.data.data;
  },

  getManagedActivities: async (): Promise<KpiActivityResponse[]> => {
    const response = await api.get<ApiResponse<KpiActivityResponse[]>>('/api/v1/kpi-activities/managed');
    return response.data.data;
  },

  getActivityById: async (id: string): Promise<KpiActivityResponse> => {
    const response = await api.get<ApiResponse<KpiActivityResponse>>(`/api/v1/kpi-activities/${id}`);
    return response.data.data;
  },

  /* ── Request reads ── */

  getMyRequests: async (): Promise<KpiActivityChangeRequestResponse[]> => {
    const response = await api.get<ApiResponse<KpiActivityChangeRequestResponse[]>>('/api/v1/kpi-activity-requests/my');
    return response.data.data;
  },

  getRequestById: async (id: string): Promise<KpiActivityChangeRequestResponse> => {
    const response = await api.get<ApiResponse<KpiActivityChangeRequestResponse>>(`/api/v1/kpi-activity-requests/${id}`);
    return response.data.data;
  },
};

/** Read-error wrapper (P2.1). */
export function extractActivityError(error: unknown): string {
  return extractErrorMessage(error, 'Failed to load activity data.');
}
