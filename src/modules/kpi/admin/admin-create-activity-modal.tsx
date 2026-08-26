'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Input, TextField, TextArea, Select, ListBox, Label, Spinner } from '@heroui/react';
import { X } from '@phosphor-icons/react';
import { toast } from '@heroui/react';
import { employeeApi } from '@/modules/organization/employees/services/employee-api';
import type { CoreUser, UserPositionResponse } from '@/modules/organization/employees/types';
import { kpiAdminV1Api } from './kpi-admin-v1-api';
import { activityV1Api } from '@/modules/kpi/activity/activity-v1-api';
import { corporateKpiApi } from '@/modules/kpi/corporate/corporate-kpi-api';
import { corporateKpiStructuresApi } from '@/modules/kpi/corporate/corporate-kpi-structures-api';
import type { CorporateKpiNode } from '@/modules/kpi/corporate/corporate-kpi.types';
import type { KpiActivityResponse } from '@/modules/kpi/activity/activity-v1.types';
import { ActivityIndicatorMultiSelect } from '@/modules/kpi/activity/activity-indicator-multi-select';

interface AdminCreateActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after successful creation (refetch current view). */
  onSuccess: () => void;
}

/**
 * T10 — administrative Activity create for anyone (no approval flow).
 * Action-level guard: the caller must hold `kpi_activity:manage` (enforced at
 * the trigger site AND by the backend @PreAuthorize). A mandatory `reason` is
 * the administrative audit trail.
 *
 * Root vs child is decided by the optional Parent selector:
 *   - no parent → root: Corporate KPI indicator + period required;
 *   - parent selected → child: indicator/period inherited (omitted from body).
 */
