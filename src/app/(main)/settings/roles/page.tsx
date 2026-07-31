'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, House, ArrowsClockwise, FunnelSimple, Check, X, Trash, CheckCircle } from '@phosphor-icons/react';
import {
  Breadcrumbs,
  BreadcrumbsItem,
  Button,
  Chip,
  SearchField,
  Dropdown,
  Label,
  Alert,
} from '@heroui/react';

import { usePermission } from '@/hooks/use-permission';
import { useRoleData, type SortField, type SortDir, type ScopeFilter } from '@/modules/settings/hooks/use-role-data';
import { RoleTable } from '@/modules/settings/components/role-table';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { PERM } from '@/constants/permissions';
import { useDebounce } from '@/hooks/use-debounce';
import type { Role } from '@/modules/settings/types';

const SORT_OPTIONS: { field: SortField; label: string; dir: SortDir }[] = [
  { field: 'roleCode', label: 'Code (A-Z)', dir: 'asc' },
  { field: 'roleCode', label: 'Code (Z-A)', dir: 'desc' },
  { field: 'roleName', label: 'Name (A-Z)', dir: 'asc' },
  { field: 'roleName', label: 'Name (Z-A)', dir: 'desc' },
  { field: 'createdAt', label: 'Newest', dir: 'desc' },
  { field: 'createdAt', label: 'Oldest', dir: 'asc' },
];

export default function RolesPage() {
  const router = useRouter();
  const { hasPerm } = usePermission();

  const {
    roles,
    isLoading,
    pagination,
    filters,
    setSearch,
    setScope,
    setSort,
    setPage,
    resetFilters,
    refresh,
    deleteRole,
    restoreRole,
  } = useRoleData();

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
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const handleDeleteRole = useCallback((role: Role) => {
    setSelectedRole(role);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedRole) return;
    setIsDeleting(true);
    try {
      await deleteRole(selectedRole.id);
      setIsDeleteDialogOpen(false);
      setSelectedRole(null);
    } catch {
      // Error toast handled by hook
    } finally {
      setIsDeleting(false);
    }
  }, [selectedRole, deleteRole]);

  const handleRestore = useCallback(async (id: number) => {
    await restoreRole(id);
  }, [restoreRole]);

  const handleSortAction = useCallback((key: React.Key) => {
    const opt = SORT_OPTIONS[Number(key)];
    if (opt) setSort(opt.field, opt.dir);
  }, [setSort]);

  const isDefaultSort = filters.sortBy === 'roleName' && filters.sortDirection === 'asc';
  const hasActiveFilters = !isDefaultSort;

  // ── Scope toggle ──
  const handleScopeToggle = useCallback(() => {
    const newScope: ScopeFilter = isDeletedScope ? 'current' : 'deleted';
    setScope(newScope);
  }, [isDeletedScope, setScope]);

  const totalItems = pagination?.totalElements ?? 0;

  if (!hasPerm(PERM.ROLE_READ)) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Access Denied</Alert.Title>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/">
          <House className="h-4 w-4" />
        </BreadcrumbsItem>
        <BreadcrumbsItem href="/settings">Settings</BreadcrumbsItem>
        <BreadcrumbsItem>Access Control & Roles</BreadcrumbsItem>
      </Breadcrumbs>

      {/* Row 1: Title + Refresh + Add */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">Roles</h1>
          <Chip
            size="md"
            className="pointer-events-none"
            aria-label={`Total ${totalItems} roles`}
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
            aria-label="Refresh role data"
          >
            <ArrowsClockwise className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {!isDeletedScope && hasPerm(PERM.ROLE_CREATE) && (
            <Button variant="primary" onPress={() => router.push('/settings/roles/create')}>
              <Plus className="h-4 w-4" />
              Add Role
            </Button>
          )}
        </div>
      </div>

      {/* Row 2: Sort + Scope (left) | Search (right) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
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

          {/* Scope Toggle: Deleted / Current — last in row order */}
          {hasPerm(PERM.ROLE_READ_DELETED) && (
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

        <SearchField
          name="search"
          value={searchInput}
          onChange={setSearchInput}
          className="w-72"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input aria-label="Search roles" placeholder="Search Code/Name" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </div>

      {/* Table */}
      <div className="w-full">
        <RoleTable
          roles={roles}
          isLoading={isLoading}
          pagination={pagination}
          onPageChange={setPage}
          onView={(id) => router.push(`/settings/roles/${id}`)}
          onEdit={(id) => router.push(`/settings/roles/${id}/edit`)}
          onDelete={handleDeleteRole}
          onRestore={handleRestore}
        />
      </div>

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => { setIsDeleteDialogOpen(false); setSelectedRole(null); }}
        onConfirm={handleDeleteConfirm}
        name={selectedRole?.roleName || ''}
        entityLabel="role"
        warning="The role will no longer be usable after deletion."
        isDeleting={isDeleting}
      />
    </div>
  );
}
