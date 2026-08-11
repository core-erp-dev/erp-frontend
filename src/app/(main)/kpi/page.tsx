'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs, BreadcrumbsItem, Alert, Button } from '@heroui/react';
import { House, ArrowLeft } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KpiDashboardContent } from '@/modules/kpi/dashboard/kpi-dashboard-content';

/**
 * KPI Dashboard deep link (`/kpi`) — same "Dashboard Kinerja" content as `/`,
 * with KPI breadcrumbs. Guarded by BOTH read permissions (the dashboard
 * response combines Corporate KPI + Unit Performance data).
 */
export default function KpiOverviewPage() {
  const router = useRouter();
  const { hasAllPerms } = usePermission();

  if (!hasAllPerms(PERM.CORPORATE_KPI_READ, PERM.UNIT_PERFORMANCE_READ)) {
    return (
      <div className="flex w-full flex-col gap-4">
        <Breadcrumbs>
          <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
          <BreadcrumbsItem>KPI</BreadcrumbsItem>
          <BreadcrumbsItem>Dashboard</BreadcrumbsItem>
        </Breadcrumbs>
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Akses Ditolak</Alert.Title>
          </Alert.Content>
        </Alert>
        <div>
          <Button variant="secondary" onPress={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem>KPI</BreadcrumbsItem>
        <BreadcrumbsItem>Dashboard</BreadcrumbsItem>
      </Breadcrumbs>
      <KpiDashboardContent />
    </div>
  );
}
