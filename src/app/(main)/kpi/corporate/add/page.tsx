'use client';

import { Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button } from '@heroui/react';
import { ArrowLeft } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_ROUTES } from '@/modules/kpi/constants';
import { CorporateKpiForm } from '@/modules/kpi/corporate/form/corporate-kpi-form';
import type { KpiNodeType } from '@/modules/kpi/corporate/corporate-kpi.types';

function AddCorporateKpiPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPerm } = usePermission();

  const preselectedType = (searchParams.get('type') === 'INDICATOR' ? 'INDICATOR' : 'ASPECT') as KpiNodeType;
  const preselectedParentId = searchParams.get('parentId') ?? undefined;

  const handleSuccess = useCallback(() => {
    router.push(KPI_ROUTES.corporate);
  }, [router]);

  if (!hasPerm(PERM.CORPORATE_KPI_MANAGE)) {
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
      <CorporateKpiForm
        mode="create"
        preselectedType={preselectedType}
        preselectedParentId={preselectedParentId}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

export default function AddCorporateKpiPage() {
  return (
    <Suspense fallback={null}>
      <AddCorporateKpiPageInner />
    </Suspense>
  );
}
