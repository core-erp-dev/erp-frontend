'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@heroui/react';
import { activityV1Api, extractActivityV1Error } from './activity-v1-api';
import { classifyActivityError, recoverableConflict } from '@/modules/kpi/shared/domain-errors';
import type { RecoverableConflict } from '@/modules/kpi/shared/domain-errors';
import type {
  ChangeRequestRequest,
  CreateActivityRequest,
  KpiActivityResponse,
  KpiActivityChangeRequestResponse,
  ActivityListQuery,
  PaginatedActivityResponse,
  ActivityRequestListQuery,
  PaginatedActivityRequestResponse,
} from './activity-v1.types';

/**
 * Activity workspace data hook (V1).
 *
 * Scope ownership (`/kpi/activities`):
 *   - My Activities  → GET /api/v1/kpi-activities?scope=mine
 *   - All Activities → GET /api/v1/kpi-activities?scope=all  (read_all | manage)
 *   - Subordinates   → GET /api/v1/kpi-activities?scope=subordinates&actingPositionId=<core_positions.id>
 *   - My Requests    → GET /api/v1/kpi-activity-requests?scope=mine
 *
 * `subordinates` and every submission flow require an EXPLICIT acting
 * Position (`core_positions.id`) chosen by the user — never guessed. The
 * subordinate result is isolated per acting Position: switching Position
 * replaces the list, and `subordinatesActingPositionId` records which Position
 * the current data belongs to (no mixing of cached results).
 *
 * Mutations (T4/T5) return a result descriptor: `{ success, conflict, message }`.
 * Recoverable conflicts (already-processed, version-conflict, duplicate-pending)
 * are classified via the shared domain-error mapping; the caller surfaces a
 * banner and refetches authoritative data. No silent retry of stale updates.
 */
export interface MutationResult {
  success: boolean;
  /** Non-null when the failure is a recoverable conflict. */
  conflict: RecoverableConflict | null;
  /** Raw user-facing message (backend detail). */
  message: string | null;
}

export interface UseActivityDataReturn {
  /* My Activities (scope=mine) */
  myActivities: KpiActivityResponse[];
  myPagination: PaginatedActivityResponse | null;
  isLoadingMy: boolean;
  myError: string | null;
  fetchMyActivities: (query?: ActivityListQuery) => Promise<void>;

  /* All Activities (scope=all) */
  allActivities: KpiActivityResponse[];
  allPagination: PaginatedActivityResponse | null;
  isLoadingAll: boolean;
  allError: string | null;
  fetchAllActivities: (query?: ActivityListQuery) => Promise<void>;

  /* Subordinates (scope=subordinates; optional positionId filter) */
  subordinatesActivities: KpiActivityResponse[];
  subordinatesPagination: PaginatedActivityResponse | null;
  isLoadingSubordinates: boolean;
  subordinatesError: string | null;
  /** The selected Position whose subordinate data is currently loaded, when filtered. */
  subordinatesActingPositionId: string | null;
  fetchSubordinatesActivities: (actingPositionId?: string, query?: ActivityListQuery) => Promise<void>;

  /* Superior (scope=superior + actingPositionId) — self-child parent source */
  superiorActivities: KpiActivityResponse[];
  isLoadingSuperior: boolean;
  superiorError: string | null;
  fetchSuperiorActivities: (actingPositionId: string) => Promise<void>;

  /* My Requests (requests scope=mine) */
  myRequests: KpiActivityChangeRequestResponse[];
  myRequestsPagination: PaginatedActivityRequestResponse | null;
  isLoadingRequests: boolean;
  requestsError: string | null;
  fetchMyRequests: (query?: ActivityRequestListQuery) => Promise<void>;

  /* Detail fetches (lazy) */
  fetchActivityDetail: (id: string) => Promise<KpiActivityResponse | null>;
  fetchRequestDetail: (id: string) => Promise<KpiActivityChangeRequestResponse | null>;
  isLoadingDetail: boolean;

  /* Mutations (T4/T5) */
  submitCreateRequest: (body: CreateActivityRequest) => Promise<MutationResult>;
  submitChangeRequest: (activityId: string, body: ChangeRequestRequest) => Promise<MutationResult>;
}

const DEFAULT_ACTIVITY_QUERY: ActivityListQuery = {
  page: 1, size: 100, search: '', status: '', sortBy: 'activityName', sortDirection: 'asc',
};
const DEFAULT_REQUEST_QUERY: ActivityRequestListQuery = {
  page: 1, size: 100, search: '', status: '', sortBy: 'createdAt', sortDirection: 'desc',
};

