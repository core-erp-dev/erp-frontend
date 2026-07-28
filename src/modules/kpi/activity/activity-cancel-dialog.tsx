'use client';

import React, { useState, useCallback } from 'react';
import { Modal, Button, TextField, TextArea, Label } from '@heroui/react';
import { Warning, X } from '@phosphor-icons/react';
import { useActivityData } from './use-activity-data';
import type { KpiActivityResponse } from './activity.types';

interface ActivityCancelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  activity: KpiActivityResponse;
}

export function ActivityCancelDialog({ isOpen, onClose, activity }: ActivityCancelDialogProps) {
  const { submitCancel, isSubmitting } = useActivityData();
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
    if (!reason.trim()) {
      setReasonError('Cancellation reason is required.');
      return;
    }
    if (reason.length > 1000) {
      setReasonError('Cancellation reason must not exceed 1000 characters.');
      return;
    }
    setReasonError(null);

    const success = await submitCancel({
      activityId: activity.id,
      cancellationReason: reason.trim(),
    });

    if (success) handleClose();
  }, [reason, activity.id, submitCancel, handleClose]);

  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <Modal.Backdrop isDismissable={false}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[480px]">
            <Modal.Header className="items-center text-center">
              <Modal.Icon className="bg-danger-soft text-danger-soft-foreground">
                <Warning className="size-5" />
              </Modal.Icon>
              <Modal.Heading>Request Cancellation</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="mb-4 text-sm text-muted-foreground">
                This will submit a <strong>cancellation request</strong> for{' '}
                <strong className="text-foreground">{activity.activityName}</strong>.
                The activity remains active until an approver approves the cancellation.
              </p>
              <TextField
                isRequired
                value={reason}
                onChange={(e) => { setReason(e); setReasonError(null); }}
                isInvalid={!!reasonError}
              >
                <Label>Cancellation Reason</Label>
                <TextArea
                  variant="secondary"
                  placeholder="Explain why this activity is being cancelled..."
                  rows={3}
                />
              </TextField>
              {reasonError && (
                <p className="mt-1 text-xs text-danger">{reasonError}</p>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={handleClose} isDisabled={isSubmitting}>
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button variant="danger" onPress={handleConfirm} isDisabled={isSubmitting} isPending={isSubmitting}>
                Submit Cancellation Request
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
