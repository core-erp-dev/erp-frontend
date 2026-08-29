'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Button, Input, Label, Modal, TextArea, TextField, toast,
} from '@heroui/react';
import { X as XIcon } from '@phosphor-icons/react';
import { useActivityData } from './use-activity-data';
import { corporateKpiApi } from '@/modules/kpi/corporate/corporate-kpi-api';
import { corporateKpiStructuresApi } from '@/modules/kpi/corporate/corporate-kpi-structures-api';
import type { CorporateKpiNode } from '@/modules/kpi/corporate/corporate-kpi.types';
import { ActivityIndicatorMultiSelect } from './activity-indicator-multi-select';
import type { ActingPosition } from '@/modules/kpi/shared/acting-position';
import type { RecoverableConflict } from '@/modules/kpi/shared/domain-errors';
import type {
  CancelChangeRequest,
  KpiActivityResponse,
  UpdateChangeRequest,
} from './activity-v1.types';

interface ActivityChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** update = proposal of mutable fields; cancel = reason only. */
  mode: 'update' | 'cancel';
  /** The Activity being changed (must be ACTIVE). */
  activity: KpiActivityResponse;
  /** The explicitly selected acting Position (`positionId` is sent as `actingPositionId`). */
  actingPosition: ActingPosition;
  /** Called after a successful submission (refetch requests + affected data). */
  onSuccess: () => void;
  /** Called after a recoverable conflict (refetch authoritative data). */
  onConflict: () => void;
}

/**
 * T5 — UPDATE/CANCEL change request against an existing Activity.
 *
 * UPDATE body: `{ requestType: 'UPDATE', actingPositionId, activityName,
 * description, unit, targetValue }` — proposal fields only; `cancellationReason`
 * is forbidden (typed `never`).
 * CANCEL body: `{ requestType: 'CANCEL', actingPositionId, cancellationReason }`
 * — proposal fields are forbidden (typed `never`), so CANCEL can never
 * serialize UPDATE-only fields.
 *
 * Lineage (parentId/corporateKpiId/assignee/period) is immutable and never
 * sent. Maker–checker + stored-approver behavior is preserved by the backend.
 */
