'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { House, ArrowLeft, DotsThreeVertical, PencilSimple, Trash, Tray } from '@phosphor-icons/react';
import { Button, TextField, Input, Label, Chip, Breadcrumbs, BreadcrumbsItem, Spinner, Dropdown, Alert, Separator, Table } from '@heroui/react';

import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { ForbiddenAccess } from '@/components/shared/forbidden-access';
import { getGenderLabel } from '@/constants/gender';
import { formatDate } from '@/components/shared/detail-field';
import { useEmployeeDetail } from '@/modules/organization/employees/hooks/use-employee-detail';
import { employeeApi } from '@/modules/organization/employees/services/employee-api';
import type { PositionOption } from '@/modules/organization/employees/types';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';

export default function EmployeeDetailRoute() {
  const { hasAnyPerm } = usePermission();
  // Guard BEFORE any data request: users without user:read|manage never fetch.
  if (!hasAnyPerm(PERM.USER_READ, PERM.USER_MANAGE)) {
    return <ForbiddenAccess />;
  }
  return <EmployeeDetailPage />;
}

function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { hasPerm, hasAnyPerm } = usePermission();

  const { employee, isLoading, error, deleteEmployee, isDeleting } = useEmployeeDetail(id);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Department lookup by position ID — same source/logic as the Add/Update Employee form
  const [departmentMap, setDepartmentMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!hasAnyPerm(PERM.POSITION_READ, PERM.POSITION_MANAGE)) return;
    let cancelled = false;
    employeeApi.getPositions()
      .then((tree) => {
        if (cancelled) return;
        const map = new Map<string, string>();
        const walk = (nodes: PositionOption[]) => {
          for (const node of nodes) {
            if (node.organizationUnit?.unitName) map.set(node.id, node.organizationUnit.unitName);
            if (node.children?.length) walk(node.children);
          }
        };
        walk(tree);
        setDepartmentMap(map);
      })
      .catch(() => {
        // Supplementary data — fail silently
      });
    return () => { cancelled = true; };
  }, [hasAnyPerm]);

  // Back with explicit fallback: deep link / refresh on Detail has no valid
  // internal history — fall back to the employee list.
  const goBack = useCallback(() => {
    if (window.history.length <= 1) {
      router.replace('/organization/employees');
    } else {
      router.back();
    }
  }, [router]);

  const handleDeleteConfirm = async () => {
    const success = await deleteEmployee();
    if (success) {
      setIsDeleteOpen(false);
      // The deleted Detail page is no longer worth revisiting — replace it.
      router.replace('/organization/employees');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{error || 'Pegawai tidak ditemukan'}</Alert.Title>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  const showDropdown = hasPerm(PERM.USER_MANAGE);
  const activePositions = (employee.positions ?? []).filter(p => p.isActive);
  // When the employee holds one or more positions, roles are not shown
  // (display-only change; role data stays untouched in the backend).
  const showRoles = activePositions.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/">
          <House className="h-4 w-4" />
        </BreadcrumbsItem>
        <BreadcrumbsItem>Organisasi</BreadcrumbsItem>
        <BreadcrumbsItem>Pegawai</BreadcrumbsItem>
        <BreadcrumbsItem>{employee.fullName}</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button isIconOnly variant="tertiary" onPress={goBack} aria-label="Kembali">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">{employee.fullName}</h1>
        </div>
        {showDropdown && (
          <Dropdown>
            <Button isIconOnly variant="tertiary" aria-label="Opsi pegawai">
              <DotsThreeVertical className="h-5 w-5" />
            </Button>
            <Dropdown.Popover>
              <Dropdown.Menu onAction={(key) => {
                if (key === 'edit') router.push(`/organization/employees/${id}/edit?from=detail`);
                if (key === 'delete') setIsDeleteOpen(true);
              }}>
                {hasPerm(PERM.USER_MANAGE) && (
                  <Dropdown.Item id="edit" textValue="Edit">
                    <div className="flex items-center gap-2">
                      <PencilSimple className="h-4 w-4 text-muted-foreground" />
                      <span>Edit</span>
                    </div>
                  </Dropdown.Item>
                )}
                {hasPerm(PERM.USER_MANAGE) && (
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

      {/* Informasi Pribadi */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Informasi Pribadi</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Nama Lengkap</Label>
            <Input value={employee.fullName} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Jenis Kelamin</Label>
            <Input value={getGenderLabel(employee.gender)} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Tanggal Lahir</Label>
            <Input value={formatDate(employee.birthDate)} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Nomor Telepon</Label>
            <Input value={employee.phoneNumber || '-'} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Email</Label>
            <Input value={employee.email} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Alamat</Label>
            <Input value={employee.address || '-'} readOnly />
          </TextField>
        </div>
      </div>

      <Separator />

      {/* Data Kepegawaian */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Data Kepegawaian</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>NIP</Label>
            <Input value={employee.nip || '-'} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Jabatan</Label>
            <Input value={employee.primaryPosition?.positionName || '-'} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Tanggal Bergabung</Label>
            <Input value={formatDate(employee.joinDate || employee.createdAt)} readOnly />
          </TextField>
          {showRoles && (
            <TextField isReadOnly className="pointer-events-none w-full">
              <Label>Role</Label>
              <Input value={employee.roles.map((r) => r.roleCode).join(', ') || '-'} readOnly />
            </TextField>
          )}
        </div>
      </div>

      <Separator />

      {/* Posisi — mirrors the Add/Update Employee position table; hidden entirely
          for positionless employees (no fake empty table) */}
      {activePositions.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">Posisi</h2>
          <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Posisi Pegawai" className="min-w-[500px]">
              <Table.Header>
                <Table.Column id="name" isRowHeader>Nama Posisi</Table.Column>
                <Table.Column id="code">Kode</Table.Column>
                <Table.Column id="department">Departemen</Table.Column>
                <Table.Column id="primary">Utama</Table.Column>
              </Table.Header>
              <Table.Body
                renderEmptyState={() =>
                  activePositions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                      <Tray className="h-8 w-8" />
                      <span className="text-sm">Belum ada posisi ditetapkan</span>
                    </div>
                  ) : null
                }
              >
                {activePositions.map((up) => (
                  <Table.Row key={up.id} id={up.id}>
                    <Table.Cell>
                      <Link
                        href={`/organization/positions/${up.positionId}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {up.positionName}
                      </Link>
                    </Table.Cell>
                    <Table.Cell className="text-muted-foreground">
                      {up.positionCode}
                    </Table.Cell>
                    <Table.Cell className="text-muted-foreground">
                      {departmentMap.get(up.positionId) || '-'}
                    </Table.Cell>
                    <Table.Cell>
                      {up.isPrimary ? (
                        <Chip size="sm" variant="soft" color="accent">Utama</Chip>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
        </div>
      )}

      <DeleteConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        name={employee.fullName}
        entityLabel="pegawai"
        warning="Pegawai tidak dapat mengakses sistem setelah dihapus."
        isDeleting={isDeleting}
      />
    </div>
  );
}
