'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Alert, Breadcrumbs, BreadcrumbsItem, Button, Tabs } from '@heroui/react';
import { Plus, ArrowsClockwise, House, X } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS } from '@/modules/kpi/constants';
import { useReportData } from '@/modules/kpi/report/use-report-data';
import { ReportTable } from '@/modules/kpi/report/report-table';
import { ReportDetailModal } from '@/modules/kpi/report/report-detail-modal';
import { ReportSubmitModal } from '@/modules/kpi/report/report-submit-modal';
import { ReportReviewDialog } from '@/modules/kpi/report/report-review-dialog';
import { ReassignReviewerDialog } from '@/modules/kpi/admin/reassign-reviewer-dialog';
import type { KpiReportResponse } from '@/modules/kpi/report/report-v1.types';

type TabId = 'my-reports' | 'review-queue';

/**
 * Reports (`/kpi/reports`) — employee Report workflow.
 *   - My Reports     → GET /api/v1/kpi-reports?scope=mine
 *   - Review Queue   → GET /api/v1/kpi-reports?scope=to-review — assigned
 *     hierarchy reports (stored reviewer) PLUS top-level root reports in the
 *     centralized company queue for kpi_report:root_review holders.
 *   - Submission is exact-assignee; approve/reject are SEPARATE operations
 *     (T16/T17). `kpi_report:manage` gates only administrative tools (P5);
 *     T18 reassignment is available for hierarchy-assigned reports only.
 * Any authenticated user may open this page (responsibility-based access).
 */
