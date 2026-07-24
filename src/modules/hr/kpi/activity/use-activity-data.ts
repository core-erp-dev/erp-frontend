'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@heroui/react';
import { activityApi, extractActivityError } from './activity-api';
import type { KpiActivityResponse, KpiActivityChangeRequestResponse } from './activity.types';

export interface UseActivityDataReturn {
  /* My Activities */
  myActivities: KpiActivityResponse[];
  isLoadingMy: boolean;
  myError: string | null;
  fetchMyActivities: () => Promise<void>;

  /* Managed Activities */
  managedActivities: KpiActivityResponse[];
  isLoadingManaged: boolean;
  managedError: string | null;
  fetchManagedActivities: () => Promise<void>;

  /* My Requests */
  myRequests: KpiActivityChangeRequestResponse[];
  isLoadingRequests: boolean;
  requestsError: string | null;
  fetchMyRequests: () => Promise<void>;

  /* Detail fetch (lazy) */
  fetchActivityDetail: (id: string) => Promise<KpiActivityResponse | null>;
  fetchRequestDetail: (id: string) => Promise<KpiActivityChangeRequestResponse | null>;

  /* Loading detail */
  isLoadingDetail: boolean;
}

export function useActivityData(): UseActivityDataReturn {
  const [myActivities, setMyActivities] = useState<KpiActivityResponse[]>([]);
  const [isLoadingMy, setIsLoadingMy] = useState(false);
  const [myError, setMyError] = useState<string | null>(null);

  const [managedActivities, setManagedActivities] = useState<KpiActivityResponse[]>([]);
  const [isLoadingManaged, setIsLoadingManaged] = useState(false);
  const [managedError, setManagedError] = useState<string | null>(null);

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
      const data = await activityApi.getMyActivities();
      if (mountedRef.current) setMyActivities(data);
    } catch (err: unknown) {
      const msg = extractActivityError(err);
      if (mountedRef.current) { setMyError(msg); setMyActivities([]); }
      toast.danger(msg);
    } finally {
      if (mountedRef.current) setIsLoadingMy(false);
    }
  }, []);

  const fetchManagedActivities = useCallback(async () => {
    setIsLoadingManaged(true);
    setManagedError(null);
    try {
      const data = await activityApi.getManagedActivities();
      if (mountedRef.current) setManagedActivities(data);
    } catch (err: unknown) {
      const msg = extractActivityError(err);
      if (mountedRef.current) { setManagedError(msg); setManagedActivities([]); }
      toast.danger(msg);
    } finally {
      if (mountedRef.current) setIsLoadingManaged(false);
    }
  }, []);

  const fetchMyRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    setRequestsError(null);
    try {
      const data = await activityApi.getMyRequests();
      if (mountedRef.current) setMyRequests(data);
    } catch (err: unknown) {
      const msg = extractActivityError(err);
      if (mountedRef.current) { setRequestsError(msg); setMyRequests([]); }
      toast.danger(msg);
    } finally {
      if (mountedRef.current) setIsLoadingRequests(false);
    }
  }, []);

  const fetchActivityDetail = useCallback(async (id: string): Promise<KpiActivityResponse | null> => {
    setIsLoadingDetail(true);
    try {
      return await activityApi.getActivityById(id);
    } catch (err: unknown) {
      const msg = extractActivityError(err);
      toast.danger(msg);
      return null;
    } finally {
      if (mountedRef.current) setIsLoadingDetail(false);
    }
  }, []);

  const fetchRequestDetail = useCallback(async (id: string): Promise<KpiActivityChangeRequestResponse | null> => {
    setIsLoadingDetail(true);
    try {
      return await activityApi.getRequestById(id);
    } catch (err: unknown) {
      const msg = extractActivityError(err);
      toast.danger(msg);
      return null;
    } finally {
      if (mountedRef.current) setIsLoadingDetail(false);
    }
  }, []);

  return {
    myActivities, isLoadingMy, myError, fetchMyActivities,
    managedActivities, isLoadingManaged, managedError, fetchManagedActivities,
    myRequests, isLoadingRequests, requestsError, fetchMyRequests,
    fetchActivityDetail, fetchRequestDetail, isLoadingDetail,
  };
}
