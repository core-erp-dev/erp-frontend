import { Surface } from '@heroui/react';
import { Checks } from '@phosphor-icons/react';
import { KPI_LABELS, KPI_DESCRIPTIONS } from '@/modules/hr/kpi/constants';

export default function KpiApprovalsPage() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.approvals}</h1>
        <p className="text-sm text-muted-foreground">{KPI_DESCRIPTIONS.approvals}</p>
      </div>

      <Surface className="flex flex-col items-center justify-center gap-3 rounded-3xl p-12">
        <Checks className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Persetujuan Aktivitas akan diimplementasikan pada fase P2.
        </p>
      </Surface>
    </div>
  );
}
