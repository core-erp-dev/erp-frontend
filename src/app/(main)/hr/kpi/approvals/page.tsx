'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Button } from '@heroui/react';
import { ArrowsClockwise } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS, KPI_DESCRIPTIONS } from '@/modules/hr/kpi/constants';
import { useApprovalData } from '@/modules/hr/kpi/activity/use-approval-data';
import { ApprovalTable } from '@/modules/hr/kpi/activity/approval-table';
import { ApprovalDialog } from '@/modules/hr/kpi/activity/approval-dialog';
import { KpiActivityDetailModal } from '@/modules/hr/kpi/activity/kpi-activity-detail-modal';
import type { KpiActivityChangeRequestResponse } from '@/modules/hr/kpi/activity/activity.types';

export default function KpiApprovalsPage() {
  const { hasPerm } = usePermission();
  const canApprove = hasPerm(PERM.KPI_ACTIVITY_APPROVE);

  const {
    pendingRequests, isLoadingPending, pendingError, fetchPending,
  } = useApprovalData();

  // Fetch on mount
  useEffect(() => {
    if (canApprove) fetchPending();
  }, [canApprove, fetchPending]);

  // ── Detail modal state ──
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const openDetail = useCallback((id: string) => {
    setDetailId(id);
    setDetailOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailId(null);
    setDetailOpen(false);
  }, []);

  // ── Approval dialog state ──
  const [dialogMode, setDialogMode] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [dialogRequest, setDialogRequest] = useState<KpiActivityChangeRequestResponse | null>(null);

  const openApprove = useCallback((req: KpiActivityChangeRequestResponse) => {
    setDialogMode('APPROVE');
    setDialogRequest(req);
  }, []);

  const openReject = useCallback((req: KpiActivityChangeRequestResponse) => {
    setDialogMode('REJECT');
    setDialogRequest(req);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogMode(null);
    setDialogRequest(null);
  }, []);

  // ── Permission guard ──
  if (!canApprove) {
    return (
      <div className="flex w-full flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.approvals}</h1>
          <p className="text-sm text-muted-foreground">{KPI_DESCRIPTIONS.approvals}</p>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.approvals}</h1>
          <p className="text-sm text-muted-foreground">{KPI_DESCRIPTIONS.approvals}</p>
        </div>
        <Button isIconOnly variant="tertiary" onPress={fetchPending} aria-label="Refresh">
          <ArrowsClockwise className="h-4 w-4" />
        </Button>
      </div>

      <ApprovalTable
        items={pendingRequests}
        isLoading={isLoadingPending}
        error={pendingError}
        onViewDetail={openDetail}
        onApprove={openApprove}
        onReject={openReject}
      />

      {/* Detail Modal */}
      <KpiActivityDetailModal
        key={detailId || 'closed'}
        isOpen={detailOpen}
        onClose={closeDetail}
        mode="REQUEST"
        entityId={detailId}
      />

      {/* Approve / Reject Dialog */}
      {dialogMode && dialogRequest && (
        <ApprovalDialog
          key={`${dialogMode}-${dialogRequest.id}`}
          isOpen={true}
          onClose={closeDialog}
          mode={dialogMode}
          request={dialogRequest}
        />
      )}
    </div>
  );
}
