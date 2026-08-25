'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Breadcrumbs, BreadcrumbsItem, Button, Chip, Dropdown, Surface } from '@heroui/react';
import { ArrowsClockwise, CaretDown, House, PencilSimple } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { ForbiddenAccess } from '@/components/shared/forbidden-access';
import { KPI_LABELS, KPI_ROUTES } from '@/modules/kpi/constants';
import { corporateKpiStructuresApi, extractStructureError } from '@/modules/kpi/corporate/corporate-kpi-structures-api';
import { getCorporateKpiDefaultYear, getCorporateKpiYearOptions } from '@/modules/kpi/corporate/corporate-kpi-year-options';
import type { CorporateKpiStructure } from '@/modules/kpi/corporate/corporate-kpi.types';
import { organizationUnitApi } from '@/modules/organization/organization-units/services/organization-unit-api';
import type { OrganizationUnitResponse } from '@/modules/organization/organization-units/types';
import { useUnitPerformanceData } from './use-unit-performance-data';
import { UnitPerformanceWeightMatrix } from './unit-performance-weight-matrix';
import { UnitPerformanceParticipants } from './unit-performance-participants';
import { UnitPerformanceAddModal } from './unit-performance-add-modal';
import { UnitPerformanceDeleteDialog } from './unit-performance-delete-dialog';
import type { UnitPerformanceMatrixUnit, UnitPerformanceWeightEntry } from './unit-performance.types';

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

export const UnitPerformanceConfigurationPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPerm } = usePermission();
  const canRead = hasPerm(PERM.UNIT_PERFORMANCE_READ);
  const canManage = hasPerm(PERM.UNIT_PERFORMANCE_MANAGE);
  const canReadCorporateKpi = hasPerm(PERM.CORPORATE_KPI_READ) || hasPerm(PERM.CORPORATE_KPI_MANAGE);
  const currentYear = new Date().getFullYear();
  const selectedYear = parseYear(searchParams.get('year'));
  const [orgUnits, setOrgUnits] = useState<OrganizationUnitResponse[]>([]);
  const [structures, setStructures] = useState<CorporateKpiStructure[]>([]);
  const [isLoadingYears, setIsLoadingYears] = useState(canReadCorporateKpi);
  const [yearsError, setYearsError] = useState<string | null>(null);
  const structureRequestRef = React.useRef(0);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UnitPerformanceMatrixUnit | null>(null);
  const [matrixVersion, setMatrixVersion] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const { matrix, isLoading, isMutating, error, fetchMatrix, saveMatrix, createUnit, deleteUnit } = useUnitPerformanceData();
  const years = useMemo(
    () => canReadCorporateKpi ? getCorporateKpiYearOptions(structures, currentYear) : [currentYear],
    [canReadCorporateKpi, currentYear, structures],
  );
  const normalizedYear = years.includes(selectedYear) ? selectedYear : getCorporateKpiDefaultYear(years, currentYear);

  const loadStructures = useCallback(async () => {
    const requestId = ++structureRequestRef.current;
    setIsLoadingYears(true);
    setYearsError(null);
    try {
      const data = await corporateKpiStructuresApi.list();
      if (requestId === structureRequestRef.current) setStructures(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      if (requestId === structureRequestRef.current) setYearsError(extractStructureError(err));
    } finally {
      if (requestId === structureRequestRef.current) setIsLoadingYears(false);
    }
  }, []);

  useEffect(() => {
    if (canReadCorporateKpi) void loadStructures();
    else setIsLoadingYears(false);
  }, [canReadCorporateKpi, loadStructures]);
  useEffect(() => {
    if (!isLoadingYears && normalizedYear !== selectedYear) {
      router.replace(`${KPI_ROUTES.unitPerformanceConfiguration}?year=${normalizedYear}`, { scroll: false });
    }
  }, [isLoadingYears, normalizedYear, router, selectedYear]);
  useEffect(() => {
    if (canRead && !isLoadingYears && !yearsError && normalizedYear === selectedYear) void fetchMatrix(selectedYear);
  }, [canRead, fetchMatrix, isLoadingYears, normalizedYear, selectedYear, yearsError]);
  useEffect(() => { setIsEditing(false); }, [selectedYear]);
  useEffect(() => {
    let cancelled = false;
    if (canManage) {
      organizationUnitApi.getUnitTree().then((tree) => {
        if (!cancelled) setOrgUnits(flattenOrgUnits(tree));
      }).catch(() => { /* optional picker source */ });
    }
    return () => { cancelled = true; };
  }, [canManage]);

  const configuredUnitIds = useMemo(() => new Set((matrix?.units ?? []).map((unit) => unit.organizationUnitId)), [matrix]);
  const availableUnits = useMemo(() => orgUnits.filter((unit) => !configuredUnitIds.has(unit.id)), [configuredUnitIds, orgUnits]);
  const handleSaveMatrix = useCallback(async (entries: UnitPerformanceWeightEntry[]) => {
    const ok = await saveMatrix(selectedYear, { weights: entries });
    if (ok) {
      setMatrixVersion((version) => version + 1);
      setIsEditing(false);
    }
    return ok;
  }, [saveMatrix, selectedYear]);
  const handleAddUnit = useCallback(async (payload: { organizationUnitId: string }) => {
    const ok = await createUnit(payload);
    if (ok) setAddOpen(false);
    return ok;
  }, [createUnit]);
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    if (await deleteUnit(deleteTarget.id)) setDeleteTarget(null);
  }, [deleteTarget, deleteUnit]);
  const handleYearChange = useCallback((year: number) => {
    router.replace(`${KPI_ROUTES.unitPerformanceConfiguration}?year=${year}`, { scroll: false });
  }, [router]);
  const handleRetry = useCallback(() => {
    if (yearsError) {
      void loadStructures();
      return;
    }
    void fetchMatrix(selectedYear);
  }, [fetchMatrix, loadStructures, selectedYear, yearsError]);

  if (!canRead) return <ForbiddenAccess />;

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs><BreadcrumbsItem href="/" aria-label="Beranda"><House className="h-4 w-4" /></BreadcrumbsItem><BreadcrumbsItem>KPI</BreadcrumbsItem><BreadcrumbsItem>KPI Unit</BreadcrumbsItem><BreadcrumbsItem>{KPI_LABELS.unitPerformanceConfiguration}</BreadcrumbsItem></Breadcrumbs>
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.unitPerformanceConfiguration}</h1><Chip size="md" className="pointer-events-none" aria-label={`Total ${matrix?.units.length ?? 0} unit peserta`}>{matrix?.units.length ?? 0}</Chip></div><div className="flex items-center gap-2"><Button isIconOnly variant="tertiary" onPress={handleRetry} isDisabled={isLoading || isLoadingYears || isMutating} aria-label="Muat ulang konfigurasi Performa Unit"><ArrowsClockwise className={`h-4 w-4 ${(isLoading || isLoadingYears) ? 'animate-spin' : ''}`} /></Button>{canManage && <><Button variant="secondary" onPress={() => setAddOpen(true)} isDisabled={isMutating || isEditing}>Kelola Unit</Button>{!isEditing && <Button variant="primary" onPress={() => setIsEditing(true)} isDisabled={isMutating || isLoading || matrix == null}><PencilSimple className="h-4 w-4" />Atur Bobot</Button>}</>}</div></div>
      <div className="flex items-center gap-2"><Dropdown><Button variant="tertiary" aria-label="Pilih tahun konfigurasi" isDisabled={isMutating || isLoadingYears}>{selectedYear}<CaretDown className="h-4 w-4" /></Button><Dropdown.Popover><Dropdown.Menu onAction={(key) => handleYearChange(Number(key))}>{years.map((year) => <Dropdown.Item key={year} id={String(year)} textValue={String(year)}>{year}</Dropdown.Item>)}</Dropdown.Menu></Dropdown.Popover></Dropdown></div>
      <div className="flex flex-col gap-6">
        <Surface className="rounded-3xl p-5"><h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">Bobot Kontribusi per Indikator</h2>{(yearsError || error) && <Alert status="danger" className="mb-4">{yearsError ?? error}</Alert>}{(isLoadingYears || (isLoading && !matrix)) ? <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">Memuat konfigurasi...</div> : matrix ? <UnitPerformanceWeightMatrix key={`${selectedYear}-${matrixVersion}`} matrix={matrix} isMutating={isMutating} isEditing={isEditing} onCancel={() => setIsEditing(false)} onSave={handleSaveMatrix} /> : null}</Surface>
        <Surface className="rounded-3xl p-5"><h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">Unit Peserta</h2><UnitPerformanceParticipants units={matrix?.units ?? []} canManage={canManage} isMutating={isMutating} onDelete={setDeleteTarget} /></Surface>
      </div>
      {addOpen && <UnitPerformanceAddModal isOpen onClose={() => setAddOpen(false)} onSubmit={handleAddUnit} orgUnits={availableUnits} isSubmitting={isMutating} />}
      {deleteTarget && <UnitPerformanceDeleteDialog row={deleteTarget} isOpen isPending={isMutating} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
};

export default UnitPerformanceConfigurationPage;
