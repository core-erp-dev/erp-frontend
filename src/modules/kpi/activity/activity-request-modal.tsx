'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Button, Input, Label, ListBox, Modal, Select, Spinner, TextArea, TextField, toast,
} from '@heroui/react';
import { X as XIcon } from '@phosphor-icons/react';
import { activityV1Api } from './activity-v1-api';
import { useActivityData } from './use-activity-data';
import { corporateKpiApi } from '@/modules/kpi/corporate/corporate-kpi-api';
import { corporateKpiStructuresApi } from '@/modules/kpi/corporate/corporate-kpi-structures-api';
import type { CorporateKpiNode } from '@/modules/kpi/corporate/corporate-kpi.types';
import type { ActingPosition } from '@/modules/kpi/shared/acting-position';
import type { RecoverableConflict } from '@/modules/kpi/shared/domain-errors';
import type {
  AssignableUserPositionResponse,
  CreateActivityRequest,
  KpiActivityResponse,
} from './activity-v1.types';
import { ActivityIndicatorMultiSelect } from './activity-indicator-multi-select';

interface ActivityRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** independent = no parent (indicator + period); child = under a selected parent. */
  mode: 'independent' | 'child';
  /** The explicitly selected acting Position (`positionId` is sent as `actingPositionId`). */
  actingPosition: ActingPosition;
  /** Child mode: eligible parents — the actor's own ACTIVE activities. */
  parents: KpiActivityResponse[];
  /** Child mode: pre-select this parent (from the row's Add Child action). */
  initialParentId?: string | null;
  /** Called after a successful submission (refetch relevant data). */
  onSuccess: () => void;
  /** Called after a recoverable conflict (refetch authoritative data). */
  onConflict: () => void;
}

/**
 * T4 — unified CREATE Activity request (independent vs child discriminated).
 *
 * Independent body: `{ assignedToUserPositionId, actingPositionId, corporateKpiId,
 * periodYear, periodMonth, activityName, description?, unit, targetValue }`
 * Child body: `{ assignedToUserPositionId, actingPositionId, parentId,
 * activityName, description?, unit, targetValue }` — indicator/period are
 * inherited and NEVER serialized (typed `never`).
 *
 * The assignee is chosen from `GET /assignable-assignees` (explicit user-
 * position selection); the acting Position is the page-level explicit choice.
 * Closes only after a successful mutation; recoverable conflicts surface a
 * banner and trigger a refetch.
 */
