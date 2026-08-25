'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Breadcrumbs, BreadcrumbsItem, Button, Chip } from '@heroui/react';
import { Plus, House, ArrowsClockwise, Play, Pause } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { ForbiddenAccess } from '@/components/shared/forbidden-access';
import { KPI_LABELS, KPI_ROUTES } from '@/modules/kpi/constants';
import { useCorporateKpiData } from '@/modules/kpi/corporate/use-corporate-kpi-data';
import { CorporateKpiFilters } from '@/modules/kpi/corporate/corporate-kpi-filters';
import { CorporateKpiTable } from '@/modules/kpi/corporate/corporate-kpi-table';
import { LifecycleDialog } from '@/modules/kpi/corporate/corporate-kpi-lifecycle-dialog';
import { CorporateKpiCreateDialog } from '@/modules/kpi/corporate/corporate-kpi-create-dialog';
import { getCorporateKpiYearOptions } from '@/modules/kpi/corporate/corporate-kpi-year-options';
import type { CorporateKpiNode, CorporateKpiStructure, LifecycleActionType } from '@/modules/kpi/corporate/corporate-kpi.types';

type PeriodMode = 'monthly' | 'annual';
type ViewMode = 'current' | 'deleted';

function parseYear(value: string | null): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function KpiCorporatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPerm } = usePermission();
  const canRead = hasPerm(PERM.CORPORATE_KPI_READ);
  const canManage = hasPerm(PERM.CORPORATE_KPI_MANAGE);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const urlYear = parseYear(searchParams.get('year'));
  const periodMode: PeriodMode = searchParams.get('period') === 'annual' ? 'annual' : 'monthly';
  const selectedMonth = Math.min(12, Math.max(1, Number(searchParams.get('month')) || currentMonth));
  const viewMode: ViewMode = searchParams.get('view') === 'deleted' || searchParams.get('scope') === 'deleted' ? 'deleted' : 'current';
  const searchQuery = searchParams.get('search') ?? '';

  const [expandedIds, setExpandedIds] = useState<Set<string> | null>(null);
  const [isTableTransitioning, setIsTableTransitioning] = useState(false);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lifecycleAction, setLifecycleAction] = useState<LifecycleActionType | null>(null);
  const [lifecycleTarget, setLifecycleTarget] = useState<{ kind: 'structure'; structure: CorporateKpiStructure } | { kind: 'node'; node: CorporateKpiNode } | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const {
    tree, deletedList, structures, isLoadingTree, isLoadingDeleted, isLoadingStructures,
    treeError, deletedError, structuresError, hasLoadedDeleted,
    fetchTree, fetchDeleted, fetchStructures, pendingLifecycle, deleteKpi, restoreKpi, changeStructureStatus,
    createStructure, isStructureMutating,
  } = useCorporateKpiData();

  const years = useMemo(() => {
    return getCorporateKpiYearOptions(structures, currentYear);
  }, [currentYear, structures]);
  const selectedYear = useMemo(() => {
    if ((isLoadingStructures || structuresError) && urlYear != null) return urlYear;
    return urlYear != null && years.includes(urlYear) ? urlYear : years[0] ?? currentYear;
  }, [currentYear, isLoadingStructures, structuresError, urlYear, years]);

  const markTableTransition = useCallback(() => {
    setIsTableTransitioning(true);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => setIsTableTransitioning(false), 150);
  }, []);
  useEffect(() => () => { if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current); }, []);

  const updateUrl = useCallback((patch: Partial<{ year: number; period: PeriodMode; month: number; view: ViewMode; search: string }>) => {
    const next = { year: selectedYear, period: periodMode, month: selectedMonth, view: viewMode, search: searchQuery, ...patch };
    const params = new URLSearchParams();
    params.set('year', String(next.year));
    if (next.period === 'annual') params.set('period', 'annual');
    if (next.period === 'monthly' && next.month !== currentMonth) params.set('month', String(next.month));
    if (next.view === 'deleted') params.set('view', 'deleted');
    if (next.search) params.set('search', next.search);
    router.replace(`${KPI_ROUTES.corporate}?${params.toString()}`, { scroll: false });
  }, [currentMonth, periodMode, searchQuery, selectedMonth, selectedYear, viewMode, router]);

  useEffect(() => { if (canRead) void fetchStructures(); }, [canRead, fetchStructures]);
  useEffect(() => {
    if (canRead && !isLoadingStructures && !structuresError) {
      void fetchTree(selectedYear, periodMode === 'monthly' ? selectedMonth : undefined);
    }
  }, [canRead, fetchTree, isLoadingStructures, periodMode, selectedMonth, selectedYear, structuresError]);
  useEffect(() => { if (viewMode === 'deleted' && canManage && !hasLoadedDeleted) void fetchDeleted(); }, [canManage, fetchDeleted, hasLoadedDeleted, viewMode]);

  useEffect(() => {
    if (!canRead || isLoadingStructures || structuresError) return;
    const fallbackYear = years[0] ?? currentYear;
    if (urlYear !== fallbackYear && (urlYear == null || !years.includes(urlYear))) {
      updateUrl({ year: fallbackYear });
    }
  }, [canRead, currentYear, isLoadingStructures, structuresError, updateUrl, urlYear, years]);
  const selectedStructure = structures.find((s) => s.year === selectedYear) ?? null;
  const structureLocked = selectedStructure?.status === 'ACTIVE';
  const lockedStructureIds = useMemo(() => new Set(structures.filter((s) => s.status === 'ACTIVE').map((s) => s.id)), [structures]);
  const expandableIds = useMemo(() => {
    const result = new Set<string>();
    const collect = (nodes: CorporateKpiNode[]) => {
      for (const node of nodes ?? []) {
        const children = node.children ?? [];
        if (children.length > 0) { result.add(node.id); collect(children); }
      }
    };
    collect(tree);
    return result;
  }, [tree]);
  const effectiveExpandedIds = expandedIds ?? expandableIds;
  const allExpanded = viewMode === 'current' && expandableIds.size > 0 && [...expandableIds].every((id) => effectiveExpandedIds.has(id));

  const handleYearChange = useCallback((year: number) => { markTableTransition(); updateUrl({ year }); }, [markTableTransition, updateUrl]);
  const handleModeChange = useCallback((period: PeriodMode) => { markTableTransition(); updateUrl({ period }); }, [markTableTransition, updateUrl]);
  const handleMonthChange = useCallback((month: number) => { markTableTransition(); updateUrl({ month }); }, [markTableTransition, updateUrl]);
  const handleViewModeChange = useCallback((view: ViewMode) => { markTableTransition(); updateUrl({ view }); }, [markTableTransition, updateUrl]);
  const handleSearchChange = useCallback((search: string) => { markTableTransition(); updateUrl({ search }); }, [markTableTransition, updateUrl]);

  const handleCreate = useCallback(() => {
    if (selectedStructure) {
      router.push(`${KPI_ROUTES.corporateAdd}?structureId=${selectedStructure.id}&type=ASPECT&from=structure`);
      return;
    }
    setIsCreateDialogOpen(true);
  }, [router, selectedStructure]);
  const handleCreateNew = useCallback(() => {
    setIsCreateDialogOpen(false);
    router.push(`${KPI_ROUTES.corporateAdd}?year=${selectedYear}&type=ASPECT&from=structure`);
  }, [router, selectedYear]);
  const handleCopy = useCallback(async (sourceYear: number) => {
    const created = await createStructure({ year: selectedYear, copyFromYear: sourceYear });
    if (created) setIsCreateDialogOpen(false);
  }, [createStructure, selectedYear]);
  const handleCreateIndicator = useCallback((aspectId: string) => {
    if (selectedStructure) router.push(`${KPI_ROUTES.corporateAdd}?structureId=${selectedStructure.id}&parentId=${aspectId}&type=INDICATOR&from=structure`);
  }, [router, selectedStructure]);
  const handleView = useCallback((node: CorporateKpiNode) => router.push(KPI_ROUTES.corporateDetailRoute(node.id, 'from=structure')), [router]);
  const handleEdit = useCallback((node: CorporateKpiNode) => router.push(KPI_ROUTES.corporateEditRoute(node.id, 'from=structure')), [router]);

  const openNodeLifecycle = useCallback((action: LifecycleActionType, node: CorporateKpiNode) => { setLifecycleAction(action); setLifecycleTarget({ kind: 'node', node }); }, []);
  const openStructureLifecycle = useCallback((action: 'activate' | 'deactivate', structure: CorporateKpiStructure) => { setLifecycleAction(action); setLifecycleTarget({ kind: 'structure', structure }); }, []);
  const closeLifecycle = useCallback(() => { setLifecycleAction(null); setLifecycleTarget(null); }, []);
  const handleLifecycleConfirm = useCallback(async () => {
    if (!lifecycleAction || !lifecycleTarget) return;
    let ok = false;
    if (lifecycleTarget.kind === 'structure') {
      if (lifecycleAction === 'activate') ok = await changeStructureStatus(lifecycleTarget.structure.id, 'ACTIVE');
      if (lifecycleAction === 'deactivate') ok = await changeStructureStatus(lifecycleTarget.structure.id, 'INACTIVE');
    } else if (lifecycleAction === 'delete') ok = await deleteKpi(lifecycleTarget.node.id, lifecycleTarget.node.year);
    else if (lifecycleAction === 'restore') ok = await restoreKpi(lifecycleTarget.node.id, lifecycleTarget.node.year);
    if (ok) closeLifecycle();
  }, [changeStructureStatus, closeLifecycle, deleteKpi, lifecycleAction, lifecycleTarget, restoreKpi]);
  const lifecycleDialogProps = useMemo(() => {
    if (!lifecycleAction || !lifecycleTarget) return null;
    if (lifecycleTarget.kind === 'structure') return lifecycleAction === 'activate'
      ? { title: 'Aktifkan Struktur KPI', message: <>Aktifkan struktur tahun <strong>{lifecycleTarget.structure.year}</strong>?</>, confirmLabel: 'Aktifkan', variant: 'primary' as const }
      : { title: 'Nonaktifkan Struktur KPI', message: <>Nonaktifkan struktur tahun <strong>{lifecycleTarget.structure.year}</strong> agar dapat diubah?</>, confirmLabel: 'Nonaktifkan', variant: 'primary' as const };
    return lifecycleAction === 'delete'
      ? { title: 'Hapus KPI', message: <>Hapus <strong>{lifecycleTarget.node.code} — {lifecycleTarget.node.name}</strong>?</>, confirmLabel: 'Hapus', variant: 'danger' as const }
      : { title: 'Pulihkan KPI', message: <>Pulihkan <strong>{lifecycleTarget.node.code} — {lifecycleTarget.node.name}</strong>?</>, confirmLabel: 'Pulihkan', variant: 'primary' as const };
  }, [lifecycleAction, lifecycleTarget]);

  if (!canRead) return <ForbiddenAccess />;
  const totalCount = viewMode === 'deleted' ? deletedList.length : tree.reduce((count, node) => count + 1 + (node.children ?? []).reduce((childCount, child) => childCount + 1 + (child.children ?? []).length, 0), 0);

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs><BreadcrumbsItem href="/" aria-label="Beranda"><House className="h-4 w-4" /></BreadcrumbsItem><BreadcrumbsItem>KPI</BreadcrumbsItem><BreadcrumbsItem>{KPI_LABELS.corporate}</BreadcrumbsItem></Breadcrumbs>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.corporate}</h1>{selectedStructure && <Chip size="md" className="pointer-events-none" aria-label={`Status struktur ${selectedStructure.status}`}>{selectedStructure.status}</Chip>}<Chip size="md" className="pointer-events-none" aria-label={`Total ${totalCount} KPI`}>{totalCount}</Chip></div>
        <div className="flex items-center gap-2">
          <Button isIconOnly variant="tertiary" onPress={() => fetchTree(selectedYear, periodMode === 'monthly' ? selectedMonth : undefined)} isDisabled={isLoadingTree} aria-label="Muat ulang struktur KPI"><ArrowsClockwise className={`h-4 w-4 ${isLoadingTree ? 'animate-spin' : ''}`} /></Button>
          {canManage && selectedStructure && (structureLocked ? <Button variant="secondary" onPress={() => openStructureLifecycle('deactivate', selectedStructure)} isDisabled={pendingLifecycle !== null}><Pause className="h-4 w-4" />Nonaktifkan</Button> : <Button variant="secondary" onPress={() => openStructureLifecycle('activate', selectedStructure)} isDisabled={pendingLifecycle !== null}><Play className="h-4 w-4" />Aktifkan</Button>)}
          {canManage && viewMode === 'current' && <Button variant="primary" onPress={handleCreate} isDisabled={structureLocked}><Plus className="h-4 w-4" />Tambah KPI</Button>}
        </div>
      </div>
      <CorporateKpiFilters periodMode={periodMode} onPeriodModeChange={handleModeChange} years={years} selectedYear={selectedYear} onYearChange={handleYearChange} selectedMonth={selectedMonth} onMonthChange={handleMonthChange} viewMode={viewMode} onViewModeChange={handleViewModeChange} searchQuery={searchQuery} onSearchChange={handleSearchChange} canViewDeleted={canManage} onExpandAll={() => setExpandedIds(new Set(expandableIds))} onCollapseAll={() => setExpandedIds(new Set())} allExpanded={allExpanded} />
      <CorporateKpiTable tree={tree} deletedList={deletedList} viewMode={viewMode} expandedIds={effectiveExpandedIds} onToggleExpand={(id) => setExpandedIds((prev) => { const next = new Set(prev ?? expandableIds); if (next.has(id)) next.delete(id); else next.add(id); return next; })} searchQuery={searchQuery} selectedYear={selectedYear} emptyStateLabel={`Belum ada struktur KPI untuk tahun ${selectedYear}.`} isLoadingTree={isLoadingTree} isLoadingStructures={isLoadingStructures} isTableTransitioning={isTableTransitioning} isLoadingDeleted={isLoadingDeleted} treeError={treeError} structuresError={structuresError} deletedError={deletedError} onRetryTree={() => fetchTree(selectedYear, periodMode === 'monthly' ? selectedMonth : undefined)} onRetryDeleted={fetchDeleted} lockedStructureIds={lockedStructureIds} onView={handleView} onCreateIndicator={canManage ? handleCreateIndicator : undefined} onEdit={canManage ? handleEdit : undefined} onDelete={canManage ? (node) => openNodeLifecycle('delete', node) : undefined} onRestore={canManage ? (node) => openNodeLifecycle('restore', node) : undefined} />
      {lifecycleDialogProps && <LifecycleDialog {...lifecycleDialogProps} isOpen={true} isPending={pendingLifecycle !== null} onConfirm={handleLifecycleConfirm} onCancel={closeLifecycle} />}
      {canManage && isCreateDialogOpen && <CorporateKpiCreateDialog isOpen={true} targetYear={selectedYear} structures={structures} isPending={isStructureMutating} onClose={() => setIsCreateDialogOpen(false)} onCreateNew={handleCreateNew} onCopy={handleCopy} />}
    </div>
  );
}
