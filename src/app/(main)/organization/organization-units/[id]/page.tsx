'use client';

import { useState, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { House, ArrowLeft, PencilSimple, Trash, Plus, Eye, Copy, Check, Tray, ArrowCounterClockwise } from '@phosphor-icons/react';
import { Button, TextField, Input, Label, Breadcrumbs, BreadcrumbsItem, Spinner, Dropdown, Alert, Separator, Chip, Table } from '@heroui/react';

import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { ForbiddenAccess } from '@/components/shared/forbidden-access';
import { useOrgUnitDetail } from '@/modules/organization/organization-units/hooks/use-org-unit-detail';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { UNIT_TYPE_LABEL_ID, UNIT_TYPE_CHIP_COLOR } from '@/modules/organization/organization-units/types';

function OrganizationUnitDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { hasPerm, hasAnyPerm } = usePermission();

  const { unit, isLoading, error, deleteUnit, isDeleting, restoreUnit, isRestoring } = useOrgUnitDetail(id);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyCode = useCallback((unitId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(unitId);
    setTimeout(() => setCopiedId(null), 3000);
  }, []);

  const handleDeleteConfirm = async () => {
    const success = await deleteUnit();
    if (success) {
      setIsDeleteOpen(false);
      // Deterministic: the Detail page no longer exists — replace to the list.
      router.replace('/organization/organization-units');
    }
  };

  const handleRestore = async () => {
    await restoreUnit();
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{error || 'Unit organisasi tidak ditemukan'}</Alert.Title>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  const children = unit.children ?? [];
  const isDeletedUnit = !!unit.deletedAt;
  const canManage = hasPerm(PERM.ORGANIZATION_UNIT_MANAGE);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem>Organisasi</BreadcrumbsItem>
        <BreadcrumbsItem href="/organization/organization-units">Unit Organisasi</BreadcrumbsItem>
        <BreadcrumbsItem>Detail</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button isIconOnly variant="tertiary" onPress={() => router.back()} aria-label="Kembali">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Detail Unit Organisasi</h1>
        </div>
        <div className="flex items-center gap-2">
          {canManage && !isDeletedUnit && (
            <Dropdown>
              <Button isIconOnly variant="tertiary" aria-label="Opsi unit organisasi">
                <PencilSimple className="h-4 w-4" />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu onAction={(key) => {
                  if (key === 'edit') router.push(`/organization/organization-units/${id}/edit?from=detail`);
                  if (key === 'delete') setIsDeleteOpen(true);
                }}>
                  <Dropdown.Item id="edit" textValue="Edit">
                    <PencilSimple className="h-4 w-4 text-muted-foreground" />
                    <span>Edit</span>
                  </Dropdown.Item>
                  <Dropdown.Item id="delete" textValue="Hapus" variant="danger">
                    <Trash className="h-4 w-4 text-danger" />
                    <span className="text-danger">Hapus</span>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          )}
          {canManage && isDeletedUnit && (
            <Button
              variant="secondary"
              size="sm"
              onPress={handleRestore}
              isPending={isRestoring}
              isDisabled={isRestoring}
            >
              <ArrowCounterClockwise className="h-4 w-4" />
              Pulihkan
            </Button>
          )}
        </div>
      </div>

      {/* Informasi Unit */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Informasi Unit</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Kode Unit</Label>
            <Input value={unit.unitCode} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Nama Unit</Label>
            <Input value={unit.unitName} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Jenis Unit</Label>
            <Input value={UNIT_TYPE_LABEL_ID[unit.unitType] ?? unit.unitType} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Unit Induk</Label>
            <Input
              value={unit.parentName || '-'}
              readOnly
              aria-label={unit.parentName ? `Unit induk ${unit.parentName}` : 'Tidak memiliki unit induk'}
            />
          </TextField>
          <div className="sm:col-span-2">
            <TextField isReadOnly className="pointer-events-none w-full">
              <Label>Deskripsi</Label>
              <Input value={unit.description || '-'} readOnly />
            </TextField>
          </div>
        </div>
        {unit.parentId && unit.parentName && (
          <p className="text-sm text-muted-foreground">
            Unit Induk:{' '}
            <Link
              href={`/organization/organization-units/${unit.parentId}`}
              className="font-medium text-foreground hover:underline"
            >
              {unit.parentName}
            </Link>
          </p>
        )}
      </div>

      <Separator />

      {/* Unit Turunan */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Unit Turunan</h2>
          {canManage && !isDeletedUnit && (
            <Button variant="primary" size="sm" onPress={() => router.push(`/organization/organization-units/create?parentId=${unit.id}&from=detail`)}>
              <Plus className="h-4 w-4" />
              Tambah Unit Bawahan
            </Button>
          )}
        </div>
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Unit Turunan" className="min-w-[500px]">
              <Table.Header>
                <Table.Column id="code" isRowHeader>Kode Unit</Table.Column>
                <Table.Column id="name">Nama Unit</Table.Column>
                <Table.Column id="type">Jenis Unit</Table.Column>
                <Table.Column id="actions" aria-label="Aksi" className="text-center">{''}</Table.Column>
              </Table.Header>
              <Table.Body
                renderEmptyState={() =>
                  children.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                      <Tray className="h-8 w-8" />
                      <span className="text-sm">Tidak ada unit turunan</span>
                    </div>
                  ) : null
                }
              >
                {children.map((child) => (
                  <Table.Row key={child.id} id={child.id}>
                    <Table.Cell className="font-medium text-foreground">
                      <div className="flex items-center gap-1">
                        {child.unitCode}
                        <Button
                          isIconOnly
                          variant="ghost"
                          size="sm"
                          aria-label={`Salin kode ${child.unitCode}`}
                          onPress={() => handleCopyCode(child.id, child.unitCode)}
                        >
                          {copiedId === child.id ? (
                            <Check className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <Link
                        href={`/organization/organization-units/${child.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {child.unitName}
                      </Link>
                    </Table.Cell>
                    <Table.Cell>
                      <Chip size="sm" color={UNIT_TYPE_CHIP_COLOR[child.unitType] ?? 'default'} variant="soft">
                        {UNIT_TYPE_LABEL_ID[child.unitType] ?? child.unitType}
                      </Chip>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center justify-end gap-1">
                        {hasAnyPerm(PERM.ORGANIZATION_UNIT_READ, PERM.ORGANIZATION_UNIT_MANAGE) && (
                          <Button
                            isIconOnly
                            variant="tertiary"
                            size="sm"
                            aria-label={`Lihat ${child.unitName}`}
                            onPress={() => router.push(`/organization/organization-units/${child.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </div>

      <DeleteConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        name={unit.unitName}
        entityLabel="unit organisasi"
        warning="Unit yang masih memiliki unit bawahan atau posisi aktif tidak dapat dihapus."
        isDeleting={isDeleting}
      />
    </div>
  );
}

export default function OrganizationUnitDetailRoute() {
  return (
    <Suspense fallback={null}>
      <OrganizationUnitDetailGuard />
    </Suspense>
  );
}

/**
 * Route guard: Detail requires organization_unit:read OR organization_unit:manage.
 * Forbidden is rendered BEFORE any data request.
 */
function OrganizationUnitDetailGuard() {
  const { hasAnyPerm } = usePermission();

  if (!hasAnyPerm(PERM.ORGANIZATION_UNIT_READ, PERM.ORGANIZATION_UNIT_MANAGE)) {
    return <ForbiddenAccess />;
  }

  return <OrganizationUnitDetailPage />;
}
