import { Surface } from '@heroui/react';
import { Article } from '@phosphor-icons/react';
import { KPI_LABELS, KPI_DESCRIPTIONS } from '@/modules/hr/kpi/constants';

export default function KpiReportsPage() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.reports}</h1>
        <p className="text-sm text-muted-foreground">{KPI_DESCRIPTIONS.reports}</p>
      </div>

      <Surface className="flex flex-col items-center justify-center gap-3 rounded-3xl p-12">
        <Article className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Manajemen Laporan Pelaksanaan akan diimplementasikan pada fase P3.
        </p>
      </Surface>
    </div>
  );
}
