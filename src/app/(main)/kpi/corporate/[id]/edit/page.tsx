'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Spinner, Alert, Button } from '@heroui/react';
import { ArrowLeft } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_ROUTES } from '@/modules/kpi/constants';
import { corporateKpiApi } from '@/modules/kpi/corporate/corporate-kpi-api';
import { extractKpiError } from '@/modules/kpi/corporate/corporate-kpi-api';
import { CorporateKpiForm } from '@/modules/kpi/corporate/form/corporate-kpi-form';
import type { CorporateKpiNode } from '@/modules/kpi/corporate/corporate-kpi.types';

export default function EditCorporateKpiPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { hasPerm } = usePermission();

  const [node, setNode] = useState<CorporateKpiNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    corporateKpiApi
      .getById(id)
      .then((data) => {
        if (!cancelled) setNode(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(extractKpiError(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

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

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (error || !node) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{error || 'Corporate KPI not found'}</Alert.Title>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <CorporateKpiForm
        key={node.id}
        mode="edit"
        initialData={node}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
