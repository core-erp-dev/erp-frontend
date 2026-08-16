'use client';

import { Suspense, useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { ForbiddenAccess } from '@/components/shared/forbidden-access';
import { OrgUnitTable } from '@/modules/organization/organization-units/components/org-unit-table';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { useOrganizationUnitData, type SortField, type SortDir, type ScopeFilter, type ViewMode } from '@/modules/organization/organization-units/hooks/use-organization-unit-data';
import { useDebounce } from '@/hooks/use-debounce';
import type { OrganizationUnitResponse } from '@/modules/organization/organization-units/types';
import { OrganizationUnitType, UNIT_TYPE_LABEL_ID } from '@/modules/organization/organization-units/types';

const SORT_OPTIONS: { field: SortField; label: string; dir: SortDir }[] = [
  { field: 'unitName', label: 'Nama (A-Z)', dir: 'asc' },
  { field: 'unitName', label: 'Nama (Z-A)', dir: 'desc' },
  { field: 'unitCode', label: 'Kode (A-Z)', dir: 'asc' },
  { field: 'unitCode', label: 'Kode (Z-A)', dir: 'desc' },
  { field: 'createdAt', label: 'Terbaru', dir: 'desc' },
  { field: 'createdAt', label: 'Terlama', dir: 'asc' },
];

const TYPE_OPTIONS = Object.values(OrganizationUnitType);

function OrganizationUnitsPage() {
  const router = useRouter();
  const { hasPerm } = usePermission();

  const {
    units,
    isLoading,
    error,
    pagination,
    filters,
    setSearch,
    setScope,
    setType,
    setSort,
    setPage,
    setView,
    resetFilters,
    refresh,
    deleteUnit,
    restoreUnit,
    treeUnits,
    isLoadingTree,
    refreshTree,
  } = useOrganizationUnitData();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const isDeletedScope = filters.scope === 'deleted';
  const viewMode = filters.view;
  const effectiveViewMode: ViewMode = isDeletedScope ? 'table' : viewMode;

  // Local search input state
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
      const children = node.children ?? [];
      if (children.length > 0) {
        ids.push(node.id);
        ids.push(...collectExpandableIds(children));
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
    setView(mode);
    if (mode === 'tree' && expandedIds.size === 0) {
      const rootIds = new Set(treeUnits.map((p) => p.id));
      setExpandedIds(rootIds);
    }
  }, [setView, treeUnits, expandedIds.size]);

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
        <BreadcrumbsItem>Unit Organisasi</BreadcrumbsItem>
      </Breadcrumbs>

      {/* Row 1: Title + Refresh + Add */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">Unit Organisasi</h1>
          <Chip
            size="md"
            className="pointer-events-none"
            aria-label={`Total ${effectiveViewMode === 'table' ? totalItems : treeUnits.length} unit`}
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
            aria-label="Muat ulang data unit organisasi"
          >
            <ArrowsClockwise className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {!isDeletedScope && hasPerm(PERM.ORGANIZATION_UNIT_MANAGE) && (
            <Button variant="primary" onPress={() => router.push('/organization/organization-units/create')}>
              <Plus className="h-4 w-4" />
              Tambah Unit
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
              {/* Filter Dropdown */}
              <Dropdown>
                <Button variant="tertiary" aria-label="Filter menurut jenis unit">
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
                      <Header>Jenis Unit</Header>
                      {TYPE_OPTIONS.map((type) => (
                        <Dropdown.Item key={type} id={`type:${type}`} textValue={UNIT_TYPE_LABEL_ID[type]}>
                          <Dropdown.ItemIndicator />
                          <Label>{UNIT_TYPE_LABEL_ID[type]}</Label>
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Section>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>

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
                <Button isIconOnly variant="tertiary" aria-label="Atur ulang filter" onPress={resetFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </>
          )}

          {/* Scope Toggle: Data Terhapus / Data Aktif — last in row order */}
          {hasPerm(PERM.ORGANIZATION_UNIT_MANAGE) && (
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
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input aria-label="Cari unit organisasi" placeholder="Cari" />
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
          error={effectiveViewMode === 'table' ? error : null}
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
        entityLabel="unit organisasi"
        warning="Unit yang masih memiliki unit bawahan atau posisi aktif tidak dapat dihapus."
        isDeleting={isDeleting}
      />
    </div>
  );
}

export default function OrganizationUnitsRoute() {
  return (
    <Suspense fallback={null}>
      <OrganizationUnitsGuard />
    </Suspense>
  );
}

/**
 * Route guard: list requires organization_unit:read OR organization_unit:manage;
 * the deleted-scope (Data Terhapus) mode additionally requires
 * organization_unit:manage. Forbidden is shown BEFORE any data request.
 */
function OrganizationUnitsGuard() {
  const { hasPerm, hasAnyPerm } = usePermission();
  const searchParams = useSearchParams();
  const canRead = hasAnyPerm(PERM.ORGANIZATION_UNIT_READ, PERM.ORGANIZATION_UNIT_MANAGE);
  const scopeDeleted = searchParams.get('scope') === 'deleted';

  if (!canRead || (scopeDeleted && !hasPerm(PERM.ORGANIZATION_UNIT_MANAGE))) {
    return <ForbiddenAccess />;
  }

  return <OrganizationUnitsPage />;
}
