'use client';

import { useState, useCallback } from 'react';
import { toast } from '@heroui/react';
import { reportV1Api, extractReportV1Error } from './report-v1-api';
import { extractErrorMessage } from '@/types/api';
import {
  classifyReportError,
  recoverableConflict,
  type RecoverableConflict,
} from '@/modules/kpi/shared/domain-errors';
import type { KpiReportResponse, SubmitReportPayload, RejectReportPayload } from './report-v1.types';

/**
 * Combined report data hook (V1).
 *   - My Reports    → GET /api/v1/kpi-reports?scope=mine
 *   - Review Queue  → GET /api/v1/kpi-reports?scope=to-review (stored reviewer)
 *   - Submit/approve/reject per T12/T16/T17.
 * Already-processed failures surface as a recoverable conflict (banner + refetch).
 */
export function useReportData() {
  /* ── My Reports ── */
  const [myReports, setMyReports] = useState<KpiReportResponse[]>([]);
  const [isLoadingMy, setIsLoadingMy] = useState(false);
  const [myError, setMyError] = useState<string | null>(null);

  const fetchMyReports = useCallback(async () => {
    setIsLoadingMy(true);
    setMyError(null);
    try {
      const data = await reportV1Api.getReports('mine');
      setMyReports(data);
    } catch (err) {
      setMyError(extractReportV1Error(err));
    } finally {
      setIsLoadingMy(false);
    }
  }, []);

  /* ── To Review ── */
  const [toReview, setToReview] = useState<KpiReportResponse[]>([]);
  const [isLoadingReview, setIsLoadingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const fetchToReview = useCallback(async () => {
    setIsLoadingReview(true);
    setReviewError(null);
    try {
      const data = await reportV1Api.getReports('to-review');
      setToReview(data);
    } catch (err) {
      setReviewError(extractReportV1Error(err));
    } finally {
      setIsLoadingReview(false);
    }
  }, []);

  /* ── Recoverable conflict state (already-processed etc.) ── */
  const [recoverable, setRecoverable] = useState<RecoverableConflict | null>(null);
  const clearRecoverable = useCallback(() => setRecoverable(null), []);

  /* ── Submit ── */
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitReport = useCallback(async (payload: SubmitReportPayload, evidenceFile: File): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      await reportV1Api.submitReport(payload, evidenceFile);
      toast.success('Report submitted successfully.');
      return true;
    } catch (err) {
      toast.danger(mapReportError(err, 'Failed to submit report.'));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  /* ── Approve ── */
  const [isApproving, setIsApproving] = useState(false);

  const approveReport = useCallback(async (id: string): Promise<boolean> => {
    setIsApproving(true);
    try {
      await reportV1Api.approveReport(id);
      toast.success('Report approved successfully.');
      await fetchToReview();
      return true;
    } catch (err) {
      const raw = extractErrorMessage(err, '');
      const kind = classifyReportError(raw);
      if (kind !== 'other') {
        setRecoverable(recoverableConflict(kind));
        await fetchToReview();
      } else {
        toast.danger(raw || 'Failed to approve report.');
      }
      return false;
    } finally {
      setIsApproving(false);
    }
  }, [fetchToReview]);

  /* ── Reject ── */
  const [isRejecting, setIsRejecting] = useState(false);

  const rejectReport = useCallback(async (id: string, payload: RejectReportPayload): Promise<boolean> => {
    setIsRejecting(true);
    try {
      await reportV1Api.rejectReport(id, payload);
      toast.success('Report rejected successfully.');
      await fetchToReview();
      return true;
    } catch (err) {
      const raw = extractErrorMessage(err, '');
      const kind = classifyReportError(raw);
      if (kind !== 'other') {
        setRecoverable(recoverableConflict(kind));
        await fetchToReview();
      } else {
        toast.danger(raw || 'Failed to reject report.');
      }
      return false;
    } finally {
      setIsRejecting(false);
    }
  }, [fetchToReview]);

  return {
    myReports,
    isLoadingMy,
    myError,
    fetchMyReports,
    toReview,
    isLoadingReview,
    reviewError,
    fetchToReview,
    submitReport,
    isSubmitting,
    approveReport,
    isApproving,
    rejectReport,
    isRejecting,
    recoverable,
    clearRecoverable,
  };
}

/** Known report mutation error → safe English message. */
function mapReportError(error: unknown, fallback: string): string {
  const raw = extractErrorMessage(error, '');
  if (!raw) return fallback;
  const known: Record<string, string> = {
    'Activity not found': 'The selected activity could not be found or is no longer available.',
    'Activity is not active': 'The selected activity is no longer active.',
    'Report date must be within the activity period': 'The report date must be within the activity\'s assigned period.',
    'A pending report already exists for this activity': 'A pending report already exists for this activity. Submit after it is reviewed.',
    'Photo evidence is required': 'Photo evidence is required.',
    'Evidence must be an image (JPEG, PNG, or WebP)': 'Evidence must be a JPEG, PNG, or WebP image.',
    'Report not found': 'The report could not be found.',
    'Report has already been processed': 'This report has already been processed.',
    'Cannot review your own report': 'You cannot review your own report.',
    'Not the designated reviewer': 'You are not the designated reviewer for this report.',
    'Evidence file not found': 'The evidence file could not be found on the server.',
    'Parent activity owner is no longer valid': 'The reviewer could not be determined. Please contact an administrator.',
  };
  for (const [key, message] of Object.entries(known)) {
    if (raw.includes(key)) return message;
  }
  return fallback;
}
