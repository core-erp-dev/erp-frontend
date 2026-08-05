'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal, Chip, Button, Spinner, Surface,
} from '@heroui/react';
import { X, ClipboardText, Checks } from '@phosphor-icons/react';
import { useActivityData } from './use-activity-data';
import { activityV1Api } from './activity-v1-api';
import {
  ACTIVITY_STATUS_LABEL,
  REQUEST_TYPE_LABEL,
  REQUEST_STATUS_LABEL,
  type KpiActivityResponse,
  type KpiActivityChangeRequestResponse,
  type KpiActivityStatus,
  type KpiActivityRequestType,
  type KpiActivityRequestStatus,
} from './activity-v1.types';

type DetailMode = 'ACTIVITY' | 'REQUEST';

interface KpiActivityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: DetailMode;
  entityId: string | null;
}

/* ── Chip color maps ── */

const ACTIVITY_STATUS_CHIP_COLOR: Record<KpiActivityStatus, 'default' | 'success'> = {
  ACTIVE: 'success',
  CANCELLED: 'default',
};

const REQUEST_TYPE_CHIP_COLOR: Record<KpiActivityRequestType, 'accent' | 'default' | 'warning'> = {
  CREATE: 'accent',
  UPDATE: 'default',
  CANCEL: 'warning',
};

const REQUEST_STATUS_CHIP_COLOR: Record<KpiActivityRequestStatus, 'success' | 'danger' | 'warning'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

/**
 * Shared Activity / Activity-request detail modal.
 * Used by BOTH `/kpi/activities` (activity + request detail) and
 * `/kpi/approvals` (request detail) — one presentation, no duplication.
 */
