'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button } from '@heroui/react';
import { ArrowLeft } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KpiDashboardContent } from '@/modules/kpi/dashboard/kpi-dashboard-content';

/**
 * Main Dashboard at `/` — "Dashboard Kinerja".
 *
 * The dashboard payload carries BOTH the Corporate KPI data and the Unit
 * Performance rows, so the page requires BOTH read permissions
 * (corporate_kpi:read AND unit_performance:read) — matching the backend
 * `hasAllAuthorities` gate. The backend remains the final enforcement.
 */
export default function DashboardPage() {
  const router = useRouter();
  const { hasAllPerms } = usePermission();

  if (!hasAllPerms(PERM.CORPORATE_KPI_READ, PERM.UNIT_PERFORMANCE_READ)) {
    return (
      <div className="flex w-full flex-col gap-4">
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

  return <KpiDashboardContent />;
}
