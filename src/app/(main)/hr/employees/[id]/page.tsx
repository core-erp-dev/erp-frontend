'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { House, ArrowLeft, PencilSimple } from '@phosphor-icons/react';
import { Button, Breadcrumbs, BreadcrumbsItem, Spinner } from '@heroui/react';

import { useAuthStore } from '@/store/auth-store';
import { employeeApi } from '@/modules/hr/employees/services/employee-api';
import type { CoreUser } from '@/modules/hr/employees/types';

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const user = useAuthStore((s) => s.user);
  const hasPerm = (perm: string) => (user?.permissions ?? []).includes(perm);

  const [employee, setEmployee] = useState<CoreUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await employeeApi.getUserById(id);
        setEmployee(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Gagal memuat data karyawan';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="md" />
        <span className="ml-3 text-sm text-gray-500">Memuat profil karyawan...</span>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error || 'Karyawan tidak ditemukan'}
        </div>
      </div>
    );
  }

  const pos = employee.primaryPosition;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
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
          <Button
            isIconOnly
            variant="tertiary"
            onPress={() => router.push('/hr/employees')}
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Profil Karyawan</h1>
        </div>
        {hasPerm('employee:update') && (
          <Button
            variant="primary"
            onPress={() => router.push(`/hr/employees/${id}/edit`)}
          >
            <PencilSimple className="h-4 w-4" />
            Edit
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-background p-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Nama Lengkap" value={employee.fullName} />
          <Field label="Email" value={employee.email} />
          <Field label="NIP" value={employee.nip || '-'} />
          <Field
            label="Status"
            value={
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  employee.isActive
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {employee.isActive ? 'Aktif' : 'Nonaktif'}
              </span>
            }
          />
          <Field label="Jabatan" value={pos?.positionName || '-'} />
          <Field label="Kode Jabatan" value={pos?.positionCode || '-'} />
          <Field label="Role" value={employee.roles.map((r) => r.roleCode).join(', ') || '-'} />
          <Field label="Bergabung" value={formatDate(employee.joinDate || employee.createdAt)} />
          <Field label="No. Telepon" value={employee.phoneNumber || '-'} />
          <Field label="Jenis Kelamin" value={employee.gender === 'M' ? 'Laki-laki' : employee.gender === 'F' ? 'Perempuan' : '-'} />
          <Field label="Tanggal Lahir" value={employee.birthDate ? formatDate(employee.birthDate) : '-'} />
          <Field label="Alamat" value={employee.address || '-'} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
