'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Alert, Breadcrumbs, BreadcrumbsItem, Button } from '@heroui/react';
import { ArrowsClockwise, House, X } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS } from '@/modules/kpi/constants';
import { useReportData } from '@/modules/kpi/report/use-report-data';
import { ReportTable } from '@/modules/kpi/report/report-table';
import { ReportDetailModal } from '@/modules/kpi/report/report-detail-modal';
import { ReportReviewDialog } from '@/modules/kpi/report/report-review-dialog';
import { ReassignReviewerDialog } from '@/modules/kpi/admin/reassign-reviewer-dialog';
import type { KpiReportResponse } from '@/modules/kpi/report/report-v1.types';
import { KpiTableToolbar } from '@/modules/kpi/shared/kpi-table';
import { paginateKpiItems, useKpiTableState } from '@/modules/kpi/shared/use-kpi-table-state';
import { useDebounce } from '@/hooks/use-debounce';

const REPORT_REVIEW_TABLE_STATE = { sortOptions: ['activityName', 'createdAt'], defaultSort: 'activityName', defaultDirection: 'asc' as const, filterOptions: ['PENDING', 'APPROVED', 'REJECTED'] };

/**
 * Report Reviews (`/kpi/report-reviews`) — the review queue for the active user.
 *   - Data     → GET /api/v1/kpi-reports?scope=to-review ONLY (never mine).
 *     Hierarchy-assigned non-root reports (stored reviewer) PLUS top-level
 *     root reports in the centralized company queue for kpi_report:root_review
 *     holders.
 *   - Approve/reject live here; reassignment (T18, kpi_report:manage) applies
 *     to hierarchy-assigned reports only — never to top-level roots.
 *   - Self-review is banned by the backend; a rejected attempt surfaces as the
 *     recoverable "You cannot review your own report" banner.
 * Visibility: same Reporting audience as My Reports — `kpi_report:root_review`
 * is NOT a page gate (hierarchy reviewers without it still see assigned
 * non-root reports; users with nothing get an empty queue, not a 403).
 */
