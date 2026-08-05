'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Button, Input, Label, ListBox, Modal, Select, Spinner, TextArea, TextField, toast,
} from '@heroui/react';
import { X as XIcon } from '@phosphor-icons/react';
import { kpiAdminV1Api } from './kpi-admin-v1-api';
import { employeeApi } from '@/modules/organization/employees/services/employee-api';
import type { CoreUser, UserPositionResponse } from '@/modules/organization/employees/types';
import type { RecoverableConflict } from '@/modules/kpi/shared/domain-errors';
import type { KpiActivityResponse } from '@/modules/kpi/activity/activity-v1.types';

interface AdminUpdateActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * The Activity to mutate. Must expose the authoritative persisted
   * `version` — it is sent verbatim as `expectedVersion` (T11). The trigger
   * site must not open this modal for data without a valid version.
   */
  activity: KpiActivityResponse;
  /** Called after a successful mutation (refetch Activity detail + lists). */
  onSuccess: () => void;
  /** Called after ACTIVITY_VERSION_CONFLICT (refetch authoritative data). */
  onConflict: () => void;
}

type AdminAction = 'UPDATE' | 'REASSIGN' | 'CANCEL';

/**
 * T11 — administrative Activity mutation (`kpi_activity:manage`).
 *
 * `expectedVersion` is ALWAYS the Activity's authoritative persisted `version`
 * from KpiActivityResponse — never fabricated, incremented, timestamp-derived,
 * or defaulted. On ACTIVITY_VERSION_CONFLICT the modal surfaces a recoverable
 * banner and triggers a refetch; the user must review the newer version and
 * re-open the form — there is NO silent retry of a stale update.
 */
