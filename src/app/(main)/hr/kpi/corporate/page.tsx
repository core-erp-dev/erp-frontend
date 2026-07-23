'use client';

import { Surface } from '@heroui/react';
import { Buildings } from '@phosphor-icons/react';
import { KPI_LABELS, KPI_DESCRIPTIONS } from '@/modules/hr/kpi/constants';

export default function KpiCorporatePage() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.corporate}</h1>
        <p className="text-sm text-muted-foreground">{KPI_DESCRIPTIONS.corporate}</p>
      </div>

      <Surface className="flex flex-col items-center justify-center gap-3 rounded-3xl p-12">
        <Buildings className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Manajemen KPI Korporat akan diimplementasikan pada fase P1.
        </p>
      </Surface>
    </div>
  );
}
