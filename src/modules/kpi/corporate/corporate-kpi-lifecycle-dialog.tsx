'use client';

import React from 'react';
import { Modal, Button } from '@heroui/react';
import type { CorporateKpiNode, LifecycleActionType } from './corporate-kpi.types';

export interface LifecycleDialogProps {
  action: LifecycleActionType;
  node: CorporateKpiNode;
  isOpen: boolean;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ACTION_LABEL: Record<LifecycleActionType, string> = {
  activate: 'Activate',
  deactivate: 'Deactivate',
  delete: 'Delete',
  restore: 'Restore',
};

const ACTION_TITLE: Record<LifecycleActionType, string> = {
  activate: 'Activate Corporate KPI',
  deactivate: 'Deactivate Corporate KPI',
  delete: 'Delete Corporate KPI',
  restore: 'Restore Corporate KPI',
};

const ACTION_BODY: Record<LifecycleActionType, string> = {
  activate: 'Are you sure you want to activate',
  deactivate: 'Are you sure you want to deactivate',
  delete: 'Are you sure you want to delete',
  restore: 'Are you sure you want to restore',
};

export const LifecycleDialog: React.FC<LifecycleDialogProps> = ({
  action,
  node,
  isOpen,
  isPending,
  onConfirm,
  onCancel,
}) => {
  const isDelete = action === 'delete';
  const verb = isPending ? 'Processing...' : ACTION_LABEL[action];

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        isDismissable={!isPending}
        onOpenChange={(open: boolean) => { if (!open) onCancel(); }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[400px]">
            <Modal.Header className={isDelete ? 'items-center text-center' : 'items-center'}>
              <Modal.Heading>{ACTION_TITLE[action]}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted-foreground">
                {ACTION_BODY[action]} <strong className="text-foreground">{node.code} — {node.name}</strong>?
              </p>
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
                variant={isDelete ? 'danger' : 'primary'}
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
