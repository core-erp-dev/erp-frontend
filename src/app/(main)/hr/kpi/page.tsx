'use client';

import { Surface } from '@heroui/react';
import { ChartBar } from '@phosphor-icons/react';
import { KPI_LABELS, KPI_DESCRIPTIONS } from '@/modules/hr/kpi/constants';

export default function KpiOverviewPage() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.overview}</h1>
        <p className="text-sm text-muted-foreground">{KPI_DESCRIPTIONS.overview}</p>
      </div>

      <Surface className="flex flex-col items-center justify-center gap-3 rounded-3xl p-12">
        <ChartBar className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Overview will be available after Corporate KPI, Activities, and Reports data is integrated.
        </p>
      </Surface>
    </div>
  );
}
