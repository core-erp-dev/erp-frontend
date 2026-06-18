'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Spinner, Alert, Button } from '@heroui/react';
import { ArrowLeft } from '@phosphor-icons/react';
import { useAuthStore } from '@/store/auth-store';
import { PositionForm } from '@/modules/hr/positions/components/position-form';
import { organizationApi } from '@/modules/hr/positions/services/organization-api';
import { findInTree } from '@/modules/hr/shared/utils/find-in-tree';
import type { PositionTree } from '@/modules/hr/positions/types';

export default function EditPositionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const user = useAuthStore((s) => s.user);
  const hasPerm = useCallback((perm: string) => (user?.permissions ?? []).includes(perm), [user?.permissions]);

  const [position, setPosition] = useState<PositionTree | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPerm('position:update')) {
      setIsLoading(false);
      return;
    }
    (async () => {
      try {
        const tree = await organizationApi.fetchPositionTree();
        const found = findInTree(tree, id);
        if (!found) setError('Jabatan tidak ditemukan');
        else setPosition(found);
      } catch {
        setError('Gagal memuat data jabatan');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id, hasPerm]);

  if (!hasPerm('position:update')) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Akses Ditolak</Alert.Title>
          </Alert.Content>
        </Alert>
        <Button variant="secondary" onPress={() => router.push('/hr/positions')}>
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
      </div>
    );
  }

  if (error || !position) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{error || 'Jabatan tidak ditemukan'}</Alert.Title>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  return (
    <PositionForm
      mode="edit"
      initialData={position}
      onSuccess={() => {
        router.push('/hr/positions');
      }}
    />
  );
}
