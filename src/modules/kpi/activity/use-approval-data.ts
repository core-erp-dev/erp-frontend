'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@heroui/react';
import { activityApi } from './activity-api';
import { mapActivityError } from './activity-error-mapper';
import type { KpiActivityChangeRequestResponse, KpiActivityResponse } from './activity.types';

export interface UseApprovalDataReturn {
  /* Pending queue */
  pendingRequests: KpiActivityChangeRequestResponse[];
  isLoadingPending: boolean;
  pendingError: string | null;
  fetchPending: () => Promise<void>;

  /* Detail fetch */
  fetchRequestDetail: (id: string) => Promise<KpiActivityChangeRequestResponse | null>;
  fetchCurrentActivity: (id: string) => Promise<KpiActivityResponse | null>;

  /* Mutations */
  isApproving: boolean;
  approve: (id: string) => Promise<boolean>;
  reject: (id: string, reason: string) => Promise<boolean>;
}

export function useApprovalData(): UseApprovalDataReturn {
  const [pendingRequests, setPendingRequests] = useState<KpiActivityChangeRequestResponse[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);

  const [isApproving, setIsApproving] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchPending = useCallback(async () => {
    setIsLoadingPending(true);
    setPendingError(null);
    try {
      const data = await activityApi.getPendingRequests();
      if (mountedRef.current) setPendingRequests(data);
    } catch (err: unknown) {
      const msg = mapActivityError(err, 'Failed to load pending requests.');
      if (mountedRef.current) { setPendingError(msg); setPendingRequests([]); }
      toast.danger(msg);
    } finally {
      if (mountedRef.current) setIsLoadingPending(false);
    }
  }, []);

  const fetchRequestDetail = useCallback(async (id: string): Promise<KpiActivityChangeRequestResponse | null> => {
    try {
      return await activityApi.getRequestById(id);
    } catch (err: unknown) {
      toast.danger(mapActivityError(err, 'Failed to load request detail.'));
      return null;
    }
  }, []);

  const fetchCurrentActivity = useCallback(async (id: string): Promise<KpiActivityResponse | null> => {
    try {
      return await activityApi.getActivityById(id);
    } catch {
      return null;
    }
  }, []);

  const approve = useCallback(async (id: string): Promise<boolean> => {
    setIsApproving(true);
    try {
      await activityApi.approveRequest(id);
      toast.success('Request approved successfully.');
      if (mountedRef.current) await fetchPending();
      return true;
    } catch (err: unknown) {
      toast.danger(mapActivityError(err, 'Something went wrong while approving the request.'));
      return false;
    } finally {
      if (mountedRef.current) setIsApproving(false);
    }
  }, [fetchPending]);

  const reject = useCallback(async (id: string, reason: string): Promise<boolean> => {
    setIsApproving(true);
    try {
      await activityApi.rejectRequest(id, { rejectionReason: reason });
      toast.success('Request rejected successfully.');
      if (mountedRef.current) await fetchPending();
      return true;
    } catch (err: unknown) {
      toast.danger(mapActivityError(err, 'Something went wrong while rejecting the request.'));
      return false;
    } finally {
      if (mountedRef.current) setIsApproving(false);
    }
  }, [fetchPending]);

  return {
    pendingRequests, isLoadingPending, pendingError, fetchPending,
    fetchRequestDetail, fetchCurrentActivity,
    isApproving, approve, reject,
  };
}
