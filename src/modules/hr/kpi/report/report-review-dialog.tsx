'use client';

import React, { useState, useCallback } from 'react';
import { Modal, Button, TextField, TextArea, Label } from '@heroui/react';
import { Warning } from '@phosphor-icons/react';
import { useReportData } from './use-report-data';
import type { KpiReportResponse } from './report.types';

type ReviewMode = 'APPROVE' | 'REJECT';

interface ReportReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  report: KpiReportResponse;
  mode: ReviewMode;
  onSuccess: () => void;
}

export function ReportReviewDialog({
  isOpen, onClose, report, mode, onSuccess,
}: ReportReviewDialogProps) {
  const { approveReport, rejectReport, isApproving, isRejecting } = useReportData();
  const [rejectionReason, setRejectionReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const isApproval = mode === 'APPROVE';
  const isPending = isApproving || isRejecting;

  const handleConfirm = useCallback(async () => {
    setValidationError(null);

    if (!isApproval) {
      if (!rejectionReason.trim()) {
        setValidationError('Rejection reason is required.');
        return;
      }
      if (rejectionReason.length > 1000) {
        setValidationError('Rejection reason must not exceed 1,000 characters.');
        return;
      }
    }

    let success = false;
    if (isApproval) {
      success = await approveReport(report.id);
    } else {
      success = await rejectReport(report.id, { rejectionReason: rejectionReason.trim() });
    }

    if (success) {
      setRejectionReason('');
      onSuccess();
    }
  }, [isApproval, rejectionReason, approveReport, rejectReport, report.id, onSuccess]);

  const handleClose = useCallback(() => {
    setRejectionReason('');
    setValidationError(null);
    onClose();
  }, [onClose]);

  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <Modal.Backdrop isDismissable={false}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[420px]">
            <Modal.Header className="items-center text-center">
              <Modal.Icon className={`${isApproval ? 'bg-primary/10 text-primary' : 'bg-danger-soft text-danger-soft-foreground'}`}>
                <Warning className="size-5" />
              </Modal.Icon>
              <Modal.Heading>{isApproval ? 'Approve Report' : 'Reject Report'}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="space-y-3 text-center">
                <p className="text-sm text-muted-foreground">
                  {isApproval
                    ? `Approve this execution report from ${report.submittedByUserName}?`
                    : `Reject execution report from ${report.submittedByUserName}?`}
                </p>
                <div className="rounded-xl bg-surface-secondary p-3 text-left text-sm">
                  <p className="font-medium text-foreground">{report.activityName}</p>
                  <p className="mt-1 text-muted-foreground">
                    Realized: {report.realizedValue} {report.unit} &middot; Date: {report.reportDate}
                  </p>
                </div>

                {!isApproval && (
                  <div className="text-left">
                    <TextField
                      isRequired
                      value={rejectionReason}
                      onChange={(e) => { setRejectionReason(e); setValidationError(null); }}
                      isInvalid={!!validationError}
                    >
                      <Label>Rejection Reason</Label>
                      <TextArea variant="secondary" placeholder="Provide a reason for rejection..." rows={3} />
                    </TextField>
                    {validationError && <p className="mt-1 text-xs text-danger">{validationError}</p>}
                    <p className="mt-1 text-right text-xs text-muted-foreground">{rejectionReason.length}/1000</p>
                  </div>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer className="flex-col-reverse">
              <Button
                className="w-full"
                variant={isApproval ? 'primary' : 'danger'}
                onPress={handleConfirm}
                isDisabled={isPending}
                isPending={isPending}
              >
                {isApproval ? 'Approve' : 'Reject'}
              </Button>
              <Button className="w-full" variant="secondary" onPress={handleClose} isDisabled={isPending}>
                Cancel
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
