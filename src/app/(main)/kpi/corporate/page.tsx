'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  Chip,
  Breadcrumbs,
  BreadcrumbsItem,
  EmptyState,
  FieldError,
  Label,
  ListBox,
  Modal,
  Select,
} from '@heroui/react';
import { Plus, House, ArrowsClockwise, Play, Pause } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS, KPI_ROUTES } from '@/modules/kpi/constants';
import { useCorporateKpiData } from '@/modules/kpi/corporate/use-corporate-kpi-data';
import { CorporateKpiFilters } from '@/modules/kpi/corporate/corporate-kpi-filters';
import { CorporateKpiTable } from '@/modules/kpi/corporate/corporate-kpi-table';
import { LifecycleDialog } from '@/modules/kpi/corporate/corporate-kpi-lifecycle-dialog';
import type { CorporateKpiNode, CorporateKpiStructure, LifecycleActionType } from '@/modules/kpi/corporate/corporate-kpi.types';

type PeriodMode = 'monthly' | 'annual';

/* ── Create Structure dialog state ── */

interface CreateStructureDialogState {
  open: boolean;
  year: number;
  error: string | null;
}

function yearOptions(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current + 1; y >= 2000; y -= 1) years.push(y);
  return years;
}

export default function KpiCorporatePage() {
  const router = useRouter();
  const { hasPerm } = usePermission();
  const canRead = hasPerm(PERM.CORPORATE_KPI_READ);
  // Manage implies read on the backend; all mutations + deleted-data views are manage-gated.
  const canManage = hasPerm(PERM.CORPORATE_KPI_MANAGE);

  const currentMonth = new Date().getMonth() + 1;

  // Full year range for the filter dropdown (2000..current+1) — independent of structures.
  const years = useMemo(() => yearOptions(), []);

  // ── Page-local UI state ──
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [viewMode, setViewMode] = useState<'current' | 'deleted'>('current');
  const [searchQuery, setSearchQuery] = useState('');
  // null = AUTO mode: every expandable row is expanded by default on first load.
  const [expandedIds, setExpandedIds] = useState<Set<string> | null>(null);

  // ── Lifecycle / create dialogs ──
  const [lifecycleAction, setLifecycleAction] = useState<LifecycleActionType | null>(null);
  const [lifecycleTarget, setLifecycleTarget] = useState<
    { kind: 'structure'; structure: CorporateKpiStructure } | { kind: 'node'; node: CorporateKpiNode } | null
  >(null);
  const [createDialog, setCreateDialog] = useState<CreateStructureDialogState>({ open: false, year: new Date().getFullYear(), error: null });

  // ── Server data ──
  const {
    tree, deletedList, structures, isLoadingTree, isLoadingDeleted, isLoadingStructures,
    treeError, deletedError, structuresError, hasLoadedDeleted,
    fetchTree, fetchDeleted, fetchStructures,
    isStructureMutating, createStructure, changeStructureStatus,
    pendingLifecycle, deleteKpi, restoreKpi,
  } = useCorporateKpiData();

  // Fetch structures once on mount (read-gated).
  useEffect(() => {
    if (canRead) void fetchStructures();
  }, [canRead, fetchStructures]);

  // The structure for the selected year (null when the year has no structure yet —
  // the page then shows the create-structure empty state for that year).
  const selectedStructure = structures.find((s) => s.year === selectedYear) ?? null;
  const structureActive = selectedStructure?.status === 'ACTIVE';
  const structureLocked = selectedStructure?.status === 'ACTIVE';

  // Locked structure ids — used by the table to freeze configuration mutations.
  const lockedStructureIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of structures) if (s.status === 'ACTIVE') ids.add(s.id);
    return ids;
  }, [structures]);

  // Fetch the tree for the selected year — a year without a structure returns
  // an empty tree (backend contract), so the table shows its own empty state.
  useEffect(() => {
    if (canRead) {
      fetchTree(selectedYear, periodMode === 'monthly' ? selectedMonth : undefined);
    }
  }, [canRead, selectedYear, periodMode, selectedMonth, fetchTree]);

  // Fetch deleted data when first switching to deleted view
  useEffect(() => {
    if (viewMode === 'deleted' && !hasLoadedDeleted && canManage) {
      fetchDeleted();
    }
  }, [viewMode, hasLoadedDeleted, canManage, fetchDeleted]);

  // ── Tree expansion ──

  const expandableIds = useMemo(() => {
    const ids = new Set<string>();
    const collect = (nodes: typeof tree) => {
      for (const node of nodes) {
        if (node.children.length > 0) { ids.add(node.id); collect(node.children); }
      }
    };
    collect(tree);
    return ids;
  }, [tree]);

  const effectiveExpandedIds = expandedIds ?? expandableIds;

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const base = prev ?? expandableIds;
      const next = new Set(base);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [expandableIds]);

  const handleExpandAll = useCallback(() => {
    setExpandedIds(new Set(expandableIds));
  }, [expandableIds]);

  const handleCollapseAll = useCallback(() => setExpandedIds(new Set()), []);

  // ── Generic handlers ──

  const handleYearChange = useCallback((year: number) => setSelectedYear(year), []);
  const handleModeChange = useCallback((mode: PeriodMode) => {
    setPeriodMode(mode);
    if (mode === 'annual') setSelectedMonth(currentMonth);
  }, [currentMonth]);
  const handleMonthChange = useCallback((month: number) => setSelectedMonth(month), []);
  const handleViewModeChange = useCallback((mode: 'current' | 'deleted') => setViewMode(mode), []);
  const handleSearchChange = useCallback((query: string) => setSearchQuery(query), []);

  // ── Create Structure ──

  const openCreateDialog = useCallback((year?: number) => {
    setCreateDialog({ open: true, year: year ?? new Date().getFullYear(), error: null });
  }, []);

  const closeCreateDialog = useCallback(() => {
    setCreateDialog((prev) => ({ ...prev, open: false, error: null }));
  }, []);

  const confirmCreateStructure = useCallback(async (payload: { year: number; copyFromYear?: number }) => {
    const created = await createStructure(payload);
    if (created) {
      setSelectedYear(created.year);
      closeCreateDialog();
    }
  }, [createStructure, closeCreateDialog]);

  // ── Lifecycle handlers ──

  const openNodeLifecycle = useCallback((action: LifecycleActionType, node: CorporateKpiNode) => {
    setLifecycleAction(action);
    setLifecycleTarget({ kind: 'node', node });
  }, []);

  const openStructureLifecycle = useCallback((action: 'activate' | 'deactivate', structure: CorporateKpiStructure) => {
    setLifecycleAction(action);
    setLifecycleTarget({ kind: 'structure', structure });
  }, []);

  const closeLifecycle = useCallback(() => {
    setLifecycleAction(null);
    setLifecycleTarget(null);
  }, []);

  const handleLifecycleConfirm = useCallback(async () => {
    if (!lifecycleAction || !lifecycleTarget) return;
    let ok = false;
    if (lifecycleTarget.kind === 'structure') {
      if (lifecycleAction === 'activate') ok = await changeStructureStatus(lifecycleTarget.structure.id, 'ACTIVE');
      if (lifecycleAction === 'deactivate') ok = await changeStructureStatus(lifecycleTarget.structure.id, 'INACTIVE');
    } else {
      if (lifecycleAction === 'delete') ok = await deleteKpi(lifecycleTarget.node.id);
      if (lifecycleAction === 'restore') ok = await restoreKpi(lifecycleTarget.node.id);
    }
    if (ok) closeLifecycle();
  }, [lifecycleAction, lifecycleTarget, changeStructureStatus, deleteKpi, restoreKpi, closeLifecycle]);

  // ── Create/Edit navigation ──

  const handleCreateAspect = useCallback(() => {
    if (!selectedStructure) return;
    router.push(`${KPI_ROUTES.corporateAdd}?structureId=${selectedStructure.id}`);
  }, [router, selectedStructure]);

  const handleCreateIndicator = useCallback((aspectId: string) => {
    if (!selectedStructure) return;
    router.push(`${KPI_ROUTES.corporateAdd}?structureId=${selectedStructure.id}&parentId=${aspectId}&type=INDICATOR`);
  }, [router, selectedStructure]);

  const handleEdit = useCallback((node: CorporateKpiNode) => {
    router.push(KPI_ROUTES.corporateEditRoute(node.id));
  }, [router]);

  // Compute total count
  const totalCount = viewMode === 'current'
    ? (() => { let c = 0; const walk = (ns: typeof tree) => { for (const n of ns) { c++; if (n.children.length > 0) walk(n.children); } }; walk(tree); return c; })()
    : deletedList.length;

  const allExpanded = (() => {
    if (tree.length === 0 || viewMode !== 'current') return false;
    return expandableIds.size > 0 && Array.from(expandableIds).every((id) => effectiveExpandedIds.has(id));
  })();

  // ── Lifecycle dialog content (structure vs node) ──

  const lifecycleDialogProps = (() => {
    if (!lifecycleAction || !lifecycleTarget) return null;
    if (lifecycleTarget.kind === 'structure') {
      const s = lifecycleTarget.structure;
      if (lifecycleAction === 'activate') {
        return {
          title: 'Activate Corporate KPI Structure',
          message: <>Are you sure you want to activate the yearly structure <strong className="text-foreground">{s.year}</strong>? The whole configuration will be validated and frozen.</>,
          confirmLabel: 'Activate',
          variant: 'primary' as const,
        };
      }
      return {
        title: 'Deactivate Corporate KPI Structure',
        message: <>Are you sure you want to deactivate the yearly structure <strong className="text-foreground">{s.year}</strong>? Its configuration can then be edited.</>,
        confirmLabel: 'Deactivate',
        variant: 'primary' as const,
      };
    }
    const n = lifecycleTarget.node;
    if (lifecycleAction === 'delete') {
      return {
        title: 'Delete Corporate KPI',
        message: <>Are you sure you want to delete <strong className="text-foreground">{n.code} — {n.name}</strong>?</>,
        confirmLabel: 'Delete',
        variant: 'danger' as const,
      };
    }
    return {
      title: 'Restore Corporate KPI',
      message: <>Are you sure you want to restore <strong className="text-foreground">{n.code} — {n.name}</strong>?</>,
      confirmLabel: 'Restore',
      variant: 'primary' as const,
    };
  })();

  // ── Permission guard ──

  if (!canRead) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Breadcrumbs>
          <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
          <BreadcrumbsItem>KPI</BreadcrumbsItem>
          <BreadcrumbsItem>{KPI_LABELS.corporate}</BreadcrumbsItem>
        </Breadcrumbs>

        <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.corporate}</h1>
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
        <BreadcrumbsItem>{KPI_LABELS.corporate}</BreadcrumbsItem>
      </Breadcrumbs>

      {/* Row 1: Title + Structure status/lifecycle + Refresh + Add */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.corporate}</h1>
          {selectedStructure && (
            <>
              <Chip
                size="md"
                variant="soft"
                color={structureActive ? 'success' : selectedStructure.status === 'INACTIVE' ? 'warning' : 'default'}
                className="pointer-events-none"
                aria-label={`Structure status ${selectedStructure.status}`}
              >
                {selectedStructure.status}
              </Chip>
              <Chip size="md" className="pointer-events-none" aria-label={`Total ${totalCount} corporate kpi`}>
                {totalCount}
              </Chip>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            isIconOnly
            variant="tertiary"
            onPress={() => fetchTree(selectedYear, periodMode === 'monthly' ? selectedMonth : undefined)}
            isDisabled={isLoadingTree}
            aria-label="Refresh"
          >
            <ArrowsClockwise className={`h-4 w-4 ${isLoadingTree ? 'animate-spin' : ''}`} />
          </Button>
          {canManage && viewMode === 'current' && selectedStructure && (
            <Button variant="primary" onPress={handleCreateAspect} isDisabled={structureLocked}>
              <Plus className="h-4 w-4" />
              Add Corporate KPI
            </Button>
          )}
          {canManage && !isLoadingStructures && !selectedStructure && (
            <Button variant="primary" onPress={() => openCreateDialog(selectedYear)}>
              <Plus className="h-4 w-4" />
              Create Structure
            </Button>
          )}
          {canManage && selectedStructure && (
            structureLocked ? (
              <Button
                variant="tertiary"
                onPress={() => openStructureLifecycle('deactivate', selectedStructure)}
                isDisabled={pendingLifecycle !== null}
              >
                <Pause className="h-4 w-4" />
                Deactivate
              </Button>
            ) : (
              <Button
                variant="primary"
                onPress={() => openStructureLifecycle('activate', selectedStructure)}
                isDisabled={pendingLifecycle !== null}
              >
                <Play className="h-4 w-4" />
                Activate
              </Button>
            )
          )}
        </div>
      </div>

      {/* Row 2: Period tabs + Structure year + Month + Expand + Deleted | Search */}
      {structuresError && structures.length === 0 && (
        <Alert status="danger">{structuresError}</Alert>
      )}

      <CorporateKpiFilters
        periodMode={periodMode}
        onPeriodModeChange={handleModeChange}
        years={years}
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
        selectedMonth={selectedMonth}
        onMonthChange={handleMonthChange}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        canViewDeleted={canManage}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        allExpanded={allExpanded}
      />

      {structureLocked && viewMode === 'current' && canManage && (
        <Alert status="default">
          The Corporate KPI structure is ACTIVE — deactivate it before editing its configuration.
        </Alert>
      )}

      <CorporateKpiTable
        tree={tree}
        deletedList={deletedList}
        viewMode={viewMode}
        expandedIds={effectiveExpandedIds}
        onToggleExpand={handleToggleExpand}
        searchQuery={searchQuery}
        selectedYear={selectedYear}
        emptyStateLabel={
          selectedStructure == null
            ? `No Corporate KPI structure yet for ${selectedYear}.`
            : undefined
        }
        isLoadingTree={isLoadingTree}
        isLoadingDeleted={isLoadingDeleted}
        treeError={treeError}
        deletedError={deletedError}
        onRetryTree={() => fetchTree(selectedYear, periodMode === 'monthly' ? selectedMonth : undefined)}
        onRetryDeleted={fetchDeleted}
        lockedStructureIds={lockedStructureIds}
        onCreateIndicator={canManage ? handleCreateIndicator : undefined}
        onEdit={canManage ? handleEdit : undefined}
        onDelete={canManage ? (node) => openNodeLifecycle('delete', node) : undefined}
        onRestore={canManage ? (node) => openNodeLifecycle('restore', node) : undefined}
      />

      {/* Lifecycle Confirmation Dialog */}
      {lifecycleDialogProps && lifecycleAction && (
        <LifecycleDialog
          title={lifecycleDialogProps.title}
          message={lifecycleDialogProps.message}
          confirmLabel={lifecycleDialogProps.confirmLabel}
          variant={lifecycleDialogProps.variant}
          isOpen={true}
          isPending={pendingLifecycle !== null}
          onConfirm={handleLifecycleConfirm}
          onCancel={closeLifecycle}
        />
      )}

      {/* Create Structure dialog */}
      <CreateStructureDialog
        isOpen={createDialog.open}
        year={createDialog.year}
        error={createDialog.error}
        structures={structures}
        isPending={isStructureMutating}
        onYearChange={(year) => setCreateDialog((prev) => ({ ...prev, year }))}
        onConfirm={confirmCreateStructure}
        onCancel={closeCreateDialog}
      />
    </div>
  );
}

