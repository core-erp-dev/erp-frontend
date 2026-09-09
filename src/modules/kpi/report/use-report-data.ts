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
import type {
  KpiReportResponse,
  PaginatedReportResponse,
  ReportListQuery,
  SubmitReportPayload,
  RejectReportPayload,
} from './report-v1.types';

export const DEFAULT_REPORT_QUERY: ReportListQuery = {
  page: 1,
  size: 10,
  search: '',
  status: '',
  sortBy: 'activityName',
  sortDirection: 'asc',
};

/**
 * Combined report data hook (V1).
 * Scoped Report lists use the same server-side query contract as Activity:
 * page, size, search, status, sortBy, and sortDirection.
 */
export function useReportData() {
  const mountedRef = useRef(true);
  const requestSeqRef = useRef({ mine: 0, review: 0, all: 0 });
  const latestQueryRef = useRef({
    mine: DEFAULT_REPORT_QUERY,
    review: DEFAULT_REPORT_QUERY,
    all: DEFAULT_REPORT_QUERY,
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /* ── My Reports ── */
  const [myReports, setMyReports] = useState<KpiReportResponse[]>([]);
  const [myPagination, setMyPagination] = useState<PaginatedReportResponse | null>(null);
  const [isLoadingMy, setIsLoadingMy] = useState(false);
  const [myError, setMyError] = useState<string | null>(null);

  const fetchMyReports = useCallback(async (query: ReportListQuery = DEFAULT_REPORT_QUERY) => {
    const requestId = ++requestSeqRef.current.mine;
    latestQueryRef.current.mine = query;
    setIsLoadingMy(true);
    setMyError(null);
    try {
      const data = await reportV1Api.getReports('mine', query);
      if (mountedRef.current && requestId === requestSeqRef.current.mine) {
        setMyReports(data.content);
        setMyPagination(data);
      }
    } catch (err) {
      if (mountedRef.current && requestId === requestSeqRef.current.mine) {
        setMyReports([]);
        setMyPagination(null);
        setMyError(extractReportV1Error(err));
      }
    } finally {
      if (mountedRef.current && requestId === requestSeqRef.current.mine) setIsLoadingMy(false);
    }
  }, []);

  /* ── To Review ── */
  const [toReview, setToReview] = useState<KpiReportResponse[]>([]);
  const [reviewPagination, setReviewPagination] = useState<PaginatedReportResponse | null>(null);
  const [isLoadingReview, setIsLoadingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const fetchToReview = useCallback(async (query: ReportListQuery = DEFAULT_REPORT_QUERY) => {
    const requestId = ++requestSeqRef.current.review;
    latestQueryRef.current.review = query;
    setIsLoadingReview(true);
    setReviewError(null);
    try {
      const data = await reportV1Api.getReports('to-review', query);
      if (mountedRef.current && requestId === requestSeqRef.current.review) {
        setToReview(data.content);
        setReviewPagination(data);
      }
    } catch (err) {
      if (mountedRef.current && requestId === requestSeqRef.current.review) {
        setToReview([]);
        setReviewPagination(null);
        setReviewError(extractReportV1Error(err));
      }
    } finally {
      if (mountedRef.current && requestId === requestSeqRef.current.review) setIsLoadingReview(false);
    }
  }, []);

  /* ── All Reports ── */
  const [allReports, setAllReports] = useState<KpiReportResponse[]>([]);
  const [allPagination, setAllPagination] = useState<PaginatedReportResponse | null>(null);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [allError, setAllError] = useState<string | null>(null);

  const fetchAllReports = useCallback(async (query: ReportListQuery = DEFAULT_REPORT_QUERY) => {
    const requestId = ++requestSeqRef.current.all;
    latestQueryRef.current.all = query;
    setIsLoadingAll(true);
    setAllError(null);
    try {
      const data = await reportV1Api.getReports('all', query);
      if (mountedRef.current && requestId === requestSeqRef.current.all) {
        setAllReports(data.content);
        setAllPagination(data);
      }
    } catch (err) {
      if (mountedRef.current && requestId === requestSeqRef.current.all) {
        setAllReports([]);
        setAllPagination(null);
        setAllError(extractReportV1Error(err));
      }
    } finally {
      if (mountedRef.current && requestId === requestSeqRef.current.all) setIsLoadingAll(false);
    }
  }, []);

  /* ── Recoverable conflict state ── */
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
      await fetchToReview(latestQueryRef.current.review);
      return true;
    } catch (err) {
      const raw = extractErrorMessage(err, '');
      const kind = classifyReportError(raw);
      if (kind !== 'other') {
        setRecoverable(recoverableConflict(kind));
        await fetchToReview(latestQueryRef.current.review);
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
      await fetchToReview(latestQueryRef.current.review);
      return true;
    } catch (err) {
      const raw = extractErrorMessage(err, '');
      const kind = classifyReportError(raw);
      if (kind !== 'other') {
        setRecoverable(recoverableConflict(kind));
        await fetchToReview(latestQueryRef.current.review);
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
    myPagination,
    isLoadingMy,
    myError,
    fetchMyReports,
    toReview,
    reviewPagination,
    isLoadingReview,
    reviewError,
    fetchToReview,
    allReports,
    allPagination,
    isLoadingAll,
    allError,
    fetchAllReports,
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

/** Known report mutation error → safe Indonesian message. */
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
