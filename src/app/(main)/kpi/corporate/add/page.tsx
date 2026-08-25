'use client';

import { Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button } from '@heroui/react';
import { ArrowLeft } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_ROUTES } from '@/modules/kpi/constants';
import { CorporateKpiForm } from '@/modules/kpi/corporate/form/corporate-kpi-form';
import type { CorporateKpiNode, KpiNodeType } from '@/modules/kpi/corporate/corporate-kpi.types';

function AddCorporateKpiPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPerm } = usePermission();

  const preselectedType = (searchParams.get('type') === 'INDICATOR' ? 'INDICATOR' : 'ASPECT') as KpiNodeType;
  const preselectedParentId = searchParams.get('parentId') ?? undefined;
  const preselectedStructureId = searchParams.get('structureId') ?? undefined;
  const parsedYear = Number(searchParams.get('year'));
  const preselectedYear = !preselectedStructureId && Number.isInteger(parsedYear) ? parsedYear : undefined;

  const handleSuccess = useCallback((node: CorporateKpiNode) => {
    router.replace(KPI_ROUTES.corporateDetailRoute(node.id));
  }, [router]);

  if (!hasPerm(PERM.CORPORATE_KPI_MANAGE)) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Akses Ditolak</Alert.Title>
          </Alert.Content>
        </Alert>
        <Button variant="secondary" onPress={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Kembali
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
        preselectedStructureId={preselectedStructureId}
        preselectedYear={preselectedYear}
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
