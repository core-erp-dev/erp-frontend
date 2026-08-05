'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Breadcrumbs, BreadcrumbsItem, Button } from '@heroui/react';
import { Plus, ArrowsClockwise, House } from '@phosphor-icons/react';
import { KPI_LABELS } from '@/modules/kpi/constants';
import { useReportData } from '@/modules/kpi/report/use-report-data';
import { ReportTable } from '@/modules/kpi/report/report-table';
import { ReportDetailModal } from '@/modules/kpi/report/report-detail-modal';
import { ReportSubmitModal } from '@/modules/kpi/report/report-submit-modal';
import type { KpiReportResponse } from '@/modules/kpi/report/report-v1.types';

/**
 * My Reports (`/kpi/reports`) — execution reports submitted by the active user.
 *   - Data     → GET /api/v1/kpi-reports?scope=mine ONLY (never to-review).
 *   - Detail/evidence stay available; top-level root reports show their
 *     reviewer as "Company queue".
 *   - NO approve/reject here — review actions live on `/kpi/report-reviews`.
 * Any authenticated user may open this page (responsibility-based access).
 */
export default function KpiMyReportsPage() {
  const { myReports, isLoadingMy, myError, fetchMyReports, isSubmitting } = useReportData();

  // Fetch on mount (direct-load / refresh safe)
  useEffect(() => {
    fetchMyReports();
  }, [fetchMyReports]);

  // ── Detail modal ──
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    mode: 'MY';
    report: KpiReportResponse | null;
  }>({ isOpen: false, mode: 'MY', report: null });

  const openDetail = useCallback((id: string) => {
    const found = myReports.find((r) => r.id === id);
    if (found) setDetailModal({ isOpen: true, mode: 'MY', report: found });
  }, [myReports]);

  const closeDetail = useCallback(() => {
    setDetailModal({ isOpen: false, mode: 'MY', report: null });
  }, []);

  // ── Submit modal ──
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  const handleSubmitSuccess = useCallback(() => {
    fetchMyReports();
  }, [fetchMyReports]);

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem>KPI</BreadcrumbsItem>
        <BreadcrumbsItem>{KPI_LABELS.reports}</BreadcrumbsItem>
      </Breadcrumbs>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.reports}</h1>
        <div className="flex items-center gap-2">
          <Button isIconOnly variant="tertiary" onPress={fetchMyReports} isDisabled={isLoadingMy} aria-label="Refresh">
            <ArrowsClockwise className={`h-4 w-4 ${isLoadingMy ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="primary" size="sm" onPress={() => setSubmitModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Submit Report
          </Button>
        </div>
      </div>

      <ReportTable
        items={myReports}
        isLoading={isLoadingMy}
        error={myError}
        mode="MY"
        onViewDetail={openDetail}
      />

      {/* Detail Modal — read-only, never shows approve/reject */}
      <ReportDetailModal
        key={detailModal.isOpen ? detailModal.report?.id || 'detail' : 'closed'}
        isOpen={detailModal.isOpen}
        onClose={closeDetail}
        report={detailModal.report}
        mode={detailModal.mode}
      />

      {/* Submit Modal */}
      <ReportSubmitModal
        isOpen={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        onSuccess={handleSubmitSuccess}
      />

      {isSubmitting && (
        <div className="sr-only" aria-live="polite">Processing report...</div>
      )}
    </div>
  );
}
