'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Chip, Breadcrumbs, BreadcrumbsItem, Label,
  Select, ListBox, Surface,
} from '@heroui/react';
import { Plus, House, ArrowsClockwise } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS } from '@/modules/kpi/constants';
import { organizationUnitApi } from '@/modules/organization/organization-units/services/organization-unit-api';
import type { OrganizationUnitResponse } from '@/modules/organization/organization-units/types';
import { useUnitPerformanceData } from '@/modules/kpi/unit-performance/use-unit-performance-data';
import { UnitPerformanceWeightMatrix } from '@/modules/kpi/unit-performance/unit-performance-weight-matrix';
import { UnitPerformanceParticipants } from '@/modules/kpi/unit-performance/unit-performance-participants';
import { UnitPerformanceAddModal } from '@/modules/kpi/unit-performance/unit-performance-add-modal';
import { UnitPerformanceDeleteDialog } from '@/modules/kpi/unit-performance/unit-performance-delete-dialog';
import type {
  UnitPerformanceMatrixUnit,
  UnitPerformanceWeightEntry,
} from '@/modules/kpi/unit-performance/unit-performance.types';

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

function yearOptions(): number[] {
  const current = new Date().getFullYear();
  return [current - 4, current - 3, current - 2, current - 1, current, current + 1];
}

/**
 * Unit Performance configuration page: the dynamic Indicator × Unit weight
 * matrix (rows = indicators of the year's structure, columns = participating
 * units, per-indicator totals must be exactly 100%) + the GLOBAL registry of
 * participating units (add/remove). Weighted contribution results are shown
 * on the KPI dashboard — nothing per-unit is measured or fabricated here.
 */
export default function UnitPerformancePage() {
  const { hasPerm } = usePermission();
  const canRead = hasPerm(PERM.UNIT_PERFORMANCE_READ);
  const canManage = hasPerm(PERM.UNIT_PERFORMANCE_MANAGE);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [orgUnits, setOrgUnits] = useState<OrganizationUnitResponse[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UnitPerformanceMatrixUnit | null>(null);
  // remounts the matrix editor after a successful save (fresh cell state)
  const [matrixVersion, setMatrixVersion] = useState(0);

  const {
    matrix, isLoading, isMutating, error,
    fetchMatrix, saveMatrix, createUnit, deleteUnit,
  } = useUnitPerformanceData();

  useEffect(() => {
    if (canRead) {
      fetchMatrix(selectedYear);
    }
  }, [canRead, selectedYear, fetchMatrix]);

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

  // Available units for ADD = org units not already configured (client-side).
  const configuredUnitIds = useMemo(
    () => new Set((matrix?.units ?? []).map((u) => u.organizationUnitId)),
    [matrix],
  );
  const availableUnits = useMemo(
    () => orgUnits.filter((u) => !configuredUnitIds.has(u.id)),
    [orgUnits, configuredUnitIds],
  );

  const handleSaveMatrix = useCallback(
    async (entries: UnitPerformanceWeightEntry[]) => {
      const ok = await saveMatrix(selectedYear, { weights: entries });
      if (ok) setMatrixVersion((v) => v + 1);
      return ok;
    },
    [saveMatrix, selectedYear],
  );

  const handleAddUnit = useCallback(
    async (payload: { organizationUnitId: string }) => {
      const ok = await createUnit(payload);
      if (ok) setAddOpen(false);
      return ok;
    },
    [createUnit],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const ok = await deleteUnit(deleteTarget.id);
    if (ok) setDeleteTarget(null);
  }, [deleteTarget, deleteUnit]);

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

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem>KPI</BreadcrumbsItem>
        <BreadcrumbsItem>{KPI_LABELS.unitPerformance}</BreadcrumbsItem>
      </Breadcrumbs>

      {/* Row 1: Title + year + refresh + add */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.unitPerformance}</h1>
          <Chip
            size="md"
            className="pointer-events-none"
            aria-label={`Total ${matrix?.units.length ?? 0} configured units`}
          >
            {matrix?.units.length ?? 0} units
          </Chip>
        </div>
        <div className="flex items-center gap-2">
          <Select
            className="w-32"
            aria-label="Matrix year"
            selectedKey={selectedYear}
            onSelectionChange={(key) => setSelectedYear(Number(key))}
            isDisabled={isMutating}
          >
            <Label>Year</Label>
            <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
            <Select.Popover>
              <ListBox>
                {yearOptions().map((y) => (
                  <ListBox.Item key={y} id={y} textValue={String(y)}>
                    <span className="text-sm text-foreground">{y}</span>
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          <Button
            isIconOnly
            variant="tertiary"
            onPress={() => fetchMatrix(selectedYear)}
            isDisabled={isLoading}
            aria-label="Refresh"
          >
            <ArrowsClockwise className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {canManage && (
            <Button variant="primary" onPress={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Unit
            </Button>
          )}
        </div>
      </div>

      {error && <Alert status="danger">{error}</Alert>}

      {/* Weight matrix */}
      <Surface className="rounded-3xl p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
          Weight Matrix — Kontribusi per Indikator
        </h2>
        {matrix ? (
          <UnitPerformanceWeightMatrix
            key={`${selectedYear}-${matrixVersion}`}
            matrix={matrix}
            isMutating={isMutating}
            onSave={handleSaveMatrix}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Loading matrix…</p>
        )}
      </Surface>

      {/* Participating units registry */}
      <Surface className="rounded-3xl p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
          Unit Peserta
        </h2>
        <UnitPerformanceParticipants
          units={matrix?.units ?? []}
          canManage={canManage}
          isMutating={isMutating}
          onDelete={setDeleteTarget}
        />
      </Surface>

      {addOpen && (
        <UnitPerformanceAddModal
          isOpen={true}
          onClose={() => setAddOpen(false)}
          onSubmit={handleAddUnit}
          orgUnits={availableUnits}
          isSubmitting={isMutating}
        />
      )}

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
