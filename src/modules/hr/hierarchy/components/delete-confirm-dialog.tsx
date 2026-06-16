'use client';

import React from 'react';
import { Modal, Button } from '@heroui/react';
import { Warning } from '@phosphor-icons/react';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  positionName: string;
  isDeleting?: boolean;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  positionName,
  isDeleting = false,
}) => {
  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        isDismissable={false}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[360px]">
            <Modal.Header className="items-center text-center">
              <Modal.Icon className="bg-danger-soft text-danger-soft-foreground">
                <Warning className="size-5" />
              </Modal.Icon>
              <Modal.Heading>Konfirmasi Hapus</Modal.Heading>
            </Modal.Header>

            <Modal.Body>
              <p className="text-sm text-muted-foreground text-center">
                Apakah Anda yakin ingin menghapus jabatan{' '}
                <strong className="text-foreground">{positionName}</strong>?
                Jabatan yang masih memiliki bawahan atau karyawan aktif tidak dapat dihapus.
              </p>
            </Modal.Body>

            <Modal.Footer className="flex-col-reverse">
              <Button
                className="w-full"
                variant="danger"
                onPress={onConfirm}
                isDisabled={isDeleting}
                isPending={isDeleting}
              >
                {isDeleting ? 'Menghapus...' : 'Hapus'}
              </Button>
              <Button
                className="w-full"
                variant="secondary"
                slot="close"
                onPress={onClose}
                isDisabled={isDeleting}
              >
                Batal
              </Button>
            </Modal.Footer>
            <Modal.CloseTrigger />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
