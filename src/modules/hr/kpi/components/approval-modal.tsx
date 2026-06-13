'use client';

import React, { useState } from 'react';
import {
  Modal,
  Button,
  TextField,
  Input,
  Label,
  FieldError,
} from '@heroui/react';
import { CheckCircle, XCircle } from '@phosphor-icons/react';
import { KpiTask, KPI_TASK_STATUS_LABELS } from '../types';

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (rejectReason?: string) => Promise<boolean>;
  task: KpiTask | null;
  isProcessing?: boolean;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  isOpen,
  onClose,
  onApprove,
  task,
  isProcessing = false,
}) => {
  const [action, setAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleSubmit = async () => {
    if (!action) return;
    const success = await onApprove(action === 'REJECT' ? rejectReason : undefined);
    if (success) {
      setAction(null);
      setRejectReason('');
    }
  };

  const handleClose = () => {
    setAction(null);
    setRejectReason('');
    onClose();
  };

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading className="px-2">Persetujuan Tugas KPI</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2 flex flex-col gap-4">
              {task && (
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <p className="font-medium">{task.taskName}</p>
                  <p className="text-sm text-muted-foreground">
                    {task.positionName} — {task.taskCode}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Status saat ini: {KPI_TASK_STATUS_LABELS[task.status]}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant={action === 'APPROVE' ? 'primary' : 'secondary'}
                  className="flex-1"
                  onPress={() => setAction('APPROVE')}
                  isDisabled={isProcessing}
                >
                  <CheckCircle className="h-4 w-4" />
                  Setujui
                </Button>
                <Button
                  variant={action === 'REJECT' ? 'danger' : 'secondary'}
                  className="flex-1"
                  onPress={() => setAction('REJECT')}
                  isDisabled={isProcessing}
                >
                  <XCircle className="h-4 w-4" />
                  Tolak
                </Button>
              </div>

              {action === 'REJECT' && (
                <TextField
                  validationBehavior="aria"
                  className="w-full"
                  name="rejectReason"
                  value={rejectReason}
                  onChange={setRejectReason}
                >
                  <Label>Alasan Penolakan</Label>
                  <Input placeholder="Masukkan alasan penolakan..." />
                </TextField>
              )}

              {action === 'APPROVE' && (
                <p className="text-sm text-muted-foreground">
                  Tugas akan diaktifkan dan pegawai dapat mulai melaporkan capaian.
                </p>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={handleClose} isDisabled={isProcessing}>
                Batal
              </Button>
              <Button
                variant={action === 'REJECT' ? 'danger' : 'primary'}
                onPress={handleSubmit}
                isDisabled={!action || (action === 'REJECT' && !rejectReason.trim()) || isProcessing}
                isPending={isProcessing}
              >
                {action === 'REJECT' ? 'Tolak Tugas' : action === 'APPROVE' ? 'Setujui Tugas' : 'Pilih Aksi'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
