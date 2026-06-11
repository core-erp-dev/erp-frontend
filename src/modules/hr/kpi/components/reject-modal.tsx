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
import { XCircle } from 'lucide-react';

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  reportInfo?: string;
}

export const RejectModal: React.FC<RejectModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  reportInfo,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (reason.trim().length < 5) {
      setError('Alasan penolakan minimal 5 karakter');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim());
      setReason('');
      setError('');
      onClose();
    } catch {
      setError('Gagal menolak laporan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('');
      setError('');
      onClose();
    }
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
              <Modal.Heading className="px-2 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-danger" />
                Tolak Laporan
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2">
              {reportInfo && (
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  {reportInfo}
                </div>
              )}

              <TextField
                isRequired
                validationBehavior="aria"
                className="w-full"
                value={reason}
                onChange={setReason}
                isInvalid={!!error}
                isDisabled={isSubmitting}
              >
                <Label>Alasan Penolakan</Label>
                <Input placeholder="Jelaskan alasan laporan ini ditolak..." />
                {error && <FieldError>{error}</FieldError>}
              </TextField>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onPress={handleClose}
                isDisabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                onPress={handleSubmit}
                isDisabled={isSubmitting || reason.trim().length < 5}
                isPending={isSubmitting}
                className="bg-danger text-danger-foreground hover:bg-danger/90"
              >
                <XCircle className="h-4 w-4" />
                Tolak Laporan
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
