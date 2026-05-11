'use client';

import React from 'react';
import { Modal, Button, Spinner } from '@heroui/react';

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
          if (!open && !isDeleting) onClose();
        }}
        isDismissable={!isDeleting}
      >
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />

            <Modal.Header>
              <Modal.Heading className="text-lg font-semibold">
                Hapus Data Karyawan
              </Modal.Heading>
            </Modal.Header>

            <Modal.Body>
              <p className="text-sm text-muted-foreground">
                Apakah Anda yakin ingin menghapus data untuk{' '}
                <span className="font-semibold text-foreground">{userName}</span>?
                Tindakan ini tidak dapat dibatalkan dan akan menghapus semua
                data penugasan jabatannya secara permanen.
              </p>
            </Modal.Body>

            <Modal.Footer>
              <Button
                variant="tertiary"
                onPress={onClose}
                isDisabled={isDeleting}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                onPress={onConfirm}
                isDisabled={isDeleting}
              >
                {isDeleting ? (
                  <div className="flex items-center gap-2">
                    <Spinner size="sm" color="current" />
                    Menghapus...
                  </div>
                ) : (
                  'Hapus'
                )}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
