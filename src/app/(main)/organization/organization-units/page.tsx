'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, House, ArrowsClockwise, SlidersHorizontal, FunnelSimple, Check, X, Trash, ArrowsOutSimple, ArrowsInSimple, CheckCircle } from '@phosphor-icons/react';
import {
  Breadcrumbs,
  BreadcrumbsItem,
  Button,
  Chip,
  SearchField,
  Dropdown,
  Header,
  Label,
  Tabs,
} from '@heroui/react';
import type { Selection } from '@heroui/react';

import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { OrgUnitTable } from '@/modules/organization/organization-units/components/org-unit-table';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { useOrganizationUnitData, type SortField, type SortDir, type ScopeFilter } from '@/modules/organization/organization-units/hooks/use-organization-unit-data';
import { useDebounce } from '@/hooks/use-debounce';
import type { OrganizationUnitResponse } from '@/modules/organization/organization-units/types';
import { OrganizationUnitType, UNIT_TYPE_LABEL } from '@/modules/organization/organization-units/types';

const SORT_OPTIONS: { field: SortField; label: string; dir: SortDir }[] = [
  { field: 'unitName', label: 'Name (A-Z)', dir: 'asc' },
  { field: 'unitName', label: 'Name (Z-A)', dir: 'desc' },
  { field: 'unitCode', label: 'Code (A-Z)', dir: 'asc' },
  { field: 'unitCode', label: 'Code (Z-A)', dir: 'desc' },
  { field: 'createdAt', label: 'Newest', dir: 'desc' },
  { field: 'createdAt', label: 'Oldest', dir: 'asc' },
];

const TYPE_OPTIONS = Object.values(OrganizationUnitType);

export default function OrganizationUnitsPage() {
  const router = useRouter();
  const { hasPerm } = usePermission();

  const {
    units,
    isLoading,
    pagination,
    filters,
    setSearch,
    setScope,
    setType,
    setSort,
    setPage,
    resetFilters,
    refresh,
    deleteUnit,
    restoreUnit,
    treeUnits,
    isLoadingTree,
    refreshTree,
  } = useOrganizationUnitData();

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
  const [selectedUnit, setSelectedUnit] = useState<OrganizationUnitResponse | null>(null);

  const handleDeleteUnit = useCallback((u: OrganizationUnitResponse) => {
    setSelectedUnit(u);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedUnit) return;
    setIsDeleting(true);
    try {
      await deleteUnit(selectedUnit.id);
      setIsDeleteDialogOpen(false);
      setSelectedUnit(null);
    } catch {
      // Error toast handled by hook
    } finally {
      setIsDeleting(false);
    }
  }, [selectedUnit, deleteUnit]);

  const handleRestore = useCallback(async (u: OrganizationUnitResponse) => {
    await restoreUnit(u.id);
  }, [restoreUnit]);

  // Filter selection keys
  const filterSelectionKeys = useMemo(() => {
    const keys = new Set<string>();
    if (filters.type !== null) keys.add(`type:${filters.type}`);
    return keys;
  }, [filters.type]);

  const activeFilterCount = filterSelectionKeys.size;

  const handleFilterChange = useCallback((selection: Selection) => {
    const selected = selection instanceof Set ? selection : new Set<string>();
    let newType: string | null = null;
    selected.forEach((k) => {
      const key = String(k);
      if (key.startsWith('type:')) newType = key.replace('type:', '');
    });
    setType(newType);
  }, [setType]);

  const handleSortAction = useCallback((key: React.Key) => {
    const opt = SORT_OPTIONS[Number(key)];
    if (opt) setSort(opt.field, opt.dir);
  }, [setSort]);

  const isDefaultSort = filters.sortBy === 'unitName' && filters.sortDirection === 'asc';
  const hasActiveFilters = activeFilterCount > 0 || !isDefaultSort;

  // ── Tree expand/collapse ──
  const collectExpandableIds = useCallback((nodes: OrganizationUnitResponse[]): string[] => {
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
    const allIds = collectExpandableIds(treeUnits);
    setExpandedIds(new Set(allIds));
  }, [treeUnits, collectExpandableIds]);

  const handleCollapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const allExpanded = (() => {
    if (treeUnits.length === 0) return false;
    const expandableIds = collectExpandableIds(treeUnits);
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
      const rootIds = new Set(treeUnits.map((p) => p.id));
      setExpandedIds(rootIds);
    }
  }, [treeUnits, expandedIds.size]);

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
        <BreadcrumbsItem>Organization Units</BreadcrumbsItem>
      </Breadcrumbs>

      {/* Row 1: Title + Refresh + Add */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">Organization Units</h1>
          <Chip
            size="md"
            className="pointer-events-none"
            aria-label={`Total ${effectiveViewMode === 'table' ? totalItems : treeUnits.length} units`}
          >
            {effectiveViewMode === 'table' ? totalItems : treeUnits.length}
          </Chip>
        </div>
        <div className="flex items-center gap-2">
          <Button
            isIconOnly
            variant="tertiary"
            onPress={() => { refresh(); refreshTree(); }}
            isDisabled={isLoading || isLoadingTree}
            aria-label="Refresh organization unit data"
          >
            <ArrowsClockwise className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {!isDeletedScope && hasPerm(PERM.POSITION_CREATE) && (
            <Button variant="primary" onPress={() => router.push('/organization/organization-units/create')}>
              <Plus className="h-4 w-4" />
              Add Unit
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
              {/* Filter Dropdown */}
              <Dropdown>
                <Button variant="tertiary" aria-label="Filter by type">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filter
                  {activeFilterCount > 0 && (
                    <>
                      <span className="mx-0.5 h-4 w-px bg-border" />
                      <span className="text-sm font-medium text-foreground">{activeFilterCount}</span>
                    </>
                  )}
                </Button>
                <Dropdown.Popover className="min-w-[220px]">
                  <Dropdown.Menu
                    selectedKeys={filterSelectionKeys}
                    selectionMode="multiple"
                    onSelectionChange={handleFilterChange}
                  >
                    <Dropdown.Section>
                      <Header>Unit Type</Header>
                      {TYPE_OPTIONS.map((type) => (
                        <Dropdown.Item key={type} id={`type:${type}`} textValue={UNIT_TYPE_LABEL[type]}>
                          <Dropdown.ItemIndicator />
                          <Label>{UNIT_TYPE_LABEL[type]}</Label>
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Section>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>

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
          {hasPerm(PERM.POSITION_READ_DELETED) && (
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
              <SearchField.Input aria-label="Search organization units" placeholder="Search code or name" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        )}
      </div>

      {/* Table / Tree */}
      <div className="w-full">
        <OrgUnitTable
          units={units}
          isLoading={effectiveViewMode === 'table' ? isLoading : isLoadingTree}
          pagination={pagination}
          onPageChange={setPage}
          onDelete={handleDeleteUnit}
          onRestore={handleRestore}
          treeUnits={treeUnits}
          expandedIds={expandedIds}
          onToggleExpand={handleToggleExpand}
          viewMode={effectiveViewMode}
        />
      </div>

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => { setIsDeleteDialogOpen(false); setSelectedUnit(null); }}
        onConfirm={handleDeleteConfirm}
        name={selectedUnit?.unitName || ''}
        entityLabel="organization unit"
        warning="A unit with active child units or active positions cannot be deleted."
        isDeleting={isDeleting}
      />
    </div>
  );
}
