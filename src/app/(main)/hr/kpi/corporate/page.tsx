'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Spinner, Alert, Button } from '@heroui/react';
import { Plus } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS, KPI_DESCRIPTIONS } from '@/modules/hr/kpi/constants';
import { useCorporateKpiData } from '@/modules/hr/kpi/corporate/use-corporate-kpi-data';
import { CorporateKpiFilters } from '@/modules/hr/kpi/corporate/corporate-kpi-filters';
import { CorporateKpiTable } from '@/modules/hr/kpi/corporate/corporate-kpi-table';
import { KpiNodeFormModal, type FormMode } from '@/modules/hr/kpi/corporate/kpi-node-form-modal';
import { mapKpiError } from '@/modules/hr/kpi/corporate/corporate-kpi-error-mapper';
import type { CorporateKpiNode, CreateKpiRequest, UpdateKpiRequest } from '@/modules/hr/kpi/corporate/corporate-kpi.types';

export default function KpiCorporatePage() {
  const { hasPerm } = usePermission();
  const canRead = hasPerm(PERM.CORPORATE_KPI_READ);
  const canCreate = hasPerm(PERM.CORPORATE_KPI_CREATE);
  const canUpdate = hasPerm(PERM.CORPORATE_KPI_UPDATE);
  const canViewDeleted = hasPerm(PERM.CORPORATE_KPI_READ_DELETED);

  const currentYear = new Date().getFullYear();

  // ── Page-local UI state ──
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [viewMode, setViewMode] = useState<'current' | 'deleted'>('current');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // ── Modal state ──
  const [modalMode, setModalMode] = useState<FormMode | null>(null);
  const [editNode, setEditNode] = useState<CorporateKpiNode | undefined>(undefined);
  const [preselectedParentId, setPreselectedParentId] = useState<string | undefined>(undefined);

  // ── Server data ──
  const {
    tree,
    deletedList,
    isLoadingTree,
    isLoadingDeleted,
    treeError,
    deletedError,
    hasLoadedDeleted,
    fetchTree,
    fetchDeleted,
    isMutating,
    createNode,
    updateNode,
    refreshTree,
  } = useCorporateKpiData();

  // Fetch tree on mount and when year changes
  useEffect(() => {
    if (canRead) {
      fetchTree(selectedYear);
    }
  }, [canRead, selectedYear, fetchTree]);

  // Fetch deleted data when first switching to deleted view
  useEffect(() => {
    if (viewMode === 'deleted' && !hasLoadedDeleted && canViewDeleted) {
      fetchDeleted();
    }
  }, [viewMode, hasLoadedDeleted, canViewDeleted, fetchDeleted]);

  // ── Handlers ──

  const handleYearChange = useCallback((year: number) => setSelectedYear(year), []);
  const handleViewModeChange = useCallback((mode: 'current' | 'deleted') => setViewMode(mode), []);
  const handleSearchChange = useCallback((query: string) => setSearchQuery(query), []);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    const allIds = new Set<string>();
    const collect = (nodes: typeof tree) => {
      for (const node of nodes) {
        if (node.children.length > 0) { allIds.add(node.id); collect(node.children); }
      }
    };
    collect(tree);
    setExpandedIds(allIds);
  }, [tree]);

  const handleCollapseAll = useCallback(() => setExpandedIds(new Set()), []);

  // ── Modal handlers ──

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
        // Update
        result = await updateNode(id, data as UpdateKpiRequest);
        if (result) {
          closeModal();
          return true;
        }
      } else {
        // Create
        result = await createNode(data as CreateKpiRequest);
        if (result) {
          closeModal();
          return true;
        }
      }
      return false;
    },
    [createNode, updateNode, closeModal],
  );

  // All Aspects in the current year, for the parent selector
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

  // ── Permission guard ──

  if (!canRead) {
    return (
      <div className="flex w-full flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.corporate}</h1>
          <p className="text-sm text-muted-foreground">{KPI_DESCRIPTIONS.corporate}</p>
        </div>
        <Alert status="danger">Access Denied</Alert>
      </div>
    );
  }

  // ── Initial loading ──

  if (isLoadingTree && tree.length === 0) {
    return (
      <div className="flex w-full flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.corporate}</h1>
          <p className="text-sm text-muted-foreground">{KPI_DESCRIPTIONS.corporate}</p>
        </div>
        <div className="flex h-64 items-center justify-center"><Spinner size="md" /></div>
      </div>
    );
  }

  // ── Rendered page ──

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.corporate}</h1>
        <p className="text-sm text-muted-foreground">{KPI_DESCRIPTIONS.corporate}</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <CorporateKpiFilters
          selectedYear={selectedYear}
          onYearChange={handleYearChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          canViewDeleted={canViewDeleted}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
        />
        {canCreate && viewMode === 'current' && (
          <Button variant="primary" size="sm" onPress={openCreateAspect}>
            <Plus className="h-4 w-4" />
            Create Aspect
          </Button>
        )}
      </div>

      <CorporateKpiTable
        tree={tree}
        deletedList={deletedList}
        viewMode={viewMode}
        expandedIds={expandedIds}
        onToggleExpand={handleToggleExpand}
        searchQuery={searchQuery}
        selectedYear={selectedYear}
        isLoadingTree={isLoadingTree}
        isLoadingDeleted={isLoadingDeleted}
        treeError={treeError}
        deletedError={deletedError}
        onRetryTree={() => fetchTree(selectedYear)}
        onRetryDeleted={fetchDeleted}
        onCreateIndicator={canCreate ? openCreateIndicator : undefined}
        onEdit={canUpdate ? openEdit : undefined}
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
    </div>
  );
}
