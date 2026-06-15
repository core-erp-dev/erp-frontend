'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Plus, House, ArrowsClockwise, SlidersHorizontal, FunnelSimple, Check, X } from '@phosphor-icons/react';
import {
  Button,
  SearchField,
  Dropdown,
  Header,
  Label,
  Breadcrumbs,
  BreadcrumbsItem,
  toast,
} from '@heroui/react';
import type { Selection } from '@heroui/react';

import { useAuthStore } from '@/store/auth-store';
import { DataTable } from '@/modules/hr/employees/components/data-table';
import { DeleteConfirmDialog } from '@/modules/hr/employees/components/delete-confirm-dialog';
import { useEmployeeData, type SortField, type SortDir, type StatusFilter } from '@/modules/hr/employees/hooks/use-employee-data';
import { useDebounce } from '@/hooks/use-debounce';
import { flattenPositionTree } from '@/modules/hr/shared/utils/flatten-positions';
import type { CoreUser } from '@/modules/hr/employees/types';

const SORT_OPTIONS: { field: SortField; label: string; dir: SortDir }[] = [
  { field: 'fullName', label: 'Nama (A-Z)', dir: 'asc' },
  { field: 'fullName', label: 'Nama (Z-A)', dir: 'desc' },
  { field: 'createdAt', label: 'Terbaru', dir: 'desc' },
  { field: 'createdAt', label: 'Terlama', dir: 'asc' },
];

export default function EmployeePage() {
  const user = useAuthStore((s) => s.user);
  const hasPerm = (perm: string) => (user?.permissions ?? []).includes(perm);

  const {
    users,
    positions,
    isLoading,
    pagination,
    filters,
    setSearch,
    setStatus,
    setJabatanId,
    setSort,
    setPage,
    resetFilters,
    refresh,
    deleteUser,
  } = useEmployeeData();

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
      toast.success('Karyawan berhasil dinonaktifkan');
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch {
      toast.danger('Gagal menonaktifkan karyawan');
    } finally {
      setIsDeleting(false);
    }
  }, [selectedUser, deleteUser]);

  // Build flat positions list for filter dropdown
  const flatPositions = useMemo(() => flattenPositionTree(positions), [positions]);

  // Filter selection keys
  const filterSelectionKeys = useMemo(() => {
    const keys = new Set<string>();
    if (filters.status === 'active') keys.add('status:active');
    if (filters.status === 'inactive') keys.add('status:inactive');
    if (filters.jabatanId !== null) keys.add(`pos:${filters.jabatanId}`);
    return keys;
  }, [filters.status, filters.jabatanId]);

  const activeFilterCount = filterSelectionKeys.size;

  const handleFilterChange = useCallback((selection: Selection) => {
    const selected = selection instanceof Set ? selection : new Set<string>();
    let newStatus: StatusFilter = 'all';
    let newJabatanId: number | null = null;
    selected.forEach((k) => {
      const key = String(k);
      if (key === 'status:active') newStatus = 'active';
      if (key === 'status:inactive') newStatus = 'inactive';
      if (key.startsWith('pos:')) newJabatanId = Number(key.replace('pos:', ''));
    });
    setStatus(newStatus);
    setJabatanId(newJabatanId);
  }, [setStatus, setJabatanId]);

  const handleSortAction = useCallback((key: React.Key) => {
    const opt = SORT_OPTIONS[Number(key)];
    if (opt) setSort(opt.field, opt.dir);
  }, [setSort]);

  const isDefaultSort = filters.sortBy === 'fullName' && filters.sortDirection === 'asc';
  const hasActiveFilters = activeFilterCount > 0 || !isDefaultSort;

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/">
          <House className="h-4 w-4" />
        </BreadcrumbsItem>
        <BreadcrumbsItem href="/hr">HR</BreadcrumbsItem>
        <BreadcrumbsItem>Karyawan</BreadcrumbsItem>
      </Breadcrumbs>

      {/* Row 1: Title + Refresh + Tambah */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">Semua Karyawan</h1>
          <Button
            isIconOnly
            variant="tertiary"
            size="sm"
            className="pointer-events-none text-sm font-medium"
            aria-label={`Total ${pagination?.totalElements ?? 0} karyawan`}
          >
            {pagination?.totalElements ?? 0}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            isIconOnly
            variant="tertiary"
            onPress={() => refresh()}
            isDisabled={isLoading}
            aria-label="Muat ulang data karyawan"
          >
            <ArrowsClockwise className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {hasPerm('employee:create') && (
            <Link href="/hr/employees/create">
              <Button variant="primary">
                <Plus className="h-4 w-4" />
                Tambah Karyawan
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Row 2: Filter + Sort (left) | Search (right) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
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
                  <Header>Status</Header>
                  <Dropdown.Item id="status:active" textValue="Aktif">
                    <Dropdown.ItemIndicator />
                    <Label>Aktif</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="status:inactive" textValue="Tidak Aktif">
                    <Dropdown.ItemIndicator />
                    <Label>Tidak Aktif</Label>
                  </Dropdown.Item>
                </Dropdown.Section>
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

          <Dropdown>
            <Button variant="tertiary" aria-label="Urutkan">
              <FunnelSimple className="h-4 w-4" />
              Urut
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
            <Button isIconOnly variant="tertiary" aria-label="Reset filter" onPress={resetFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <SearchField
          name="search"
          value={searchInput}
          onChange={setSearchInput}
          className="w-72"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input aria-label="Cari karyawan" placeholder="Cari NIP, Nama, Email" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </div>

      {/* Table */}
      <div className="w-full">
        <DataTable
          users={users}
          isLoading={isLoading}
          pagination={pagination}
          onPageChange={setPage}
          onDelete={handleDeleteUser}
        />
      </div>

      {/* Delete Dialog (only modal remaining) */}
      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => { setIsDeleteDialogOpen(false); setSelectedUser(null); }}
        onConfirm={handleDeleteConfirm}
        userName={selectedUser?.fullName || ''}
        isDeleting={isDeleting}
      />
    </div>
  );
}
