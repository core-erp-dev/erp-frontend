'use client';

import { useState, useMemo, Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { House, ArrowLeft, DotsThreeVertical, PencilSimple, Trash } from '@phosphor-icons/react';
import { Button, TextField, Input, Label, Breadcrumbs, BreadcrumbsItem, Spinner, Dropdown, Alert, Separator } from '@heroui/react';

import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { useRoleDetail } from '@/modules/settings/hooks/use-role-detail';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import type { Permission } from '@/modules/settings/types';

const moduleLabels: Record<string, string> = {
  position: 'Position',
  user: 'User',
  role: 'Role & Permission',
  permission: 'Permission',
};

function PermissionRow({ perm }: { perm: Permission }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-foreground">{perm.description}</span>
        <span className="text-xs text-gray-400">{perm.permissionCode}</span>
      </div>
    </div>
  );
}

export default function RoleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { hasPerm } = usePermission();

  const { role, permissions, modules, isLoading, error, isDeleting, deleteRole } = useRoleDetail(id);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleDeleteConfirm = async () => {
    const success = await deleteRole();
    if (success) {
      setIsDeleteOpen(false);
      router.push('/settings/roles');
    }
  };

  // Assigned permissions per module, in the same module order as the Add/Edit Role form
  const groupedModules = useMemo(() => {
    if (!role) return [];
    const assignedCodes = new Set(role.permissions);
    return modules
      .map((module) => ({
        module,
        perms: permissions.filter((p) => p.module === module && assignedCodes.has(p.permissionCode)),
      }))
      .filter((g) => g.perms.length > 0);
  }, [role, permissions, modules]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (error || !role) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{error || 'Role not found'}</Alert.Title>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  const showDropdown = hasPerm(PERM.ROLE_MANAGE);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem>Settings</BreadcrumbsItem>
        <BreadcrumbsItem href="/settings/roles">Access Control & Roles</BreadcrumbsItem>
        <BreadcrumbsItem>{role.roleName}</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button isIconOnly variant="tertiary" onPress={() => router.back()} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">{role.roleName}</h1>
        </div>
        <div className="flex items-center gap-2">
          {showDropdown && (
            <Dropdown>
              <Button isIconOnly variant="tertiary" aria-label="Options">
                <DotsThreeVertical className="h-5 w-5" />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu onAction={(key) => {
                  if (key === 'edit') router.push(`/settings/roles/${id}/edit`);
                  if (key === 'delete') setIsDeleteOpen(true);
                }}>
                  {hasPerm(PERM.ROLE_MANAGE) && (
                    <Dropdown.Item id="edit" textValue="Edit">
                      <PencilSimple className="h-4 w-4 text-muted-foreground" />
                      <span>Edit</span>
                    </Dropdown.Item>
                  )}
                  {hasPerm(PERM.ROLE_MANAGE) && (
                    <Dropdown.Item id="delete" textValue="Delete" variant="danger">
                      <Trash className="h-4 w-4 text-danger" />
                      <span className="text-danger">Delete</span>
                    </Dropdown.Item>
                  )}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          )}
        </div>
      </div>

      {/* Role Information */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Role Information</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Code</Label>
            <Input value={role.roleCode} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Name</Label>
            <Input value={role.roleName} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Status</Label>
            <Input value={role.deletedAt ? 'Deleted' : 'Active'} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Description</Label>
            <Input value={role.description || '-'} readOnly />
          </TextField>
        </div>
      </div>

      <Separator />

      {/* Permissions */}
      <div className="relative flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Permissions</h2>
        {groupedModules.length === 0 ? (
          <p className="text-sm text-gray-400">No permissions assigned</p>
        ) : (
          groupedModules.map((group, idx) => {
            const leftCount = Math.ceil(group.perms.length / 2);
            const leftPerms = group.perms.slice(0, leftCount);
            const rightPerms = group.perms.slice(leftCount);
            return (
              <Fragment key={group.module}>
                {idx > 0 && <Separator className="w-full" />}
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    {moduleLabels[group.module] || group.module}
                  </h3>
                  <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      {leftPerms.map((perm) => <PermissionRow key={perm.id} perm={perm} />)}
                    </div>
                    <div className="flex flex-col gap-1">
                      {rightPerms.map((perm) => <PermissionRow key={perm.id} perm={perm} />)}
                    </div>
                  </div>
                </div>
              </Fragment>
            );
          })
        )}
      </div>

      <DeleteConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        name={role.roleName}
        entityLabel="role"
        warning="Role will no longer be usable after deletion."
        isDeleting={isDeleting}
      />
    </div>
  );
}
