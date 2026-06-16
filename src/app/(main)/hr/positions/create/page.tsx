'use client';

import { useRouter } from 'next/navigation';
import { toast } from '@heroui/react';
import { PositionForm } from '@/modules/hr/hierarchy/components/position-form';

export default function CreatePositionPage() {
  const router = useRouter();

  return (
    <PositionForm
      mode="create"
      onSuccess={() => {
        toast.success('Jabatan berhasil ditambahkan');
        router.push('/hr/positions');
      }}
    />
  );
}