export default function KpiReportReviewsPage() {
  const { hasPerm } = usePermission();
  // T18 administrative tool — `kpi_report:manage` gates only this, never the page.
  const canReassignReviewer = hasPerm(PERM.KPI_REPORT_MANAGE);

  const {
    toReview, isLoadingReview, reviewError, fetchToReview,
    isApproving, isRejecting,
    recoverable, clearRecoverable,
  } = useReportData();
  const tableState = useKpiTableState(REPORT_REVIEW_TABLE_STATE);
  const { filters: tableFilters, setSearch } = tableState;
  const [searchInput, setSearchInput] = useState(tableState.filters.search);
  const debouncedSearch = useDebounce(searchInput, 400);
  useEffect(() => { if (debouncedSearch !== tableFilters.search) setSearch(debouncedSearch); }, [debouncedSearch, tableFilters.search, setSearch]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSearchInput(tableFilters.search); }, [tableFilters.search]);

  // Fetch on mount (direct-load / refresh safe)
  useEffect(() => {
    fetchToReview();
  }, [fetchToReview]);

  // ── Detail modal (REVIEW mode) ──
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    mode: 'REVIEW';
    report: KpiReportResponse | null;
  }>({ isOpen: false, mode: 'REVIEW', report: null });

  const openDetail = useCallback((id: string) => {
    const found = toReview.find((r) => r.id === id);
    if (found) setDetailModal({ isOpen: true, mode: 'REVIEW', report: found });
  }, [toReview]);

  const closeDetail = useCallback(() => {
    setDetailModal({ isOpen: false, mode: 'REVIEW', report: null });
  }, []);

  // ── Review dialog (approve/reject confirmation) ──
  const [reviewDialog, setReviewDialog] = useState<{
    isOpen: boolean;
    mode: 'APPROVE' | 'REJECT';
    report: KpiReportResponse | null;
  }>({ isOpen: false, mode: 'APPROVE', report: null });

  const openApprove = useCallback((id: string) => {
    const found = toReview.find((r) => r.id === id);
    if (found) setReviewDialog({ isOpen: true, mode: 'APPROVE', report: found });
  }, [toReview]);

  const openReject = useCallback((id: string) => {
    const found = toReview.find((r) => r.id === id);
    if (found) setReviewDialog({ isOpen: true, mode: 'REJECT', report: found });
  }, [toReview]);

  const closeReviewDialog = useCallback(() => {
    setReviewDialog({ isOpen: false, mode: 'APPROVE', report: null });
  }, []);

  const handleReviewSuccess = useCallback(() => {
    closeDetail();
    closeReviewDialog();
    fetchToReview();
  }, [closeDetail, closeReviewDialog, fetchToReview]);

  // ── Reassign reviewer dialog (T18, kpi_report:manage) ──
  const [reassignReport, setReassignReport] = useState<KpiReportResponse | null>(null);

  const openReassignReviewer = useCallback((report: KpiReportResponse) => {
    setReassignReport(report);
  }, []);

  const closeReassignReviewer = useCallback(() => {
    setReassignReport(null);
  }, []);

  const visibleReports = toReview.filter((report) =>
    (!tableState.filters.search || report.activityName.toLowerCase().includes(tableState.filters.search.toLowerCase()))
    && (!tableState.filters.filter || report.status === tableState.filters.filter),
  ).sort((left, right) => {
    const leftValue = tableState.filters.sortBy === 'createdAt' ? left.createdAt : left.activityName;
    const rightValue = tableState.filters.sortBy === 'createdAt' ? right.createdAt : right.activityName;
    return leftValue.localeCompare(rightValue, 'id-ID') * (tableState.filters.direction === 'desc' ? -1 : 1);
  });
  const pagedReports = paginateKpiItems(visibleReports, tableState.filters.page);

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem>KPI</BreadcrumbsItem>
        <BreadcrumbsItem>{KPI_LABELS.reportReviews}</BreadcrumbsItem>
      </Breadcrumbs>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.reportReviews}</h1>
        <div className="flex items-center gap-2">
          <Button isIconOnly variant="tertiary" onPress={fetchToReview} isDisabled={isLoadingReview} aria-label="Muat ulang laporan">
            <ArrowsClockwise className={`h-4 w-4 ${isLoadingReview ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Recoverable conflict banner (already-processed / self-review etc.) */}
      {recoverable && (
        <div className="relative">
          <Alert status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Report Already Processed</Alert.Title>
              <Alert.Description>{recoverable.message}</Alert.Description>
            </Alert.Content>
          </Alert>
          <Button
            isIconOnly
            variant="tertiary"
            size="sm"
            className="absolute right-2 top-2"
            onPress={clearRecoverable}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <KpiTableToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchLabel="Cari laporan"
        filterOptions={[{ id: 'PENDING', label: 'Menunggu Persetujuan' }, { id: 'APPROVED', label: 'Disetujui' }, { id: 'REJECTED', label: 'Ditolak' }]}
        selectedFilterIds={tableState.filters.filter ? new Set([tableState.filters.filter]) : new Set()}
        onFilterChange={(selection) => { const selected = selection instanceof Set ? Array.from(selection)[0] : undefined; tableState.setFilter(String(selected ?? '')); }}
        sortOptions={[{ id: 'activityName:asc', label: 'Nama (A-Z)' }, { id: 'activityName:desc', label: 'Nama (Z-A)' }, { id: 'createdAt:desc', label: 'Terbaru' }, { id: 'createdAt:asc', label: 'Terlama' }]}
        selectedSortId={`${tableState.filters.sortBy}:${tableState.filters.direction}`}
        onSortChange={(selection) => { const selected = selection instanceof Set ? String(Array.from(selection)[0] ?? '') : ''; const [field, direction] = selected.split(':') as ['activityName' | 'createdAt', 'asc' | 'desc']; if (field && direction) tableState.setSort(field, direction); }}
        hasActiveFilters={Boolean(tableState.filters.search || tableState.filters.filter || tableState.filters.sortBy !== REPORT_REVIEW_TABLE_STATE.defaultSort || tableState.filters.direction !== 'asc')}
        onReset={() => { setSearchInput(''); tableState.reset(); }}
      />

      <ReportTable
        items={pagedReports.items}
        isLoading={isLoadingReview || tableState.isQueryLoading}
        error={reviewError}
        mode="TO_REVIEW"
        onViewDetail={openDetail}
        onReassignReviewer={canReassignReviewer ? openReassignReviewer : undefined}
        totalItems={pagedReports.totalItems}
        currentPage={pagedReports.page}
        totalPages={pagedReports.totalPages}
        onPageChange={tableState.setPage}
      />

      {/* Detail Modal — REVIEW mode exposes approve/reject */}
      <ReportDetailModal
        key={detailModal.isOpen ? detailModal.report?.id || 'detail' : 'closed'}
        isOpen={detailModal.isOpen}
        onClose={closeDetail}
        report={detailModal.report}
        mode={detailModal.mode}
        onApprove={detailModal.mode === 'REVIEW' ? openApprove : undefined}
        onReject={detailModal.mode === 'REVIEW' ? openReject : undefined}
      />

      {/* Review Dialog */}
      {reviewDialog.report && (
        <ReportReviewDialog
          key={reviewDialog.isOpen ? `${reviewDialog.mode}-${reviewDialog.report.id}` : 'closed'}
          isOpen={reviewDialog.isOpen}
          onClose={closeReviewDialog}
          report={reviewDialog.report}
          mode={reviewDialog.mode}
          onSuccess={handleReviewSuccess}
        />
      )}

      {(isApproving || isRejecting) && (
        <div className="sr-only" aria-live="polite">Memproses laporan...</div>
      )}

      {/* T18 — administrative reviewer reassignment (hierarchy-assigned reports only) */}
      {reassignReport && (
        <ReassignReviewerDialog
          key={reassignReport.id}
          isOpen={true}
          onClose={closeReassignReviewer}
          report={reassignReport}
          onSuccess={fetchToReview}
        />
      )}
    </div>
  );
}
