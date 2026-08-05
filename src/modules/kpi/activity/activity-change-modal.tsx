'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Button, Input, Label, Modal, TextArea, TextField, toast,
} from '@heroui/react';
import { X as XIcon } from '@phosphor-icons/react';
import { useActivityData } from './use-activity-data';
import type { ActingPosition } from '@/modules/kpi/shared/acting-position';
import type { RecoverableConflict } from '@/modules/kpi/shared/domain-errors';
import type {
  CancelChangeRequest,
  KpiActivityResponse,
  UpdateChangeRequest,
} from './activity-v1.types';

interface ActivityChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** update = proposal of mutable fields; cancel = reason only. */
  mode: 'update' | 'cancel';
  /** The Activity being changed (must be ACTIVE). */
  activity: KpiActivityResponse;
  /** The explicitly selected acting Position (`positionId` is sent as `actingPositionId`). */
  actingPosition: ActingPosition;
  /** Called after a successful submission (refetch requests + affected data). */
  onSuccess: () => void;
  /** Called after a recoverable conflict (refetch authoritative data). */
  onConflict: () => void;
}

/**
 * T5 — UPDATE/CANCEL change request against an existing Activity.
 *
 * UPDATE body: `{ requestType: 'UPDATE', actingPositionId, activityName,
 * description, unit, targetValue }` — proposal fields only; `cancellationReason`
 * is forbidden (typed `never`).
 * CANCEL body: `{ requestType: 'CANCEL', actingPositionId, cancellationReason }`
 * — proposal fields are forbidden (typed `never`), so CANCEL can never
 * serialize UPDATE-only fields.
 *
 * Lineage (parentId/corporateKpiId/assignee/period) is immutable and never
 * sent. Maker–checker + stored-approver behavior is preserved by the backend.
 */
export function ActivityChangeModal({
  isOpen, onClose, mode, activity, actingPosition, onSuccess, onConflict,
}: ActivityChangeModalProps) {
  const { submitChangeRequest } = useActivityData();

  const [activityName, setActivityName] = useState(activity.activityName);
  const [description, setDescription] = useState(activity.description ?? '');
  const [unit, setUnit] = useState(activity.unit);
  const [targetValue, setTargetValue] = useState(String(activity.targetValue));
  const [cancellationReason, setCancellationReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<RecoverableConflict | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* Prefill from the authoritative Activity response whenever the modal opens. */
  useEffect(() => {
    if (!isOpen) return;
    setActivityName(activity.activityName);
    setDescription(activity.description ?? '');
    setUnit(activity.unit);
    setTargetValue(String(activity.targetValue));
    setCancellationReason('');
    setValidationError(null);
    setConflict(null);
  }, [isOpen, activity]);

  const handleSubmit = useCallback(async () => {
    setValidationError(null);
    setConflict(null);

    if (mode === 'cancel') {
      if (!cancellationReason.trim()) {
        setValidationError('A cancellation reason is required.');
        return;
      }
      const body: CancelChangeRequest = {
        requestType: 'CANCEL',
        actingPositionId: actingPosition.positionId,
        cancellationReason: cancellationReason.trim(),
      };
      setIsSubmitting(true);
      try {
        const result = await submitChangeRequest(activity.id, body);
        if (result.success) {
          toast.success('Cancellation request submitted successfully.');
          onSuccess();
          onClose();
        } else if (result.conflict) {
          setConflict(result.conflict);
          onConflict();
        } else {
          toast.danger(result.message ?? 'Failed to submit the cancellation request.');
        }
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    /* UPDATE mode */
    if (!activityName.trim()) {
      setValidationError('Activity name is required.');
      return;
    }
    if (!unit.trim()) {
      setValidationError('Unit is required.');
      return;
    }
    const tv = parseFloat(targetValue);
    if (!targetValue || Number.isNaN(tv) || tv <= 0) {
      setValidationError('Target value must be a positive number.');
      return;
    }

    const body: UpdateChangeRequest = {
      requestType: 'UPDATE',
      actingPositionId: actingPosition.positionId,
      activityName: activityName.trim(),
      description: description.trim() || null,
      unit: unit.trim(),
      targetValue: tv,
    };
    setIsSubmitting(true);
    try {
      const result = await submitChangeRequest(activity.id, body);
      if (result.success) {
        toast.success('Update request submitted successfully.');
        onSuccess();
        onClose();
      } else if (result.conflict) {
        setConflict(result.conflict);
        onConflict();
      } else {
        toast.danger(result.message ?? 'Failed to submit the update request.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    mode, cancellationReason, activityName, unit, targetValue, description,
    actingPosition.positionId, activity.id, submitChangeRequest,
    onSuccess, onClose, onConflict,
  ]);

  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Backdrop isDismissable={false}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[560px]">
            <Modal.Header>
              <Modal.Heading>
                {mode === 'update' ? 'Request Activity Update' : 'Request Activity Cancellation'}
              </Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col gap-4">
                {conflict && (
                  <div className="rounded-lg bg-warning-soft p-3 text-sm text-warning-soft-foreground">
                    {conflict.message}
                  </div>
                )}
                {validationError && (
                  <div className="rounded-lg bg-danger-soft p-3 text-sm text-danger-soft-foreground">
                    {validationError}
                  </div>
                )}

                <div className="rounded-lg bg-secondary-soft p-3 text-sm text-muted-foreground">
                  <div>Activity: <span className="font-medium text-foreground">{activity.activityName}</span></div>
                  <div>
                    Acting Position: <span className="font-medium text-foreground">{actingPosition.positionName}</span>
                    {actingPosition.isPrimary ? ' (Primary)' : ''}
                  </div>
                </div>

                {mode === 'update' ? (
                  <>
                    <TextField isRequired value={activityName} onChange={setActivityName}>
                      <Label>Activity Name</Label>
                      <Input variant="secondary" placeholder="Enter activity name..." />
                    </TextField>

                    <TextField value={description} onChange={setDescription}>
                      <Label>Description</Label>
                      <TextArea variant="secondary" placeholder="Optional description..." rows={2} />
                    </TextField>

                    <div className="grid grid-cols-2 gap-4">
                      <TextField isRequired value={unit} onChange={setUnit}>
                        <Label>Unit</Label>
                        <Input variant="secondary" placeholder="e.g. %, IDR, units" />
                      </TextField>
                      <TextField isRequired value={targetValue} onChange={setTargetValue} type="number">
                        <Label>Target Value</Label>
                        <Input variant="secondary" placeholder="e.g. 100" />
                      </TextField>
                    </div>
                  </>
                ) : (
                  <TextField isRequired value={cancellationReason} onChange={setCancellationReason}>
                    <Label>Cancellation Reason</Label>
                    <TextArea variant="secondary" placeholder="Explain why this activity must be cancelled..." rows={3} />
                  </TextField>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose} isDisabled={isSubmitting}>
                <XIcon className="h-4 w-4" />
                Cancel
              </Button>
              <Button
                variant={mode === 'cancel' ? 'danger' : 'primary'}
                onPress={handleSubmit}
                isDisabled={isSubmitting}
                isPending={isSubmitting}
              >
                Submit {mode === 'cancel' ? 'Cancellation' : 'Update'} Request
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
