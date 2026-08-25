'use client';

import React from 'react';
import { Modal, Button } from '@heroui/react';
import { Trash } from '@phosphor-icons/react';
import type { Variable } from './variables.types';

export interface VariableDeleteDialogProps {
  variable: Variable;
  isOpen: boolean;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Soft-delete confirmation for a variable. */
export const VariableDeleteDialog: React.FC<VariableDeleteDialogProps> = ({
  variable,
  isOpen,
  isPending,
  onConfirm,
  onCancel,
}) => (
  <Modal>
    <Modal.Backdrop
      isOpen={isOpen}
      isDismissable={!isPending}
      onOpenChange={(open: boolean) => { if (!open) onCancel(); }}
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-[420px]">
          <Modal.Header className="flex items-center justify-between">
            <Modal.Heading>Hapus Variabel</Modal.Heading>
            <Modal.CloseTrigger />
          </Modal.Header>

          <Modal.Body className="p-6">
            <div className="flex items-start gap-3">
              <Trash className="mt-0.5 h-5 w-5 text-danger" />
              <p className="text-sm text-muted-foreground">
                Hapus variabel <span className="font-medium text-foreground">{variable.code} - {variable.name}</span>?
                Kode tetap digunakan dan variabel dapat dipulihkan dari data terhapus.
              </p>
            </div>
          </Modal.Body>

          <Modal.Footer className="flex justify-end gap-2">
            <Button variant="secondary" onPress={onCancel} isDisabled={isPending}>
              Batal
            </Button>
            <Button variant="danger" onPress={onConfirm} isPending={isPending} isDisabled={isPending}>
              Hapus
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </Modal>
);
