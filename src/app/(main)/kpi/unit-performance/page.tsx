'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Alert, Button, Chip, Breadcrumbs, BreadcrumbsItem } from '@heroui/react';
import { Plus, House, ArrowsClockwise } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS, KPI_ROUTES } from '@/modules/kpi/constants';
import { organizationUnitApi } from '@/modules/organization/organization-units/services/organization-unit-api';
import type { OrganizationUnitResponse } from '@/modules/organization/organization-units/types';
import { useUnitPerformanceData } from '@/modules/kpi/unit-performance/use-unit-performance-data';
import { UnitPerformanceFilters } from '@/modules/kpi/unit-performance/unit-performance-filters';
import { UnitPerformanceTable } from '@/modules/kpi/unit-performance/unit-performance-table';
import { UnitPerformanceFormModal } from '@/modules/kpi/unit-performance/unit-performance-form-modal';
import { UnitPerformanceDeleteDialog } from '@/modules/kpi/unit-performance/unit-performance-delete-dialog';
import type {
  UnitPerformanceRow,
  CreateUnitPerformanceRequest,
  UpdateUnitPerformanceRequest,
} from '@/modules/kpi/unit-performance/unit-performance.types';

type PeriodMode = 'monthly' | 'annual';

/** Flatten the org-unit tree into a flat, active-only list for the picker. */
function flattenOrgUnits(nodes: OrganizationUnitResponse[]): OrganizationUnitResponse[] {
  const out: OrganizationUnitResponse[] = [];
  const walk = (list: OrganizationUnitResponse[]) => {
    for (const node of list) {
      out.push(node);
      if (node.children.length > 0) walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

export default function UnitPerformancePage() {
  const { hasPerm } = usePermission();
  const canRead = hasPerm(PERM.UNIT_PERFORMANCE_READ);
  const canManage = hasPerm(PERM.UNIT_PERFORMANCE_MANAGE);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // ── Page-local UI state ──
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [orgUnits, setOrgUnits] = useState<OrganizationUnitResponse[]>([]);

  // ── Form / delete dialog state ──
  const [formState, setFormState] = useState<{ mode: 'CREATE' | 'EDIT'; row?: UnitPerformanceRow } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UnitPerformanceRow | null>(null);

  // ── Server data ──
  const {
    rows, isLoading, error, isMutating,
    fetchRows, createRow, updateRow, deleteRow,
  } = useUnitPerformanceData();

  // Fetch on mount and when the period (year/mode/month) changes.
  // Monthly: year + month. Annual: year only — the month parameter is omitted.
  useEffect(() => {
    if (canRead) {
      fetchRows(selectedYear, periodMode === 'monthly' ? selectedMonth : undefined);
    }
  }, [canRead, selectedYear, periodMode, selectedMonth, fetchRows]);

  // Org-unit master data for the Add picker (flattened once; the tree endpoint
  // requires organization_unit:read|manage — managers without it get an empty
  // picker and the form validation still applies).
  useEffect(() => {
    let cancelled = false;
    if (canManage) {
      organizationUnitApi.getUnitTree()
        .then((tree) => { if (!cancelled) setOrgUnits(flattenOrgUnits(tree)); })
        .catch(() => { /* picker unavailable — no blocking */ });
    }
    return () => { cancelled = true; };
  }, [canManage]);

  // Available units for CREATE = org units not already configured (client-side).
  const configuredUnitIds = useMemo(
    () => new Set(rows.map((r) => r.organizationUnitId)),
    [rows],
  );
  const availableUnits = useMemo(
    () => orgUnits.filter((u) => !configuredUnitIds.has(u.id)),
    [orgUnits, configuredUnitIds],
  );

  // ── Handlers ──

  const handleYearChange = useCallback((year: number) => setSelectedYear(year), []);
  const handleModeChange = useCallback((mode: PeriodMode) => {
    setPeriodMode(mode);
    if (mode === 'annual') setSelectedMonth(currentMonth);
  }, [currentMonth]);
  const handleMonthChange = useCallback((month: number) => setSelectedMonth(month), []);

  const openAdd = useCallback(() => setFormState({ mode: 'CREATE' }), []);
  const openEdit = useCallback((row: UnitPerformanceRow) => setFormState({ mode: 'EDIT', row }), []);
  const closeForm = useCallback(() => setFormState(null), []);

  const handleFormSubmit = useCallback(
    async (payload: CreateUnitPerformanceRequest | UpdateUnitPerformanceRequest, id?: string) => {
      const ok = formState?.mode === 'EDIT'
        ? await updateRow(id as string, payload as UpdateUnitPerformanceRequest)
        : await createRow(payload as CreateUnitPerformanceRequest);
      if (ok) setFormState(null);
      return ok;
    },
    [formState?.mode, createRow, updateRow],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const ok = await deleteRow(deleteTarget.id);
    if (ok) setDeleteTarget(null);
  }, [deleteTarget, deleteRow]);

  // ── Permission guard ──

  if (!canRead) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Breadcrumbs>
          <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
          <BreadcrumbsItem>KPI</BreadcrumbsItem>
          <BreadcrumbsItem>{KPI_LABELS.unitPerformance}</BreadcrumbsItem>
        </Breadcrumbs>

        <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.unitPerformance}</h1>
        <Alert status="danger">Access Denied</Alert>
      </div>
    );
  }

  // ── Rendered page ──

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem>KPI</BreadcrumbsItem>
        <BreadcrumbsItem>{KPI_LABELS.unitPerformance}</BreadcrumbsItem>
      </Breadcrumbs>

      {/* Row 1: Title + Chip + Refresh + Add */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.unitPerformance}</h1>
          <Chip
            size="md"
            className="pointer-events-none"
            aria-label={`Total ${rows.length} configured units`}
          >
            {rows.length}
          </Chip>
        </div>
        <div className="flex items-center gap-2">
          <Button
            isIconOnly
            variant="tertiary"
            onPress={() => fetchRows(selectedYear, periodMode === 'monthly' ? selectedMonth : undefined)}
            isDisabled={isLoading}
            aria-label="Refresh"
          >
            <ArrowsClockwise className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {canManage && (
            <Button variant="primary" onPress={openAdd}>
              <Plus className="h-4 w-4" />
              Add Unit
            </Button>
          )}
        </div>
      </div>

      {/* Row 2: Month|Year tabs + Year/Month dropdowns */}
      <UnitPerformanceFilters
        periodMode={periodMode}
        onPeriodModeChange={handleModeChange}
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
        selectedMonth={selectedMonth}
        onMonthChange={handleMonthChange}
      />

      <UnitPerformanceTable
        rows={rows}
        isLoading={isLoading}
        error={error}
        onRetry={() => fetchRows(selectedYear, periodMode === 'monthly' ? selectedMonth : undefined)}
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? setDeleteTarget : undefined}
      />

      {/* Add / Edit modal */}
      {formState && (
        <UnitPerformanceFormModal
          mode={formState.mode}
          isOpen={true}
          onClose={closeForm}
          onSubmit={handleFormSubmit}
          row={formState.mode === 'EDIT' ? formState.row : undefined}
          rows={rows}
          orgUnits={availableUnits}
          isSubmitting={isMutating}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <UnitPerformanceDeleteDialog
          row={deleteTarget}
          isOpen={true}
          isPending={isMutating}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
