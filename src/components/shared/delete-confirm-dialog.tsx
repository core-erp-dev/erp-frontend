'use client';

import React from 'react';
import { Modal, Button } from '@heroui/react';
import { Warning } from '@phosphor-icons/react';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  /** Display name of the entity being deleted */
  name: string;
  /** Label for the entity type (e.g. "employee", "position") */
  entityLabel: string;
  /** Optional additional warning message */
  warning?: string;
  isDeleting?: boolean;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  name,
  entityLabel,
  warning,
  isDeleting = false,
}) => {
  return (
    // NOTE: Modal.Backdrop is used as the root (controlled, without <Modal>) —
    // HeroUI v3 <Modal> wraps children in a RAC DialogTrigger whose PressResponder
    // has no pressable child, which logs a dev-only warning on every page mount.
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
              <Modal.Heading>Confirm Delete</Modal.Heading>
            </Modal.Header>

            <Modal.Body>
              <p className="text-sm text-muted-foreground text-center">
                Are you sure you want to delete this {entityLabel}{' '}
                <strong className="text-foreground">{name}</strong>?
                {warning && (
                  <>
                    <br />
                    <span className="text-xs">{warning}</span>
                  </>
                )}
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
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
              <Button
                className="w-full"
                variant="secondary"
                slot="close"
                onPress={onClose}
                isDisabled={isDeleting}
              >
                Cancel
              </Button>
            </Modal.Footer>
            <Modal.CloseTrigger />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
  );
};
