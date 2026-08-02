'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, TextField, TextArea, Select, ListBox, Label, Spinner } from '@heroui/react';
import { X, ArrowsClockwise } from '@phosphor-icons/react';
import { toast } from '@heroui/react';
import { employeeApi } from '@/modules/organization/employees/services/employee-api';
import type { CoreUser } from '@/modules/organization/employees/types';
import { kpiAdminV1Api } from './kpi-admin-v1-api';
import { PERM } from '@/constants/permissions';
import type { KpiActivityChangeRequestResponse } from '@/modules/kpi/activity/activity-v1.types';

interface ReassignApproverDialogProps {
  isOpen: boolean;
  onClose: () => void;
  request: KpiActivityChangeRequestResponse;
  /** Called after successful reassignment (refetch to-review). */
  onSuccess: () => void;
}

/**
 * T9 — administrative approver reassignment (stuck-request recovery).
 * Action-level guard: the caller must hold `kpi_activity:manage` (enforced at
 * the trigger site AND by the backend @PreAuthorize). The requester can never
 * become the approver (backend-enforced).
 */
export function ReassignApproverDialog({ isOpen, onClose, request, onSuccess }: ReassignApproverDialogProps) {
  const [users, setUsers] = useState<CoreUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const page = await employeeApi.getUsers({ size: 100 });
      // Only users holding the approve permission are valid approver candidates.
      setUsers(page.content.filter((u) => u.permissions.includes(PERM.KPI_ACTIVITY_APPROVE)));
    } catch {
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setSelectedUserId('');
      setReason('');
      setValidationError(null);
    }
  }, [isOpen, loadUsers]);

  const handleConfirm = useCallback(async () => {
    setValidationError(null);
    if (!selectedUserId) {
      setValidationError('Select the new approver.');
      return;
    }
    if (!reason.trim()) {
      setValidationError('An administrative reason is required.');
      return;
    }
    if (reason.length > 1000) {
      setValidationError('Reason must not exceed 1000 characters.');
      return;
    }
    setIsSubmitting(true);
    try {
      await kpiAdminV1Api.adminReassignApprover(request.id, {
        newApproverUserId: selectedUserId,
        reason: reason.trim(),
      });
      toast.success('Approver reassigned successfully.');
      onSuccess();
      onClose();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Failed to reassign approver.');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedUserId, reason, request.id, onSuccess, onClose]);

  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Backdrop isDismissable={false}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[480px]">
            <Modal.Header>
              <Modal.Heading>Reassign Approver</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Reassign the approval for{' '}
                  <strong className="text-foreground">{request.activityName || '-'}</strong>{' '}
                  (currently assigned to{' '}
                  <strong className="text-foreground">{request.approverUserName || '-'}</strong>).
                </p>

                <div>
                  {isLoadingUsers ? (
                    <div className="flex items-center justify-center py-4"><Spinner size="sm" /></div>
                  ) : (
                    <Select
                      variant="secondary"
                      selectedKey={selectedUserId || null}
                      onSelectionChange={(k) => setSelectedUserId(String(k || ''))}
                      isInvalid={!!validationError && !selectedUserId}
                      placeholder="Select new approver..."
                    >
                      <Label>New Approver</Label>
                      <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {users.map((u) => (
                            <ListBox.Item key={u.id} id={u.id} textValue={u.fullName}>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-foreground">{u.fullName}</span>
                                <span className="text-xs text-muted-foreground">{u.email}</span>
                              </div>
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  )}
                  {users.length === 0 && !isLoadingUsers && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      No users with the approve permission found.
                    </p>
                  )}
                </div>

                <TextField value={reason} onChange={(e) => { setReason(e); setValidationError(null); }} isInvalid={!!validationError && !!reason}>
                  <Label>Reason</Label>
                  <TextArea variant="secondary" placeholder="Administrative audit reason (required)..." rows={3} />
                </TextField>
                {validationError && <p className="-mt-2 text-xs text-danger">{validationError}</p>}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose} isDisabled={isSubmitting}>
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button variant="primary" onPress={handleConfirm} isDisabled={isSubmitting} isPending={isSubmitting}>
                <ArrowsClockwise className="h-4 w-4" />
                Reassign
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
