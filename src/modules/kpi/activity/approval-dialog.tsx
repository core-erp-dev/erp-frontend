'use client';

import React, { useState, useCallback } from 'react';
import { Modal, Button, TextField, TextArea, Label } from '@heroui/react';
import { Warning, X } from '@phosphor-icons/react';
import { useApprovalData } from './use-approval-data';
import {
  REQUEST_TYPE_LABEL,
  type KpiActivityChangeRequestResponse,
} from './activity-v1.types';

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
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setReason('');
    setReasonError(null);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleConfirm = useCallback(async () => {
    if (mode === 'REJECT') {
      if (!reason.trim()) {
        setReasonError('Alasan penolakan wajib diisi.');
        return;
      }
      if (reason.length > 1000) {
        setReasonError('Alasan penolakan maksimal 1.000 karakter.');
        return;
      }
      setReasonError(null);
      const ok = await decide(request.id, { decision: 'REJECT', rejectionReason: reason.trim() });
      if (ok) handleClose();
    } else {
      const ok = await decide(request.id, { decision: 'APPROVE' });
      if (ok) handleClose();
    }
  }, [mode, reason, request.id, decide, handleClose]);

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
                  This will approve the <strong>{typeLabel}</strong> request for{' '}
                  <strong className="text-foreground">{request.activityName || '-'}</strong>{' '}
                  submitted by <strong>{request.requestedByUserName}</strong>.
                </p>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  The pending changes will be applied to the official activity data.
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

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      isDismissable={false}
      onOpenChange={(o) => { if (!o) handleClose(); }}
    >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[480px]">
            <Modal.Header className="items-center text-center">
              <Modal.Icon className="bg-danger-soft text-danger-soft-foreground">
                <Warning className="size-5" />
              </Modal.Icon>
              <Modal.Heading>Tolak Pengajuan</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="mb-4 text-sm text-muted-foreground">
                This will reject the <strong>{typeLabel}</strong> request for{' '}
                <strong className="text-foreground">{request.activityName || '-'}</strong>{' '}
                submitted by <strong>{request.requestedByUserName}</strong>.
              </p>
              <TextField
                isRequired
                value={reason}
                onChange={(e) => { setReason(e); setReasonError(null); }}
                isInvalid={!!reasonError}
              >
                <Label>Alasan Penolakan</Label>
                <TextArea variant="secondary" placeholder="Jelaskan alasan pengajuan ini ditolak..." rows={3} />
              </TextField>
              {reasonError && <p className="mt-1 text-xs text-danger">{reasonError}</p>}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={handleClose} isDisabled={isDeciding}>
                <X className="h-4 w-4" />
                Batal
              </Button>
              <Button variant="danger" onPress={handleConfirm} isDisabled={isDeciding} isPending={isDeciding}>
                Tolak
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
  );
}
