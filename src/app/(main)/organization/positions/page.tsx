'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { PositionTable } from '@/modules/organization/positions/components/position-table';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { usePositionData, type SortField, type SortDir, type ScopeFilter } from '@/modules/organization/positions/hooks/use-position-data';
import { useDebounce } from '@/hooks/use-debounce';

const SORT_OPTIONS: { field: SortField; label: string; dir: SortDir }[] = [
  { field: 'positionName', label: 'Name (A-Z)', dir: 'asc' },
  { field: 'positionName', label: 'Name (Z-A)', dir: 'desc' },
  { field: 'positionCode', label: 'Code (A-Z)', dir: 'asc' },
  { field: 'positionCode', label: 'Code (Z-A)', dir: 'desc' },
  { field: 'positionLevel', label: 'Level (Lowest)', dir: 'asc' },
  { field: 'positionLevel', label: 'Level (Highest)', dir: 'desc' },
];

export default function PositionsPage() {
  const router = useRouter();
  const { hasPerm } = usePermission();

  const {
    positions,
    isLoading,
    pagination,
    filters,
    setSearch,
    setScope,
    setSort,
    setPage,
    resetFilters,
    refreshTable,
    deletePosition,
    restorePosition,
    treePositions,
    isLoadingTree,
    refreshTree,
  } = usePositionData();

  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const isDeletedScope = filters.scope === 'deleted';

  // Local search input state
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [lastSearched, setLastSearched] = useState('');
  if (debouncedSearch !== lastSearched) {
    setLastSearched(debouncedSearch);
    setSearch(debouncedSearch);
  }

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

  const handleRestore = useCallback(async (id: string, name: string) => {
    await restorePosition(id);
  }, [restorePosition]);

  // Sort state
  const isDefaultSort = filters.sortBy === 'positionName' && filters.sortDirection === 'asc';
  const hasActiveFilters = !isDefaultSort;

  const handleSortAction = useCallback((key: React.Key) => {
    const opt = SORT_OPTIONS[Number(key)];
    if (opt) setSort(opt.field, opt.dir);
  }, [setSort]);

  // ── Tree expand/collapse ──
  const collectExpandableIds = useCallback((nodes: typeof treePositions): string[] => {
    const ids: string[] = [];
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        ids.push(node.id);
        ids.push(...collectExpandableIds(node.children));
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
    setViewMode(mode);
    if (mode === 'tree' && expandedIds.size === 0) {
      const rootIds = new Set(treePositions.map((p) => p.id));
      setExpandedIds(rootIds);
    }
  }, [treePositions, expandedIds.size]);

  // ── Scope toggle ──
  const handleScopeToggle = useCallback(() => {
    const newScope: ScopeFilter = isDeletedScope ? 'current' : 'deleted';
    setScope(newScope);
    // Deleted scope forces table view
    if (newScope === 'deleted') {
      setViewMode('table');
    }
  }, [isDeletedScope, setScope]);

  const totalItems = pagination?.totalElements ?? 0;
  const effectiveViewMode = isDeletedScope ? 'table' : viewMode;

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/">
          <House className="h-4 w-4" />
        </BreadcrumbsItem>
        <BreadcrumbsItem>Organization</BreadcrumbsItem>
        <BreadcrumbsItem>Position Structure</BreadcrumbsItem>
      </Breadcrumbs>

      {/* Row 1: Title + Refresh + Add */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">Position Structure</h1>
          <Chip
            size="md"
            className="pointer-events-none"
            aria-label={`Total ${effectiveViewMode === 'table' ? totalItems : treePositions.length} positions`}
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
            aria-label="Refresh position data"
          >
            <ArrowsClockwise className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {!isDeletedScope && hasPerm(PERM.POSITION_MANAGE) && (
            <Button variant="primary" onPress={() => router.push('/organization/positions/create')}>
              <Plus className="h-4 w-4" />
              Add Position
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
                <Tabs.List aria-label="View">
                  <Tabs.Tab id="table">Table<Tabs.Indicator /></Tabs.Tab>
                  <Tabs.Tab id="tree">Tree<Tabs.Indicator /></Tabs.Tab>
                </Tabs.List>
              </Tabs.ListContainer>
            </Tabs>
          )}

          {effectiveViewMode === 'tree' && !isDeletedScope && (
            <Button
              variant="tertiary"
              onPress={allExpanded ? handleCollapseAll : handleExpandAll}
              aria-label={allExpanded ? 'Collapse all' : 'Expand all'}
            >
              {allExpanded ? (
                <ArrowsInSimple className="h-4 w-4" />
              ) : (
                <ArrowsOutSimple className="h-4 w-4" />
              )}
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </Button>
          )}

          {effectiveViewMode === 'table' && (
            <>
              {/* Sort Dropdown */}
              <Dropdown>
                <Button variant="tertiary" aria-label="Sort">
                  <FunnelSimple className="h-4 w-4" />
                  Sort
                  {!isDefaultSort && (
                    <>
                      <span className="mx-0.5 h-4 w-px bg-border" />
                      <Check className="h-4 w-4" />
                    </>
                  )}
                </Button>
                <Dropdown.Popover>
                  <Dropdown.Menu onAction={handleSortAction}>
                    {SORT_OPTIONS.map((opt, i) => (
                      <Dropdown.Item key={i} id={String(i)} textValue={opt.label}>
                        <Label>{opt.label}</Label>
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>

              {hasActiveFilters && (
                <Button isIconOnly variant="tertiary" aria-label="Reset filters" onPress={resetFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </>
          )}

          {/* Scope Toggle: Deleted / Current — last in row order */}
          {hasPerm(PERM.POSITION_MANAGE) && (
            <Button variant="tertiary" aria-label={isDeletedScope ? 'Show current' : 'Show deleted'} onPress={handleScopeToggle}>
              {isDeletedScope ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Trash className="h-4 w-4" />
              )}
              {isDeletedScope ? 'Current' : 'Deleted'}
            </Button>
          )}
        </div>

        {effectiveViewMode === 'table' && (
          <SearchField
            name="search"
            value={searchInput}
            onChange={setSearchInput}
            className="w-72"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input aria-label="Search positions" placeholder="Search code or name" />
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
        entityLabel="position"
        warning="A position with active subordinates or employees cannot be deleted."
        isDeleting={isDeleting}
      />
    </div>
  );
}
