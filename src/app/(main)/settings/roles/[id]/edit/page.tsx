'use client';

import { useParams, useRouter } from 'next/navigation';
import { Spinner, Alert, Button } from '@heroui/react';
import { ArrowLeft } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { useRoleDetail } from '@/modules/settings/hooks/use-role-detail';
import { RoleForm } from '@/modules/settings/components/role-form';

export default function EditRolePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { hasPerm } = usePermission();

  const { role, isLoading, error } = useRoleDetail(id);

  if (!hasPerm(PERM.ROLE_MANAGE)) {
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

  if (error || !role) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{error || 'Role not found'}</Alert.Title>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <RoleForm
        mode="edit"
        initialData={role}
        onSuccess={() => {
          router.push(`/settings/roles/${id}`);
        }}
      />
    </div>
  );
}
