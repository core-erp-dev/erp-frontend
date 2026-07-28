'use client';

import { useParams, useRouter } from 'next/navigation';
import { Spinner, Alert, Button } from '@heroui/react';
import { ArrowLeft } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { usePositionDetail } from '@/modules/organization/positions/hooks/use-position-detail';
import { PositionForm } from '@/modules/organization/positions/components/position-form';

export default function EditPositionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { hasPerm } = usePermission();

  const { position, isLoading, error } = usePositionDetail(id);

  if (!hasPerm(PERM.POSITION_UPDATE)) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Access Denied</Alert.Title>
          </Alert.Content>
        </Alert>
        <Button variant="secondary" onPress={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Back
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
            <Alert.Title>{error || 'Position not found'}</Alert.Title>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PositionForm
        mode="edit"
        initialData={position}
        onSuccess={() => {
          router.push('/organization/positions');
        }}
      />
    </div>
  );
}
