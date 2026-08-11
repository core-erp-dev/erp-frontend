'use client';

import React from 'react';
import { Surface } from '@heroui/react';
import type { KpiDashboardSummary } from '../kpi-dashboard.types';

interface SummaryValuesProps {
  summary: KpiDashboardSummary | null;
}

const VALUE_DEFS: {
  key: 'totalActualScore' | 'totalTargetScore' | 'totalActualResult' | 'totalTargetResult';
  label: string;
  hint: string;
}[] = [
  { key: 'totalActualScore', label: 'Skor Capaian', hint: 'Jumlah skor indikator dievaluasi' },
  { key: 'totalTargetScore', label: 'Skor Target', hint: 'Jumlah skor target indikator' },
  { key: 'totalActualResult', label: 'Nilai Capaian', hint: 'Total realisasi tertimbang' },
  { key: 'totalTargetResult', label: 'Nilai Target', hint: 'Total target tertimbang' },
];

/** id-ID number formatting without altering the business value. */
function formatValue(value: number | null): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 4,
  }).format(value);
}

/**
 * Four summary totals — displayed exactly as the backend sends them (null =
 * NO_KPI_DATA shows "—", never a fabricated 0). No recalculation here.
 */
export const SummaryValues: React.FC<SummaryValuesProps> = ({ summary }) => {
  if (!summary) return null;

  return (
    <Surface className="rounded-3xl p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
        Ringkasan Nilai
      </h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {VALUE_DEFS.map((def) => (
          <div key={def.key} className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{def.label}</span>
            <span className="text-xl font-semibold text-foreground">
              {formatValue(summary[def.key])}
            </span>
            <span className="text-[11px] text-muted-foreground/80">{def.hint}</span>
          </div>
        ))}
      </div>
    </Surface>
  );
};
