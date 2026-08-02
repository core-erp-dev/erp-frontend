'use client';

import React from 'react';
import { DashboardContent } from '@/modules/kpi/overview/dashboard-content';

/**
 * Main Dashboard at `/` — any authenticated user (the (main) layout AuthGuard
 * enforces authentication). V1 Activity/Report reads are responsibility-based,
 * so no permission catalog gate applies.
 */
export default function DashboardPage() {
  return <DashboardContent />;
}
