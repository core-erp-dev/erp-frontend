'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Breadcrumbs, BreadcrumbsItem, Button, Chip, Label, ListBox, Select, Surface } from '@heroui/react';
import { ArrowsClockwise, House, Plus } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { ForbiddenAccess } from '@/components/shared/forbidden-access';
import { KPI_LABELS, KPI_ROUTES } from '@/modules/kpi/constants';
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

function yearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  return [currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
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
  const selectedYear = parseYear(searchParams.get('year'));
  const [orgUnits, setOrgUnits] = useState<OrganizationUnitResponse[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UnitPerformanceMatrixUnit | null>(null);
  const [matrixVersion, setMatrixVersion] = useState(0);
  const { matrix, isLoading, isMutating, error, fetchMatrix, saveMatrix, createUnit, deleteUnit } = useUnitPerformanceData();

  useEffect(() => { if (canRead) void fetchMatrix(selectedYear); }, [canRead, fetchMatrix, selectedYear]);
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
    if (ok) setMatrixVersion((version) => version + 1);
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

  if (!canRead) return <ForbiddenAccess />;

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs><BreadcrumbsItem href="/" aria-label="Beranda"><House className="h-4 w-4" /></BreadcrumbsItem><BreadcrumbsItem>KPI</BreadcrumbsItem><BreadcrumbsItem>KPI Unit</BreadcrumbsItem><BreadcrumbsItem>{KPI_LABELS.unitPerformanceConfiguration}</BreadcrumbsItem></Breadcrumbs>
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.unitPerformanceConfiguration}</h1><Chip size="md" className="pointer-events-none" aria-label={`Total ${matrix?.units.length ?? 0} unit peserta`}>{matrix?.units.length ?? 0}</Chip></div><div className="flex items-center gap-2"><Button isIconOnly variant="tertiary" onPress={() => void fetchMatrix(selectedYear)} isDisabled={isLoading || isMutating} aria-label="Muat ulang konfigurasi Performa Unit"><ArrowsClockwise className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /></Button>{canManage && <Button variant="primary" onPress={() => setAddOpen(true)} isDisabled={isMutating}><Plus className="h-4 w-4" />Tambah Unit</Button>}</div></div>
      <div className="flex items-center gap-2"><Select className="w-36" aria-label="Pilih tahun konfigurasi" selectedKey={selectedYear} onSelectionChange={(key) => handleYearChange(Number(key))} isDisabled={isMutating}><Label>Tahun</Label><Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger><Select.Popover><ListBox>{yearOptions().map((year) => <ListBox.Item key={year} id={year} textValue={String(year)}>{year}</ListBox.Item>)}</ListBox></Select.Popover></Select></div>
      <div className="flex flex-col gap-6">
        <Surface className="rounded-3xl p-5"><h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">Bobot Kontribusi per Indikator</h2>{error && <Alert status="danger" className="mb-4">{error}</Alert>}{isLoading && !matrix ? <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">Memuat konfigurasi…</div> : matrix ? <UnitPerformanceWeightMatrix key={`${selectedYear}-${matrixVersion}`} matrix={matrix} isMutating={isMutating} onSave={handleSaveMatrix} /> : null}</Surface>
        <Surface className="rounded-3xl p-5"><h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">Unit Peserta</h2><UnitPerformanceParticipants units={matrix?.units ?? []} canManage={canManage} isMutating={isMutating} onDelete={setDeleteTarget} /></Surface>
      </div>
      {addOpen && <UnitPerformanceAddModal isOpen onClose={() => setAddOpen(false)} onSubmit={handleAddUnit} orgUnits={availableUnits} isSubmitting={isMutating} />}
      {deleteTarget && <UnitPerformanceDeleteDialog row={deleteTarget} isOpen isPending={isMutating} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
};

export default UnitPerformanceConfigurationPage;
