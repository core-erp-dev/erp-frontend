import { api } from '@/lib/axios';
import { extractErrorMessage } from '@/types/api';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import { assertActivityScope, assertRequestScope } from '@/modules/kpi/shared/scope.types';
import type { KpiActivityScope, KpiRequestScope } from '@/modules/kpi/shared/scope.types';
import type {
  AssignableUserPositionResponse,
  ChangeRequestRequest,
  CreateActivityRequest,
  KpiActivityResponse,
  KpiActivityChangeRequestResponse,
  ActivityListQuery,
  PaginatedActivityResponse,
  ActivityRequestListQuery,
  PaginatedActivityRequestResponse,
  RequestDecisionRequest,
} from './activity-v1.types';

/**
 * KPI Activity V1 client — normal workflow (T1/T2/T3/T4/T5/T6/T7/T8).
 *
 * Backend: KpiActivityController, KpiActivityChangeRequestController.
 * Every scoped call explicitly sends `scope` (the backend has no default).
 * Submission endpoints (T4/T5) are responsibility-based and require an
 * explicit `actingPositionId` (`core_positions.id`) — the caller must select
 * it; the client never guesses the primary/first position and never sends the
 * assignment id. There are NO separate approve/reject methods: T8 is the
 * single unified decision endpoint.
 */
export const activityV1Api = {
  /**
   * T1 — scoped Activity list.
   * `actingPositionId` remains for `superior`; mine/subordinates use the
   * optional `positionId` query filter and omit it for all relevant positions.
   */
  getActivities: async (
    scope: KpiActivityScope,
    actingPositionId?: string,
  ): Promise<KpiActivityResponse[]> => {
    const page = await activityV1Api.getActivitiesPage(scope, actingPositionId, {
      page: 1,
      size: 100,
      search: '',
      status: '',
      sortBy: 'activityName',
      sortDirection: 'asc',
    });
    return page.content;
  },

  getActivitiesPage: async (
    scope: KpiActivityScope,
    actingPositionId: string | undefined,
    query: ActivityListQuery,
  ): Promise<PaginatedActivityResponse> => {
    assertActivityScope(scope, 'GET /api/v1/kpi-activities');
    const response = await api.get<ApiResponse<PaginatedResponse<KpiActivityResponse> | KpiActivityResponse[]>>('/api/v1/kpi-activities', {
      params: {
        scope,
        ...(actingPositionId && (scope === 'subordinates' || scope === 'superior') ? { actingPositionId } : {}),
        ...(query.positionId && (scope === 'mine' || scope === 'subordinates') ? { positionId: query.positionId } : {}),
        ...(query.subordinateScope && scope === 'subordinates' ? { subordinateScope: query.subordinateScope } : {}),
        page: query.page,
        size: query.size,
        ...(query.search ? { search: query.search } : {}),
        ...(query.status ? { status: query.status } : {}),
        sortBy: query.sortBy,
        sortDirection: query.sortDirection,
      },
    });
    const data = response.data.data;
    return Array.isArray(data)
      ? { content: data, page: 1, size: data.length, totalElements: data.length, totalPages: data.length > 0 ? 1 : 0, last: true }
      : data;
  },

  /** T2 — Activity detail. `actingPositionId` is optional (direct-superior access only). */
  getActivityById: async (id: string, actingPositionId?: string): Promise<KpiActivityResponse> => {
    const response = await api.get<ApiResponse<KpiActivityResponse>>(`/api/v1/kpi-activities/${id}`, {
      params: actingPositionId ? { actingPositionId } : undefined,
    });
    return response.data.data;
  },

  /**
   * T3 — assignable assignee Positions for a hierarchy-dependent request.
   * `actingPositionId` is a `core_positions.id`; `parentId` restricts to the
   * direct subordinates of the parent's assignee (child create).
   */
  getAssignableAssignees: async (
    actingPositionId: string,
    parentId?: string,
  ): Promise<AssignableUserPositionResponse[]> => {
    const response = await api.get<ApiResponse<AssignableUserPositionResponse[]>>(
      '/api/v1/kpi-activities/assignable-assignees',
      { params: parentId ? { actingPositionId, parentId } : { actingPositionId } },
    );
    return response.data.data;
  },

  /**
   * T4 — unified CREATE request submission (root vs child by `parentId`).
   * The body is the discriminated `CreateActivityRequest`: root sends
   * indicator + period (parentId forbidden); child sends `parentId`
   * (indicator/period forbidden — inherited from the parent).
   */
  submitCreateRequest: async (body: CreateActivityRequest): Promise<KpiActivityChangeRequestResponse> => {
    const response = await api.post<ApiResponse<KpiActivityChangeRequestResponse>>(
      '/api/v1/kpi-activity-requests',
      body,
    );
    return response.data.data;
  },

  /**
   * T5 — UPDATE/CANCEL change request against an existing Activity.
   * The body is the discriminated `ChangeRequestRequest`: UPDATE sends only
   * mutable proposal fields; CANCEL sends only `cancellationReason`.
   */
  submitChangeRequest: async (
    activityId: string,
    body: ChangeRequestRequest,
  ): Promise<KpiActivityChangeRequestResponse> => {
    const response = await api.post<ApiResponse<KpiActivityChangeRequestResponse>>(
      `/api/v1/kpi-activities/${activityId}/change-requests`,
      body,
    );
    return response.data.data;
  },

  /** T6 — scoped Activity-request list. */
  getRequests: async (scope: KpiRequestScope): Promise<KpiActivityChangeRequestResponse[]> => {
    assertRequestScope(scope, 'GET /api/v1/kpi-activity-requests');
    const page = await activityV1Api.getRequestsPage(scope, {
      page: 1, size: 100, search: '', status: '', sortBy: 'createdAt', sortDirection: 'desc',
    });
    return page.content;
  },

  getRequestsPage: async (
    scope: KpiRequestScope,
    query: ActivityRequestListQuery,
  ): Promise<PaginatedActivityRequestResponse> => {
    assertRequestScope(scope, 'GET /api/v1/kpi-activity-requests');
    const response = await api.get<ApiResponse<PaginatedActivityRequestResponse | KpiActivityChangeRequestResponse[]>>(
      '/api/v1/kpi-activity-requests',
      {
        params: {
          scope,
          page: query.page,
          size: query.size,
          ...(query.search ? { search: query.search } : {}),
          ...(query.status ? { status: query.status } : {}),
          sortBy: query.sortBy,
          sortDirection: query.sortDirection,
        },
      },
    );
    const data = response.data.data;
    return Array.isArray(data)
      ? { content: data, page: 1, size: data.length, totalElements: data.length, totalPages: data.length > 0 ? 1 : 0, last: true }
      : data;
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
  return extractErrorMessage(error, 'Gagal memuat data aktivitas.');
}
