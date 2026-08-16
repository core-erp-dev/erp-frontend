'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Spinner, Alert, Button } from '@heroui/react';
import { ArrowLeft } from '@phosphor-icons/react';
import { ForbiddenAccess } from '@/components/shared/forbidden-access';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { usePositionDetail } from '@/modules/organization/positions/hooks/use-position-detail';
import { PositionForm } from '@/modules/organization/positions/components/position-form';
import { resolveEditReturn } from '@/modules/organization/positions/utils/position-navigation-utils';

export default function EditPositionPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const { hasPerm } = usePermission();

  // Hook always runs (rules-of-hooks); the enabled flag skips the data/lookup
  // request when the permission guard has not passed.
  const { position, isLoading, error } = usePositionDetail(id, hasPerm(PERM.POSITION_MANAGE));

  // Permission guard renders BEFORE any data/lookup request.
  if (!hasPerm(PERM.POSITION_MANAGE)) {
    return <ForbiddenAccess />;
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
        <Button variant="secondary" onPress={() => router.back()} className="self-start">
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
      </div>
    );
  }

  const handleSuccess = () => {
    const from = searchParams.get('from');
    const target = resolveEditReturn(from, id);
    if (target === 'back') router.back();
    else router.replace(target.replace);
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PositionForm
        mode="edit"
        initialData={position}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
