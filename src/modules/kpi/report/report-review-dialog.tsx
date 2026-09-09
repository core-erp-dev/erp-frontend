'use client';

import { useCallback } from 'react';
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
  const { approveReport, rejectReport } = useReportData();
  const isApproval = mode === 'APPROVE';

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return <KpiRejectionDialog mode={isApproval ? 'APPROVE' : 'REJECT'} isOpen={isOpen} title={isApproval ? 'Setujui Laporan' : 'Tolak Laporan'} description={<>Anda akan {isApproval ? 'menyetujui' : 'menolak'} laporan pelaksanaan dari <strong>{report.submittedByUserName}</strong> untuk <strong className="text-foreground">{report.activityName}</strong>.</>} onClose={handleClose} onSubmit={async (reason) => { const success = isApproval ? await approveReport(report.id, { approvalReason: reason }) : await rejectReport(report.id, { rejectionReason: reason }); if (success) onSuccess(); return success; }} />;
}