export default function KpiReportsPage() {
  const { hasPerm } = usePermission();
  // T18 administrative tool — `kpi_report:manage` gates only this, never the page.
  const canReassignReviewer = hasPerm(PERM.KPI_REPORT_MANAGE);

  const {
    myReports, isLoadingMy, myError, fetchMyReports,
    toReview, isLoadingReview, reviewError, fetchToReview,
    isSubmitting,
    isApproving,
    isRejecting,
    recoverable, clearRecoverable,
  } = useReportData();

  // Reports the actor submitted — visible in the queue but NOT actionable
  // (UX guard; the backend is the authoritative self-review ban).
  const ownReportIds = useMemo(() => new Set(myReports.map((r) => r.id)), [myReports]);

  // ── Tabs (both always available — scopes are responsibility-based) ──
  const tabs = useMemo<{ id: TabId; label: string }[]>(() => [
    { id: 'my-reports', label: 'My Reports' },
    { id: 'review-queue', label: 'Review Queue' },
  ], []);

  const [activeTab, setActiveTab] = useState<TabId>('my-reports');
  const effectiveTab = tabs.some((t) => t.id === activeTab) ? activeTab : tabs[0].id;

  // ── Fetch on tab activation ──
  useEffect(() => {
    if (activeTab === 'my-reports') fetchMyReports();
  }, [activeTab, fetchMyReports]);

  useEffect(() => {
    if (activeTab === 'review-queue') fetchToReview();
  }, [activeTab, fetchToReview]);

  // ── Detail modal ──
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    mode: 'MY' | 'REVIEW';
    report: KpiReportResponse | null;
  }>({ isOpen: false, mode: 'MY', report: null });

  const openDetail = useCallback((id: string) => {
    const all = [...myReports, ...toReview];
    const found = all.find((r) => r.id === id);
    if (!found) return;
    const mode = found.status === 'PENDING' && toReview.some((r) => r.id === id)
      ? 'REVIEW' as const
      : 'MY' as const;
    setDetailModal({ isOpen: true, mode, report: found });
  }, [myReports, toReview]);

  const closeDetail = useCallback(() => {
    setDetailModal({ isOpen: false, mode: 'MY', report: null });
  }, []);

  // ── Submit modal ──
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  const handleSubmitSuccess = useCallback(() => {
    fetchMyReports();
  }, [fetchMyReports]);

  // ── Review dialog ──
  const [reviewDialog, setReviewDialog] = useState<{
    isOpen: boolean;
    mode: 'APPROVE' | 'REJECT';
    report: KpiReportResponse | null;
  }>({ isOpen: false, mode: 'APPROVE', report: null });

  const openApprove = useCallback((id: string) => {
    const found = toReview.find((r) => r.id === id);
    if (found && !ownReportIds.has(found.id)) {
      setReviewDialog({ isOpen: true, mode: 'APPROVE', report: found });
    }
  }, [toReview, ownReportIds]);

  const openReject = useCallback((id: string) => {
    const found = toReview.find((r) => r.id === id);
    if (found && !ownReportIds.has(found.id)) {
      setReviewDialog({ isOpen: true, mode: 'REJECT', report: found });
    }
  }, [toReview, ownReportIds]);

  const closeReviewDialog = useCallback(() => {
    setReviewDialog({ isOpen: false, mode: 'APPROVE', report: null });
  }, []);

  const handleReviewSuccess = useCallback(() => {
    closeDetail();
    closeReviewDialog();
    fetchToReview();
  }, [closeDetail, closeReviewDialog, fetchToReview]);

  // ── Reassign reviewer dialog state (T18, kpi_report:manage) ──
  const [reassignReport, setReassignReport] = useState<KpiReportResponse | null>(null);

  const openReassignReviewer = useCallback((report: KpiReportResponse) => {
    setReassignReport(report);
  }, []);

  const closeReassignReviewer = useCallback(() => {
    setReassignReport(null);
  }, []);

  const isAnyLoading = isLoadingMy || isLoadingReview;

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem>KPI</BreadcrumbsItem>
        <BreadcrumbsItem>Reports</BreadcrumbsItem>
      </Breadcrumbs>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.reports}</h1>
        <div className="flex items-center gap-2">
          <Button isIconOnly variant="tertiary" onPress={() => {
            if (effectiveTab === 'my-reports') fetchMyReports();
            else fetchToReview();
          }} isDisabled={isAnyLoading} aria-label="Refresh">
            <ArrowsClockwise className={`h-4 w-4 ${isAnyLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="primary" size="sm" onPress={() => setSubmitModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Submit Report
          </Button>
        </div>
      </div>

      {/* Recoverable conflict banner */}
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

      <Tabs
        className="w-full"
        selectedKey={effectiveTab}
        onSelectionChange={(key) => setActiveTab(key as TabId)}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="KPI Reports">
            {tabs.map((tab) => (
              <Tabs.Tab key={tab.id} id={tab.id}>
                {tab.label}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>

        {tabs.map((tab) => (
          <Tabs.Panel key={tab.id} id={tab.id} className="pt-4">
            {tab.id === 'my-reports' && (
              <ReportTable
                items={myReports}
                isLoading={isLoadingMy}
                error={myError}
                mode="MY"
                onViewDetail={openDetail}
              />
            )}
            {tab.id === 'review-queue' && (
              <ReportTable
                items={toReview}
                isLoading={isLoadingReview}
                error={reviewError}
                mode="TO_REVIEW"
                onViewDetail={openDetail}
                onReassignReviewer={canReassignReviewer ? openReassignReviewer : undefined}
              />
            )}
          </Tabs.Panel>
        ))}
      </Tabs>

      {/* Detail Modal */}
      <ReportDetailModal
        key={detailModal.isOpen ? detailModal.report?.id || 'detail' : 'closed'}
        isOpen={detailModal.isOpen}
        onClose={closeDetail}
        report={detailModal.report}
        mode={detailModal.mode}
        onApprove={detailModal.mode === 'REVIEW' ? openApprove : undefined}
        onReject={detailModal.mode === 'REVIEW' ? openReject : undefined}
        disableDecisions={detailModal.report ? ownReportIds.has(detailModal.report.id) : false}
      />

      {/* Submit Modal */}
      <ReportSubmitModal
        isOpen={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        onSuccess={handleSubmitSuccess}
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

      {(isSubmitting || isApproving || isRejecting) && (
        <div className="sr-only" aria-live="polite">Processing report...</div>
      )}

      {/* T18 — administrative reviewer reassignment */}
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
