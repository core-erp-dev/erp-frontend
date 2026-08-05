'use client';

import React from 'react';
import { Breadcrumbs, BreadcrumbsItem } from '@heroui/react';
import { House } from '@phosphor-icons/react';
import { DashboardContent } from '@/modules/kpi/overview/dashboard-content';

/**
 * KPI Dashboard (legacy deep link; the sidebar Dashboard entry points to `/`).
 * Any authenticated user — V1 reads are responsibility-based.
 */
export default function KpiOverviewPage() {
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
