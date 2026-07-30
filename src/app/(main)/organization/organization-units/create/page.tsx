'use client';

import { useRouter } from 'next/navigation';
import { Alert, Button } from '@heroui/react';
import { ArrowLeft } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { OrgUnitForm } from '@/modules/organization/organization-units/components/org-unit-form';

export default function CreateOrganizationUnitPage() {
  const router = useRouter();
  const { hasPerm } = usePermission();

  if (!hasPerm(PERM.POSITION_CREATE)) {
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

  return (
    <div className="mx-auto w-full max-w-4xl">
      <OrgUnitForm
        mode="create"
        onSuccess={() => {
          router.push('/organization/organization-units');
        }}
      />
    </div>
  );
}
