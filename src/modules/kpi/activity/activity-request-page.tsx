'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Breadcrumbs, BreadcrumbsItem, Button, Input, Label,
  ListBox, Modal, Select, Spinner, TextArea, TextField, toast,
} from '@heroui/react';
import { ArrowLeft, FloppyDisk, House } from '@phosphor-icons/react';
import { ActingPositionSelector, useMyPositions } from '@/modules/kpi/shared/acting-position-selector';
import { activityV1Api, extractActivityV1Error } from './activity-v1-api';
import { corporateKpiApi } from '@/modules/kpi/corporate/corporate-kpi-api';
import { corporateKpiStructuresApi } from '@/modules/kpi/corporate/corporate-kpi-structures-api';
import { ActivityIndicatorMultiSelect } from './activity-indicator-multi-select';
import type { CorporateKpiNode } from '@/modules/kpi/corporate/corporate-kpi.types';
import type { AssignableUserPositionResponse, KpiActivityResponse } from './activity-v1.types';

type RequestContext = 'mine' | 'subordinate';

interface ActivityRequestPageProps {
  context: RequestContext;
  onBack: () => void;
  onSuccess: () => void;
}

const NO_ACTIVE_POSITION = 'Anda tidak memiliki posisi aktif. Hubungi administrator jika ini tidak terduga.';
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function ActivityRequestPage({ context, onBack, onSuccess }: ActivityRequestPageProps) {
  const { positions, isLoading: isLoadingPositions, error: positionsError } = useMyPositions();
  const [actingPositionId, setActingPositionId] = useState('');
  const [assignees, setAssignees] = useState<AssignableUserPositionResponse[]>([]);
  const [parents, setParents] = useState<KpiActivityResponse[]>([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [parentId, setParentId] = useState('');
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [indicators, setIndicators] = useState<CorporateKpiNode[]>([]);
  const [indicatorIds, setIndicatorIds] = useState<string[]>([]);
  const [activityName, setActivityName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const [isLoadingIndicators, setIsLoadingIndicators] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const actingPosition = useMemo(
    () => positions.find((position) => position.positionId === actingPositionId) ?? null,
    [positions, actingPositionId],
  );
  const isChild = context === 'subordinate' && Boolean(parentId);
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, index) => current - 1 + index);
  }, []);

  useEffect(() => {
    setAssigneeId('');
    setParentId('');
    setParents([]);
    setAssignees([]);
    if (!actingPositionId || context !== 'subordinate') return;
    let active = true;
    setIsLoadingTargets(true);
    void Promise.all([
      activityV1Api.getAssignableAssignees(actingPositionId),
      activityV1Api.getActivitiesPage('mine', undefined, {
        page: 1, size: 100, search: '', status: 'ACTIVE', positionId: actingPositionId,
        sortBy: 'activityName', sortDirection: 'asc',
      }),
    ]).then(([targetOptions, parentPage]) => {
      if (!active) return;
      setAssignees(targetOptions.filter((option) => !option.isSelf));
      setParents(parentPage.content.filter((activity) => activity.assignedToUserPositionId === actingPosition?.userPositionId));
    }).catch((error: unknown) => {
      if (active) toast.danger(extractActivityV1Error(error));
    }).finally(() => { if (active) setIsLoadingTargets(false); });
    return () => { active = false; };
  }, [actingPosition?.userPositionId, actingPositionId, context]);

  const loadIndicators = useCallback(async (selectedYear: number) => {
    setIsLoadingIndicators(true);
    try {
      const [tree, structures] = await Promise.all([
        corporateKpiApi.getTreeByYear(selectedYear),
        corporateKpiStructuresApi.list(),
      ]);
      const activeStructureIds = new Set(structures.filter((structure) => structure.status === 'ACTIVE').map((structure) => structure.id));
      const result: CorporateKpiNode[] = [];
      const collect = (nodes: CorporateKpiNode[]) => nodes.forEach((node) => {
        if (node.nodeType === 'INDICATOR' && activeStructureIds.has(node.structureId)) result.push(node);
        if (node.children.length) collect(node.children);
      });
      collect(tree);
      setIndicators(result);
    } catch (error: unknown) {
      setIndicators([]);
      toast.danger(extractActivityV1Error(error));
    } finally {
      setIsLoadingIndicators(false);
    }
  }, []);

  useEffect(() => {
    setIndicatorIds([]);
    if (!isChild && year !== null) void loadIndicators(year);
    if (isChild) setIndicators([]);
  }, [isChild, loadIndicators, year]);

  const submit = useCallback(async () => {
    setValidationError(null);
    if (!actingPosition) return setValidationError(NO_ACTIVE_POSITION);
    if (context === 'subordinate' && !assigneeId) return setValidationError('Pilih posisi penanggung jawab.');
    if (year === null && !isChild) return setValidationError('Pilih tahun periode.');
    if (month === null && !isChild) return setValidationError('Pilih bulan periode.');
    if (!isChild && indicatorIds.length === 0) return setValidationError('Pilih minimal satu indikator KPI Perusahaan.');
    if (!activityName.trim()) return setValidationError('Nama aktivitas wajib diisi.');
    if (!unit.trim()) return setValidationError('Satuan wajib diisi.');
    const target = Number(targetValue);
    if (!targetValue.trim() || !Number.isFinite(target) || target <= 0) return setValidationError('Target harus berupa angka positif.');

    setIsSubmitting(true);
    try {
      const assignedToUserPositionId = context === 'mine' ? actingPosition.userPositionId : assigneeId;
      if (isChild) {
        await activityV1Api.submitCreateRequest({
          assignedToUserPositionId, actingPositionId: actingPosition.positionId, parentId,
          activityName: activityName.trim(), description: description.trim() || undefined,
          unit: unit.trim(), targetValue: target,
        });
      } else {
        await activityV1Api.submitCreateRequest({
          assignedToUserPositionId, actingPositionId: actingPosition.positionId, corporateKpiIds: indicatorIds,
          periodYear: year as number, periodMonth: month as number, activityName: activityName.trim(),
          description: description.trim() || undefined, unit: unit.trim(), targetValue: target,
        });
      }
      toast.success('Pengajuan aktivitas berhasil dikirim.');
      onSuccess();
    } catch (error: unknown) {
      toast.danger(extractActivityV1Error(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [actingPosition, activityName, assigneeId, context, description, indicatorIds, isChild, month, onSuccess, parentId, targetValue, unit, year]);

  const title = context === 'mine' ? 'Ajukan Aktivitas' : 'Ajukan Aktivitas Bawahan';
  const cannotSubmit = isLoadingPositions || !actingPosition || (context === 'subordinate' && isLoadingTargets);
  const isPositionless = !isLoadingPositions && !positionsError && positions.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem>KPI</BreadcrumbsItem>
        <BreadcrumbsItem href={context === 'mine' ? '/kpi/activities/mine' : '/kpi/activities/subordinate'}>{context === 'mine' ? 'Aktivitas Saya' : 'Aktivitas Bawahan'}</BreadcrumbsItem>
        <BreadcrumbsItem>{title}</BreadcrumbsItem>
      </Breadcrumbs>
      <div className="flex items-center gap-3">
        <Button isIconOnly variant="tertiary" onPress={onBack} aria-label="Kembali"><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      </div>

      {positionsError && <Alert status="danger"><Alert.Indicator /><Alert.Content><Alert.Title>{positionsError}</Alert.Title></Alert.Content></Alert>}
      {!isLoadingPositions && !positionsError && positions.length === 0 && <Alert status="warning"><Alert.Indicator /><Alert.Content><Alert.Title>{NO_ACTIVE_POSITION}</Alert.Title></Alert.Content></Alert>}
      {validationError && <Alert status="danger"><Alert.Indicator /><Alert.Content><Alert.Title>{validationError}</Alert.Title></Alert.Content></Alert>}

      <div className="flex flex-col gap-5">
        <ActingPositionSelector positions={positions} value={actingPositionId || null} onChange={setActingPositionId} disabled={isSubmitting} label="Posisi Saya" />
        {context === 'subordinate' && (
          <>
            {isLoadingTargets ? <div className="flex justify-center py-3"><Spinner size="sm" /></div> : (
              <Select variant="primary" selectedKey={assigneeId || null} onSelectionChange={(key) => setAssigneeId(key == null ? '' : String(key))} isDisabled={!actingPosition || isSubmitting}>
                <Label>Posisi Penanggung Jawab</Label><Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover><ListBox>{assignees.map((option) => <ListBox.Item key={option.userPositionId} id={option.userPositionId} textValue={`${option.userFullName} ${option.positionName}`}><span>{option.userFullName}</span><span className="text-muted-foreground"> • {option.positionName}</span></ListBox.Item>)}</ListBox></Select.Popover>
              </Select>
            )}
            <Select variant="primary" selectedKey={parentId || '__none__'} onSelectionChange={(key) => setParentId(key == null || String(key) === '__none__' ? '' : String(key))} isDisabled={!actingPosition || isLoadingTargets || isSubmitting}>
              <Label>Aktivitas Induk / Referensi (Opsional)</Label><Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover><ListBox><ListBox.Item id="__none__" textValue="Tanpa aktivitas induk">Tanpa aktivitas induk</ListBox.Item>{parents.map((parent) => <ListBox.Item key={parent.id} id={parent.id} textValue={parent.activityName}>{parent.activityName}</ListBox.Item>)}</ListBox></Select.Popover>
            </Select>
          </>
        )}

        {!isChild && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select variant="primary" selectedKey={year === null ? null : String(year)} onSelectionChange={(key) => setYear(key == null ? null : Number(key))} isDisabled={isSubmitting}>
                <Label>Tahun Periode</Label><Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger><Select.Popover><ListBox>{yearOptions.map((option) => <ListBox.Item key={option} id={String(option)} textValue={String(option)}>{option}</ListBox.Item>)}</ListBox></Select.Popover>
              </Select>
              <Select variant="primary" selectedKey={month === null ? null : String(month)} onSelectionChange={(key) => setMonth(key == null ? null : Number(key))} isDisabled={isSubmitting}>
                <Label>Bulan Periode</Label><Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger><Select.Popover><ListBox>{MONTHS.map((label, index) => <ListBox.Item key={index + 1} id={String(index + 1)} textValue={label}>{label}</ListBox.Item>)}</ListBox></Select.Popover>
              </Select>
            </div>
            <ActivityIndicatorMultiSelect indicators={indicators} selectedIds={indicatorIds} onChange={setIndicatorIds} isLoading={isLoadingIndicators} variant="primary" />
          </>
        )}
        {isChild && <Alert status="accent"><Alert.Indicator /><Alert.Content><Alert.Title>KPI Perusahaan dan periode diwarisi dari aktivitas induk.</Alert.Title></Alert.Content></Alert>}
        <TextField isRequired value={activityName} onChange={setActivityName}><Label>Nama Aktivitas</Label><Input variant="primary" placeholder="Masukkan nama aktivitas" /></TextField>
        <TextField value={description} onChange={setDescription}><Label>Deskripsi</Label><TextArea variant="primary" placeholder="Masukkan deskripsi" rows={3} /></TextField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField isRequired value={targetValue} onChange={setTargetValue}><Label>Target</Label><Input variant="primary" type="number" placeholder="Masukkan target" /></TextField>
          <TextField isRequired value={unit} onChange={setUnit}><Label>Satuan</Label><Input variant="primary" placeholder="Contoh: %, IDR, unit" /></TextField>
        </div>
      </div>
      <div className="flex justify-end gap-3"><Button variant="secondary" onPress={onBack} isDisabled={isSubmitting}>Batal</Button><Button variant="primary" onPress={submit} isDisabled={cannotSubmit || isSubmitting} isPending={isSubmitting}><FloppyDisk className="h-4 w-4" />Kirim Pengajuan</Button></div>
      {isPositionless && (
        <Modal.Backdrop isOpen isDismissable={false} onOpenChange={() => undefined}>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header><Modal.Heading>Tidak Dapat Mengajukan Aktivitas</Modal.Heading></Modal.Header>
              <Modal.Body><p className="text-sm text-muted-foreground">{NO_ACTIVE_POSITION}</p></Modal.Body>
              <Modal.Footer><Button variant="primary" onPress={onBack}>Kembali ke Halaman Utama</Button></Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      )}
    </div>
  );
}
