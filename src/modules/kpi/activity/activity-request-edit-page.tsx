'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Breadcrumbs, BreadcrumbsItem, Button, Input, Label, Spinner, TextArea, TextField, toast } from '@heroui/react';
import { ArrowLeft, FloppyDisk, House } from '@phosphor-icons/react';
import { useActivityDetail } from './use-activity-detail';
import { useMyPositions } from '@/modules/kpi/shared/acting-position-selector';
import { activityV1Api, extractActivityV1Error } from './activity-v1-api';
import { corporateKpiApi } from '@/modules/kpi/corporate/corporate-kpi-api';
import { corporateKpiStructuresApi } from '@/modules/kpi/corporate/corporate-kpi-structures-api';
import { ActivityIndicatorMultiSelect } from './activity-indicator-multi-select';
import type { CorporateKpiNode } from '@/modules/kpi/corporate/corporate-kpi.types';

interface ActivityRequestEditPageProps {
  id: string;
  onBack: () => void;
  onSuccess: () => void;
}

export function ActivityRequestEditPage({ id, onBack, onSuccess }: ActivityRequestEditPageProps) {
  const { activity, isLoading, error, refresh } = useActivityDetail(id, true);
  const { positions, isLoading: isLoadingPositions } = useMyPositions();
  const [activityName, setActivityName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [indicatorIds, setIndicatorIds] = useState<string[]>([]);
  const [indicators, setIndicators] = useState<CorporateKpiNode[]>([]);
  const [isLoadingIndicators, setIsLoadingIndicators] = useState(false);
  const [indicatorsLoaded, setIndicatorsLoaded] = useState(false);
  const [indicatorsError, setIndicatorsError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isChild = Boolean(activity?.parentId);
  const actingPosition = useMemo(
    () => positions.find((position) => position.userPositionId === activity?.assignedToUserPositionId) ?? null,
    [activity?.assignedToUserPositionId, positions],
  );

  useEffect(() => {
    if (!activity) return;
    setActivityName(activity.activityName);
    setDescription(activity.description ?? '');
    setUnit(activity.unit);
    setTargetValue(String(activity.targetValue));
    setIndicatorIds(activity.corporateKpis?.map((indicator) => indicator.id) ?? (activity.corporateKpiId ? [activity.corporateKpiId] : []));
    setValidationError(null);
    setIndicatorsLoaded(Boolean(activity.parentId));
  }, [activity]);

  const loadIndicators = useCallback(async () => {
    if (!activity || isChild) return;
    setIsLoadingIndicators(true);
    setIndicatorsError(null);
    try {
      const [tree, structures] = await Promise.all([corporateKpiApi.getTreeByYear(activity.periodYear), corporateKpiStructuresApi.list()]);
      const activeStructureIds = new Set(structures.filter((structure) => structure.status === 'ACTIVE').map((structure) => structure.id));
      const result: CorporateKpiNode[] = [];
      const collect = (nodes: CorporateKpiNode[]) => nodes.forEach((node) => {
        if (node.nodeType === 'INDICATOR' && activeStructureIds.has(node.structureId)) result.push(node);
        if (node.children.length) collect(node.children);
      });
      collect(tree);
      setIndicators(result);
    } catch (loadError: unknown) {
      setIndicatorsError(extractActivityV1Error(loadError));
    } finally {
      setIsLoadingIndicators(false);
      setIndicatorsLoaded(true);
    }
  }, [activity, isChild]);

  useEffect(() => { void loadIndicators(); }, [loadIndicators]);

  const submit = useCallback(async () => {
    setValidationError(null);
    if (!activity || !actingPosition) return setValidationError('Posisi aktif untuk aktivitas ini tidak ditemukan.');
    if (!activityName.trim()) return setValidationError('Nama aktivitas wajib diisi.');
    if (!unit.trim()) return setValidationError('Satuan wajib diisi.');
    if (!isChild && indicatorIds.length === 0) return setValidationError('Pilih minimal satu indikator KPI Perusahaan.');
    const target = Number(targetValue);
    if (!targetValue.trim() || !Number.isFinite(target) || target <= 0) return setValidationError('Target harus berupa angka positif.');
    setIsSubmitting(true);
    try {
      await activityV1Api.submitChangeRequest(activity.id, {
        requestType: 'UPDATE', actingPositionId: actingPosition.positionId,
        activityName: activityName.trim(), description: description.trim() || null,
        unit: unit.trim(), targetValue: target, ...(isChild ? {} : { corporateKpiIds: indicatorIds }),
      });
      toast.success('Pengajuan perubahan berhasil dikirim.');
      onSuccess();
    } catch (submitError: unknown) {
      const message = extractActivityV1Error(submitError);
      setValidationError(message);
      void refresh();
    } finally {
      setIsSubmitting(false);
    }
  }, [activity, actingPosition, activityName, description, indicatorIds, isChild, onSuccess, refresh, targetValue, unit]);

  if (isLoading || isLoadingPositions || (!isChild && !indicatorsLoaded)) return <div className="flex h-64 items-center justify-center"><Spinner size="md" /></div>;
  if (error || !activity) return <div className="flex flex-col gap-5"><Alert status="danger"><Alert.Indicator /><Alert.Content><Alert.Title>{error || 'Aktivitas tidak ditemukan.'}</Alert.Title></Alert.Content></Alert><Button variant="secondary" className="self-start" onPress={onBack}>Kembali</Button></div>;
  if (indicatorsError) return <div className="flex flex-col gap-5"><Alert status="danger"><Alert.Indicator /><Alert.Content><Alert.Title>{indicatorsError}</Alert.Title></Alert.Content></Alert><Button variant="secondary" className="self-start" onPress={onBack}>Kembali</Button></div>;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Breadcrumbs><BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem><BreadcrumbsItem>KPI</BreadcrumbsItem><BreadcrumbsItem href="/kpi/activities/mine">Aktivitas Saya</BreadcrumbsItem><BreadcrumbsItem>Ajukan Perubahan</BreadcrumbsItem></Breadcrumbs>
      <div className="flex items-center gap-3"><Button isIconOnly variant="tertiary" onPress={onBack} aria-label="Kembali"><ArrowLeft className="h-5 w-5" /></Button><h1 className="text-xl font-semibold text-foreground">Ajukan Perubahan Aktivitas</h1></div>
      {validationError && <Alert status="danger"><Alert.Indicator /><Alert.Content><Alert.Title>{validationError}</Alert.Title></Alert.Content></Alert>}
      {isChild && <Alert status="accent"><Alert.Indicator /><Alert.Content><Alert.Title>KPI Perusahaan diwarisi dari aktivitas induk.</Alert.Title></Alert.Content></Alert>}
      <div className="flex flex-col gap-5">
        {!isChild && <ActivityIndicatorMultiSelect indicators={indicators} selectedIds={indicatorIds} onChange={setIndicatorIds} isLoading={isLoadingIndicators} variant="primary" />}
        <TextField isRequired value={activityName} onChange={setActivityName}><Label>Nama Aktivitas</Label><Input variant="primary" /></TextField>
        <TextField value={description} onChange={setDescription}><Label>Deskripsi</Label><TextArea variant="primary" rows={3} /></TextField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><TextField isRequired value={targetValue} onChange={setTargetValue}><Label>Target</Label><Input variant="primary" type="number" /></TextField><TextField isRequired value={unit} onChange={setUnit}><Label>Satuan</Label><Input variant="primary" /></TextField></div>
      </div>
      <div className="flex justify-end gap-3"><Button variant="secondary" onPress={onBack} isDisabled={isSubmitting}>Batal</Button><Button variant="primary" onPress={submit} isDisabled={!actingPosition || isSubmitting} isPending={isSubmitting}><FloppyDisk className="h-4 w-4" />Kirim Pengajuan</Button></div>
    </div>
  );
}
