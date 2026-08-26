'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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
 *   - Review Queue  → GET /api/v1/kpi-reports?scope=to-review — assigned
 *     hierarchy reports (stored reviewer) PLUS top-level root reports in the
 *     centralized company queue for kpi_report:root_review holders.
 *   - Submit/approve/reject per T12/T16/T17.
 * Already-processed failures surface as a recoverable conflict (banner + refetch).
 */
export function useReportData() {
  /* ── My Reports ── */
  const [myReports, setMyReports] = useState<KpiReportResponse[]>([]);
  const [isLoadingMy, setIsLoadingMy] = useState(false);
  const [myError, setMyError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const requestSeqRef = useRef({ mine: 0, review: 0 });
  useEffect(() => {
    // React Strict Mode runs effect cleanup during its development probe and
    // then mounts the effect again. Reset the guard in setup so the real
    // request is still allowed to commit its loading/data state.
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchMyReports = useCallback(async () => {
    const requestId = ++requestSeqRef.current.mine;
    setIsLoadingMy(true);
    setMyError(null);
    setMyReports([]);
    try {
      const data = await reportV1Api.getReports('mine');
      if (mountedRef.current && requestId === requestSeqRef.current.mine) setMyReports(data);
    } catch (err) {
      if (mountedRef.current && requestId === requestSeqRef.current.mine) setMyError(extractReportV1Error(err));
    } finally {
      if (mountedRef.current && requestId === requestSeqRef.current.mine) setIsLoadingMy(false);
    }
  }, []);

  /* ── To Review ── */
  const [toReview, setToReview] = useState<KpiReportResponse[]>([]);
  const [isLoadingReview, setIsLoadingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const fetchToReview = useCallback(async () => {
    const requestId = ++requestSeqRef.current.review;
    setIsLoadingReview(true);
    setReviewError(null);
    setToReview([]);
    try {
      const data = await reportV1Api.getReports('to-review');
      if (mountedRef.current && requestId === requestSeqRef.current.review) setToReview(data);
    } catch (err) {
      if (mountedRef.current && requestId === requestSeqRef.current.review) setReviewError(extractReportV1Error(err));
    } finally {
      if (mountedRef.current && requestId === requestSeqRef.current.review) setIsLoadingReview(false);
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
      toast.success('Laporan berhasil diajukan.');
      return true;
    } catch (err) {
      toast.danger(mapReportError(err, 'Gagal mengajukan laporan.'));
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
      toast.success('Laporan berhasil disetujui.');
      await fetchToReview();
      return true;
    } catch (err) {
      const raw = extractErrorMessage(err, '');
      const kind = classifyReportError(raw);
      if (kind !== 'other') {
        setRecoverable(recoverableConflict(kind));
        await fetchToReview();
      } else {
        toast.danger(raw || 'Gagal menyetujui laporan.');
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
      toast.success('Laporan berhasil ditolak.');
      await fetchToReview();
      return true;
    } catch (err) {
      const raw = extractErrorMessage(err, '');
      const kind = classifyReportError(raw);
      if (kind !== 'other') {
        setRecoverable(recoverableConflict(kind));
        await fetchToReview();
      } else {
        toast.danger(raw || 'Gagal menolak laporan.');
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
    'Activity not found': 'Aktivitas yang dipilih tidak ditemukan atau sudah tidak tersedia.',
    'Activity is not active': 'Aktivitas yang dipilih sudah tidak aktif.',
    'Report date must be within the activity period': 'Tanggal laporan harus berada dalam periode aktivitas.',
    'A pending report already exists for this activity': 'Sudah ada laporan yang menunggu persetujuan untuk aktivitas ini.',
    'Photo evidence is required': 'Bukti foto wajib diisi.',
    'Evidence must be an image (JPEG, PNG, or WebP)': 'Bukti harus berupa gambar JPEG, PNG, atau WebP.',
    'Report not found': 'Laporan tidak ditemukan.',
    'Report has already been processed': 'Laporan ini sudah diproses.',
    'Cannot review your own report': 'Anda tidak dapat meninjau laporan sendiri.',
    'Not the designated reviewer': 'Anda bukan peninjau laporan ini.',
    'Evidence file not found': 'Berkas bukti tidak ditemukan di server.',
    'Parent activity owner is no longer valid': 'Peninjau tidak dapat ditentukan. Hubungi administrator.',
  };
  for (const [key, message] of Object.entries(known)) {
    if (raw.includes(key)) return message;
  }
  return fallback;
}
