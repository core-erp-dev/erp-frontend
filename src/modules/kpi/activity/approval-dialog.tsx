'use client';

import React, { useState, useCallback } from 'react';
import { Modal, Button, TextField, TextArea, Label } from '@heroui/react';
import { Warning, X } from '@phosphor-icons/react';
import { useApprovalData } from './use-approval-data';
import {
  REQUEST_TYPE_LABEL,
  type KpiActivityChangeRequestResponse,
} from './activity.types';

type DialogMode = 'APPROVE' | 'REJECT';

interface ApprovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: DialogMode;
  request: KpiActivityChangeRequestResponse;
}

export function ApprovalDialog({ isOpen, onClose, mode, request }: ApprovalDialogProps) {
  const { approve, reject, isApproving } = useApprovalData();
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
        setReasonError('Rejection reason is required.');
        return;
      }
      if (reason.length > 1000) {
        setReasonError('Rejection reason must not exceed 1000 characters.');
        return;
      }
      setReasonError(null);
      const ok = await reject(request.id, reason.trim());
      if (ok) handleClose();
    } else {
      const ok = await approve(request.id);
      if (ok) handleClose();
    }
  }, [mode, reason, request.id, approve, reject, handleClose]);

  const typeLabel = REQUEST_TYPE_LABEL[request.requestType];

  if (mode === 'APPROVE') {
    return (
      <Modal isOpen={isOpen} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <Modal.Backdrop isDismissable={false}>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[420px]">
              <Modal.Header className="items-center text-center">
                <Modal.Icon className="bg-primary-soft text-primary-soft-foreground">
                  <Warning className="size-5" />
                </Modal.Icon>
                <Modal.Heading>Approve Request</Modal.Heading>
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
                <Button className="w-full" variant="primary" onPress={handleConfirm} isDisabled={isApproving} isPending={isApproving}>
                  Approve
                </Button>
                <Button className="w-full" variant="secondary" onPress={handleClose} isDisabled={isApproving}>
                  Cancel
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <Modal.Backdrop isDismissable={false}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[480px]">
            <Modal.Header className="items-center text-center">
              <Modal.Icon className="bg-danger-soft text-danger-soft-foreground">
                <Warning className="size-5" />
              </Modal.Icon>
              <Modal.Heading>Reject Request</Modal.Heading>
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
                <Label>Rejection Reason</Label>
                <TextArea variant="secondary" placeholder="Explain why this request is being rejected..." rows={3} />
              </TextField>
              {reasonError && <p className="mt-1 text-xs text-danger">{reasonError}</p>}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={handleClose} isDisabled={isApproving}>
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button variant="danger" onPress={handleConfirm} isDisabled={isApproving} isPending={isApproving}>
                Reject
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
