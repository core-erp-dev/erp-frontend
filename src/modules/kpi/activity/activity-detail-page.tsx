'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Alert,
  Breadcrumbs,
  BreadcrumbsItem,
  Button,
  Dropdown,
  Input,
  Label,
  Separator,
  Spinner,
  TextField,
} from '@heroui/react';
import { ArrowLeft, DotsThreeVertical, House, PencilSimple, Prohibit } from '@phosphor-icons/react';
import {
  ACTIVITY_STATUS_LABEL,
} from './activity-v1.types';
import { useActivityDetail } from './use-activity-detail';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';

interface ActivityDetailPageProps {
  id: string;
}

export function ActivityDetailPage({ id }: ActivityDetailPageProps) {
  const router = useRouter();
  const { hasPerm } = usePermission();
  const { activity, isLoading, error } = useActivityDetail(id);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{error || 'Aktivitas tidak ditemukan'}</Alert.Title>
          </Alert.Content>
        </Alert>
        <Button variant="secondary" onPress={() => router.back()} className="self-start">
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
      </div>
    );
  }

  const indicators = activity.corporateKpis
    ?? (activity.corporateKpiId
      ? [{ id: activity.corporateKpiId, code: activity.corporateKpiCode, name: activity.corporateKpiName }]
      : []);
  const formatNumber = (value: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(value);
  const period = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' })
    .format(new Date(activity.periodYear, activity.periodMonth - 1, 1));
  const indicatorText = indicators.length > 0
    ? indicators.map((indicator) => `${indicator.code} · ${indicator.name}`).join('; ')
    : '-';
  const openManage = (action: 'UPDATE' | 'CANCEL') => {
    router.push(`/kpi/activities/${id}/edit?from=detail&action=${action}`);
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem>KPI</BreadcrumbsItem>
        <BreadcrumbsItem href="/kpi/activities/all">Semua Aktivitas</BreadcrumbsItem>
        <BreadcrumbsItem>{activity.activityName}</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button isIconOnly variant="tertiary" onPress={() => router.back()} aria-label="Kembali">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="truncate text-xl font-semibold text-foreground">{activity.activityName}</h1>
        </div>
        {hasPerm(PERM.KPI_ACTIVITY_MANAGE) && (
          <Dropdown>
            <Button isIconOnly variant="tertiary" aria-label="Opsi aktivitas">
              <DotsThreeVertical className="h-5 w-5" />
            </Button>
            <Dropdown.Popover>
              <Dropdown.Menu onAction={(key) => {
                if (key === 'manage') openManage('UPDATE');
                if (key === 'cancel') openManage('CANCEL');
              }}>
                <Dropdown.Item id="manage" textValue="Kelola aktivitas">
                  <div className="flex items-center gap-2">
                    <PencilSimple className="h-4 w-4 text-muted-foreground" />
                    <span>Kelola aktivitas</span>
                  </div>
                </Dropdown.Item>
                {activity.status === 'ACTIVE' && (
                  <Dropdown.Item id="cancel" textValue="Batalkan aktivitas" variant="danger">
                    <div className="flex items-center gap-2 text-danger">
                      <Prohibit className="h-4 w-4" />
                      <span>Batalkan aktivitas</span>
                    </div>
                  </Dropdown.Item>
                )}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Informasi Aktivitas</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Nama Aktivitas</Label>
            <Input value={activity.activityName} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Status</Label>
            <Input value={ACTIVITY_STATUS_LABEL[activity.status]} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full sm:col-span-2">
            <Label>Deskripsi</Label>
            <Input value={activity.description || '-'} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Aktivitas Induk</Label>
            {activity.parentId ? (
              <Link
                href={`/kpi/activities/${activity.parentId}`}
                className="block truncate font-medium text-foreground hover:underline"
              >
                {activity.parentActivityName || '-'}
              </Link>
            ) : (
              <Input value={activity.parentActivityName || '-'} readOnly />
            )}
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>KPI Perusahaan</Label>
            <Input value={indicatorText} readOnly />
          </TextField>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Periode &amp; Pencapaian</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Periode</Label>
            <Input value={period} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Satuan</Label>
            <Input value={activity.unit} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Nilai Target</Label>
            <Input value={formatNumber(activity.targetValue)} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Nilai Realisasi</Label>
            <Input value={formatNumber(activity.realizedValue)} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Progress</Label>
            <Input value={`${Math.round(activity.progressPercent)}%`} readOnly />
          </TextField>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Penanggung Jawab</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Nama</Label>
            <Input value={activity.assignedToUserName} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Jabatan</Label>
            <Input value={activity.assignedToPositionName} readOnly />
          </TextField>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="secondary" onPress={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
      </div>

    </div>
  );
}
