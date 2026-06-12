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
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface AmendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  reportInfo?: string;
}

export const AmendModal: React.FC<AmendModalProps> = ({
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
      setError('Alasan revisi minimal 5 karakter');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim());
      setReason('');
      setError('');
      onClose();
    } catch {
      setError('Gagal memproses revisi. Silakan coba lagi.');
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
              <Modal.Heading className="px-2">
                Minta Revisi Laporan
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2">
              {/* Warning Banner */}
              <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  Menarik persetujuan akan mengurangi nilai realisasi yang sudah terakumulasi.
                  Pegawai perlu mengirim laporan baru sebagai pengganti.
                </span>
              </div>

              {/* Report Info */}
              {reportInfo && (
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  {reportInfo}
                </div>
              )}

              {/* Reason Field */}
              <TextField
                isRequired
                validationBehavior="aria"
                className="w-full"
                value={reason}
                onChange={setReason}
                isInvalid={!!error}
                isDisabled={isSubmitting}
              >
                <Label>Alasan Revisi</Label>
                <Input placeholder="Jelaskan alasan perlunya revisi laporan ini..." />
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
                className="bg-warning text-warning-foreground hover:bg-warning/90"
              >
                <RotateCcw className="h-4 w-4" />
                Tarik & Minta Revisi
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
