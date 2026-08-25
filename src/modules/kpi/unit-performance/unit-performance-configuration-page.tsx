'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Breadcrumbs, BreadcrumbsItem, Chip, Dropdown } from '@heroui/react';
import { ArrowsClockwise, CaretDown, FloppyDisk, House, PencilSimple } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { ForbiddenAccess } from '@/components/shared/forbidden-access';
import { KPI_LABELS, KPI_ROUTES } from '@/modules/kpi/constants';
import { corporateKpiStructuresApi, extractStructureError } from '@/modules/kpi/corporate/corporate-kpi-structures-api';
import { getCorporateKpiDefaultValueYear, getCorporateKpiValueYearOptions } from '@/modules/kpi/corporate/corporate-kpi-year-options';
import type { CorporateKpiStructure } from '@/modules/kpi/corporate/corporate-kpi.types';
import { organizationUnitApi } from '@/modules/organization/organization-units/services/organization-unit-api';
import type { OrganizationUnitResponse } from '@/modules/organization/organization-units/types';
import { useUnitPerformanceData } from './use-unit-performance-data';
import {
  createMatrixDraft,
  getMatrixValidation,
  matrixDraftToEntries,
  UnitPerformanceWeightMatrix,
  type UnitPerformanceMatrixDraft,
} from './unit-performance-weight-matrix';
import { UnitPerformanceAddModal } from './unit-performance-add-modal';
import { UnitPerformanceDeleteDialog } from './unit-performance-delete-dialog';
import type { UnitPerformanceMatrixUnit, UnitPerformanceWeightMatrix as Matrix } from './unit-performance.types';

function flattenOrgUnits(nodes: OrganizationUnitResponse[]): OrganizationUnitResponse[] {
  const result: OrganizationUnitResponse[] = [];
  const visit = (items: OrganizationUnitResponse[]) => items.forEach((item) => {
    result.push(item);
    if (item.children.length > 0) visit(item.children);
  });
  visit(nodes);
  return result;
}

function parseYear(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : new Date().getFullYear();
}

const EMPTY_MATRIX = (year: number): Matrix => ({
  year,
  units: [],
  indicators: [],
  weights: [],
  totals: {},
  complete: false,
});

export const UnitPerformanceConfigurationPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPerm } = usePermission();
  const canRead = hasPerm(PERM.UNIT_PERFORMANCE_READ);
  const canManage = hasPerm(PERM.UNIT_PERFORMANCE_MANAGE);
  const canReadCorporateKpi = hasPerm(PERM.CORPORATE_KPI_READ) || hasPerm(PERM.CORPORATE_KPI_MANAGE);
  const currentYear = new Date().getFullYear();
  const urlYear = parseYear(searchParams.get('year'));
  const [structures, setStructures] = useState<CorporateKpiStructure[]>([]);
  const [isLoadingStructures, setIsLoadingStructures] = useState(canReadCorporateKpi);
  const [structuresError, setStructuresError] = useState<string | null>(null);
  const structureRequestRef = useRef(0);
  const [orgUnits, setOrgUnits] = useState<OrganizationUnitResponse[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UnitPerformanceMatrixUnit | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<UnitPerformanceMatrixDraft>({});
  const { matrix, isLoading, isMutating, error, fetchMatrix, saveMatrix, createUnit, deleteUnit } = useUnitPerformanceData();

  const years = useMemo(
    () => canReadCorporateKpi ? getCorporateKpiValueYearOptions(structures) : [currentYear],
    [canReadCorporateKpi, currentYear, structures],
  );
  const selectedYear = years.includes(urlYear) ? urlYear : getCorporateKpiDefaultValueYear(years, currentYear);
  const tableMatrix = matrix ?? EMPTY_MATRIX(selectedYear ?? currentYear);
  const tableLoading = isLoadingStructures || isLoading;
  const tableError = structuresError ?? error;
  const validation = useMemo(() => getMatrixValidation(tableMatrix, draft), [draft, tableMatrix]);

  const updateYearUrl = useCallback((year: number) => {
    const query = year === currentYear ? '' : `?year=${year}`;
    router.replace(`${KPI_ROUTES.unitPerformanceConfiguration}${query}`, { scroll: false });
  }, [currentYear, router]);

  const loadStructures = useCallback(async () => {
    const requestId = ++structureRequestRef.current;
    setIsLoadingStructures(true);
    setStructuresError(null);
    try {
      const data = await corporateKpiStructuresApi.list();
      if (requestId === structureRequestRef.current) setStructures(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      if (requestId === structureRequestRef.current) setStructuresError(extractStructureError(err));
    } finally {
      if (requestId === structureRequestRef.current) setIsLoadingStructures(false);
    }
  }, []);

  useEffect(() => {
    if (canReadCorporateKpi) void loadStructures();
    else setIsLoadingStructures(false);
  }, [canReadCorporateKpi, loadStructures]);

  useEffect(() => {
    if (!isLoadingStructures && selectedYear != null && selectedYear !== urlYear) updateYearUrl(selectedYear);
  }, [isLoadingStructures, selectedYear, updateYearUrl, urlYear]);

  useEffect(() => {
    if (canRead && !isLoadingStructures && !structuresError && selectedYear != null && selectedYear === urlYear) void fetchMatrix(selectedYear);
  }, [canRead, fetchMatrix, isLoadingStructures, selectedYear, structuresError, urlYear]);

  useEffect(() => {
    setIsEditing(false);
    setDraft({});
  }, [selectedYear]);

  useEffect(() => {
    let cancelled = false;
    if (canManage) {
      organizationUnitApi.getUnitTree().then((tree) => {
        if (!cancelled) setOrgUnits(flattenOrgUnits(tree));
      }).catch(() => { /* picker source error is surfaced by the modal when empty */ });
    }
    return () => { cancelled = true; };
  }, [canManage]);

  const configuredUnits = useMemo(() => matrix?.units ?? [], [matrix]);
  const configuredUnitIds = useMemo(() => new Set(configuredUnits.map((unit) => unit.organizationUnitId)), [configuredUnits]);
  const availableUnits = useMemo(() => orgUnits.filter((unit) => !configuredUnitIds.has(unit.id)), [configuredUnitIds, orgUnits]);

  const handleRetry = useCallback(() => {
    if (structuresError) {
      void loadStructures();
      return;
    }
    if (selectedYear != null) void fetchMatrix(selectedYear);
  }, [fetchMatrix, loadStructures, selectedYear, structuresError]);
  const handleYearChange = useCallback((year: number) => updateYearUrl(year), [updateYearUrl]);
  const handleDraftChange = useCallback((indicatorId: string, unitId: string, value: string) => {
    setDraft((previous) => ({
      ...previous,
      [indicatorId]: { ...(previous[indicatorId] ?? {}), [unitId]: value },
    }));
  }, []);
  const startEditing = useCallback(() => {
    setDraft(createMatrixDraft(tableMatrix));
    setIsEditing(true);
  }, [tableMatrix]);
  const cancelEditing = useCallback(() => {
    setDraft({});
    setIsEditing(false);
  }, []);
  const handleSave = useCallback(async () => {
    if (!validation.allValid || isMutating) return;
    if (selectedYear == null) return;
    const ok = await saveMatrix(selectedYear, { weights: matrixDraftToEntries(tableMatrix, draft) });
    if (ok) cancelEditing();
  }, [cancelEditing, draft, isMutating, saveMatrix, selectedYear, tableMatrix, validation.allValid]);
  const handleAddUnit = useCallback(async (payload: { organizationUnitId: string }) => {
    const ok = await createUnit(payload);
    if (ok) setAddOpen(false);
    return ok;
  }, [createUnit]);
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    if (await deleteUnit(deleteTarget.id)) setDeleteTarget(null);
  }, [deleteTarget, deleteUnit]);

  if (!canRead) return <ForbiddenAccess />;

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs><BreadcrumbsItem href="/" aria-label="Beranda"><House className="h-4 w-4" /></BreadcrumbsItem><BreadcrumbsItem>KPI</BreadcrumbsItem><BreadcrumbsItem>KPI Unit</BreadcrumbsItem><BreadcrumbsItem>{KPI_LABELS.unitPerformanceConfiguration}</BreadcrumbsItem></Breadcrumbs>
      <div className="flex items-center justify-between"><div className="flex items-center gap-3"><h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.unitPerformanceConfiguration}</h1><Chip size="md" className="pointer-events-none" aria-label={`Total ${tableMatrix.indicators.length} indikator`}>{tableMatrix.indicators.length}</Chip></div><div className="flex items-center gap-2"><Button isIconOnly variant="tertiary" onPress={handleRetry} isDisabled={tableLoading || isMutating} aria-label="Muat ulang konfigurasi Performa Unit"><ArrowsClockwise className={`h-4 w-4 ${tableLoading ? 'animate-spin' : ''}`} /></Button>{canManage && (isEditing ? <><Button variant="secondary" onPress={cancelEditing} isDisabled={isMutating}>Batal</Button><Button variant="primary" onPress={handleSave} isPending={isMutating} isDisabled={isMutating || !validation.allValid}><FloppyDisk className="h-4 w-4" />Simpan</Button></> : <><Button variant="secondary" onPress={() => setAddOpen(true)} isDisabled={tableLoading || isMutating}>Tambah Unit</Button><Button variant="primary" onPress={startEditing} isDisabled={tableLoading || isMutating || selectedYear == null || tableMatrix.indicators.length === 0 || tableMatrix.units.length === 0}><PencilSimple className="h-4 w-4" />Atur Bobot</Button></>)}</div></div>
      <div className="flex items-center gap-2"><Dropdown><Button variant="tertiary" aria-label="Pilih tahun konfigurasi" isDisabled={tableLoading || isMutating}>{selectedYear ?? '-'}<CaretDown className="h-4 w-4" /></Button><Dropdown.Popover><Dropdown.Menu onAction={(key) => handleYearChange(Number(key))}>{years.map((year) => <Dropdown.Item key={year} id={String(year)} textValue={String(year)}>{year}</Dropdown.Item>)}</Dropdown.Menu></Dropdown.Popover></Dropdown></div>
      <UnitPerformanceWeightMatrix matrix={tableMatrix} draft={draft} canEdit={isEditing && canManage} isLoading={tableLoading} error={tableError} onRetry={handleRetry} onDraftChange={handleDraftChange} onDeleteUnit={canManage ? setDeleteTarget : undefined} isUnitActionDisabled={isEditing || isMutating || tableLoading} />
      {addOpen && <UnitPerformanceAddModal isOpen onClose={() => setAddOpen(false)} onSubmit={handleAddUnit} orgUnits={availableUnits} isSubmitting={isMutating} />}
      {deleteTarget && <UnitPerformanceDeleteDialog row={deleteTarget} isOpen isPending={isMutating} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
};

export default UnitPerformanceConfigurationPage;
