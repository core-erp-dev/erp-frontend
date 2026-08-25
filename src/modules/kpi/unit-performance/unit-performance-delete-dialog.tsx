'use client';

import React from 'react';
import { Modal, Button } from '@heroui/react';
import { Trash } from '@phosphor-icons/react';
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
            <Modal.Heading>Hapus Unit Peserta</Modal.Heading>
            <Modal.CloseTrigger />
          </Modal.Header>

          <Modal.Body className="p-6">
            <div className="flex items-start gap-3">
              <Trash className="mt-0.5 h-5 w-5 text-danger" />
              <p className="text-sm text-muted-foreground">
                Hapus <span className="font-medium text-foreground">{row.unitCode} — {row.unitName}</span>{' '}
                dari Performa Unit? Bobotnya akan dihapus dari setiap indikator dan matriks
                perlu dilengkapi kembali.
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
