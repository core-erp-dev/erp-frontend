'use client';

import React from 'react';
import { Badge } from '@heroui/react';
import { usePendingCount } from '@/modules/hr/kpi/hooks/use-pending-count';

/**
 * Client component that renders the KPI approval badge count.
 * Extracted from Sidebar to isolate the polling behavior
 * and prevent re-rendering the entire sidebar on every poll tick.
 */
export function KpiPendingBadge() {
  const { pendingCount } = usePendingCount(45000);

  if (pendingCount <= 0) return null;

  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-xs font-bold text-white">
      {pendingCount > 99 ? '99+' : pendingCount}
    </span>
  );
}
