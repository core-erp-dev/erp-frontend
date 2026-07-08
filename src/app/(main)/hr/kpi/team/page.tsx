'use client';

import { Tabs, Surface, Alert, Button } from '@heroui/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, TreeStructure } from '@phosphor-icons/react';

export default function KpiTeamPage() {
  const { hasPerm } = usePermission();
  const router = useRouter();

  if (!hasPerm(PERM.PERFORMANCE_READ)) {
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
      <h1 className="text-xl font-semibold text-foreground">Kinerja Tim</h1>

      <Tabs className="w-full" defaultSelectedKey="summary">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Kinerja Tim">
            <Tabs.Tab id="summary">
              <Users className="h-4 w-4" />
              Ringkasan Tim
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="departments">
              <TreeStructure className="h-4 w-4" />
              Per Departemen
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel className="pt-4" id="summary">
          <Surface className="flex flex-col items-center justify-center gap-2 rounded-3xl p-12">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Ringkasan kinerja tim akan ditampilkan di sini.
            </p>
          </Surface>
        </Tabs.Panel>

        <Tabs.Panel className="pt-4" id="departments">
          <Surface className="flex flex-col items-center justify-center gap-2 rounded-3xl p-12">
            <TreeStructure className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Rincian kinerja per departemen akan ditampilkan di sini.
            </p>
          </Surface>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
