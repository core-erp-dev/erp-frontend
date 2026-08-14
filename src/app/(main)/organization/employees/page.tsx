'use client';

import { Suspense, useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, House, ArrowsClockwise, SlidersHorizontal, FunnelSimple, Check, X, Trash, CheckCircle } from '@phosphor-icons/react';
import {
  Alert,
  Breadcrumbs,
  BreadcrumbsItem,
  Button,
  Chip,
  SearchField,
  Dropdown,
  Header,
  Label,
} from '@heroui/react';
import type { Selection } from '@heroui/react';

import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { DataTable } from '@/modules/organization/employees/components/data-table';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { useEmployeeData, type SortField, type SortDir, type ScopeFilter } from '@/modules/organization/employees/hooks/use-employee-data';
import { useDebounce } from '@/hooks/use-debounce';
import { flattenPositionTree } from '@/modules/organization/shared/utils/flatten-positions';
import type { CoreUser } from '@/modules/organization/employees/types';

const SORT_OPTIONS: { field: SortField; label: string; dir: SortDir }[] = [
  { field: 'fullName', label: 'Nama (A-Z)', dir: 'asc' },
  { field: 'fullName', label: 'Nama (Z-A)', dir: 'desc' },
  { field: 'createdAt', label: 'Terbaru', dir: 'desc' },
  { field: 'createdAt', label: 'Terlama', dir: 'asc' },
];

function EmployeeListPage() {
  const router = useRouter();
  const { hasPerm } = usePermission();

  const {
    users,
    positions,
    isLoading,
    error,
    pagination,
    filters,
    setSearch,
    setScope,
    setPositionId,
    setSort,
    setPage,
    resetFilters,
    refresh,
    deleteUser,
    restoreUser,
  } = useEmployeeData();

  const isDeletedScope = filters.scope === 'deleted';

  // Local search input state — debounced, then pushed to the URL search params.
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebounce(searchInput, 400);
  // Push the debounced value to the URL when it differs from what the URL holds.
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      setSearch(debouncedSearch);
    }
  }, [debouncedSearch, filters.search, setSearch]);
  // Follow external URL changes (deep link / Back / forward) back into the input.
  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CoreUser | null>(null);

  const handleDeleteUser = useCallback((u: CoreUser) => {
    setSelectedUser(u);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedUser) return;
    setIsDeleting(true);
    try {
      await deleteUser(selectedUser.id);
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch {
      // Error toast handled by hook
    } finally {
      setIsDeleting(false);
    }
  }, [selectedUser, deleteUser]);

  const handleRestore = useCallback(async (u: CoreUser) => {
    await restoreUser(u.id);
  }, [restoreUser]);

  // Build flat positions list for filter dropdown
  const flatPositions = useMemo(() => flattenPositionTree(positions), [positions]);

  // Filter selection keys
  const filterSelectionKeys = useMemo(() => {
    const keys = new Set<string>();
    if (filters.positionId !== null) keys.add(`pos:${filters.positionId}`);
    return keys;
  }, [filters.positionId]);

  const activeFilterCount = filterSelectionKeys.size;

  const handleFilterChange = useCallback((selection: Selection) => {
    const selected = selection instanceof Set ? selection : new Set<string>();
    let newPositionId: string | null = null;
    selected.forEach((k) => {
      const key = String(k);
      if (key.startsWith('pos:')) newPositionId = key.replace('pos:', '');
    });
    setPositionId(newPositionId);
  }, [setPositionId]);

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

  const isDefaultSort = filters.sortBy === 'fullName' && filters.sortDirection === 'asc';
  const hasActiveFilters = activeFilterCount > 0 || !isDefaultSort;

  // ── Scope toggle ──
  const handleScopeToggle = useCallback(() => {
    const newScope: ScopeFilter = isDeletedScope ? 'current' : 'deleted';
    setScope(newScope);
  }, [isDeletedScope, setScope]);

  const totalItems = pagination?.totalElements ?? 0;

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/">
          <House className="h-4 w-4" />
        </BreadcrumbsItem>
        <BreadcrumbsItem>Organisasi</BreadcrumbsItem>
        <BreadcrumbsItem>Pegawai</BreadcrumbsItem>
      </Breadcrumbs>

      {/* Row 1: Title + Refresh + Add */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">Daftar Pegawai</h1>
          <Chip
            size="md"
            className="pointer-events-none"
            aria-label={`Total ${totalItems} pegawai`}
          >
            {totalItems}
          </Chip>
        </div>
        <div className="flex items-center gap-2">
          <Button
            isIconOnly
            variant="tertiary"
            onPress={() => refresh()}
            isDisabled={isLoading}
            aria-label="Muat ulang data pegawai"
          >
            <ArrowsClockwise className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {!isDeletedScope && hasPerm(PERM.USER_MANAGE) && (
            <Button variant="primary" onPress={() => router.push('/organization/employees/create')}>
              <Plus className="h-4 w-4" />
              Tambah Pegawai
            </Button>
          )}
        </div>
      </div>

      {/* Row 2: Filter + Sort + Scope (left) | Search (right) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Filter Dropdown */}
          <Dropdown>
            <Button variant="tertiary" aria-label="Filter">
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
                  <Header>Jabatan</Header>
                  {flatPositions.map((pos) => (
                    <Dropdown.Item key={pos.id} id={`pos:${pos.id}`} textValue={pos.positionName}>
                      <Dropdown.ItemIndicator />
                      <Label>{pos.positionName}</Label>
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
            <Button isIconOnly variant="tertiary" aria-label="Reset filter" onPress={resetFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}

          {/* Scope Toggle: Data Terhapus / Aktif — last in row order */}
          {hasPerm(PERM.USER_MANAGE) && (
            <Button variant="tertiary" aria-label={isDeletedScope ? 'Tampilkan data aktif' : 'Tampilkan data terhapus'} onPress={handleScopeToggle}>
              {isDeletedScope ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Trash className="h-4 w-4" />
              )}
              {isDeletedScope ? 'Aktif' : 'Data Terhapus'}
            </Button>
          )}
        </div>

        <SearchField
          name="search"
          value={searchInput}
          onChange={setSearchInput}
          className="w-72"
          aria-label="Cari pegawai"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Cari" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </div>

      {/* Failed request — explicit error state, never a fake empty table */}
      {error && <Alert status="danger">{error}</Alert>}

      {/* Table */}
      <div className="w-full">
        <DataTable
          users={users}
          isLoading={isLoading}
          error={error}
          pagination={pagination}
          onPageChange={setPage}
          onDelete={handleDeleteUser}
          onRestore={handleRestore}
        />
      </div>

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => { setIsDeleteDialogOpen(false); setSelectedUser(null); }}
        onConfirm={handleDeleteConfirm}
        name={selectedUser?.fullName || ''}
        entityLabel="pegawai"
        warning="Pegawai tidak dapat mengakses sistem setelah dihapus."
        isDeleting={isDeleting}
      />
    </div>
  );
}

export default function EmployeePage() {
  return (
    <Suspense fallback={null}>
      <EmployeeListPage />
    </Suspense>
  );
}
