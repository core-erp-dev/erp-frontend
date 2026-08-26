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
import type {
  ActivityRequestListQuery,
  KpiActivityChangeRequestResponse,
  PaginatedActivityRequestResponse,
} from './activity-v1.types';
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
  pagination: PaginatedActivityRequestResponse | null;
  isLoading: boolean;
  error: string | null;
  fetchToReview: (query?: ActivityRequestListQuery) => Promise<void>;

  /* Unified decision */
  isDeciding: boolean;
  decide: (id: string, body: RequestDecisionRequest) => Promise<boolean>;

  /* Recoverable conflict (already-processed / version-conflict) */
  recoverable: RecoverableConflict | null;
  clearRecoverable: () => void;
}

const DEFAULT_APPROVAL_QUERY: ActivityRequestListQuery = {
  page: 1, size: 10, search: '', status: '', sortBy: 'createdAt', sortDirection: 'asc',
};

export function useApprovalData(): UseApprovalDataReturn {
  const [toReview, setToReview] = useState<KpiActivityChangeRequestResponse[]>([]);
  const [pagination, setPagination] = useState<PaginatedActivityRequestResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeciding, setIsDeciding] = useState(false);
  const [recoverable, setRecoverable] = useState<RecoverableConflict | null>(null);
  const mountedRef = useRef(true);
  const requestSeqRef = useRef(0);
  const latestQueryRef = useRef<ActivityRequestListQuery | undefined>(undefined);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchToReview = useCallback(async (query?: ActivityRequestListQuery) => {
    const requestId = ++requestSeqRef.current;
    latestQueryRef.current = query ?? latestQueryRef.current;
    setIsLoading(true);
    setError(null);
    setToReview([]);
    setPagination(null);
    try {
      const data = await activityV1Api.getRequestsPage('to-review', latestQueryRef.current ?? DEFAULT_APPROVAL_QUERY);
      if (mountedRef.current && requestId === requestSeqRef.current) {
        setToReview(data.content);
        setPagination(data);
      }
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Gagal memuat pengajuan persetujuan aktivitas.');
      if (mountedRef.current && requestId === requestSeqRef.current) { setError(msg); setToReview([]); setPagination(null); toast.danger(msg); }
    } finally {
      if (mountedRef.current && requestId === requestSeqRef.current) setIsLoading(false);
    }
  }, []);

  const decide = useCallback(async (id: string, body: RequestDecisionRequest): Promise<boolean> => {
    setIsDeciding(true);
    try {
      await activityV1Api.decideRequest(id, body);
      toast.success(body.decision === 'APPROVE' ? 'Pengajuan berhasil disetujui.' : 'Pengajuan berhasil ditolak.');
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
        toast.danger(raw || 'Terjadi kesalahan saat memproses pengajuan.');
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
    toReview, pagination, isLoading, error, fetchToReview,
    isDeciding, decide,
    recoverable, clearRecoverable,
  };
}