export function ActivityRequestModal({
  isOpen, onClose, mode, actingPosition, parents, initialParentId, onSuccess, onConflict,
}: ActivityRequestModalProps) {
  const { submitCreateRequest } = useActivityData();
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  const [assignees, setAssignees] = useState<AssignableUserPositionResponse[]>([]);
  const [isLoadingAssignees, setIsLoadingAssignees] = useState(false);
  const [assigneeId, setAssigneeId] = useState('');
  const [parentId, setParentId] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [periodMonth, setPeriodMonth] = useState<number | null>(null);
  const [ckTree, setCkTree] = useState<CorporateKpiNode[]>([]);
  const [isLoadingCk, setIsLoadingCk] = useState(false);
  const [ckIds, setCkIds] = useState<string[]>([]);
  const [activityName, setActivityName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<RecoverableConflict | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedParent = parents.find((parent) => parent.id === parentId) ?? null;

  /* Reset on open; load assignable assignees for the acting Position. */
  useEffect(() => {
    if (!isOpen) return;
    setAssigneeId('');
    setParentId(mode === 'child' && initialParentId ? initialParentId : '');
    setSelectedYear(null);
    setPeriodMonth(null);
    setCkIds([]);
    setActivityName('');
    setDescription('');
    setUnit('');
    setTargetValue('');
    setValidationError(null);
    setConflict(null);
    /* Child-mode assignees load via the parent-change effect below. */
    if (mode !== 'child') {
      setIsLoadingAssignees(true);
      setAssignees([]);
      activityV1Api
        .getAssignableAssignees(actingPosition.positionId)
        .then(setAssignees)
        .catch(() => setAssignees([]))
        .finally(() => setIsLoadingAssignees(false));
    }
  }, [isOpen, mode, initialParentId, actingPosition.positionId]);

  /* Child mode: reload assignees when the parent changes (direct subordinates of the parent assignee). */
  useEffect(() => {
    if (!isOpen || mode !== 'child' || !parentId) return;
    setIsLoadingAssignees(true);
    setAssigneeId('');
    setAssignees([]);
    activityV1Api
      .getAssignableAssignees(actingPosition.positionId, parentId)
      .then((data) => {
        setAssignees(data);
        // Self-child context (parent = the actor's direct superior): T3 returns
        // ONLY the actor's own assignment — preselect it so the request targets
        // the actor without an explicit pick.
        if (data.length === 1 && data[0].isSelf) {
          setAssigneeId(data[0].userPositionId);
        }
      })
      .catch(() => setAssignees([]))
      .finally(() => setIsLoadingAssignees(false));
  }, [isOpen, mode, parentId, actingPosition.positionId]);

  /* Independent mode: CK indicators for the selected year. */
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
    if (isOpen && mode === 'independent' && selectedYear !== null) void fetchCkTree(selectedYear);
  }, [isOpen, mode, selectedYear, fetchCkTree]);

  const handleSubmit = useCallback(async () => {
    setValidationError(null);
    setConflict(null);
    if (!assigneeId) {
      setValidationError('Pilih posisi penanggung jawab.');
      return;
    }
    if (mode === 'independent' && selectedYear === null) {
      setValidationError('Pilih tahun periode.');
      return;
    }
    if (mode === 'independent' && periodMonth === null) {
      setValidationError('Pilih bulan periode.');
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
    if (!targetValue || Number.isNaN(tv) || tv <= 0) {
      setValidationError('Nilai target harus berupa angka positif.');
      return;
    }
    if (mode === 'independent' && ckIds.length === 0) {
      setValidationError('Pilih minimal satu indikator KPI Perusahaan untuk aktivitas independen.');
      return;
    }
    if (mode === 'child' && !parentId) {
      setValidationError('Pilih aktivitas induk untuk aktivitas turunan.');
      return;
    }

    const body: CreateActivityRequest = mode === 'independent'
      ? {
          assignedToUserPositionId: assigneeId,
          actingPositionId: actingPosition.positionId,
          corporateKpiIds: ckIds,
          periodYear: selectedYear as number,
          periodMonth: periodMonth as number,
          activityName: activityName.trim(),
          description: description.trim() || undefined,
          unit: unit.trim(),
          targetValue: tv,
        }
      : {
          assignedToUserPositionId: assigneeId,
          actingPositionId: actingPosition.positionId,
          parentId,
          activityName: activityName.trim(),
          description: description.trim() || undefined,
          unit: unit.trim(),
          targetValue: tv,
        };

    setIsSubmitting(true);
    try {
      const result = await submitCreateRequest(body);
      if (result.success) {
        toast.success('Pengajuan aktivitas berhasil dikirim.');
        onSuccess();
        onClose();
      } else if (result.conflict) {
        setConflict(result.conflict);
        onConflict();
      } else {
        toast.danger(result.message ?? 'Gagal mengirim pengajuan aktivitas.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    mode, assigneeId, activityName, unit, targetValue, ckIds, parentId,
    selectedYear, periodMonth, description, actingPosition.positionId,
    submitCreateRequest, onSuccess, onClose, onConflict,
  ]);

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      isDismissable={false}
      onOpenChange={(o) => { if (!o) onClose(); }}
    >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[600px]">
            <Modal.Header>
              <Modal.Heading>
                {mode === 'independent' ? 'Ajukan Aktivitas Independen' : 'Ajukan Aktivitas Turunan'}
              </Modal.Heading>
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
                  Posisi Acting: <span className="font-medium text-foreground">{actingPosition.positionName}</span>
                  {actingPosition.isPrimary ? ' (Utama)' : ''}
                </div>

                {isLoadingAssignees ? (
                  <div className="flex items-center justify-center py-4"><Spinner size="sm" /></div>
                ) : (
                  <Select
                    variant="secondary"
                    selectedKey={assigneeId || null}
                    onSelectionChange={(k) => setAssigneeId(String(k || ''))}
                    placeholder={assignees.length === 0 ? 'Tidak ada posisi yang dapat dipilih' : 'Pilih posisi penanggung jawab...'}
                  >
                    <Label>Posisi Penanggung Jawab</Label>
                    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {assignees.map((a) => (
                          <ListBox.Item key={a.userPositionId} id={a.userPositionId} textValue={a.userFullName}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm text-foreground">
                                {a.userFullName}{a.isSelf ? ' (Anda)' : ''}
                              </span>
                              <span className="text-xs text-muted-foreground">{a.positionName}</span>
                            </div>
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                )}

                {mode === 'child' && (
                  <>
                    <Select
                      variant="secondary"
                      selectedKey={parentId || null}
                      onSelectionChange={(k) => { setParentId(String(k || '')); setAssigneeId(''); }}
                      placeholder={parents.length === 0 ? 'Tidak ada aktivitas induk yang tersedia' : 'Pilih aktivitas induk...'}
                    >
                      <Label>Aktivitas Induk</Label>
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
                    {selectedParent && (
                      <div className="rounded-lg bg-secondary-soft p-3 text-sm text-muted-foreground">
                        <div className="font-medium text-foreground">Indicator diwariskan dari aktivitas induk</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(selectedParent.corporateKpis ?? (selectedParent.corporateKpiId ? [{ id: selectedParent.corporateKpiId, code: selectedParent.corporateKpiCode, name: selectedParent.corporateKpiName }] : [])).map((indicator) => (
                            <span key={indicator.id}>{indicator.code} — {indicator.name}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {mode === 'independent' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <Select
                        variant="secondary"
                        selectedKey={selectedYear === null ? null : String(selectedYear)}
                        onSelectionChange={(k) => { setSelectedYear(k == null ? null : Number(k)); setCkIds([]); }}
                        isRequired
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
                        selectedKey={periodMonth === null ? null : String(periodMonth)}
                        onSelectionChange={(k) => setPeriodMonth(k == null ? null : Number(k))}
                        isRequired
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
                      selectedIds={ckIds}
                      onChange={setCkIds}
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
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose} isDisabled={isSubmitting}>
                <XIcon className="h-4 w-4" />
                Batal
              </Button>
              <Button variant="primary" onPress={handleSubmit} isDisabled={isSubmitting} isPending={isSubmitting}>
                Kirim Pengajuan
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
  );
}
