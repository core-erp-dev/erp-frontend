'use client';

import { Tabs, Surface, Alert, Button } from '@heroui/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Target, Checks, FileC } from '@phosphor-icons/react';

export default function KpiAdminPage() {
  const { hasAnyPerm } = usePermission();
  const router = useRouter();

  const canView = hasAnyPerm(PERM.TASK_READ, PERM.TASK_APPROVE, PERM.REPORT_APPROVE);

  if (!canView) {
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
      <h1 className="text-xl font-semibold text-foreground">Admin KPI</h1>

      <Tabs className="w-full" defaultSelectedKey="tasks">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Admin KPI">
            <Tabs.Tab id="tasks">
              <Target className="h-4 w-4" />
              Manajemen Tugas
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="task-approvals">
              <Checks className="h-4 w-4" />
              Persetujuan Tugas
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="report-approvals">
              <FileC className="h-4 w-4" />
              Persetujuan Laporan
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel className="pt-4" id="tasks">
          <Surface className="flex flex-col items-center justify-center gap-2 rounded-3xl p-12">
            <Target className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Manajemen tugas KPI akan ditampilkan di sini.
            </p>
          </Surface>
        </Tabs.Panel>

        <Tabs.Panel className="pt-4" id="task-approvals">
          <Surface className="flex flex-col items-center justify-center gap-2 rounded-3xl p-12">
            <Checks className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Antrean persetujuan tugas KPI akan ditampilkan di sini.
            </p>
          </Surface>
        </Tabs.Panel>

        <Tabs.Panel className="pt-4" id="report-approvals">
          <Surface className="flex flex-col items-center justify-center gap-2 rounded-3xl p-12">
            <FileC className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Antrean persetujuan laporan harian akan ditampilkan di sini.
            </p>
          </Surface>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
