'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@heroui/react';
import { activityApi, extractActivityError } from './activity-api';
import { mapActivityError } from './activity-error-mapper';
import type {
  KpiActivityResponse,
  KpiActivityChangeRequestResponse,
  AssignableUserPositionResponse,
  CreateRootActivityPayload,
  CreateChildActivityPayload,
  UpdateKpiActivityPayload,
  CancelKpiActivityPayload,
} from './activity.types';

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

  /* Owned Activities */
  ownedActivities: KpiActivityResponse[];
  isLoadingOwned: boolean;
  ownedError: string | null;
  fetchOwnedActivities: () => Promise<void>;

  /* My Requests */
  myRequests: KpiActivityChangeRequestResponse[];
  isLoadingRequests: boolean;
  requestsError: string | null;
  fetchMyRequests: () => Promise<void>;

  /* Detail fetch (lazy) */
  fetchActivityDetail: (id: string) => Promise<KpiActivityResponse | null>;
  fetchRequestDetail: (id: string) => Promise<KpiActivityChangeRequestResponse | null>;
  isLoadingDetail: boolean;

  /* Assignable UserPositions (P2.2) */
  assignablePositions: AssignableUserPositionResponse[];
  isLoadingAssignable: boolean;
  fetchAssignableForRoot: () => Promise<void>;
  fetchAssignableForChild: (parentId: string) => Promise<void>;

  /* Mutations (P2.2) */
  isSubmitting: boolean;
  submitRootCreate: (payload: CreateRootActivityPayload) => Promise<boolean>;
  submitChildCreate: (payload: CreateChildActivityPayload) => Promise<boolean>;
  submitUpdate: (payload: UpdateKpiActivityPayload) => Promise<boolean>;
  submitCancel: (payload: CancelKpiActivityPayload) => Promise<boolean>;
}

export function useActivityData(): UseActivityDataReturn {
  const [myActivities, setMyActivities] = useState<KpiActivityResponse[]>([]);
  const [isLoadingMy, setIsLoadingMy] = useState(false);
  const [myError, setMyError] = useState<string | null>(null);

  const [managedActivities, setManagedActivities] = useState<KpiActivityResponse[]>([]);
  const [isLoadingManaged, setIsLoadingManaged] = useState(false);
  const [managedError, setManagedError] = useState<string | null>(null);

  const [ownedActivities, setOwnedActivities] = useState<KpiActivityResponse[]>([]);
  const [isLoadingOwned, setIsLoadingOwned] = useState(false);
  const [ownedError, setOwnedError] = useState<string | null>(null);

  const [myRequests, setMyRequests] = useState<KpiActivityChangeRequestResponse[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  const [assignablePositions, setAssignablePositions] = useState<AssignableUserPositionResponse[]>([]);
  const [isLoadingAssignable, setIsLoadingAssignable] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const fetchOwnedActivities = useCallback(async () => {
    setIsLoadingOwned(true);
    setOwnedError(null);
    try {
      const data = await activityApi.getOwnedActivities();
      if (mountedRef.current) setOwnedActivities(data);
    } catch (err: unknown) {
      const msg = extractActivityError(err);
      if (mountedRef.current) { setOwnedError(msg); setOwnedActivities([]); }
      toast.danger(msg);
    } finally {
      if (mountedRef.current) setIsLoadingOwned(false);
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

  /* ── Assignable positions (P2.2) ── */

  const fetchAssignableForRoot = useCallback(async () => {
    setIsLoadingAssignable(true);
    try {
      const data = await activityApi.getAssignableUserPositionsForRoot();
      if (mountedRef.current) setAssignablePositions(data);
    } catch (err: unknown) {
      const msg = extractActivityError(err);
      toast.danger(msg);
    } finally {
      if (mountedRef.current) setIsLoadingAssignable(false);
    }
  }, []);

  const fetchAssignableForChild = useCallback(async (parentId: string) => {
    setIsLoadingAssignable(true);
    try {
      const data = await activityApi.getAssignableUserPositionsForChild(parentId);
      if (mountedRef.current) setAssignablePositions(data);
    } catch (err: unknown) {
      const msg = extractActivityError(err);
      toast.danger(msg);
    } finally {
      if (mountedRef.current) setIsLoadingAssignable(false);
    }
  }, []);

  /* ── Mutations (P2.2) ── */

  const submitRootCreate = useCallback(async (payload: CreateRootActivityPayload): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      await activityApi.submitRootCreate(payload);
      toast.success('Activity request submitted successfully.');
      if (mountedRef.current) await fetchMyRequests();
      return true;
    } catch (err: unknown) {
      const msg = mapActivityError(err, 'Something went wrong while submitting the request.');
      toast.danger(msg);
      return false;
    } finally {
      if (mountedRef.current) setIsSubmitting(false);
    }
  }, [fetchMyRequests]);

  const submitChildCreate = useCallback(async (payload: CreateChildActivityPayload): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      await activityApi.submitChildCreate(payload);
      toast.success('Activity request submitted successfully.');
      if (mountedRef.current) await fetchMyRequests();
      return true;
    } catch (err: unknown) {
      const msg = mapActivityError(err, 'Something went wrong while submitting the request.');
      toast.danger(msg);
      return false;
    } finally {
      if (mountedRef.current) setIsSubmitting(false);
    }
  }, [fetchMyRequests]);

  const submitUpdate = useCallback(async (payload: UpdateKpiActivityPayload): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      await activityApi.submitUpdate(payload);
      toast.success('Activity request submitted successfully.');
      if (mountedRef.current) await fetchMyRequests();
      return true;
    } catch (err: unknown) {
      const msg = mapActivityError(err, 'Something went wrong while submitting the request.');
      toast.danger(msg);
      return false;
    } finally {
      if (mountedRef.current) setIsSubmitting(false);
    }
  }, [fetchMyRequests]);

  const submitCancel = useCallback(async (payload: CancelKpiActivityPayload): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      await activityApi.submitCancel(payload);
      toast.success('Activity request submitted successfully.');
      if (mountedRef.current) await fetchMyRequests();
      return true;
    } catch (err: unknown) {
      const msg = mapActivityError(err, 'Something went wrong while submitting the cancellation request.');
      toast.danger(msg);
      return false;
    } finally {
      if (mountedRef.current) setIsSubmitting(false);
    }
  }, [fetchMyRequests]);

  return {
    myActivities, isLoadingMy, myError, fetchMyActivities,
    managedActivities, isLoadingManaged, managedError, fetchManagedActivities,
    ownedActivities, isLoadingOwned, ownedError, fetchOwnedActivities,
    myRequests, isLoadingRequests, requestsError, fetchMyRequests,
    fetchActivityDetail, fetchRequestDetail, isLoadingDetail,
    assignablePositions, isLoadingAssignable,
    fetchAssignableForRoot, fetchAssignableForChild,
    isSubmitting, submitRootCreate, submitChildCreate, submitUpdate, submitCancel,
  };
}