export function AdminUpdateActivityModal({
  isOpen, onClose, activity, onSuccess, onConflict,
}: AdminUpdateActivityModalProps) {
  const [action, setAction] = useState<AdminAction>('UPDATE');
  const [reason, setReason] = useState('');
  const [activityName, setActivityName] = useState(activity.activityName);
  const [description, setDescription] = useState(activity.description ?? '');
  const [unit, setUnit] = useState(activity.unit);
  const [targetValue, setTargetValue] = useState(String(activity.targetValue));
  const [users, setUsers] = useState<CoreUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserPositionId, setSelectedUserPositionId] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<RecoverableConflict | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;
  const activePositions: UserPositionResponse[] = selectedUser
    ? selectedUser.positions.filter((p) => p.isActive)
    : [];

  /* Reset + prefill from the authoritative Activity response on open. */
  useEffect(() => {
    if (!isOpen) return;
    setAction('UPDATE');
    setReason('');
    setActivityName(activity.activityName);
    setDescription(activity.description ?? '');
    setUnit(activity.unit);
    setTargetValue(String(activity.targetValue));
    setSelectedUserId('');
    setSelectedUserPositionId('');
    setValidationError(null);
    setConflict(null);
  }, [isOpen, activity]);

  /* Load candidate users only when REASSIGN is chosen. */
  useEffect(() => {
    if (!isOpen || action !== 'REASSIGN' || users.length > 0) return;
    setIsLoadingUsers(true);
    employeeApi
      .getUsers({ size: 100 })
      .then((page) => setUsers(page.content))
      .catch(() => setUsers([]))
      .finally(() => setIsLoadingUsers(false));
  }, [isOpen, action, users.length]);

  const handleUserChange = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setSelectedUserPositionId('');
  }, []);

  const handleSubmit = useCallback(async () => {
    setValidationError(null);
    setConflict(null);

    if (!reason.trim()) {
      setValidationError('An administrative reason is required.');
      return;
    }
    if (action === 'UPDATE') {
      if (!activityName.trim()) {
        setValidationError('Activity name is required.');
        return;
      }
      if (!unit.trim()) {
        setValidationError('Unit is required.');
        return;
      }
      const tv = parseFloat(targetValue);
      if (!targetValue || Number.isNaN(tv) || tv <= 0) {
        setValidationError('Target value must be a positive number.');
        return;
      }
    }
    if (action === 'REASSIGN' && !selectedUserPositionId) {
      setValidationError('Select the new assignee position.');
      return;
    }

    setIsSubmitting(true);
    try {
      await kpiAdminV1Api.adminUpdateActivity(activity.id, {
        action,
        reason: reason.trim(),
        /** Authoritative persisted version — never fabricated or derived. */
        expectedVersion: activity.version,
        activityName: action === 'UPDATE' ? activityName.trim() : undefined,
        description: action === 'UPDATE' ? description.trim() || undefined : undefined,
        unit: action === 'UPDATE' ? unit.trim() : undefined,
        targetValue: action === 'UPDATE' ? parseFloat(targetValue) : undefined,
        assignedToUserPositionId: action === 'REASSIGN' ? selectedUserPositionId : undefined,
      });
      toast.success('Activity updated successfully.');
      onSuccess();
      onClose();
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Failed to update the activity.';
      if (raw.includes('Activity was modified by another user')) {
        setConflict({
          kind: 'version-conflict',
          message: 'This activity was modified by another user — reload and review the newer version before resubmitting.',
          refetch: true,
        });
        onConflict();
      } else {
        toast.danger(raw);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    action, reason, activityName, unit, targetValue, description,
    selectedUserPositionId, activity.id, activity.version,
    onSuccess, onClose, onConflict,
  ]);

  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Backdrop isDismissable={false}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[560px]">
            <Modal.Header>
              <Modal.Heading>Admin Update Activity</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col gap-4">
                {conflict && (
                  <div className="rounded-lg bg-warning-soft p-3 text-sm text-warning-soft-foreground">
                    {conflict.message}
                  </div>
                )}
                {validationError && (
                  <div className="rounded-lg bg-danger-soft p-3 text-sm text-danger-soft-foreground">
                    {validationError}
                  </div>
                )}

                <div className="rounded-lg bg-secondary-soft p-3 text-sm text-muted-foreground">
                  <div>
                    Activity: <span className="font-medium text-foreground">{activity.activityName}</span>
                  </div>
                  <div>
                    Version: <span className="font-medium text-foreground">{activity.version}</span>
                  </div>
                </div>

                <Select
                  variant="secondary"
                  selectedKey={action}
                  onSelectionChange={(k) => setAction(String(k) as AdminAction)}
                >
                  <Label>Action</Label>
                  <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item key="UPDATE" id="UPDATE" textValue="Update details">Update details</ListBox.Item>
                      <ListBox.Item key="REASSIGN" id="REASSIGN" textValue="Reassign assignee">Reassign assignee</ListBox.Item>
                      <ListBox.Item key="CANCEL" id="CANCEL" textValue="Cancel activity">Cancel activity</ListBox.Item>
                    </ListBox>
                  </Select.Popover>
                </Select>

                {action === 'UPDATE' && (
                  <>
                    <TextField isRequired value={activityName} onChange={setActivityName}>
                      <Label>Activity Name</Label>
                      <Input variant="secondary" placeholder="Enter activity name..." />
                    </TextField>

                    <TextField value={description} onChange={setDescription}>
                      <Label>Description</Label>
                      <TextArea variant="secondary" placeholder="Optional description..." rows={2} />
                    </TextField>

                    <div className="grid grid-cols-2 gap-4">
                      <TextField isRequired value={unit} onChange={setUnit}>
                        <Label>Unit</Label>
                        <Input variant="secondary" placeholder="e.g. %, IDR, units" />
                      </TextField>
                      <TextField isRequired value={targetValue} onChange={setTargetValue} type="number">
                        <Label>Target Value</Label>
                        <Input variant="secondary" placeholder="e.g. 100" />
                      </TextField>
                    </div>
                  </>
                )}

                {action === 'REASSIGN' && (
                  <>
                    {isLoadingUsers ? (
                      <div className="flex items-center justify-center py-4"><Spinner size="sm" /></div>
                    ) : (
                      <Select
                        variant="secondary"
                        selectedKey={selectedUserId || null}
                        onSelectionChange={(k) => handleUserChange(String(k || ''))}
                        placeholder="Select assignee user..."
                      >
                        <Label>New Assignee User</Label>
                        <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {users.map((u) => (
                              <ListBox.Item key={u.id} id={u.id} textValue={u.fullName}>
                                <span className="text-sm text-foreground">{u.fullName}</span>
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    )}

                    {selectedUser && (
                      <Select
                        variant="secondary"
                        selectedKey={selectedUserPositionId || null}
                        onSelectionChange={(k) => setSelectedUserPositionId(String(k || ''))}
                        placeholder="Select assignee position..."
                      >
                        <Label>New Assignee Position</Label>
                        <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {activePositions.map((p) => (
                              <ListBox.Item key={p.id} id={p.id} textValue={p.positionName}>
                                <span className="text-sm text-foreground">{p.positionName}</span>
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    )}
                  </>
                )}

                <TextField value={reason} onChange={setReason}>
                  <Label>Reason</Label>
                  <TextArea variant="secondary" placeholder="Administrative audit reason (required)..." rows={2} />
                </TextField>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose} isDisabled={isSubmitting}>
                <XIcon className="h-4 w-4" />
                Cancel
              </Button>
              <Button
                variant={action === 'CANCEL' ? 'danger' : 'primary'}
                onPress={handleSubmit}
                isDisabled={isSubmitting}
                isPending={isSubmitting}
              >
                Apply Update
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
