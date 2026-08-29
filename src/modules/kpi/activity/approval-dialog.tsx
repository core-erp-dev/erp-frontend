'use client';

import React, { useCallback } from 'react';
import { Modal, Button } from '@heroui/react';
import { Warning } from '@phosphor-icons/react';
import { useApprovalData } from './use-approval-data';
import {
  REQUEST_TYPE_LABEL,
  type KpiActivityChangeRequestResponse,
} from './activity-v1.types';
import { KpiRejectionDialog } from '@/modules/kpi/shared/kpi-rejection-dialog';

type DialogMode = 'APPROVE' | 'REJECT';

interface ApprovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: DialogMode;
  request: KpiActivityChangeRequestResponse;
}

/**
 * Unified Activity-request decision dialog (T8).
 * APPROVE sends `{ decision: 'APPROVE' }` — never a rejectionReason.
 * REJECT requires a non-blank `rejectionReason` (≤1000) and sends
 * `{ decision: 'REJECT', rejectionReason }`.
 */
export function ApprovalDialog({ isOpen, onClose, mode, request }: ApprovalDialogProps) {
  const { decide, isDeciding } = useApprovalData();
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleConfirm = useCallback(async () => {
    if (mode === 'APPROVE') {
      const ok = await decide(request.id, { decision: 'APPROVE' });
      if (ok) handleClose();
    }
  }, [mode, request.id, decide, handleClose]);

  const typeLabel = REQUEST_TYPE_LABEL[request.requestType];

  if (mode === 'APPROVE') {
    return (
      <Modal.Backdrop
        isOpen={isOpen}
        isDismissable={false}
        onOpenChange={(o) => { if (!o) handleClose(); }}
      >
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[420px]">
              <Modal.Header className="items-center text-center">
                <Modal.Icon className="bg-primary-soft text-primary-soft-foreground">
                  <Warning className="size-5" />
                </Modal.Icon>
                <Modal.Heading>Setujui Pengajuan</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-center text-sm text-muted-foreground">
                  Anda akan menyetujui pengajuan <strong>{typeLabel}</strong> untuk{' '}
                  <strong className="text-foreground">{request.activityName || '-'}</strong> yang diajukan oleh <strong>{request.requestedByUserName}</strong>.
                </p>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Perubahan yang menunggu akan diterapkan pada data aktivitas resmi.
                </p>
              </Modal.Body>
              <Modal.Footer className="flex-col-reverse">
                <Button className="w-full" variant="primary" onPress={handleConfirm} isDisabled={isDeciding} isPending={isDeciding}>
                  Setujui
                </Button>
                <Button className="w-full" variant="secondary" onPress={handleClose} isDisabled={isDeciding}>
                  Batal
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
    );
  }

  return <KpiRejectionDialog isOpen={isOpen} title="Tolak Pengajuan" description={<>Anda akan menolak pengajuan <strong>{typeLabel}</strong> untuk <strong className="text-foreground">{request.activityName || '-'}</strong> yang diajukan oleh <strong>{request.requestedByUserName}</strong>.</>} onClose={handleClose} onSubmit={(reason) => decide(request.id, { decision: 'REJECT', rejectionReason: reason })} />;
}
