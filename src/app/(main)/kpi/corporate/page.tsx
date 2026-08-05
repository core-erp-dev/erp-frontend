'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Alert, Button, Chip, Breadcrumbs, BreadcrumbsItem } from '@heroui/react';
import { Plus, House, ArrowsClockwise } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS } from '@/modules/kpi/constants';
import { useCorporateKpiData } from '@/modules/kpi/corporate/use-corporate-kpi-data';
import { CorporateKpiFilters } from '@/modules/kpi/corporate/corporate-kpi-filters';
import { CorporateKpiTable } from '@/modules/kpi/corporate/corporate-kpi-table';
import { KpiNodeFormModal, type FormMode } from '@/modules/kpi/corporate/kpi-node-form-modal';
import { LifecycleDialog } from '@/modules/kpi/corporate/corporate-kpi-lifecycle-dialog';
import type { CorporateKpiNode, CreateKpiRequest, UpdateKpiRequest, LifecycleActionType } from '@/modules/kpi/corporate/corporate-kpi.types';

type PeriodMode = 'monthly' | 'annual';

export default function KpiCorporatePage() {
  const { hasPerm } = usePermission();
  const canRead = hasPerm(PERM.CORPORATE_KPI_READ);
  // Manage implies read on the backend; all mutations + deleted-data views are manage-gated.
  const canManage = hasPerm(PERM.CORPORATE_KPI_MANAGE);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // ── Page-local UI state ──
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [viewMode, setViewMode] = useState<'current' | 'deleted'>('current');
  const [searchQuery, setSearchQuery] = useState('');
  // null = AUTO mode: every expandable row is expanded by default on first load.
  // The first user toggle materializes a real Set (see handleToggleExpand).
  const [expandedIds, setExpandedIds] = useState<Set<string> | null>(null);

  // ── Create/Edit modal state ──
  const [modalMode, setModalMode] = useState<FormMode | null>(null);
  const [editNode, setEditNode] = useState<CorporateKpiNode | undefined>(undefined);
  const [preselectedParentId, setPreselectedParentId] = useState<string | undefined>(undefined);

  // ── Lifecycle dialog state ──
  const [lifecycleAction, setLifecycleAction] = useState<LifecycleActionType | null>(null);
  const [lifecycleNode, setLifecycleNode] = useState<CorporateKpiNode | null>(null);

  // ── Server data ──
  const {
    tree, deletedList, isLoadingTree, isLoadingDeleted,
    treeError, deletedError, hasLoadedDeleted,
    fetchTree, fetchDeleted,
    isMutating, createNode, updateNode,
    pendingLifecycle, changeStatus, deleteKpi, restoreKpi,
  } = useCorporateKpiData();

  // Fetch tree on mount and when the period (year/mode/month) changes.
  // Monthly: year + month. Annual: year only — the month parameter is omitted.
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

  // Every node with children is expandable.
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

  // Effective expansion: AUTO mode (null) expands every expandable row; once the
  // user toggles, the materialized Set wins.
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
    // Annual scope omits the month entirely; keep the month selection for the Month tab.
    if (mode === 'annual') setSelectedMonth(currentMonth);
  }, [currentMonth]);
  const handleMonthChange = useCallback((month: number) => setSelectedMonth(month), []);
  const handleViewModeChange = useCallback((mode: 'current' | 'deleted') => setViewMode(mode), []);
  const handleSearchChange = useCallback((query: string) => setSearchQuery(query), []);

  // ── Create/Edit modal handlers ──

  const openCreateAspect = useCallback(() => {
    setModalMode('CREATE_ASPECT');
    setEditNode(undefined);
    setPreselectedParentId(undefined);
  }, []);

  const openCreateIndicator = useCallback((aspectId: string) => {
    setModalMode('CREATE_INDICATOR');
    setEditNode(undefined);
    setPreselectedParentId(aspectId);
  }, []);

  const openEdit = useCallback((node: CorporateKpiNode) => {
    setModalMode(node.nodeType === 'ASPECT' ? 'EDIT_ASPECT' : 'EDIT_INDICATOR');
    setEditNode(node);
    setPreselectedParentId(undefined);
  }, []);

  const closeModal = useCallback(() => {
    setModalMode(null);
    setEditNode(undefined);
    setPreselectedParentId(undefined);
  }, []);

  const handleSubmit = useCallback(
    async (data: CreateKpiRequest | UpdateKpiRequest, id?: string): Promise<boolean> => {
      let result: CorporateKpiNode | null = null;
      if (id) {
        result = await updateNode(id, data as UpdateKpiRequest);
        if (result) { closeModal(); return true; }
      } else {
        result = await createNode(data as CreateKpiRequest);
        if (result) { closeModal(); return true; }
      }
      return false;
    },
    [createNode, updateNode, closeModal],
  );

  // ── Lifecycle handlers ──

  const openLifecycle = useCallback((action: LifecycleActionType, node: CorporateKpiNode) => {
    setLifecycleAction(action);
    setLifecycleNode(node);
  }, []);

  const closeLifecycle = useCallback(() => {
    setLifecycleAction(null);
    setLifecycleNode(null);
  }, []);

  const handleLifecycleConfirm = useCallback(async () => {
    if (!lifecycleAction || !lifecycleNode) return;
    let ok = false;
    switch (lifecycleAction) {
      case 'activate':
        ok = await changeStatus(lifecycleNode.id, 'ACTIVE');
        break;
      case 'deactivate':
        ok = await changeStatus(lifecycleNode.id, 'INACTIVE');
        break;
      case 'delete':
        ok = await deleteKpi(lifecycleNode.id);
        break;
      case 'restore':
        ok = await restoreKpi(lifecycleNode.id);
        break;
    }
    if (ok) closeLifecycle();
  }, [lifecycleAction, lifecycleNode, changeStatus, deleteKpi, restoreKpi, closeLifecycle]);

  // All Aspects for parent selector
  const aspects = useMemo(() => {
    const result: CorporateKpiNode[] = [];
    const collect = (nodes: typeof tree) => {
      for (const n of nodes) {
        if (n.nodeType === 'ASPECT') result.push(n);
        if (n.children.length > 0) collect(n.children);
      }
    };
    collect(tree);
    return result;
  }, [tree]);

  // Compute total count and all-expanded state
  const totalCount = viewMode === 'current'
    ? (() => { let c = 0; const walk = (ns: typeof tree) => { for (const n of ns) { c++; if (n.children.length > 0) walk(n.children); } }; walk(tree); return c; })()
    : deletedList.length;

  const allExpanded = (() => {
    if (tree.length === 0 || viewMode !== 'current') return false;
    return expandableIds.size > 0 && Array.from(expandableIds).every((id) => effectiveExpandedIds.has(id));
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

      {/* Row 1: Title + Chip + Refresh + Add */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.corporate}</h1>
          <Chip
            size="md"
            className="pointer-events-none"
            aria-label={`Total ${totalCount} corporate kpi`}
          >
            {totalCount}
          </Chip>
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
          {canManage && viewMode === 'current' && (
            <Button variant="primary" onPress={openCreateAspect}>
              <Plus className="h-4 w-4" />
              Add Corporate KPI
            </Button>
          )}
        </div>
      </div>

      {/* Row 2: Period tabs + Year/Month dropdowns + Expand + Deleted | Search */}
      <CorporateKpiFilters
        periodMode={periodMode}
        onPeriodModeChange={handleModeChange}
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

      <CorporateKpiTable
        tree={tree}
        deletedList={deletedList}
        viewMode={viewMode}
        expandedIds={effectiveExpandedIds}
        onToggleExpand={handleToggleExpand}
        searchQuery={searchQuery}
        selectedYear={selectedYear}
        isLoadingTree={isLoadingTree}
        isLoadingDeleted={isLoadingDeleted}
        treeError={treeError}
        deletedError={deletedError}
        onRetryTree={() => fetchTree(selectedYear, periodMode === 'monthly' ? selectedMonth : undefined)}
        onRetryDeleted={fetchDeleted}
        onCreateIndicator={canManage ? openCreateIndicator : undefined}
        onEdit={canManage ? openEdit : undefined}
        onActivate={canManage ? (node) => openLifecycle('activate', node) : undefined}
        onDeactivate={canManage ? (node) => openLifecycle('deactivate', node) : undefined}
        onDelete={canManage ? (node) => openLifecycle('delete', node) : undefined}
        onRestore={canManage ? (node) => openLifecycle('restore', node) : undefined}
      />

      {/* Create/Edit Modal */}
      {modalMode && (
        <KpiNodeFormModal
          mode={modalMode}
          isOpen={true}
          onClose={closeModal}
          onSubmit={handleSubmit}
          preselectedParentId={preselectedParentId}
          node={editNode}
          aspects={aspects}
          selectedYear={selectedYear}
          isSubmitting={isMutating}
        />
      )}

      {/* Lifecycle Confirmation Dialog */}
      {lifecycleAction && lifecycleNode && (
        <LifecycleDialog
          action={lifecycleAction}
          node={lifecycleNode}
          isOpen={true}
          isPending={pendingLifecycle !== null}
          onConfirm={handleLifecycleConfirm}
          onCancel={closeLifecycle}
        />
      )}
    </div>
  );
}
