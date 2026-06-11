'use client';

import React from 'react';
import {
  Modal,
  Button,
} from '@heroui/react';
import { AlertTriangle } from 'lucide-react';

interface DeleteTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  taskName: string;
  childCount: number;
  isDeleting?: boolean;
}

export const DeleteTaskDialog: React.FC<DeleteTaskDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  taskName,
  childCount,
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
              <div className="flex items-center gap-2 px-2">
                <AlertTriangle className="h-5 w-5 text-danger" />
                <Modal.Heading>Konfirmasi Hapus Tugas</Modal.Heading>
              </div>
            </Modal.Header>
            <Modal.Body className="p-2">
              <p className="text-sm text-muted-foreground">
                Apakah Anda yakin ingin menghapus tugas <strong className="text-foreground">{taskName}</strong>?
              </p>
              {childCount > 0 && (
                <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
                  Tugas ini memiliki <strong>{childCount} sub-tugas</strong> yang juga akan ikut terhapus.
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose} isDisabled={isDeleting}>
                Batal
              </Button>
              <Button
                variant="danger"
                onPress={onConfirm}
                isDisabled={isDeleting}
                isPending={isDeleting}
              >
                {isDeleting ? 'Menghapus...' : 'Hapus Tugas'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
