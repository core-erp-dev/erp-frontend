'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Spinner, Alert, Button } from '@heroui/react';
import { ArrowLeft } from '@phosphor-icons/react';
import { useAuthStore } from '@/store/auth-store';
import { EmployeeForm } from '@/modules/hr/employees/components/employee-form';
import { employeeApi } from '@/modules/hr/employees/services/employee-api';
import type { CoreUser } from '@/modules/hr/employees/types';

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const user = useAuthStore((s) => s.user);
  const hasPerm = useCallback((perm: string) => (user?.permissions ?? []).includes(perm), [user?.permissions]);

  const [employee, setEmployee] = useState<CoreUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPerm('employee:update')) {
      setIsLoading(false);
      return;
    }
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
  }, [id, hasPerm]);

  if (!hasPerm('employee:update')) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Akses Ditolak</Alert.Title>
          </Alert.Content>
        </Alert>
        <Button variant="secondary" onPress={() => router.push('/hr/employees')}>
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="md" />
        <span className="ml-3 text-sm text-gray-500">Memuat data karyawan...</span>
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

  return (
    <EmployeeForm
      mode="edit"
      initialData={employee}
      onSuccess={() => {
        router.push(`/hr/employees/${id}`);
      }}
    />
  );
}
