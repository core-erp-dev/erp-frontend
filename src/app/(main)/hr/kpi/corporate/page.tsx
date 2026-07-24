'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Spinner, Alert } from '@heroui/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS, KPI_DESCRIPTIONS } from '@/modules/hr/kpi/constants';
import { useCorporateKpiData } from '@/modules/hr/kpi/corporate/use-corporate-kpi-data';
import { CorporateKpiFilters } from '@/modules/hr/kpi/corporate/corporate-kpi-filters';
import { CorporateKpiTable } from '@/modules/hr/kpi/corporate/corporate-kpi-table';

export default function KpiCorporatePage() {
  const { hasPerm } = usePermission();
  const canRead = hasPerm(PERM.CORPORATE_KPI_READ);
  const canViewDeleted = hasPerm(PERM.CORPORATE_KPI_READ_DELETED);

  const currentYear = new Date().getFullYear();

  // ── Page-local UI state ──
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [viewMode, setViewMode] = useState<'current' | 'deleted'>('current');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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
  } = useCorporateKpiData();

  // Fetch tree on mount and when year changes
  useEffect(() => {
    if (canRead) {
      fetchTree(selectedYear);
    }
  }, [canRead, selectedYear, fetchTree]);

  // Fetch deleted data when first switching to deleted view
  const prevViewModeRef = React.useRef(viewMode);
  useEffect(() => {
    if (
      viewMode === 'deleted' &&
      !hasLoadedDeleted &&
      canViewDeleted
    ) {
      fetchDeleted();
    }
    prevViewModeRef.current = viewMode;
  }, [viewMode, hasLoadedDeleted, canViewDeleted, fetchDeleted]);

  // ── Handlers ──

  const handleYearChange = useCallback((year: number) => {
    setSelectedYear(year);
  }, []);

  const handleViewModeChange = useCallback((mode: 'current' | 'deleted') => {
    setViewMode(mode);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    const allIds = new Set<string>();
    const collectAspectIds = (nodes: typeof tree) => {
      for (const node of nodes) {
        if (node.children.length > 0) {
          allIds.add(node.id);
          collectAspectIds(node.children);
        }
      }
    };
    collectAspectIds(tree);
    setExpandedIds(allIds);
  }, [tree]);

  const handleCollapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

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

  // ── Initial loading state ──

  if (isLoadingTree && tree.length === 0) {
    return (
      <div className="flex w-full flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.corporate}</h1>
          <p className="text-sm text-muted-foreground">{KPI_DESCRIPTIONS.corporate}</p>
        </div>
        <div className="flex h-64 items-center justify-center">
          <Spinner size="md" />
        </div>
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
      />
    </div>
  );
}
