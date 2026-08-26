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
import { ActivityIndicatorMultiSelect } from '@/modules/kpi/activity/activity-indicator-multi-select';
import { corporateKpiApi } from '@/modules/kpi/corporate/corporate-kpi-api';
import { corporateKpiStructuresApi } from '@/modules/kpi/corporate/corporate-kpi-structures-api';
import type { CorporateKpiNode } from '@/modules/kpi/corporate/corporate-kpi.types';

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
  initialAction?: AdminAction;
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
  isOpen, onClose, activity, onSuccess, onConflict, initialAction = 'UPDATE',
}: AdminUpdateActivityModalProps) {
  const [action, setAction] = useState<AdminAction>('UPDATE');
  const [reason, setReason] = useState('');
  const [activityName, setActivityName] = useState(activity.activityName);
  const [description, setDescription] = useState(activity.description ?? '');
  const [unit, setUnit] = useState(activity.unit);
  const [targetValue, setTargetValue] = useState(String(activity.targetValue));
  const [corporateKpiIds, setCorporateKpiIds] = useState<string[]>([]);
  const [indicators, setIndicators] = useState<CorporateKpiNode[]>([]);
  const [isLoadingIndicators, setIsLoadingIndicators] = useState(false);
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
    setAction(initialAction);
    setReason('');
    setActivityName(activity.activityName);
    setDescription(activity.description ?? '');
    setUnit(activity.unit);
    setTargetValue(String(activity.targetValue));
    setCorporateKpiIds(activity.corporateKpis?.map((kpi) => kpi.id) ?? (activity.corporateKpiId ? [activity.corporateKpiId] : []));
    setSelectedUserId('');
    setSelectedUserPositionId('');
    setValidationError(null);
    setConflict(null);
  }, [isOpen, activity, initialAction]);

  useEffect(() => {
    if (!isOpen || action !== 'UPDATE') return;
    let active = true;
    setIsLoadingIndicators(true);
    Promise.all([corporateKpiApi.getTreeByYear(activity.periodYear), corporateKpiStructuresApi.list()])
      .then(([tree, structures]) => {
        if (!active) return;
        const activeStructures = new Set(structures.filter((s) => s.status === 'ACTIVE').map((s) => s.id));
        const result: CorporateKpiNode[] = [];
        const collect = (nodes: CorporateKpiNode[]) => nodes.forEach((node) => {
          if (node.nodeType === 'INDICATOR' && activeStructures.has(node.structureId)) result.push(node);
          if (node.children.length > 0) collect(node.children);
        });
        collect(tree);
        setIndicators(result);
      })
      .catch(() => { if (active) setIndicators([]); })
      .finally(() => { if (active) setIsLoadingIndicators(false); });
    return () => { active = false; };
  }, [isOpen, action, activity.periodYear]);

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
      setValidationError('Alasan administratif wajib diisi.');
      return;
    }
    if (action === 'UPDATE') {
      if (!activityName.trim()) {
        setValidationError('Nama aktivitas wajib diisi.');
        return;
      }
      if (!unit.trim()) {
        setValidationError('Unit wajib diisi.');
        return;
      }
      const tv = parseFloat(targetValue);
      if (!targetValue || Number.isNaN(tv) || tv <= 0) {
        setValidationError('Nilai target harus berupa angka positif.');
        return;
      }
      if (corporateKpiIds.length === 0) {
        setValidationError('Pilih minimal satu indikator KPI Perusahaan.');
        return;
      }
    }
    if (action === 'REASSIGN' && !selectedUserPositionId) {
      setValidationError('Pilih posisi penanggung jawab baru.');
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
        corporateKpiIds: action === 'UPDATE' ? corporateKpiIds : undefined,
        assignedToUserPositionId: action === 'REASSIGN' ? selectedUserPositionId : undefined,
      });
      toast.success(action === 'CANCEL' ? 'Aktivitas berhasil dibatalkan.' : 'Aktivitas berhasil diperbarui.');
      onSuccess();
      onClose();
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Gagal memperbarui aktivitas.';
      if (raw.includes('Activity was modified by another user')) {
        setConflict({
          kind: 'version-conflict',
          message: 'Aktivitas ini diubah oleh pengguna lain — muat ulang dan tinjau versi terbaru sebelum mengirim ulang.',
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
    selectedUserPositionId, corporateKpiIds, activity.id, activity.version,
    onSuccess, onClose, onConflict,
  ]);

  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Backdrop isDismissable={false}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[560px]">
            <Modal.Header>
            <Modal.Heading>{action === 'CANCEL' ? 'Batalkan Aktivitas' : 'Kelola Aktivitas'}</Modal.Heading>
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
                    Aktivitas: <span className="font-medium text-foreground">{activity.activityName}</span>
                  </div>
                  <div>
                    Versi: <span className="font-medium text-foreground">{activity.version}</span>
                  </div>
                </div>

                {initialAction !== 'CANCEL' && <Select
                  variant="secondary"
                  selectedKey={action}
                  onSelectionChange={(k) => setAction(String(k) as AdminAction)}
                >
                  <Label>Aksi</Label>
                  <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item key="UPDATE" id="UPDATE" textValue="Ubah detail">Ubah detail</ListBox.Item>
                      <ListBox.Item key="REASSIGN" id="REASSIGN" textValue="Ganti penanggung jawab">Ganti penanggung jawab</ListBox.Item>
                      <ListBox.Item key="CANCEL" id="CANCEL" textValue="Batalkan aktivitas">Batalkan aktivitas</ListBox.Item>
                    </ListBox>
                  </Select.Popover>
                </Select>}

                {action === 'UPDATE' && (
                  <>
                    <ActivityIndicatorMultiSelect
                      indicators={indicators}
                      selectedIds={corporateKpiIds}
                      onChange={setCorporateKpiIds}
                      isLoading={isLoadingIndicators}
                    />
                    <TextField isRequired value={activityName} onChange={setActivityName}>
                      <Label>Nama Aktivitas</Label>
                      <Input variant="secondary" placeholder="Masukkan nama aktivitas..." />
                    </TextField>

                    <TextField value={description} onChange={setDescription}>
                      <Label>Deskripsi</Label>
                      <TextArea variant="secondary" placeholder="Deskripsi opsional..." rows={2} />
                    </TextField>

                    <div className="grid grid-cols-2 gap-4">
                      <TextField isRequired value={unit} onChange={setUnit}>
                        <Label>Unit</Label>
                        <Input variant="secondary" placeholder="Contoh: %, IDR, unit" />
                      </TextField>
                      <TextField isRequired value={targetValue} onChange={setTargetValue} type="number">
                        <Label>Nilai Target</Label>
                        <Input variant="secondary" placeholder="Contoh: 100" />
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
                        placeholder="Pilih pengguna penanggung jawab..."
                      >
                        <Label>Pengguna Penanggung Jawab Baru</Label>
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
                        placeholder="Pilih posisi penanggung jawab..."
                      >
                        <Label>Posisi Penanggung Jawab Baru</Label>
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
                  <Label>Alasan</Label>
                  <TextArea variant="secondary" placeholder="Alasan administratif wajib diisi..." rows={2} />
                </TextField>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose} isDisabled={isSubmitting}>
                <XIcon className="h-4 w-4" />
                Batal
              </Button>
              <Button
                variant={action === 'CANCEL' ? 'danger' : 'primary'}
                onPress={handleSubmit}
                isDisabled={isSubmitting}
                isPending={isSubmitting}
              >
                {action === 'CANCEL' ? 'Batalkan Aktivitas' : 'Simpan Perubahan'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
