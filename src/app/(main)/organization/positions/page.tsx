'use client';

import { Suspense, useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, House, ArrowsClockwise, FunnelSimple, Check, X, Trash, ArrowsOutSimple, ArrowsInSimple, CheckCircle } from '@phosphor-icons/react';
import {
  Breadcrumbs,
  BreadcrumbsItem,
  Button,
  Chip,
  SearchField,
  Dropdown,
  Label,
  Tabs,
} from '@heroui/react';
import type { Selection } from '@heroui/react';

import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { ForbiddenAccess } from '@/components/shared/forbidden-access';
import { PositionTable } from '@/modules/organization/positions/components/position-table';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { usePositionData, type SortField, type SortDir, type ScopeFilter, type ViewMode } from '@/modules/organization/positions/hooks/use-position-data';
import { useDebounce } from '@/hooks/use-debounce';

const SORT_OPTIONS: { field: SortField; label: string; dir: SortDir }[] = [
  { field: 'positionName', label: 'Nama (A-Z)', dir: 'asc' },
  { field: 'positionName', label: 'Nama (Z-A)', dir: 'desc' },
  { field: 'positionCode', label: 'Kode (A-Z)', dir: 'asc' },
  { field: 'positionCode', label: 'Kode (Z-A)', dir: 'desc' },
  { field: 'positionLevel', label: 'Level (Terendah)', dir: 'asc' },
  { field: 'positionLevel', label: 'Level (Tertinggi)', dir: 'desc' },
];

