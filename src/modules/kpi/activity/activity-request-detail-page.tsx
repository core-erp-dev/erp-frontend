'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Alert, Breadcrumbs, BreadcrumbsItem, Button, Chip, Input, Label, Spinner, TextField } from '@heroui/react';
import { ArrowLeft, House } from '@phosphor-icons/react';
import { activityV1Api, extractActivityV1Error } from './activity-v1-api';
import {
  REQUEST_STATUS_LABEL,
  REQUEST_TYPE_LABEL,
  type KpiActivityChangeRequestResponse,
  type KpiActivityResponse,
  type KpiActivityRequestStatus,
  type KpiActivityRequestType,
} from './activity-v1.types';

const REQUEST_TYPE_CHIP_COLOR: Record<KpiActivityRequestType, 'accent' | 'default' | 'warning'> = {
  CREATE: 'accent', UPDATE: 'default', CANCEL: 'warning',
};
const REQUEST_STATUS_CHIP_COLOR: Record<KpiActivityRequestStatus, 'success' | 'danger' | 'warning'> = {
  PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger',
};

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return <TextField isReadOnly className="pointer-events-none w-full"><Label>{label}</Label><Input value={typeof value === 'string' ? value : ''} readOnly /></TextField>;
}

function formatPeriod(year: number | null, month: number | null) {
  return year && month ? new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1)) : '-';
}

export function ActivityRequestDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') === 'approval' ? 'approval' : 'mine';
  const listHref = from === 'approval' ? '/kpi/approvals' : '/kpi/activities/my-requests';
  const listLabel = from === 'approval' ? 'Persetujuan Aktivitas' : 'Pengajuan Saya';
  const [request, setRequest] = useState<KpiActivityChangeRequestResponse | null>(null);
  const [currentActivity, setCurrentActivity] = useState<KpiActivityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void activityV1Api.getRequestById(id).then(async (data) => {
      if (!active) return;
      setRequest(data);
      if (data.requestType === 'UPDATE' && data.activityId) {
        const current = await activityV1Api.getActivityById(data.activityId).catch(() => null);
        if (active) setCurrentActivity(current);
      }
    }).catch((loadError) => {
      if (active) setError(extractActivityV1Error(loadError));
    }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="md" /></div>;
  if (error || !request) return <div className="flex w-full flex-col gap-6"><Alert status="danger"><Alert.Indicator /><Alert.Content><Alert.Title>{error || 'Pengajuan tidak ditemukan.'}</Alert.Title></Alert.Content></Alert><Button variant="secondary" className="self-start" onPress={() => router.replace(listHref)}><ArrowLeft className="h-4 w-4" />Kembali</Button></div>;

  const indicators = request.corporateKpis ?? (request.corporateKpiId ? [{ id: request.corporateKpiId, code: '', name: request.corporateKpiName ?? '' }] : []);
  const activityName = request.activityName || '-';

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Breadcrumbs><BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem><BreadcrumbsItem>KPI</BreadcrumbsItem><BreadcrumbsItem href={listHref}>{listLabel}</BreadcrumbsItem><BreadcrumbsItem>Detail Pengajuan</BreadcrumbsItem></Breadcrumbs>
      <div className="flex items-center gap-3"><Button isIconOnly variant="tertiary" onPress={() => router.replace(listHref)} aria-label="Kembali"><ArrowLeft className="h-5 w-5" /></Button><h1 className="truncate text-xl font-semibold text-foreground">{activityName}</h1></div>
      {request.requestType === 'UPDATE' && currentActivity && <section className="flex flex-col gap-4"><h2 className="text-sm font-semibold text-foreground">Saat Ini vs Usulan</h2><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><DetailField label="Nama Aktivitas Saat Ini" value={currentActivity.activityName} /><DetailField label="Nama Aktivitas Usulan" value={activityName} /><DetailField label="Deskripsi Saat Ini" value={currentActivity.description || '-'} /><DetailField label="Deskripsi Usulan" value={request.description || '-'} /><DetailField label="Satuan Saat Ini" value={currentActivity.unit} /><DetailField label="Satuan Usulan" value={request.unit || '-'} /><DetailField label="Target Saat Ini" value={String(currentActivity.targetValue)} /><DetailField label="Target Usulan" value={request.targetValue == null ? '-' : String(request.targetValue)} /></div></section>}
      <section className="flex flex-col gap-4"><h2 className="text-sm font-semibold text-foreground">Informasi Pengajuan</h2><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="flex flex-col gap-1"><Label>Jenis Pengajuan</Label><Chip size="sm" className="w-fit" color={REQUEST_TYPE_CHIP_COLOR[request.requestType]} variant="soft">{REQUEST_TYPE_LABEL[request.requestType]}</Chip></div><div className="flex flex-col gap-1"><Label>Status</Label><Chip size="sm" className="w-fit" color={REQUEST_STATUS_CHIP_COLOR[request.status]} variant="soft">{REQUEST_STATUS_LABEL[request.status]}</Chip></div><DetailField label="Nama Aktivitas" value={activityName} /><DetailField label="Diajukan Oleh" value={request.requestedByUserName} /><DetailField label="Aktivitas Induk" value={request.parentActivityName || '-'} /><DetailField label="KPI Perusahaan" value={indicators.length ? indicators.map((item) => `${item.code ? `${item.code} · ` : ''}${item.name}`).join('; ') : '-'} /><DetailField label="Periode" value={formatPeriod(request.periodYear, request.periodMonth)} /><DetailField label="Satuan" value={request.unit || '-'} /><DetailField label="Nilai Target" value={request.targetValue == null ? '-' : String(request.targetValue)} /><DetailField label="Penanggung Jawab" value={request.assignedToUserName || '-'} /></div>{request.cancellationReason && <DetailField label="Alasan Pembatalan" value={request.cancellationReason} />}{request.rejectionReason && <DetailField label="Alasan Penolakan" value={request.rejectionReason} />}</section>
      {request.parentId && <Link href={`/kpi/activities/${request.parentId}`} className="text-sm font-medium text-primary hover:underline">Lihat aktivitas induk</Link>}
    </div>
  );
}
