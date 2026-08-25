'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Alert, Breadcrumbs, BreadcrumbsItem, Button, Input, Label, Separator, Spinner, Table, TextField } from '@heroui/react';
import { ArrowLeft, House, Tray } from '@phosphor-icons/react';
import { ForbiddenAccess } from '@/components/shared/forbidden-access';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS, KPI_ROUTES, UNIT_PERFORMANCE_DETAIL_ORIGIN_KEY } from '@/modules/kpi/constants';
import { MONTH_NAMES_ID } from '@/modules/kpi/corporate/period-label';
import { useUnitPerformanceDetail } from '@/modules/kpi/unit-performance/use-unit-performance-detail';
import type { UnitPerformanceIndicatorRow } from '@/modules/kpi/unit-performance/unit-performance.types';

function parseYear(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : new Date().getFullYear();
}

function parseMonth(value: string | null): number | undefined {
  if (value === null) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 12 ? parsed : undefined;
}

function formatNumber(value: number | null): string {
  return value == null ? '-' : new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(value);
}

function formatPercent(value: number | null): string {
  return value == null ? '-' : `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value)}%`;
}

function DetailTable({
  rows,
  isLoading = false,
  error = null,
  onRetry,
}: {
  rows: UnitPerformanceIndicatorRow[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Breakdown indikator Performa Unit" className="min-w-[760px]">
          <Table.Header>
            <Table.Column id="code">Kode</Table.Column>
            <Table.Column id="indicator" isRowHeader>Indikator</Table.Column>
            <Table.Column id="weight">Bobot/Porsi Unit</Table.Column>
            <Table.Column id="actual">Nilai Aktual</Table.Column>
            <Table.Column id="target">Target Nilai Renbis</Table.Column>
            <Table.Column id="contribution">Hasil/Kontribusi</Table.Column>
          </Table.Header>
          <Table.Body
            renderEmptyState={() => (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
                {isLoading ? <Spinner size="md" /> : error ? (
                  <>
                    <span className="text-sm text-danger">{error}</span>
                    {onRetry && <Button variant="secondary" size="sm" onPress={onRetry}>Coba Lagi</Button>}
                  </>
                ) : (
                  <><Tray className="h-8 w-8" /><span className="text-sm">Belum ada breakdown indikator untuk periode ini.</span></>
                )}
              </div>
            )}
          >
            {!rows.length ? null : rows.map((row) => (
              <Table.Row key={row.id}>
                <Table.Cell className="text-muted-foreground">{row.code || '-'}</Table.Cell>
                <Table.Cell className="font-medium text-foreground">{row.name || '-'}</Table.Cell>
                <Table.Cell className="text-muted-foreground">{formatPercent(row.unitWeight)}</Table.Cell>
                <Table.Cell className="text-muted-foreground">{formatNumber(row.actualValue)}</Table.Cell>
                <Table.Cell className="text-muted-foreground">{formatNumber(row.targetValue)}</Table.Cell>
                <Table.Cell className="text-muted-foreground">{formatNumber(row.contribution)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

export default function UnitPerformanceDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const id = String(params.id);
  const { hasPerm } = usePermission();
  const canRead = hasPerm(PERM.UNIT_PERFORMANCE_READ);
  const year = parseYear(searchParams.get('year'));
  const month = parseMonth(searchParams.get('month'));
  const { detail, isLoading, error, isForbidden, load } = useUnitPerformanceDetail(id);
  const canReturnToListRef = useRef(false);

  useEffect(() => {
    if (canRead) void load(year, month);
  }, [canRead, load, month, year]);

  useEffect(() => {
    if (searchParams.get('from') !== 'unit-performance') return;
    try {
      if (sessionStorage.getItem(UNIT_PERFORMANCE_DETAIL_ORIGIN_KEY) === id) {
        canReturnToListRef.current = true;
        sessionStorage.removeItem(UNIT_PERFORMANCE_DETAIL_ORIGIN_KEY);
      }
    } catch {
      canReturnToListRef.current = false;
    }
  }, [id, searchParams]);

  const goBack = useCallback(() => {
    if (canReturnToListRef.current) {
      router.back();
      return;
    }
    const fallback = new URLSearchParams();
    for (const key of ['period', 'year', 'month', 'search', 'page']) {
      const value = searchParams.get(key);
      if (value !== null) fallback.set(key, value);
    }
    router.replace(fallback.toString() ? `${KPI_ROUTES.unitPerformance}?${fallback}` : KPI_ROUTES.unitPerformance);
  }, [router, searchParams]);

  if (!canRead || isForbidden) return <ForbiddenAccess />;
  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="md" /></div>;
  if (error || !detail) {
    return (
      <div className="flex w-full flex-col gap-4">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content><Alert.Title>Detail Performa Unit</Alert.Title></Alert.Content>
        </Alert>
        <DetailTable rows={[]} error={error ?? 'Performa Unit tidak ditemukan.'} onRetry={() => void load(year, month)} />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/" aria-label="Beranda"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem>KPI</BreadcrumbsItem>
        <BreadcrumbsItem href={KPI_ROUTES.unitPerformance}>KPI Unit</BreadcrumbsItem>
        <BreadcrumbsItem>{KPI_LABELS.unitPerformance}</BreadcrumbsItem>
        <BreadcrumbsItem>Detail</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center gap-3">
        <Button isIconOnly variant="tertiary" onPress={goBack} aria-label="Kembali ke Performa Unit">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Detail Performa Unit</h1>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Informasi Performa Unit</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextField isReadOnly className="pointer-events-none w-full"><Label>Nama Unit</Label><Input value={detail.unitName} readOnly /></TextField>
          <TextField isReadOnly className="pointer-events-none w-full"><Label>Kode Unit</Label><Input value={detail.unitCode} readOnly /></TextField>
          <TextField isReadOnly className="pointer-events-none w-full"><Label>Tahun</Label><Input value={String(detail.year)} readOnly /></TextField>
          <TextField isReadOnly className="pointer-events-none w-full"><Label>Bulan</Label><Input value={detail.month == null ? 'Tahunan' : (MONTH_NAMES_ID[detail.month - 1] ?? String(detail.month))} readOnly /></TextField>
          <TextField isReadOnly className="pointer-events-none w-full"><Label>Realisasi</Label><Input value={formatNumber(detail.realization)} readOnly /></TextField>
          <TextField isReadOnly className="pointer-events-none w-full"><Label>Performa</Label><Input value={formatPercent(detail.performance)} readOnly /></TextField>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Breakdown per Indikator</h2>
        <DetailTable rows={detail.indicators} />
      </div>
    </div>
  );
}
