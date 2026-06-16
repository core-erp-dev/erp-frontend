'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from '@heroui/react';
import { Spinner } from '@heroui/react';
import { PositionForm } from '@/modules/hr/hierarchy/components/position-form';
import { organizationApi } from '@/modules/hr/hierarchy/services/organization-api';
import type { PositionTree } from '@/modules/hr/hierarchy/types';

export default function EditPositionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [position, setPosition] = useState<PositionTree | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Fetch tree and find the position by ID
        const tree = await organizationApi.fetchPositionTree();
        const found = findInTree(tree, id);
        if (!found) {
          setError('Jabatan tidak ditemukan');
        } else {
          setPosition(found);
        }
      } catch {
        setError('Gagal memuat data jabatan');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (error || !position) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error || 'Jabatan tidak ditemukan'}
        </div>
      </div>
    );
  }

  return (
    <PositionForm
      mode="edit"
      initialData={position}
      onSuccess={() => {
        toast.success('Jabatan berhasil diperbarui');
        router.push('/hr/positions');
      }}
    />
  );
}

function findInTree(tree: PositionTree[], id: string): PositionTree | null {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children.length > 0) {
      const found = findInTree(node.children, id);
      if (found) return found;
    }
  }
  return null;
}
