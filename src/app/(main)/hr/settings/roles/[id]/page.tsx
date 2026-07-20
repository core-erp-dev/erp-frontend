'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { House, ArrowLeft, DotsThreeVertical, PencilSimple, Trash } from '@phosphor-icons/react';
import { Button, Breadcrumbs, BreadcrumbsItem, Spinner, Dropdown, Alert, Surface } from '@heroui/react';

import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { useRoleDetail } from '@/modules/hr/settings/hooks/use-role-detail';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';

const moduleLabels: Record<string, string> = {
  position: 'Jabatan',
  user: 'Pengguna',
  role: 'Role & Permission',
  permission: 'Permission',
};

export default function RoleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { hasPerm } = usePermission();

  const { role, permissions, isLoading, error, isDeleting, deleteRole } = useRoleDetail(id);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleDeleteConfirm = async () => {
    const success = await deleteRole();
    if (success) {
      setIsDeleteOpen(false);
      router.push('/hr/settings/roles');
    }
  };

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
            <Alert.Title>{error || 'Role tidak ditemukan'}</Alert.Title>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  const showDropdown = hasPerm(PERM.ROLE_UPDATE) || hasPerm(PERM.ROLE_DELETE);

  const groupedPermissions = role.permissions.reduce(
    (acc, permCode) => {
      const [mod] = permCode.split(':');
      if (!acc[mod]) acc[mod] = [];
      acc[mod].push(permCode);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/">
          <House className="h-4 w-4" />
        </BreadcrumbsItem>
        <BreadcrumbsItem href="/hr">HR</BreadcrumbsItem>
        <BreadcrumbsItem href="/hr/settings/roles">Hak Akses & Role</BreadcrumbsItem>
        <BreadcrumbsItem>{role.roleName}</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button isIconOnly variant="tertiary" onPress={() => router.back()} aria-label="Kembali">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">{role.roleName}</h1>
        </div>
        {showDropdown && (
          <Dropdown>
            <Button isIconOnly variant="tertiary" aria-label="Opsi role">
              <DotsThreeVertical className="h-5 w-5" />
            </Button>
            <Dropdown.Popover>
              <Dropdown.Menu onAction={(key) => {
                if (key === 'edit') router.push(`/hr/settings/roles/${id}/edit`);
                if (key === 'delete') setIsDeleteOpen(true);
              }}>
                {hasPerm(PERM.ROLE_UPDATE) && (
                  <Dropdown.Item id="edit" textValue="Edit">
                    <div className="flex items-center gap-2">
                      <PencilSimple className="h-4 w-4 text-muted-foreground" />
                      <span>Edit</span>
                    </div>
                  </Dropdown.Item>
                )}
                {hasPerm(PERM.ROLE_DELETE) && (
                  <Dropdown.Item id="delete" textValue="Hapus" variant="danger">
                    <div className="flex items-center gap-2 text-danger">
                      <Trash className="h-4 w-4" />
                      <span>Hapus</span>
                    </div>
                  </Dropdown.Item>
                )}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        )}
      </div>

      {/* Informasi Role */}
      <Surface className="rounded-3xl p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
          Informasi Role
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Kode Role</p>
            <p className="text-sm font-medium text-foreground">{role.roleCode}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Nama Role</p>
            <p className="text-sm font-medium text-foreground">{role.roleName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Deskripsi</p>
            <p className="text-sm text-foreground">{role.description || '-'}</p>
          </div>
        </div>
      </Surface>

      {/* Permissions */}
      <Surface className="rounded-3xl p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
          Permissions
        </h2>
        {role.permissions.length === 0 ? (
          <p className="text-sm text-gray-400">Tidak ada permission</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedPermissions).map(([module, perms]) => (
              <div key={module}>
                <h3 className="mb-2 font-medium text-foreground">
                  {moduleLabels[module] || module}
                </h3>
                <div className="space-y-1">
                  {perms.map((perm) => {
                    const permDesc = permissions.find((p) => p.permissionCode === perm);
                    return (
                      <div key={perm} className="flex items-center gap-2 text-sm">
                        <div className="h-1 w-1 rounded-full bg-foreground/20" />
                        <span className="text-foreground">{permDesc?.description || perm}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Surface>

      <DeleteConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        name={role.roleName}
        entityLabel="role"
        warning="Role tidak akan bisa digunakan setelah dihapus."
        isDeleting={isDeleting}
      />
    </div>
  );
}