export function ActivityChangeModal({
  isOpen, onClose, mode, activity, actingPosition, onSuccess, onConflict,
}: ActivityChangeModalProps) {
  const { submitChangeRequest } = useActivityData();

  const [activityName, setActivityName] = useState(activity.activityName);
  const [description, setDescription] = useState(activity.description ?? '');
  const [unit, setUnit] = useState(activity.unit);
  const [targetValue, setTargetValue] = useState(String(activity.targetValue));
  const [corporateKpiIds, setCorporateKpiIds] = useState<string[]>([]);
  const [indicators, setIndicators] = useState<CorporateKpiNode[]>([]);
  const [isLoadingIndicators, setIsLoadingIndicators] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<RecoverableConflict | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isChild = Boolean(activity.parentId);

  /* Prefill from the authoritative Activity response whenever the modal opens. */
  useEffect(() => {
    if (!isOpen) return;
    setActivityName(activity.activityName);
    setDescription(activity.description ?? '');
    setUnit(activity.unit);
    setTargetValue(String(activity.targetValue));
    setCorporateKpiIds(activity.corporateKpis?.map((kpi) => kpi.id) ?? (activity.corporateKpiId ? [activity.corporateKpiId] : []));
    setCancellationReason('');
    setValidationError(null);
    setConflict(null);
  }, [isOpen, activity]);

  useEffect(() => {
    if (!isOpen || mode !== 'update' || isChild) {
      setIndicators([]);
      setIsLoadingIndicators(false);
      return;
    }
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
  }, [isOpen, mode, activity.periodYear, isChild]);

  const handleSubmit = useCallback(async () => {
    setValidationError(null);
    setConflict(null);

    if (mode === 'cancel') {
      if (!cancellationReason.trim()) {
        setValidationError('Alasan pembatalan wajib diisi.');
        return;
      }
      const body: CancelChangeRequest = {
        requestType: 'CANCEL',
        actingPositionId: actingPosition.positionId,
        cancellationReason: cancellationReason.trim(),
      };
      setIsSubmitting(true);
      try {
        const result = await submitChangeRequest(activity.id, body);
        if (result.success) {
          toast.success('Pengajuan pembatalan berhasil dikirim.');
          onSuccess();
          onClose();
        } else if (result.conflict) {
          setConflict(result.conflict);
          onConflict();
        } else {
          toast.danger(result.message ?? 'Gagal mengirim pengajuan pembatalan.');
        }
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    /* UPDATE mode */
    if (!activityName.trim()) {
      setValidationError('Nama aktivitas wajib diisi.');
      return;
    }
    if (!unit.trim()) {
      setValidationError('Unit wajib diisi.');
      return;
    }
    if (!isChild && corporateKpiIds.length === 0) {
      setValidationError('Pilih minimal satu indikator KPI Perusahaan.');
      return;
    }
    const tv = parseFloat(targetValue);
    if (!targetValue || Number.isNaN(tv) || tv <= 0) {
      setValidationError('Nilai target harus berupa angka positif.');
      return;
    }

    const body: UpdateChangeRequest = {
      requestType: 'UPDATE',
      actingPositionId: actingPosition.positionId,
      activityName: activityName.trim(),
      description: description.trim() || null,
      unit: unit.trim(),
      targetValue: tv,
      ...(isChild ? {} : { corporateKpiIds }),
    };
    setIsSubmitting(true);
    try {
      const result = await submitChangeRequest(activity.id, body);
      if (result.success) {
        toast.success('Pengajuan perubahan berhasil dikirim.');
        onSuccess();
        onClose();
      } else if (result.conflict) {
        setConflict(result.conflict);
        onConflict();
      } else {
        toast.danger(result.message ?? 'Gagal mengirim pengajuan perubahan.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    mode, cancellationReason, activityName, unit, targetValue, description, corporateKpiIds, isChild,
    actingPosition.positionId, activity.id, submitChangeRequest,
    onSuccess, onClose, onConflict,
  ]);

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      isDismissable={false}
      onOpenChange={(o) => { if (!o) onClose(); }}
    >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[560px]">
            <Modal.Header>
              <Modal.Heading>
                {mode === 'update' ? 'Ajukan Perubahan Aktivitas' : 'Ajukan Pembatalan Aktivitas'}
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
                  <div>Aktivitas: <span className="font-medium text-foreground">{activity.activityName}</span></div>
                  <div>
                    Posisi Acting: <span className="font-medium text-foreground">{actingPosition.positionName}</span>
                    {actingPosition.isPrimary ? ' (Utama)' : ''}
                  </div>
                </div>

                {mode === 'update' ? (
                  <>
                    {isChild ? (
                      <div className="rounded-lg bg-secondary-soft p-3 text-sm text-muted-foreground">
                        <div className="font-medium text-foreground">Indicator diwariskan dari aktivitas induk</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(activity.corporateKpis ?? (activity.corporateKpiId ? [{ id: activity.corporateKpiId, code: activity.corporateKpiCode, name: activity.corporateKpiName }] : [])).map((indicator) => (
                            <span key={indicator.id}>{indicator.code} — {indicator.name}</span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <ActivityIndicatorMultiSelect
                        indicators={indicators}
                        selectedIds={corporateKpiIds}
                        onChange={setCorporateKpiIds}
                        isLoading={isLoadingIndicators}
                      />
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
                  </>
                ) : (
                  <TextField isRequired value={cancellationReason} onChange={setCancellationReason}>
                    <Label>Alasan Pembatalan</Label>
                    <TextArea variant="secondary" placeholder="Jelaskan alasan aktivitas ini harus dibatalkan..." rows={3} />
                  </TextField>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose} isDisabled={isSubmitting}>
                <XIcon className="h-4 w-4" />
                Batal
              </Button>
              <Button
                variant={mode === 'cancel' ? 'danger' : 'primary'}
                onPress={handleSubmit}
                isDisabled={isSubmitting}
                isPending={isSubmitting}
              >
                Kirim Pengajuan {mode === 'cancel' ? 'Pembatalan' : 'Perubahan'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
  );
}
