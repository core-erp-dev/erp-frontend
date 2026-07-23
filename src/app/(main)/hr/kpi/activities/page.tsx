'use client';

import { Surface } from '@heroui/react';
import { ClipboardText } from '@phosphor-icons/react';
import { KPI_LABELS, KPI_DESCRIPTIONS } from '@/modules/hr/kpi/types';

export default function KpiActivitiesPage() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.activities}</h1>
        <p className="text-sm text-muted-foreground">{KPI_DESCRIPTIONS.activities}</p>
      </div>

      <Surface className="flex flex-col items-center justify-center gap-3 rounded-3xl p-12">
        <ClipboardText className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Manajemen Aktivitas KPI akan diimplementasikan pada fase P2.
        </p>
      </Surface>
    </div>
  );
}
