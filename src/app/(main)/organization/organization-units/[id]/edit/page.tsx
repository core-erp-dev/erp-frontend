'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Spinner, Alert } from '@heroui/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { ForbiddenAccess } from '@/components/shared/forbidden-access';
import { organizationUnitApi } from '@/modules/organization/organization-units/services/organization-unit-api';
import type { OrganizationUnitResponse } from '@/modules/organization/organization-units/types';
import { OrgUnitForm } from '@/modules/organization/organization-units/components/org-unit-form';
import { resolveEditReturn } from '@/modules/organization/organization-units/utils/org-unit-navigation-utils';

export default function EditOrganizationUnitPage() {
  const { hasPerm } = usePermission();

  // Guard BEFORE any data request: users without manage never fetch the unit.
  if (!hasPerm(PERM.ORGANIZATION_UNIT_MANAGE)) {
    return <ForbiddenAccess />;
  }

  return <EditOrganizationUnitContent />;
}

function EditOrganizationUnitContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const fromParam = searchParams.get('from');

  const [unit, setUnit] = useState<OrganizationUnitResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await organizationUnitApi.getUnitById(id);
        if (!cancelled) setUnit(data);
      } catch {
        if (!cancelled) setError('Gagal memuat data unit organisasi');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleSuccess = useCallback(() => {
    // Deterministic: back only when Detail pushed this page (?from=detail);
    // deep links / refresh fall back to the unit's Detail via replace.
    const target = resolveEditReturn(fromParam, id);
    if (target === 'back') router.back();
    else router.replace(target.replace);
  }, [fromParam, id, router]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{error || 'Unit organisasi tidak ditemukan'}</Alert.Title>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <OrgUnitForm
        mode="edit"
        initialData={unit}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
