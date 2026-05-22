'use client';

import React from 'react';
import {
  Modal,
  Button,
} from '@heroui/react';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  userName: string;
  isDeleting?: boolean;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  userName,
  isDeleting = false,
}) => {
  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />

            <Modal.Header>
              <Modal.Heading className="px-2 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Konfirmasi Nonaktifkan
              </Modal.Heading>
            </Modal.Header>

            <Modal.Body className="p-2">
              <p className="text-sm text-muted-foreground">
                Apakah Anda yakin ingin menonaktifkan karyawan{' '}
                <strong className="text-foreground">{userName}</strong>?
                Karyawan tidak akan bisa mengakses sistem setelah dinonaktifkan.
              </p>
            </Modal.Body>

            <Modal.Footer>
              <Button
                variant="secondary"
                onPress={onClose}
                isDisabled={isDeleting}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                onPress={onConfirm}
                isDisabled={isDeleting}
                isPending={isDeleting}
              >
                {isDeleting ? 'Menonaktifkan...' : 'Nonaktifkan'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
