'use client';

import { useState, useCallback } from 'react';
import { toast } from '@heroui/react';
import { reportApi, extractReportError } from './report-api';
import { mapReportError } from './report-error-mapper';
import type { KpiReportResponse, SubmitReportPayload, RejectReportPayload } from './report.types';

/**
 * Combined report data hook.
 * Uses feature-local Axios calls — no global cache, no React Query.
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
      const data = await reportApi.getMyReports();
      setMyReports(data);
    } catch (err) {
      setMyError(extractReportError(err));
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
      const data = await reportApi.getReportsToReview();
      setToReview(data);
    } catch (err) {
      setReviewError(extractReportError(err));
    } finally {
      setIsLoadingReview(false);
    }
  }, []);

  /* ── Submit ── */
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitReport = useCallback(async (payload: SubmitReportPayload, evidenceFile: File): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      await reportApi.submitReport(payload, evidenceFile);
      toast.success('Report submitted successfully.');
      return true;
    } catch (err) {
      const message = mapReportError(err, 'Failed to submit report.');
      toast.danger(message);
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
      await reportApi.approveReport(id);
      toast.success('Report approved successfully.');
      return true;
    } catch (err) {
      const message = mapReportError(err, 'Failed to approve report.');
      toast.danger(message);
      return false;
    } finally {
      setIsApproving(false);
    }
  }, []);

  /* ── Reject ── */
  const [isRejecting, setIsRejecting] = useState(false);

  const rejectReport = useCallback(async (id: string, payload: RejectReportPayload): Promise<boolean> => {
    setIsRejecting(true);
    try {
      await reportApi.rejectReport(id, payload);
      toast.success('Report rejected successfully.');
      return true;
    } catch (err) {
      const message = mapReportError(err, 'Failed to reject report.');
      toast.danger(message);
      return false;
    } finally {
      setIsRejecting(false);
    }
  }, []);

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
  };
}
