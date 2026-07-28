'use client';

import React from 'react';
import { Alert, Breadcrumbs, BreadcrumbsItem } from '@heroui/react';
import { House } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { KPI_ANY_PERMISSION } from '@/modules/kpi/constants';
import { DashboardContent } from '@/modules/kpi/overview/dashboard-content';

export default function KpiOverviewPage() {
  const { hasAnyPerm } = usePermission();
  const canAccess = hasAnyPerm(...KPI_ANY_PERMISSION);

  if (!canAccess) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Alert color="danger" title="Access Denied">
          You do not have permission to view the KPI Overview.
        </Alert>
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
      <DashboardContent />
    </div>
  );
}
