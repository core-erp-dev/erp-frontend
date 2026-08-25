'use client';

import React from 'react';
import { Modal, Button } from '@heroui/react';
import type { UnitPerformanceMatrixUnit } from './unit-performance.types';

export interface UnitPerformanceDeleteDialogProps {
  row: UnitPerformanceMatrixUnit;
  isOpen: boolean;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Soft-delete confirmation for a participating unit (registry removal). */
export const UnitPerformanceDeleteDialog: React.FC<UnitPerformanceDeleteDialogProps> = ({
  row,
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
            <Modal.Heading>Hapus Unit</Modal.Heading>
            <Modal.CloseTrigger />
          </Modal.Header>

          <Modal.Body className="p-6">
            <p className="text-sm text-foreground">
              Hapus <span className="font-medium">{row.unitCode} - {row.unitName}</span>?
            </p>
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
