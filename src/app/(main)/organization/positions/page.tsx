'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, House, ArrowsClockwise, FunnelSimple, Check, X, Eye, ArrowsOutSimple, ArrowsInSimple } from '@phosphor-icons/react';
import {
  Breadcrumbs,
  BreadcrumbsItem,
  Button,
  SearchField,
  Dropdown,
  Label,
  Tabs,
  toast,
} from '@heroui/react';

import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { PositionTable } from '@/modules/organization/positions/components/position-table';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { usePositionData, type SortField, type SortDir } from '@/modules/organization/positions/hooks/use-position-data';
import { organizationApi } from '@/modules/organization/positions/services/organization-api';
import type { PositionTree } from '@/modules/organization/positions/types';
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
    pagination,
    isLoading,
    filters,
    setSearch,
    setIncludeDeleted,
    setSort,
    setPage,
    resetFilters,
    refreshTable,
    deletePosition,
    treePositions,
    isLoadingTree,
    refreshTree,
  } = usePositionData();

  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Search
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [lastSearched, setLastSearched] = useState('');
  if (debouncedSearch !== lastSearched) {
    setLastSearched(debouncedSearch);
    setSearch(debouncedSearch);
  }

  // Delete dialog
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleDeleteRequest = useCallback((id: string, name: string) => {
    setDeleteTarget({ id, name });
    setIsDeleteOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deletePosition(deleteTarget.id);
      setIsDeleteOpen(false);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, deletePosition]);

  const handleRestoreRequest = useCallback(async (id: string, name: string) => {
    try {
      await organizationApi.restorePosition(id);
      toast.success(`Position "${name}" restored successfully`);
      refreshTable();
      refreshTree();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to restore position';
      toast.danger(msg);
    }
  }, [refreshTable, refreshTree]);

  // Expand/collapse for tree view
  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Collect all node IDs that have children (expandable)
  const collectExpandableIds = useCallback((nodes: PositionTree[]): string[] => {
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

  // Check if all expandable nodes are expanded
  const allExpanded = (() => {
    if (treePositions.length === 0) return false;
    const expandableIds = collectExpandableIds(treePositions);
    return expandableIds.length > 0 && expandableIds.every((id) => expandedIds.has(id));
  })();

  // Auto-expand roots when switching to tree view
  const handleViewModeChange = useCallback((mode: 'table' | 'tree') => {
    setViewMode(mode);
    if (mode === 'tree' && expandedIds.size === 0) {
      const rootIds = new Set(treePositions.map((p) => p.id));
      setExpandedIds(rootIds);
    }
  }, [treePositions, expandedIds.size]);

  // Sort state
  const handleSortAction = useCallback((key: React.Key) => {
    const opt = SORT_OPTIONS[Number(key)];
    if (opt) setSort(opt.field, opt.dir);
  }, [setSort]);

  const isDefaultSort = filters.sortBy === 'positionName' && filters.sortDirection === 'asc';
  const hasActiveFilters = !isDefaultSort || filters.includeDeleted;

  const totalItems = pagination?.totalElements ?? 0;

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem>Organization</BreadcrumbsItem>
        <BreadcrumbsItem>Position Structure</BreadcrumbsItem>
      </Breadcrumbs>

      {/* Row 1: Title + Refresh + Add */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">Position Structure</h1>
          <Button
            isIconOnly
            variant="tertiary"
            size="sm"
            className="pointer-events-none text-sm font-medium"
            aria-label={`Total ${viewMode === 'table' ? totalItems : treePositions.length} positions`}
          >
            {viewMode === 'table' ? totalItems : treePositions.length}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {/* Refresh */}
          <Button
            isIconOnly
            variant="tertiary"
            onPress={() => { refreshTable(); refreshTree(); }}
            isDisabled={isLoading || isLoadingTree}
            aria-label="Refresh"
          >
            <ArrowsClockwise className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          {hasPerm(PERM.POSITION_CREATE) && (
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
          {/* View Switcher — HeroUI Tabs */}
          <Tabs
            selectedKey={viewMode}
            onSelectionChange={(key) => handleViewModeChange(key as 'table' | 'tree')}
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label="View">
                <Tabs.Tab id="table">Table<Tabs.Indicator /></Tabs.Tab>
                <Tabs.Tab id="tree">Tree<Tabs.Indicator /></Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>

          {viewMode === 'tree' && (
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

          {viewMode === 'table' && (
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

              {/* Toggle: Show Deleted */}
              {hasPerm(PERM.POSITION_READ_DELETED) && (
                <Button variant="tertiary" aria-label="Show deleted" onPress={() => setIncludeDeleted(!filters.includeDeleted)}>
                  <Eye className="h-4 w-4" />
                  Deleted
                  {filters.includeDeleted && (
                    <>
                      <span className="mx-0.5 h-4 w-px bg-border" />
                      <Check className="h-4 w-4" />
                    </>
                  )}
                </Button>
              )}

              {/* Reset */}
              {hasActiveFilters && (
                <Button isIconOnly variant="tertiary" aria-label="Reset filters" onPress={resetFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>

        {viewMode === 'table' && (
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
          pagination={pagination}
          onPageChange={setPage}
          treePositions={treePositions}
          expandedIds={expandedIds}
          onToggleExpand={handleToggleExpand}
          isLoading={viewMode === 'table' ? isLoading : isLoadingTree}
          viewMode={viewMode}
          onDelete={handleDeleteRequest}
          onRestore={handleRestoreRequest}
        />
      </div>

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => { setIsDeleteOpen(false); setDeleteTarget(null); }}
        onConfirm={handleDeleteConfirm}
        name={deleteTarget?.name || ''}
        isDeleting={isDeleting}
        entityLabel="position"
        warning="A position with active subordinates or employees cannot be deleted."
      />
    </div>
  );
}