export function AdminCreateActivityModal({ isOpen, onClose, onSuccess }: AdminCreateActivityModalProps) {
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  /* Data sources */
  const [users, setUsers] = useState<CoreUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [parents, setParents] = useState<KpiActivityResponse[]>([]);
  const [ckTree, setCkTree] = useState<CorporateKpiNode[]>([]);
  const [isLoadingCk, setIsLoadingCk] = useState(false);

  /* Form state */
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserPositionId, setSelectedUserPositionId] = useState('');
  const [parentId, setParentId] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [periodMonth, setPeriodMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedCkIds, setSelectedCkIds] = useState<string[]>([]);
  const [activityName, setActivityName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;
  const activePositions: UserPositionResponse[] = selectedUser
    ? selectedUser.positions.filter((p) => p.isActive)
    : [];
  const isRoot = !parentId;

  /* Load users + parent activities on open */
  const loadData = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const page = await employeeApi.getUsers({ size: 100 });
      setUsers(page.content);
    } catch {
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
    try {
      const all = await activityV1Api.getActivities('all');
      setParents(all.filter((a) => a.status === 'ACTIVE'));
    } catch {
      setParents([]);
    }
  }, []);

  /* Load CK tree when year changes (root only) */
  const fetchCkTree = useCallback(async (year: number) => {
    setIsLoadingCk(true);
    try {
      const tree = await corporateKpiApi.getTreeByYear(year);
      // Lifecycle lives on the yearly structure: only ACTIVE structures'
      // indicators are bindable for Activities.
      const structures = await corporateKpiStructuresApi.list();
      const activeStructureIds = new Set(
        structures.filter((s) => s.status === 'ACTIVE').map((s) => s.id),
      );
      const indicators: CorporateKpiNode[] = [];
      const collect = (nodes: CorporateKpiNode[]) => {
        for (const node of nodes) {
          if (node.nodeType === 'INDICATOR' && activeStructureIds.has(node.structureId)) {
            indicators.push(node);
          }
          if (node.children.length > 0) collect(node.children);
        }
      };
      collect(tree);
      setCkTree(indicators);
    } catch {
      setCkTree([]);
    } finally {
      setIsLoadingCk(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
      setSelectedUserId('');
      setSelectedUserPositionId('');
      setParentId('');
      setSelectedCkIds([]);
      setActivityName('');
      setDescription('');
      setUnit('');
      setTargetValue('');
      setReason('');
      setValidationError(null);
    }
  }, [isOpen, loadData]);

  useEffect(() => {
    if (isOpen && isRoot) fetchCkTree(selectedYear);
  }, [isOpen, isRoot, selectedYear, fetchCkTree]);

  /* User change clears position selection */
  const handleUserChange = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setSelectedUserPositionId('');
  }, []);

  const handleSubmit = useCallback(async () => {
    setValidationError(null);
    if (!selectedUserPositionId) {
      setValidationError('Pilih posisi penanggung jawab.');
      return;
    }
    if (!activityName.trim()) {
      setValidationError('Nama aktivitas wajib diisi.');
      return;
    }
    if (!unit.trim()) {
      setValidationError('Unit wajib diisi.');
      return;
    }
    const tv = parseFloat(targetValue);
    if (!targetValue || isNaN(tv) || tv <= 0) {
      setValidationError('Nilai target harus berupa angka positif.');
      return;
    }
    if (isRoot && selectedCkIds.length === 0) {
      setValidationError('Pilih minimal satu indikator KPI Perusahaan untuk aktivitas induk.');
      return;
    }
    if (!reason.trim()) {
      setValidationError('Alasan administratif wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      await kpiAdminV1Api.adminCreateActivity({
        assignedToUserPositionId: selectedUserPositionId,
        parentId: isRoot ? undefined : parentId,
        corporateKpiIds: isRoot ? selectedCkIds : undefined,
        periodYear: isRoot ? selectedYear : undefined,
        periodMonth: isRoot ? periodMonth : undefined,
        activityName: activityName.trim(),
        description: description.trim() || undefined,
        unit: unit.trim(),
        targetValue: tv,
        reason: reason.trim(),
      });
      toast.success('Aktivitas berhasil dibuat.');
      onSuccess();
      onClose();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Gagal membuat aktivitas.');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedUserPositionId, activityName, unit, targetValue, isRoot, selectedCkIds, reason, parentId, selectedYear, periodMonth, description, onSuccess, onClose]);

  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Backdrop isDismissable={false}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[600px]">
            <Modal.Header>
            <Modal.Heading>Buat Aktivitas</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col gap-4">
                {validationError && (
                  <div className="rounded-lg bg-danger-soft p-3 text-sm text-danger-soft-foreground">
                    {validationError}
                  </div>
                )}

                {isLoadingUsers ? (
                  <div className="flex items-center justify-center py-4"><Spinner size="sm" /></div>
                ) : (
                  <Select
                    variant="secondary"
                    selectedKey={selectedUserId || null}
                    onSelectionChange={(k) => handleUserChange(String(k || ''))}
                    placeholder="Pilih pengguna penanggung jawab..."
                  >
                    <Label>Pengguna Penanggung Jawab</Label>
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
                    <Label>Posisi Penanggung Jawab</Label>
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

                {/* Parent selector — empty = root create */}
                <Select
                  variant="secondary"
                  selectedKey={parentId || null}
                  onSelectionChange={(k) => { setParentId(String(k || '')); setSelectedCkIds([]); }}
                  placeholder="Tanpa induk — aktivitas utama"
                >
                  <Label>Aktivitas Induk (opsional)</Label>
                  <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {parents.map((p) => (
                        <ListBox.Item key={p.id} id={p.id} textValue={p.activityName}>
                          <span className="text-sm text-foreground">{p.activityName}</span>
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>

                {isRoot && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <Select
                        variant="secondary"
                        selectedKey={String(selectedYear)}
                        onSelectionChange={(k) => { setSelectedYear(Number(k)); setSelectedCkIds([]); }}
                      >
                        <Label>Tahun Periode</Label>
                        <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {yearOptions.map((y) => (
                              <ListBox.Item key={String(y)} id={String(y)} textValue={String(y)}>
                                {y}
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                      <Select
                        variant="secondary"
                        selectedKey={String(periodMonth)}
                        onSelectionChange={(k) => setPeriodMonth(Number(k))}
                      >
                        <Label>Bulan Periode</Label>
                        <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                              <ListBox.Item key={String(m)} id={String(m)} textValue={String(m).padStart(2, '0')}>
                                {String(m).padStart(2, '0')}
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </div>

                    <ActivityIndicatorMultiSelect
                      indicators={ckTree}
                      selectedIds={selectedCkIds}
                      onChange={setSelectedCkIds}
                      isLoading={isLoadingCk}
                    />
                  </>
                )}

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

                <TextField value={reason} onChange={setReason}>
                  <Label>Alasan</Label>
                  <TextArea variant="secondary" placeholder="Alasan audit administratif wajib diisi..." rows={2} />
                </TextField>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose} isDisabled={isSubmitting}>
                <X className="h-4 w-4" />
                Batal
              </Button>
              <Button variant="primary" onPress={handleSubmit} isDisabled={isSubmitting} isPending={isSubmitting}>
                Buat Aktivitas
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
