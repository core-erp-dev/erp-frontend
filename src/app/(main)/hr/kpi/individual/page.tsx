'use client';

import { Tabs, Surface, Alert, Button } from '@heroui/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Target, FileC, ChartBar } from '@phosphor-icons/react';

export default function KpiIndividualPage() {
  const { hasPerm } = usePermission();
  const router = useRouter();

  if (!hasPerm(PERM.TASK_READ)) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content><Alert.Title>Akses Ditolak</Alert.Title></Alert.Content>
        </Alert>
        <Button variant="secondary" onPress={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Kinerja Individu</h1>

      <Tabs className="w-full" defaultSelectedKey="tasks">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Kinerja Individu">
            <Tabs.Tab id="tasks">
              <Target className="h-4 w-4" />
              Tugas Saya
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="reports">
              <FileC className="h-4 w-4" />
              Laporan Saya
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="achievement">
              <ChartBar className="h-4 w-4" />
              Capaian Saya
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel className="pt-4" id="tasks">
          <Surface className="flex flex-col items-center justify-center gap-2 rounded-3xl p-12">
            <Target className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Daftar tugas KPI Anda akan ditampilkan di sini.
            </p>
          </Surface>
        </Tabs.Panel>

        <Tabs.Panel className="pt-4" id="reports">
          <Surface className="flex flex-col items-center justify-center gap-2 rounded-3xl p-12">
            <FileC className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Riwayat laporan harian Anda akan ditampilkan di sini.
            </p>
          </Surface>
        </Tabs.Panel>

        <Tabs.Panel className="pt-4" id="achievement">
          <Surface className="flex flex-col items-center justify-center gap-2 rounded-3xl p-12">
            <ChartBar className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Ringkasan capaian KPI Anda akan ditampilkan di sini.
            </p>
          </Surface>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
