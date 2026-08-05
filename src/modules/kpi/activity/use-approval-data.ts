'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@heroui/react';
import { activityV1Api } from './activity-v1-api';
import { extractErrorMessage } from '@/types/api';
import {
  classifyActivityError,
  recoverableConflict,
  type RecoverableConflict,
} from '@/modules/kpi/shared/domain-errors';
import type { KpiActivityChangeRequestResponse } from './activity-v1.types';
import type { RequestDecisionRequest } from './activity-v1.types';

/**
 * Activity approval data hook (V1) — owns the `/kpi/approvals` surface.
 *   - queue: GET /api/v1/kpi-activity-requests?scope=to-review
 *   - decision: PATCH /api/v1/kpi-activity-requests/{id}/decision (unified)
 * Already-processed / version-conflict failures surface as a recoverable
 * banner + automatic refetch — never a generic unknown-error toast.
 */
export interface UseApprovalDataReturn {
  /* To-review queue (scope=to-review) */
  toReview: KpiActivityChangeRequestResponse[];
  isLoading: boolean;
  error: string | null;
  fetchToReview: () => Promise<void>;

  /* Unified decision */
  isDeciding: boolean;
  decide: (id: string, body: RequestDecisionRequest) => Promise<boolean>;

  /* Recoverable conflict (already-processed / version-conflict) */
  recoverable: RecoverableConflict | null;
  clearRecoverable: () => void;
}

export function useApprovalData(): UseApprovalDataReturn {
  const [toReview, setToReview] = useState<KpiActivityChangeRequestResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeciding, setIsDeciding] = useState(false);
  const [recoverable, setRecoverable] = useState<RecoverableConflict | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchToReview = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await activityV1Api.getRequests('to-review');
      if (mountedRef.current) setToReview(data);
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to load approval requests.');
      if (mountedRef.current) { setError(msg); setToReview([]); }
      toast.danger(msg);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  const decide = useCallback(async (id: string, body: RequestDecisionRequest): Promise<boolean> => {
    setIsDeciding(true);
    try {
      await activityV1Api.decideRequest(id, body);
      toast.success(body.decision === 'APPROVE' ? 'Request approved successfully.' : 'Request rejected successfully.');
      if (mountedRef.current) {
        setRecoverable(null);
        await fetchToReview();
      }
      return true;
    } catch (err: unknown) {
      const raw = extractErrorMessage(err, '');
      const kind = classifyActivityError(raw);
      if (kind !== 'other') {
        // Recoverable: banner + refetch the queue so the row disappears or updates.
        if (mountedRef.current) setRecoverable(recoverableConflict(kind));
        if (mountedRef.current) await fetchToReview();
      } else {
        toast.danger(raw || 'Something went wrong while processing the request.');
      }
      return false;
    } finally {
      if (mountedRef.current) setIsDeciding(false);
    }
  }, [fetchToReview]);

  const clearRecoverable = useCallback(() => {
    if (mountedRef.current) setRecoverable(null);
  }, []);

  return {
    toReview, isLoading, error, fetchToReview,
    isDeciding, decide,
    recoverable, clearRecoverable,
  };
}
