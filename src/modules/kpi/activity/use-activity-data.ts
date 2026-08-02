'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@heroui/react';
import { activityV1Api, extractActivityV1Error } from './activity-v1-api';
import type {
  KpiActivityResponse,
  KpiActivityChangeRequestResponse,
} from './activity-v1.types';

/**
 * Activity workspace data hook (V1).
 *
 * Scope ownership (`/kpi/activities`):
 *   - My Activities  → GET /api/v1/kpi-activities?scope=mine
 *   - All Activities → GET /api/v1/kpi-activities?scope=all  (read_all | manage)
 *   - My Requests    → GET /api/v1/kpi-activity-requests?scope=mine
 *
 * `subordinates` (scope=subordinates) and every submission flow are NOT
 * activated: they require an explicit acting Position (`core_positions.id`)
 * and the frontend has no self-accessible position source yet (contract
 * blocker, plan §15.1). No position is ever guessed.
 */
export interface UseActivityDataReturn {
  /* My Activities (scope=mine) */
  myActivities: KpiActivityResponse[];
  isLoadingMy: boolean;
  myError: string | null;
  fetchMyActivities: () => Promise<void>;

  /* All Activities (scope=all) */
  allActivities: KpiActivityResponse[];
  isLoadingAll: boolean;
  allError: string | null;
  fetchAllActivities: () => Promise<void>;

  /* My Requests (requests scope=mine) */
  myRequests: KpiActivityChangeRequestResponse[];
  isLoadingRequests: boolean;
  requestsError: string | null;
  fetchMyRequests: () => Promise<void>;

  /* Detail fetches (lazy) */
  fetchActivityDetail: (id: string) => Promise<KpiActivityResponse | null>;
  fetchRequestDetail: (id: string) => Promise<KpiActivityChangeRequestResponse | null>;
  isLoadingDetail: boolean;
}

export function useActivityData(): UseActivityDataReturn {
  const [myActivities, setMyActivities] = useState<KpiActivityResponse[]>([]);
  const [isLoadingMy, setIsLoadingMy] = useState(false);
  const [myError, setMyError] = useState<string | null>(null);

  const [allActivities, setAllActivities] = useState<KpiActivityResponse[]>([]);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [allError, setAllError] = useState<string | null>(null);

  const [myRequests, setMyRequests] = useState<KpiActivityChangeRequestResponse[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchMyActivities = useCallback(async () => {
    setIsLoadingMy(true);
    setMyError(null);
    try {
      const data = await activityV1Api.getActivities('mine');
      if (mountedRef.current) setMyActivities(data);
    } catch (err: unknown) {
      const msg = extractActivityV1Error(err);
      if (mountedRef.current) { setMyError(msg); setMyActivities([]); }
      toast.danger(msg);
    } finally {
      if (mountedRef.current) setIsLoadingMy(false);
    }
  }, []);

  const fetchAllActivities = useCallback(async () => {
    setIsLoadingAll(true);
    setAllError(null);
    try {
      const data = await activityV1Api.getActivities('all');
      if (mountedRef.current) setAllActivities(data);
    } catch (err: unknown) {
      const msg = extractActivityV1Error(err);
      if (mountedRef.current) { setAllError(msg); setAllActivities([]); }
      toast.danger(msg);
    } finally {
      if (mountedRef.current) setIsLoadingAll(false);
    }
  }, []);

  const fetchMyRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    setRequestsError(null);
    try {
      const data = await activityV1Api.getRequests('mine');
      if (mountedRef.current) setMyRequests(data);
    } catch (err: unknown) {
      const msg = extractActivityV1Error(err);
      if (mountedRef.current) { setRequestsError(msg); setMyRequests([]); }
      toast.danger(msg);
    } finally {
      if (mountedRef.current) setIsLoadingRequests(false);
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

  return {
    myActivities, isLoadingMy, myError, fetchMyActivities,
    allActivities, isLoadingAll, allError, fetchAllActivities,
    myRequests, isLoadingRequests, requestsError, fetchMyRequests,
    fetchActivityDetail, fetchRequestDetail, isLoadingDetail,
  };
}
