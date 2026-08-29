'use client';

import React, { useCallback } from 'react';
import { Modal, Button } from '@heroui/react';
import { Warning } from '@phosphor-icons/react';
import { useReportData } from './use-report-data';
import type { KpiReportResponse } from './report-v1.types';
import { KpiRejectionDialog } from '@/modules/kpi/shared/kpi-rejection-dialog';

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
  const isApproval = mode === 'APPROVE';
  const isPending = isApproving || isRejecting;

  const handleConfirm = useCallback(async () => {
    const success = await approveReport(report.id);
    if (success) onSuccess();
  }, [approveReport, report.id, onSuccess]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isApproval) return <KpiRejectionDialog isOpen={isOpen} title="Tolak Laporan" description={<>Anda akan menolak laporan pelaksanaan dari <strong>{report.submittedByUserName}</strong> untuk <strong className="text-foreground">{report.activityName}</strong>.</>} onClose={handleClose} onSubmit={async (reason) => { const success = await rejectReport(report.id, { rejectionReason: reason }); if (success) onSuccess(); return success; }} />;

  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <Modal.Backdrop isDismissable={false}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[420px]">
            <Modal.Header className="items-center text-center">
              <Modal.Icon className={`${isApproval ? 'bg-primary/10 text-primary' : 'bg-danger-soft text-danger-soft-foreground'}`}>
                <Warning className="size-5" />
              </Modal.Icon>
        <Modal.Heading>{isApproval ? 'Setujui Laporan' : 'Tolak Laporan'}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="space-y-3 text-center">
                <p className="text-sm text-muted-foreground">
                  {isApproval
                    ? `Setujui laporan pelaksanaan dari ${report.submittedByUserName}?`
                    : `Tolak laporan pelaksanaan dari ${report.submittedByUserName}?`}
                </p>
                <div className="rounded-xl bg-surface-secondary p-3 text-left text-sm">
                  <p className="font-medium text-foreground">{report.activityName}</p>
                  <p className="mt-1 text-muted-foreground">
                    Realisasi: {report.realizedValue} {report.unit} &middot; Tanggal: {report.reportDate}
                  </p>
                </div>

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
                {isApproval ? 'Setujui' : 'Tolak'}
              </Button>
              <Button className="w-full" variant="secondary" onPress={handleClose} isDisabled={isPending}>
                Batal
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
