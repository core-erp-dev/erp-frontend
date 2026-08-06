'use client';

import React from 'react';
import { Modal, Button } from '@heroui/react';

export interface LifecycleDialogProps {
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  variant?: 'primary' | 'danger';
  isOpen: boolean;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Generic confirmation dialog used for both node lifecycle actions
 * (delete/restore) and yearly-structure actions (activate/deactivate/delete).
 */
export const LifecycleDialog: React.FC<LifecycleDialogProps> = ({
  title,
  message,
  confirmLabel,
  variant = 'primary',
  isOpen,
  isPending,
  onConfirm,
  onCancel,
}) => {
  const verb = isPending ? 'Processing...' : confirmLabel;

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        isDismissable={!isPending}
        onOpenChange={(open: boolean) => { if (!open) onCancel(); }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[400px]">
            <Modal.Header className={variant === 'danger' ? 'items-center text-center' : 'items-center'}>
              <Modal.Heading>{title}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted-foreground">{message}</p>
            </Modal.Body>
            <Modal.Footer className="flex justify-end gap-2">
              <Button
                variant="secondary"
                slot="close"
                onPress={onCancel}
                isDisabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant={variant}
                onPress={onConfirm}
                isDisabled={isPending}
              >
                {verb}
              </Button>
            </Modal.Footer>
            <Modal.CloseTrigger />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
