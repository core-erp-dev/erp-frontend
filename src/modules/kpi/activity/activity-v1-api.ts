import { api } from '@/lib/axios';
import { extractErrorMessage } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import { assertActivityScope, assertRequestScope } from '@/modules/kpi/shared/scope.types';
import type { KpiActivityScope, KpiRequestScope } from '@/modules/kpi/shared/scope.types';
import type {
  KpiActivityResponse,
  KpiActivityChangeRequestResponse,
  RequestDecisionRequest,
} from './activity-v1.types';

/**
 * KPI Activity V1 client — normal workflow reads (T1/T2/T6/T7) + unified
 * decision (T8).
 *
 * Backend: KpiActivityController, KpiActivityChangeRequestController.
 * Every scoped call explicitly sends `scope` (the backend has no default).
 * T3/T4/T5 submission requires an acting-Position source that does not yet
 * exist (contract blocker, plan §15.1) — those clients are deferred with the
 * blocked UI. There are NO separate approve/reject methods: T8 is the single
 * unified decision endpoint.
 */
export const activityV1Api = {
  /**
   * T1 — scoped Activity list.
   * `actingPositionId` is required only for `subordinates`; `mine`/`all` never
   * send it and never guess a position.
   */
  getActivities: async (
    scope: KpiActivityScope,
    actingPositionId?: string,
  ): Promise<KpiActivityResponse[]> => {
    assertActivityScope(scope, 'GET /api/v1/kpi-activities');
    const response = await api.get<ApiResponse<KpiActivityResponse[]>>('/api/v1/kpi-activities', {
      params: actingPositionId && scope === 'subordinates'
        ? { scope, actingPositionId }
        : { scope },
    });
    return response.data.data;
  },

  /** T2 — Activity detail. `actingPositionId` is optional (direct-superior access only). */
  getActivityById: async (id: string, actingPositionId?: string): Promise<KpiActivityResponse> => {
    const response = await api.get<ApiResponse<KpiActivityResponse>>(`/api/v1/kpi-activities/${id}`, {
      params: actingPositionId ? { actingPositionId } : undefined,
    });
    return response.data.data;
  },

  /** T6 — scoped Activity-request list. */
  getRequests: async (scope: KpiRequestScope): Promise<KpiActivityChangeRequestResponse[]> => {
    assertRequestScope(scope, 'GET /api/v1/kpi-activity-requests');
    const response = await api.get<ApiResponse<KpiActivityChangeRequestResponse[]>>(
      '/api/v1/kpi-activity-requests',
      { params: { scope } },
    );
    return response.data.data;
  },

  /** T7 — Activity-request detail. */
  getRequestById: async (id: string): Promise<KpiActivityChangeRequestResponse> => {
    const response = await api.get<ApiResponse<KpiActivityChangeRequestResponse>>(
      `/api/v1/kpi-activity-requests/${id}`,
    );
    return response.data.data;
  },

  /**
   * T8 — unified Activity-request decision (approve | reject).
   * The body is a discriminated union: APPROVE never sends `rejectionReason`;
   * REJECT requires a non-blank `rejectionReason` (backend `@AssertTrue`).
   */
  decideRequest: async (id: string, body: RequestDecisionRequest): Promise<KpiActivityChangeRequestResponse> => {
    const response = await api.patch<ApiResponse<KpiActivityChangeRequestResponse>>(
      `/api/v1/kpi-activity-requests/${id}/decision`,
      body,
    );
    return response.data.data;
  },
};

/** Error extractor (read). */
export function extractActivityV1Error(error: unknown): string {
  return extractErrorMessage(error, 'Failed to load activity data.');
}