export function KpiActivityDetailModal({
  isOpen, onClose, mode, entityId,
}: KpiActivityDetailModalProps) {
  const { fetchActivityDetail, fetchRequestDetail } = useActivityData();
  const [activity, setActivity] = useState<KpiActivityResponse | null>(null);
  const [request, setRequest] = useState<KpiActivityChangeRequestResponse | null>(null);
  const [currentActivity, setCurrentActivity] = useState<KpiActivityResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!entityId) return;
    setIsLoading(true);
    setCurrentActivity(null);
    setLoadError(null);

    const load = async () => {
      if (mode === 'ACTIVITY') {
        const result = await fetchActivityDetail(entityId);
        if (result) setActivity(result);
        else setLoadError('Failed to load activity detail.');
      } else {
        const result = await fetchRequestDetail(entityId);
        if (result) {
          setRequest(result);
          // Lazy-fetch current activity for UPDATE comparison (may 403 for a
          // requester who is not the assignee — comparison is best-effort).
          if (result.requestType === 'UPDATE' && result.activityId) {
            const current = await activityV1Api.getActivityById(result.activityId).catch(() => null);
            setCurrentActivity(current);
          }
        } else {
          setLoadError('Failed to load request detail.');
        }
      }
      setIsLoading(false);
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, mode]);

  const handleClose = useCallback(() => {
    setActivity(null);
    setRequest(null);
    setCurrentActivity(null);
    setLoadError(null);
    onClose();
  }, [onClose]);

  const renderActivityDetail = () => {
    if (!activity) return null;
    return (
      <div className="flex flex-col gap-6">
        <Surface className="flex flex-col gap-4 rounded-3xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Activity Information</h2>
          <DetailRow label="Activity Name" value={activity.activityName} />
          <DetailRow label="Description" value={activity.description || '-'} />
          <DetailRow label="Parent Activity" value={activity.parentActivityName || '-'} />
          <DetailRow label="Corporate KPI" value={activity.corporateKpiName} />
          <DetailRow label="Period" value={`${activity.periodYear}-${String(activity.periodMonth).padStart(2, '0')}`} />
          <DetailRow label="Unit" value={activity.unit} />
          <DetailRow label="Target Value" value={String(activity.targetValue)} />
          <DetailRow label="Realized Value" value={String(activity.realizedValue)} />
          <DetailRow label="Progress" value={`${Math.round(activity.progressPercent)}%`} />
          <DetailRow label="Status" value={
            <Chip size="sm" color={ACTIVITY_STATUS_CHIP_COLOR[activity.status]} variant="soft">
              {ACTIVITY_STATUS_LABEL[activity.status]}
            </Chip>
          } />
          <DetailRow label="Assignee" value={activity.assignedToUserName} />
          <DetailRow label="Position" value={activity.assignedToPositionName} />
        </Surface>
      </div>
    );
  };

  const renderComparison = (label: string, currentVal: React.ReactNode, proposedVal: React.ReactNode) => (
    <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-secondary px-3 py-2 text-sm">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className="text-muted-foreground line-through">{currentVal}</span>
      <span className="font-medium text-foreground">{proposedVal}</span>
    </div>
  );

  const renderRequestDetail = () => {
    if (!request) return null;
    const isCancel = request.requestType === 'CANCEL';
    const isUpdate = request.requestType === 'UPDATE';

    return (
      <div className="flex flex-col gap-6">
        {isUpdate && currentActivity && (
          <Surface className="flex flex-col gap-3 rounded-3xl p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Current vs Proposed</h2>
            <div className="grid grid-cols-3 gap-1 text-xs text-muted-foreground">
              <span>Field</span><span>Current</span><span>Proposed</span>
            </div>
            {renderComparison('Activity Name', currentActivity.activityName, request.activityName || '-')}
            {renderComparison('Description', currentActivity.description || '-', request.description || '-')}
            {renderComparison('Unit', currentActivity.unit, request.unit || '-')}
            {renderComparison('Target', String(currentActivity.targetValue), request.targetValue != null ? String(request.targetValue) : '-')}
          </Surface>
        )}

        <Surface className="flex flex-col gap-4 rounded-3xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Request Information</h2>
          <DetailRow label="Request Type" value={
            <Chip size="sm" color={REQUEST_TYPE_CHIP_COLOR[request.requestType]} variant="soft">
              {REQUEST_TYPE_LABEL[request.requestType]}
            </Chip>
          } />
          <DetailRow label="Status" value={
            <Chip size="sm" color={REQUEST_STATUS_CHIP_COLOR[request.status]} variant="soft">
              {REQUEST_STATUS_LABEL[request.status]}
            </Chip>
          } />
          <DetailRow label="Activity Name" value={request.activityName || '-'} />
          {isCancel && request.cancellationReason ? <DetailRow label="Cancellation Reason" value={request.cancellationReason} /> : null}
          <DetailRow label="Parent Activity" value={request.parentActivityName || '-'} />
          <DetailRow label="Corporate KPI" value={request.corporateKpiName || '-'} />
          <DetailRow label="Assignee" value={request.assignedToUserName || '-'} />
          <DetailRow label="Period" value={request.periodYear ? `${request.periodYear}-${String(request.periodMonth).padStart(2, '0')}` : '-'} />
          <DetailRow label="Unit" value={request.unit || '-'} />
          <DetailRow label="Target Value" value={request.targetValue != null ? String(request.targetValue) : '-'} />
          <DetailRow label="Requested By" value={request.requestedByUserName} />
          {request.rejectionReason ? <DetailRow label="Rejection Reason" value={request.rejectionReason} /> : null}
        </Surface>
      </div>
    );
  };

  const title = mode === 'ACTIVITY' ? 'Activity Detail' : 'Request Detail';
  const Icon = mode === 'ACTIVITY' ? ClipboardText : Checks;

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <Modal.Backdrop isDismissable={false}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[600px]">
            <Modal.Header>
              <Modal.Icon className="bg-primary-soft text-primary-soft-foreground">
                <Icon className="size-5" />
              </Modal.Icon>
              <Modal.Heading>{title}</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body>
              {isLoading ? (
                <div className="flex h-48 items-center justify-center"><Spinner size="md" /></div>
              ) : loadError ? (
                <div className="flex items-center justify-center rounded-3xl bg-surface-secondary p-8 text-sm text-danger">{loadError}</div>
              ) : mode === 'ACTIVITY' ? renderActivityDetail() : renderRequestDetail()}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={handleClose}>
                <X className="h-4 w-4" />
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-36 shrink-0 text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}
