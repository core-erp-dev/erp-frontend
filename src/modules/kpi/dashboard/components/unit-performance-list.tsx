'use client';

import React from 'react';
import { Surface } from '@heroui/react';
import { Buildings } from '@phosphor-icons/react';
import type { UnitPerformanceRow } from '@/modules/kpi/unit-performance/unit-performance.types';

interface UnitPerformanceListProps {
  rows: UnitPerformanceRow[];
}

function formatPercent(value: number | null): string {
  if (value == null) return '—';
  return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value)}%`;
}

/**
 * Performance per Unit — ranked horizontal bars (descending performance,
 * nulls last). The bar width is a VISUAL clamp at 100% because the backend
 * performance is uncapped; the label always shows the true value. Values come
 * straight from `unitPerformance` — nothing is recomputed or invented here.
 */
export const UnitPerformanceList: React.FC<UnitPerformanceListProps> = ({ rows }) => {
  const sorted = [...rows].sort((a, b) => {
    const pa = a.performance;
    const pb = b.performance;
    if (pa == null && pb == null) return a.unitName.localeCompare(b.unitName);
    if (pa == null) return 1;
    if (pb == null) return -1;
    return pb - pa;
  });

  return (
    <Surface className="rounded-3xl p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
        Performance per Unit
      </h2>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface-secondary px-4 py-8 text-center">
          <Buildings className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Belum ada konfigurasi Unit Performance.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sorted.map((row) => {
            const width = row.performance != null ? Math.min(Math.max(row.performance, 0), 100) : 0;
            return (
              <div key={row.id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium text-foreground">
                    {row.unitName}
                    <span className="ml-2 text-xs text-muted-foreground">{row.unitCode}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-foreground">
                    {formatPercent(row.performance)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Bobot {row.weight}%</span>
                  <span>
                    Realisasi{' '}
                    {row.realization != null
                      ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(row.realization)
                      : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Surface>
  );
};