/* ── Create Structure modal ── */

interface CreateStructureDialogProps {
  isOpen: boolean;
  year: number;
  error: string | null;
  /** Existing structures — source-year options for the copy mode. */
  structures: CorporateKpiStructure[];
  isPending: boolean;
  onYearChange: (year: number) => void;
  onConfirm: (payload: { year: number; copyFromYear?: number }) => void;
  onCancel: () => void;
}

function CreateStructureDialog({
  isOpen,
  year,
  error,
  structures,
  isPending,
  onYearChange,
  onConfirm,
  onCancel,
}: CreateStructureDialogProps) {
  const years = yearOptions();
  const [mode, setMode] = useState<'new' | 'copy'>('new');
  const [copyFromYear, setCopyFromYear] = useState<number | null>(null);

  // Reset the mode selection every time the dialog opens.
  useEffect(() => {
    if (isOpen) {
      setMode('new');
      setCopyFromYear(null);
    }
  }, [isOpen]);

  const sourceOptions = structures.filter((s) => s.year !== year);

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        isDismissable={!isPending}
        onOpenChange={(open: boolean) => { if (!open) onCancel(); }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[400px]">
            <Modal.Header>
              <Modal.Heading>Create Corporate KPI Structure</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col gap-4">
                {error && <Alert status="danger">{error}</Alert>}
                <Select
                  className="w-full"
                  selectedKey={String(year)}
                  onSelectionChange={(key) => onYearChange(Number(key))}
                  isRequired
                  aria-label="Year"
                  placeholder="Select year"
                >
                  <Label>Year</Label>
                  <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {years.map((y) => (
                        <ListBox.Item key={String(y)} id={String(y)} textValue={String(y)}>
                          {String(y)}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                  <FieldError>Year is required.</FieldError>
                </Select>

                {/* Mode: build the new structure empty, or copy the configuration of a previous year */}
                <div className="flex flex-col gap-1.5">
                  <Label>Configuration</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={mode === 'new' ? 'primary' : 'tertiary'}
                      onPress={() => setMode('new')}
                      aria-label="Create new structure"
                    >
                      Create new (empty)
                    </Button>
                    <Button
                      variant={mode === 'copy' ? 'primary' : 'tertiary'}
                      onPress={() => setMode('copy')}
                      aria-label="Copy from year"
                    >
                      Copy from year
                    </Button>
                  </div>
                </div>

                {mode === 'copy' && (
                  <Select
                    className="w-full"
                    selectedKey={copyFromYear != null ? String(copyFromYear) : null}
                    onSelectionChange={(key) => setCopyFromYear(key ? Number(key) : null)}
                    isRequired
                    isInvalid={copyFromYear == null}
                    disabledKeys={[String(year)]}
                    aria-label="Source Year"
                    placeholder="Select source year"
                  >
                    <Label>Source Year</Label>
                    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                    <Select.Popover>
                      <ListBox
                        renderEmptyState={() => <EmptyState>No previous structures available</EmptyState>}
                      >
                        {sourceOptions.map((s) => (
                          <ListBox.Item key={s.id} id={String(s.year)} textValue={String(s.year)}>
                            {String(s.year)}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                )}

                <p className="text-xs text-muted-foreground">
                  {mode === 'copy'
                    ? 'The new structure starts as DRAFT with the previous year\'s aspects, indicators, and variable bindings copied over.'
                    : 'The structure starts as DRAFT. Configure its KPIs, then activate it as a whole.'}
                </p>
              </div>
            </Modal.Body>
            <Modal.Footer className="flex justify-end gap-2">
              <Button variant="secondary" slot="close" onPress={onCancel} isDisabled={isPending}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onPress={() => onConfirm(mode === 'copy' ? { year, copyFromYear: copyFromYear ?? undefined } : { year })}
                isDisabled={isPending || (mode === 'copy' && copyFromYear == null)}
              >
                {isPending ? 'Creating...' : 'Create Structure'}
              </Button>
            </Modal.Footer>
            <Modal.CloseTrigger />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
