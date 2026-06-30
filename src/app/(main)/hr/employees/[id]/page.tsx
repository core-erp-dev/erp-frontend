'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { House, ArrowLeft, DotsThreeVertical, PencilSimple, Trash, MedalMilitary, Briefcase } from '@phosphor-icons/react';
import { Button, Breadcrumbs, BreadcrumbsItem, Spinner, Dropdown, Alert, Surface, Badge, toast } from '@heroui/react';

import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { getGenderLabel } from '@/constants/gender';
import { useEmployeeDetail } from '@/modules/hr/employees/hooks/use-employee-detail';
import { employeeApi } from '@/modules/hr/employees/services/employee-api';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { hasPerm } = usePermission();

  const { employee, isLoading, error } = useEmployeeDetail(id);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await employeeApi.deleteUser(id);
      toast.success('Karyawan berhasil dihapus');
      setIsDeleteOpen(false);
      router.push('/hr/employees');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus karyawan';
      toast.danger(msg);
    } finally {
      setIsDeleting(false);
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
            <Alert.Title>{error || 'Karyawan tidak ditemukan'}</Alert.Title>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  const pos = employee.primaryPosition;
  const showDropdown = hasPerm(PERM.EMPLOYEE_UPDATE) || hasPerm(PERM.EMPLOYEE_DELETE);

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/">
          <House className="h-4 w-4" />
        </BreadcrumbsItem>
        <BreadcrumbsItem href="/hr">HR</BreadcrumbsItem>
        <BreadcrumbsItem href="/hr/employees">Karyawan</BreadcrumbsItem>
        <BreadcrumbsItem>{employee.fullName}</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button isIconOnly variant="tertiary" onPress={() => router.back()} aria-label="Kembali">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">{employee.fullName}</h1>
        </div>
        {showDropdown && (
          <Dropdown>
            <Button isIconOnly variant="tertiary" aria-label="Opsi karyawan">
              <DotsThreeVertical className="h-5 w-5" />
            </Button>
            <Dropdown.Popover>
              <Dropdown.Menu onAction={(key) => {
                if (key === 'edit') router.push(`/hr/employees/${id}/edit`);
                if (key === 'delete') setIsDeleteOpen(true);
              }}>
                {hasPerm(PERM.EMPLOYEE_UPDATE) && (
                  <Dropdown.Item id="edit" textValue="Edit">
                    <div className="flex items-center gap-2">
                      <PencilSimple className="h-4 w-4 text-muted-foreground" />
                      <span>Edit</span>
                    </div>
                  </Dropdown.Item>
                )}
                {hasPerm(PERM.EMPLOYEE_DELETE) && (
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
      <Surface className="rounded-3xl p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">Informasi Pribadi</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Nama Lengkap" value={employee.fullName} />
          <Field label="Jenis Kelamin" value={getGenderLabel(employee.gender)} />
          <Field label="Tanggal Lahir" value={employee.birthDate ? formatDate(employee.birthDate) : '-'} />
          <Field label="No. Telepon" value={employee.phoneNumber || '-'} />
          <Field label="Email" value={employee.email} />
          <Field label="Alamat" value={employee.address || '-'} />
        </div>
      </Surface>

      {/* Data Kepegawaian */}
      <Surface className="rounded-3xl p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">Data Kepegawaian</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="NIP" value={employee.nip || '-'} />
          <Field label="Jabatan" value={pos?.positionName || '-'} />
          <Field label="Tanggal Bergabung" value={formatDate(employee.joinDate || employee.createdAt)} />
          <Field label="Role" value={employee.roles.map((r) => r.roleCode).join(', ') || '-'} />
        </div>
      </Surface>

      {/* Daftar Jabatan */}
      <Surface className="rounded-3xl p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">Daftar Jabatan</h2>
        {(() => {
          const activePositions = (employee.positions ?? []).filter(p => p.isActive);
          if (activePositions.length === 0) {
            return <p className="text-sm text-gray-400">Belum memiliki jabatan</p>;
          }
          return (
            <div className="space-y-2">
              {activePositions.map(up => (
                <div key={up.id} className="flex items-center justify-between rounded-xl bg-surface-secondary px-4 py-3">
                  <div className="flex items-center gap-3">
                    {up.isPrimary
                      ? <MedalMilitary className="h-5 w-5 text-amber-500" />
                      : <Briefcase className="h-5 w-5 text-muted-foreground" />
                    }
                    <div>
                      <span className="font-medium text-foreground">{up.positionName}</span>
                      <span className="ml-2 text-xs text-gray-400">{up.positionCode}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={up.isPrimary ? 'primary' : 'secondary'} size="sm">
                      {up.isPrimary ? 'Utama' : 'Rangkap'}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {formatDate(up.startDate)}
                      {up.endDate ? ` · s/d ${formatDate(up.endDate)}` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </Surface>

      <DeleteConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        name={employee.fullName}
        entityLabel="karyawan"
        warning="Karyawan tidak akan bisa mengakses sistem setelah dihapus."
        isDeleting={isDeleting}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