function PositionsPage() {
  const router = useRouter();
  const { hasPerm } = usePermission();

  const {
    positions,
    isLoading,
    error,
    pagination,
    filters,
    setSearch,
    setScope,
    setSort,
    setPage,
    setView,
    resetFilters,
    refreshTable,
    deletePosition,
    restorePosition,
    treePositions,
    isLoadingTree,
    treeError,
    refreshTree,
  } = usePositionData();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const isDeletedScope = filters.scope === 'deleted';
  const viewMode = filters.view;
  const effectiveViewMode: ViewMode = isDeletedScope ? 'table' : viewMode;

  // Local search input state (debounced; URL is the source of truth)
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [lastSearched, setLastSearched] = useState('');
  useEffect(() => {
    if (debouncedSearch !== lastSearched) {
      setLastSearched(debouncedSearch);
      setSearch(debouncedSearch);
    }
  }, [debouncedSearch, lastSearched, setSearch]);

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleDeleteRequest = useCallback((id: string, name: string) => {
    setDeleteTarget({ id, name });
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deletePosition(deleteTarget.id);
      setIsDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch {
      // Error toast handled by hook
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, deletePosition]);

  const handleRestore = useCallback(async (id: string) => {
    await restorePosition(id);
  }, [restorePosition]);

  // Sort — single-select, selected state mirrors the Filter menu pattern
  const sortSelectionKeys = useMemo(() => {
    const idx = SORT_OPTIONS.findIndex(
      (opt) => opt.field === filters.sortBy && opt.dir === filters.sortDirection,
    );
    return new Set([String(idx >= 0 ? idx : 0)]);
  }, [filters.sortBy, filters.sortDirection]);

  const handleSortSelectionChange = useCallback((selection: Selection) => {
    const selected = selection instanceof Set ? selection : new Set<string>();
    const first = Array.from(selected)[0];
    const opt = SORT_OPTIONS[Number(first)];
    if (opt) setSort(opt.field, opt.dir);
  }, [setSort]);

  const isDefaultSort = filters.sortBy === 'positionName' && filters.sortDirection === 'asc';
  const hasActiveFilters = !isDefaultSort;

  // ── Tree expand/collapse ──
  const collectExpandableIds = useCallback((nodes: typeof treePositions): string[] => {
    const ids: string[] = [];
    for (const node of nodes) {
      const children = node.children ?? [];
      if (children.length > 0) {
        ids.push(node.id);
        ids.push(...collectExpandableIds(children));
      }
    }
    return ids;
  }, []);

  const handleExpandAll = useCallback(() => {
    const allIds = collectExpandableIds(treePositions);
    setExpandedIds(new Set(allIds));
  }, [treePositions, collectExpandableIds]);

  const handleCollapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const allExpanded = (() => {
    if (treePositions.length === 0) return false;
    const expandableIds = collectExpandableIds(treePositions);
    return expandableIds.length > 0 && expandableIds.every((id) => expandedIds.has(id));
  })();

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Auto-expand roots when switching to tree view
  const handleViewModeChange = useCallback((mode: 'table' | 'tree') => {
    setView(mode);
    if (mode === 'tree' && expandedIds.size === 0) {
      const rootIds = new Set(treePositions.map((p) => p.id));
      setExpandedIds(rootIds);
    }
  }, [setView, treePositions, expandedIds.size]);

  // ── Scope toggle ──
  const handleScopeToggle = useCallback(() => {
    const newScope: ScopeFilter = isDeletedScope ? 'current' : 'deleted';
    // Deleted scope forces table view — applied in the same URL update.
    setScope(newScope, newScope === 'deleted' ? 'table' : undefined);
  }, [isDeletedScope, setScope]);

  const totalItems = pagination?.totalElements ?? 0;

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/">
          <House className="h-4 w-4" />
        </BreadcrumbsItem>
        <BreadcrumbsItem>Organisasi</BreadcrumbsItem>
        <BreadcrumbsItem>Struktur Jabatan</BreadcrumbsItem>
      </Breadcrumbs>

      {/* Row 1: Title + Refresh + Add */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">Struktur Jabatan</h1>
          <Chip
            size="md"
            className="pointer-events-none"
            aria-label={`Total ${effectiveViewMode === 'table' ? totalItems : treePositions.length} jabatan`}
          >
            {effectiveViewMode === 'table' ? totalItems : treePositions.length}
          </Chip>
        </div>
        <div className="flex items-center gap-2">
          <Button
            isIconOnly
            variant="tertiary"
            onPress={() => { refreshTable(); refreshTree(); }}
            isDisabled={isLoading || isLoadingTree}
            aria-label="Muat ulang data jabatan"
          >
            <ArrowsClockwise className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {!isDeletedScope && hasPerm(PERM.POSITION_MANAGE) && (
            <Button variant="primary" onPress={() => router.push('/organization/positions/create?from=list')}>
              <Plus className="h-4 w-4" />
              Tambah Jabatan
            </Button>
          )}
        </div>
      </div>

      {/* Row 2: Tabs (left) | Search (right) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* View Switcher — HeroUI Tabs (hidden in deleted scope) */}
          {!isDeletedScope && (
            <Tabs
              selectedKey={effectiveViewMode}
              onSelectionChange={(key) => handleViewModeChange(key as 'table' | 'tree')}
            >
              <Tabs.ListContainer>
                <Tabs.List aria-label="Tampilan">
                  <Tabs.Tab id="table">Tabel<Tabs.Indicator /></Tabs.Tab>
                  <Tabs.Tab id="tree">Hierarki<Tabs.Indicator /></Tabs.Tab>
                </Tabs.List>
              </Tabs.ListContainer>
            </Tabs>
          )}

          {effectiveViewMode === 'tree' && !isDeletedScope && (
            <Button
              variant="tertiary"
              onPress={allExpanded ? handleCollapseAll : handleExpandAll}
              aria-label={allExpanded ? 'Ciutkan semua' : 'Perluas semua'}
            >
              {allExpanded ? (
                <ArrowsInSimple className="h-4 w-4" />
              ) : (
                <ArrowsOutSimple className="h-4 w-4" />
              )}
              {allExpanded ? 'Ciutkan Semua' : 'Perluas Semua'}
            </Button>
          )}

          {effectiveViewMode === 'table' && (
            <>
              {/* Sort Dropdown */}
              <Dropdown>
                <Button variant="tertiary" aria-label="Urutkan">
                  <FunnelSimple className="h-4 w-4" />
                  Urutkan
                  {!isDefaultSort && (
                    <>
                      <span className="mx-0.5 h-4 w-px bg-border" />
                      <Check className="h-4 w-4" />
                    </>
                  )}
                </Button>
                <Dropdown.Popover>
                  <Dropdown.Menu
                    selectedKeys={sortSelectionKeys}
                    selectionMode="single"
                    onSelectionChange={handleSortSelectionChange}
                  >
                    {SORT_OPTIONS.map((opt, i) => (
                      <Dropdown.Item key={i} id={String(i)} textValue={opt.label}>
                        <Dropdown.ItemIndicator />
                        <Label>{opt.label}</Label>
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>

              {hasActiveFilters && (
                <Button isIconOnly variant="tertiary" aria-label="Atur ulang filter" onPress={resetFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </>
          )}

          {/* Scope Toggle: Data Terhapus / Data Aktif — last in row order */}
          {hasPerm(PERM.POSITION_MANAGE) && (
            <Button variant="tertiary" aria-label={isDeletedScope ? 'Tampilkan data aktif' : 'Tampilkan data terhapus'} onPress={handleScopeToggle}>
              {isDeletedScope ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Trash className="h-4 w-4" />
              )}
              {isDeletedScope ? 'Data Aktif' : 'Data Terhapus'}
            </Button>
          )}
        </div>

        {effectiveViewMode === 'table' && (
          <SearchField
            name="search"
            value={searchInput}
            onChange={setSearchInput}
            className="w-72"
            aria-label="Cari jabatan"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Cari" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        )}
      </div>

      {/* Table / Tree */}
      <div className="w-full">
        <PositionTable
          positions={positions}
          isLoading={effectiveViewMode === 'table' ? isLoading : isLoadingTree}
          error={effectiveViewMode === 'table' ? error : treeError}
          pagination={pagination}
          onPageChange={setPage}
          onDelete={handleDeleteRequest}
          onRestore={handleRestore}
          treePositions={treePositions}
          expandedIds={expandedIds}
          onToggleExpand={handleToggleExpand}
          viewMode={effectiveViewMode}
        />
      </div>

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => { setIsDeleteDialogOpen(false); setDeleteTarget(null); }}
        onConfirm={handleDeleteConfirm}
        name={deleteTarget?.name || ''}
        entityLabel="jabatan"
        warning="Jabatan yang masih memiliki bawahan atau pegawai aktif tidak dapat dihapus."
        isDeleting={isDeleting}
      />
    </div>
  );
}

export default function PositionsRoute() {
  return (
    <Suspense fallback={null}>
      <PositionsGuard />
    </Suspense>
  );
}

/**
 * Route guard: list requires position:read OR position:manage; the
 * deleted-scope (Data Terhapus) mode additionally requires position:manage.
 * Forbidden is shown BEFORE any data request.
 */
function PositionsGuard() {
  const { hasPerm, hasAnyPerm } = usePermission();
  const searchParams = useSearchParams();
  const canRead = hasAnyPerm(PERM.POSITION_READ, PERM.POSITION_MANAGE);
  const scopeDeleted = searchParams.get('scope') === 'deleted';

  if (!canRead || (scopeDeleted && !hasPerm(PERM.POSITION_MANAGE))) {
    return <ForbiddenAccess />;
  }

  return <PositionsPage />;
}
