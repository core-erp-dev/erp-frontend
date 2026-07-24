'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, House, ArrowsClockwise, Eye, Check, X } from '@phosphor-icons/react';
import {
  Breadcrumbs,
  BreadcrumbsItem,
  Button,
  SearchField,
  Alert,
  Spinner,
} from '@heroui/react';

import { usePermission } from '@/hooks/use-permission';
import { useRoleData } from '@/modules/hr/settings/hooks/use-role-data';
import { RoleTable } from '@/modules/hr/settings/components/role-table';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { PERM } from '@/constants/permissions';
import type { Role } from '@/modules/hr/settings/types';

export default function RolesPage() {
  const router = useRouter();
  const { hasPerm } = usePermission();

  const {
    roles,
    deletedRoles,
    isLoading,
    includeDeleted,
    setIncludeDeleted,
    refresh,
    deleteRole,
    restoreRole,
  } = useRoleData();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const debouncedSearch = useCallback(
    (() => {
      let timeout: NodeJS.Timeout;
      return (value: string) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => setSearch(value), 400);
      };
    })(),
    [],
  );

  useEffect(() => {
    debouncedSearch(searchInput);
  }, [searchInput, debouncedSearch]);

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
    } finally {
      setIsDeleting(false);
    }
  }, [selectedRole, deleteRole]);

  const handleRestore = useCallback(async (id: number) => {
    await restoreRole(id);
  }, [restoreRole]);

  const filteredRoles = roles.filter((role) =>
    search
      ? role.roleCode.toLowerCase().includes(search.toLowerCase()) ||
        role.roleName.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  const displayRoles = includeDeleted
    ? [...filteredRoles, ...deletedRoles].sort((a, b) => b.id - a.id)
    : filteredRoles;

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
        <BreadcrumbsItem href="/hr">HR</BreadcrumbsItem>
        <BreadcrumbsItem>Access Control & Roles</BreadcrumbsItem>
      </Breadcrumbs>

      {/* Title + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">Roles</h1>
          <Button
            isIconOnly
            variant="tertiary"
            size="sm"
            className="pointer-events-none text-sm font-medium"
            aria-label={`Total ${displayRoles.length} roles`}
          >
            {displayRoles.length}
          </Button>
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
          {hasPerm(PERM.ROLE_CREATE) && (
            <Button variant="primary" onPress={() => router.push('/hr/settings/roles/create')}>
              <Plus className="h-4 w-4" />
              Add Role
            </Button>
          )}
        </div>
      </div>

      {/* Search + Toggle Deleted */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasPerm(PERM.ROLE_READ_DELETED) && (
            <Button
              variant="tertiary"
              aria-label="Show deleted"
              onPress={() => setIncludeDeleted(!includeDeleted)}
            >
              <Eye className="h-4 w-4" />
              Deleted
              {includeDeleted && (
                <>
                  <span className="mx-0.5 h-4 w-px bg-border" />
                  <Check className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
          {search && (
            <Button isIconOnly variant="tertiary" aria-label="Reset search" onPress={() => { setSearchInput(''); setSearch(''); }}>
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
            <SearchField.Input aria-label="Search roles" placeholder="Search Code/Name" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="md" />
        </div>
      ) : (
        <RoleTable
          roles={displayRoles}
          includeDeleted={includeDeleted}
          onView={(id) => router.push(`/hr/settings/roles/${id}`)}
          onEdit={(id) => router.push(`/hr/settings/roles/${id}/edit`)}
          onDelete={handleDeleteRole}
          onRestore={handleRestore}
        />
      )}

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