export function useActivityData(): UseActivityDataReturn {
  const [myActivities, setMyActivities] = useState<KpiActivityResponse[]>([]);
  const [myPagination, setMyPagination] = useState<PaginatedActivityResponse | null>(null);
  const [isLoadingMy, setIsLoadingMy] = useState(false);
  const [myError, setMyError] = useState<string | null>(null);

  const [allActivities, setAllActivities] = useState<KpiActivityResponse[]>([]);
  const [allPagination, setAllPagination] = useState<PaginatedActivityResponse | null>(null);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [allError, setAllError] = useState<string | null>(null);

  const [subordinatesActivities, setSubordinatesActivities] = useState<KpiActivityResponse[]>([]);
  const [subordinatesPagination, setSubordinatesPagination] = useState<PaginatedActivityResponse | null>(null);
  const [isLoadingSubordinates, setIsLoadingSubordinates] = useState(false);
  const [subordinatesError, setSubordinatesError] = useState<string | null>(null);
  const [subordinatesActingPositionId, setSubordinatesActingPositionId] = useState<string | null>(null);

  const [superiorActivities, setSuperiorActivities] = useState<KpiActivityResponse[]>([]);
  const [isLoadingSuperior, setIsLoadingSuperior] = useState(false);
  const [superiorError, setSuperiorError] = useState<string | null>(null);

  const [myRequests, setMyRequests] = useState<KpiActivityChangeRequestResponse[]>([]);
  const [myRequestsPagination, setMyRequestsPagination] = useState<PaginatedActivityRequestResponse | null>(null);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const mountedRef = useRef(true);
  const requestSeqRef = useRef({ mine: 0, all: 0, subordinates: 0, superior: 0, requests: 0 });
  const latestAllQueryRef = useRef<ActivityListQuery | undefined>(undefined);
  const latestMyQueryRef = useRef<ActivityListQuery | undefined>(undefined);
  const latestSubordinatesQueryRef = useRef<ActivityListQuery | undefined>(undefined);
  const latestMyRequestsQueryRef = useRef<ActivityRequestListQuery | undefined>(undefined);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchMyActivities = useCallback(async (query?: ActivityListQuery) => {
    const requestId = ++requestSeqRef.current.mine;
    latestMyQueryRef.current = query ?? latestMyQueryRef.current;
    setIsLoadingMy(true);
    setMyError(null);
    setMyActivities([]);
    setMyPagination(null);
    try {
      const data = await activityV1Api.getActivitiesPage('mine', undefined, latestMyQueryRef.current ?? DEFAULT_ACTIVITY_QUERY);
      if (mountedRef.current && requestId === requestSeqRef.current.mine) {
        setMyActivities(data.content);
        setMyPagination(data);
      }
    } catch (err: unknown) {
      const msg = extractActivityV1Error(err);
      if (mountedRef.current && requestId === requestSeqRef.current.mine) { setMyError(msg); setMyActivities([]); setMyPagination(null); }
      toast.danger(msg);
    } finally {
      if (mountedRef.current && requestId === requestSeqRef.current.mine) setIsLoadingMy(false);
    }
  }, []);

  const fetchAllActivities = useCallback(async (query?: ActivityListQuery) => {
    const requestId = ++requestSeqRef.current.all;
    latestAllQueryRef.current = query ?? latestAllQueryRef.current;
    setIsLoadingAll(true);
    setAllError(null);
    setAllActivities([]);
    setAllPagination(null);
    try {
      const data = await activityV1Api.getActivitiesPage('all', undefined, latestAllQueryRef.current ?? {
        page: 1, size: 10, search: '', status: '', sortBy: 'activityName', sortDirection: 'asc',
      });
      if (mountedRef.current && requestId === requestSeqRef.current.all) {
        setAllActivities(data.content);
        setAllPagination(data);
      }
    } catch (err: unknown) {
      const msg = extractActivityV1Error(err);
      if (mountedRef.current && requestId === requestSeqRef.current.all) { setAllError(msg); setAllActivities([]); setAllPagination(null); }
      toast.danger(msg);
    } finally {
      if (mountedRef.current && requestId === requestSeqRef.current.all) setIsLoadingAll(false);
    }
  }, []);

  /**
   * Subordinates — omits the position filter by default so the backend can
   * aggregate every relevant position. A selected position is sent as a query
   * filter; every result replaces the previous list and is race guarded.
   */
  const fetchSubordinatesActivities = useCallback(async (actingPositionId?: string, query?: ActivityListQuery) => {
    const requestId = ++requestSeqRef.current.subordinates;
    latestSubordinatesQueryRef.current = query ?? latestSubordinatesQueryRef.current;
    setIsLoadingSubordinates(true);
    setSubordinatesError(null);
    setSubordinatesActivities([]);
    setSubordinatesPagination(null);
    setSubordinatesActingPositionId(null);
    try {
      const data = await activityV1Api.getActivitiesPage(
        'subordinates', actingPositionId, latestSubordinatesQueryRef.current ?? DEFAULT_ACTIVITY_QUERY,
      );
      if (mountedRef.current && requestId === requestSeqRef.current.subordinates) {
        setSubordinatesActivities(data.content);
        setSubordinatesPagination(data);
        setSubordinatesActingPositionId(actingPositionId ?? null);
      }
    } catch (err: unknown) {
      const msg = extractActivityV1Error(err);
      if (mountedRef.current && requestId === requestSeqRef.current.subordinates) {
        setSubordinatesError(msg);
        setSubordinatesActivities([]);
        setSubordinatesPagination(null);
        setSubordinatesActingPositionId(null);
      }
      toast.danger(msg);
    } finally {
      if (mountedRef.current && requestId === requestSeqRef.current.subordinates) setIsLoadingSubordinates(false);
    }
  }, []);

  /**
   * Superior — ACTIVE activities of the acting Position's direct superior
   * (self-child parent source). Always sends an explicit `scope=superior`
   * plus the selected acting Position; switching Position replaces the list.
   */
  const fetchSuperiorActivities = useCallback(async (actingPositionId: string) => {
    const requestId = ++requestSeqRef.current.superior;
    setIsLoadingSuperior(true);
    setSuperiorError(null);
    setSuperiorActivities([]);
    try {
      const data = await activityV1Api.getActivities('superior', actingPositionId);
      if (mountedRef.current && requestId === requestSeqRef.current.superior) setSuperiorActivities(data);
    } catch (err: unknown) {
      const msg = extractActivityV1Error(err);
      if (mountedRef.current && requestId === requestSeqRef.current.superior) { setSuperiorError(msg); setSuperiorActivities([]); }
      toast.danger(msg);
    } finally {
      if (mountedRef.current && requestId === requestSeqRef.current.superior) setIsLoadingSuperior(false);
    }
  }, []);

  const fetchMyRequests = useCallback(async (query?: ActivityRequestListQuery) => {
    const requestId = ++requestSeqRef.current.requests;
    latestMyRequestsQueryRef.current = query ?? latestMyRequestsQueryRef.current;
    setIsLoadingRequests(true);
    setRequestsError(null);
    setMyRequests([]);
    setMyRequestsPagination(null);
    try {
      const data = await activityV1Api.getRequestsPage('mine', latestMyRequestsQueryRef.current ?? DEFAULT_REQUEST_QUERY);
      if (mountedRef.current && requestId === requestSeqRef.current.requests) {
        setMyRequests(data.content);
        setMyRequestsPagination(data);
      }
    } catch (err: unknown) {
      const msg = extractActivityV1Error(err);
      if (mountedRef.current && requestId === requestSeqRef.current.requests) { setRequestsError(msg); setMyRequests([]); setMyRequestsPagination(null); }
      toast.danger(msg);
    } finally {
      if (mountedRef.current && requestId === requestSeqRef.current.requests) setIsLoadingRequests(false);
    }
  }, []);

  const fetchActivityDetail = useCallback(async (id: string): Promise<KpiActivityResponse | null> => {
    setIsLoadingDetail(true);
    try {
      return await activityV1Api.getActivityById(id);
    } catch (err: unknown) {
      toast.danger(extractActivityV1Error(err));
      return null;
    } finally {
      if (mountedRef.current) setIsLoadingDetail(false);
    }
  }, []);

  const fetchRequestDetail = useCallback(async (id: string): Promise<KpiActivityChangeRequestResponse | null> => {
    setIsLoadingDetail(true);
    try {
      return await activityV1Api.getRequestById(id);
    } catch (err: unknown) {
      toast.danger(extractActivityV1Error(err));
      return null;
    } finally {
      if (mountedRef.current) setIsLoadingDetail(false);
    }
  }, []);

  const submitCreateRequest = useCallback(async (body: CreateActivityRequest): Promise<MutationResult> => {
    try {
      await activityV1Api.submitCreateRequest(body);
      return { success: true, conflict: null, message: null };
    } catch (err: unknown) {
      const raw = extractActivityV1Error(err);
      const kind = classifyActivityError(raw);
      if (kind !== 'other') {
        return { success: false, conflict: recoverableConflict(kind), message: raw };
      }
      return { success: false, conflict: null, message: raw };
    }
  }, []);

  const submitChangeRequest = useCallback(async (
    activityId: string,
    body: ChangeRequestRequest,
  ): Promise<MutationResult> => {
    try {
      await activityV1Api.submitChangeRequest(activityId, body);
      return { success: true, conflict: null, message: null };
    } catch (err: unknown) {
      const raw = extractActivityV1Error(err);
      const kind = classifyActivityError(raw);
      if (kind !== 'other') {
        return { success: false, conflict: recoverableConflict(kind), message: raw };
      }
      return { success: false, conflict: null, message: raw };
    }
  }, []);

  return {
    myActivities, myPagination, isLoadingMy, myError, fetchMyActivities,
    allActivities, allPagination, isLoadingAll, allError, fetchAllActivities,
    subordinatesActivities, subordinatesPagination, isLoadingSubordinates, subordinatesError,
    subordinatesActingPositionId, fetchSubordinatesActivities,
    superiorActivities, isLoadingSuperior, superiorError, fetchSuperiorActivities,
    myRequests, myRequestsPagination, isLoadingRequests, requestsError, fetchMyRequests,
    fetchActivityDetail, fetchRequestDetail, isLoadingDetail,
    submitCreateRequest, submitChangeRequest,
  };
}
