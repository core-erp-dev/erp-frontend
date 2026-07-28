'use client';

import React from 'react';
import { Alert } from '@heroui/react';
import { usePermission } from '@/hooks/use-permission';
import { KPI_ANY_PERMISSION } from '@/modules/kpi/constants';
import { DashboardContent } from '@/modules/kpi/overview/dashboard-content';

export default function DashboardPage() {
  const { hasAnyPerm } = usePermission();
  const canAccess = hasAnyPerm(...KPI_ANY_PERMISSION);

  if (!canAccess) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Alert color="danger" title="Access Denied">
          You do not have permission to view the Dashboard.
        </Alert>
      </div>
    );
  }

  return <DashboardContent />;
}
