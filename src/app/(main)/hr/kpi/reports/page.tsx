'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Alert, Button, Tabs } from '@heroui/react';
import { Plus, ArrowsClockwise } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS, KPI_DESCRIPTIONS } from '@/modules/hr/kpi/constants';
import { useReportData } from '@/modules/hr/kpi/report/use-report-data';
import { ReportTable } from '@/modules/hr/kpi/report/report-table';
import { ReportDetailModal } from '@/modules/hr/kpi/report/report-detail-modal';
import { ReportSubmitModal } from '@/modules/hr/kpi/report/report-submit-modal';
import { ReportReviewDialog } from '@/modules/hr/kpi/report/report-review-dialog';
import type { KpiReportResponse } from '@/modules/hr/kpi/report/report.types';

type TabId = 'my-reports' | 'review-queue';

export default function KpiReportsPage() {
  const { hasPerm, hasAnyPerm } = usePermission();

  // Capabilities (same rule as sidebar)
  const canReadMyReports = hasPerm(PERM.KPI_REPORT_READ);
  const canReviewReports = hasPerm(PERM.KPI_REPORT_REVIEW);
  const canSubmitReport = hasPerm(PERM.KPI_REPORT_SUBMIT) && hasPerm(PERM.KPI_ACTIVITY_READ);
  const canAccess = canReadMyReports || canReviewReports || canSubmitReport;

  // Data hook
  const {
    myReports, isLoadingMy, myError, fetchMyReports,
    toReview, isLoadingReview, reviewError, fetchToReview,
    submitReport, isSubmitting,
    approveReport, isApproving,
    rejectReport, isRejecting,
  } = useReportData();

  // ── Tabs (permission-aware) ──
  const tabs = useMemo(() => {
    const result: { id: TabId; label: string }[] = [];
    if (canReadMyReports) result.push({ id: 'my-reports', label: 'My Reports' });
    if (canReviewReports) result.push({ id: 'review-queue', label: 'Review Queue' });
    return result;
  }, [canReadMyReports, canReviewReports]);

  const [activeTab, setActiveTab] = useState<TabId>('my-reports');
  const effectiveTab = tabs.some((t) => t.id === activeTab) ? activeTab : tabs[0]?.id;

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
    const mode = canReviewReports && found.status === 'PENDING' && toReview.some((r) => r.id === id)
      ? 'REVIEW' as const
      : 'MY' as const;
    setDetailModal({ isOpen: true, mode, report: found });
  }, [myReports, toReview, canReviewReports]);

  const closeDetail = useCallback(() => {
    setDetailModal({ isOpen: false, mode: 'MY', report: null });
  }, []);

  // ── Submit modal ──
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  const handleSubmitSuccess = useCallback(() => {
    if (canReadMyReports) fetchMyReports();
  }, [canReadMyReports, fetchMyReports]);

  // ── Review dialog ──
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

  // ── Permission guard ──
  if (!canAccess) {
    return (
      <div className="flex w-full flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.reports}</h1>
          <p className="text-sm text-muted-foreground">{KPI_DESCRIPTIONS.reports}</p>
        </div>
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Access Denied</Alert.Title>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.reports}</h1>
          <p className="text-sm text-muted-foreground">{KPI_DESCRIPTIONS.reports}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button isIconOnly variant="tertiary" onPress={() => {
            if (effectiveTab === 'my-reports') fetchMyReports();
            else if (effectiveTab === 'review-queue') fetchToReview();
          }}>
            <ArrowsClockwise className="h-4 w-4" />
          </Button>
          {canSubmitReport && (
            <Button variant="primary" size="sm" onPress={() => setSubmitModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Submit Report
            </Button>
          )}
        </div>
      </div>

      {/* Tabs (only when at least one tab) */}
      {tabs.length > 0 ? (
        <Tabs
          className="w-full"
          selectedKey={effectiveTab || 'my-reports'}
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
                />
              )}
            </Tabs.Panel>
          ))}
        </Tabs>
      ) : canSubmitReport ? (
        /* Submit-only user: show centered prompt */
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl p-12 text-muted-foreground">
          <p className="text-sm">You have permission to submit reports.</p>
          <p className="text-sm">Use the Submit Report button above to submit an execution report for an assigned activity.</p>
        </div>
      ) : null}

      {/* Detail Modal */}
      <ReportDetailModal
        key={detailModal.isOpen ? detailModal.report?.id || 'detail' : 'closed'}
        isOpen={detailModal.isOpen}
        onClose={closeDetail}
        report={detailModal.report}
        mode={detailModal.mode}
        onApprove={detailModal.mode === 'REVIEW' ? openApprove : undefined}
        onReject={detailModal.mode === 'REVIEW' ? openReject : undefined}
      />

      {/* Submit Modal */}
      <ReportSubmitModal
        isOpen={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        onSuccess={handleSubmitSuccess}
        canReadMyReports={canReadMyReports}
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
    </div>
  );
}
