'use client';

import React, { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Button, Spinner, Table, Tooltip } from '@heroui/react';
import { Tray } from '@phosphor-icons/react';
import { UNIT_PERFORMANCE_DETAIL_ORIGIN_KEY } from '@/modules/kpi/constants';
import type {
  UnitPerformanceIndicatorRow,
  UnitPerformanceIndicatorStatus,
  UnitPerformanceRow,
} from './unit-performance.types';

interface UnitPerformanceResultsTableProps {
  rows: UnitPerformanceRow[];
  isLoading: boolean;
  error: string | null;
  isTransitioning: boolean;
  searchQuery: string;
  onRetry: () => void;
  getDetailHref: (rowId: string) => string;
}

interface MatrixIndicator {
  id: string;
  code: string;
  name: string;
  aspectName: string;
}

interface MatrixIndicatorGroup {
  name: string;
  indicators: MatrixIndicator[];
}

function formatPercent(value: number | null): string {
  return value == null ? '-' : `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value)}%`;
}

function formatNumber(value: number | null): string {
  return value == null ? '-' : new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(value);
}

function buildIndicatorGroups(rows: UnitPerformanceRow[]): MatrixIndicatorGroup[] {
  const groups = new Map<string, MatrixIndicatorGroup>();
  const indicatorIds = new Set<string>();

  rows.forEach((row) => {
    (row.indicators ?? []).forEach((indicator) => {
      if (indicatorIds.has(indicator.id)) return;
      indicatorIds.add(indicator.id);
      const aspectName = indicator.aspectName?.trim() || 'Tanpa bidang';
      const group = groups.get(aspectName) ?? { name: aspectName, indicators: [] };
      group.indicators.push({
        id: indicator.id,
        code: indicator.code,
        name: indicator.name,
        aspectName,
      });
      groups.set(aspectName, group);
    });
  });

  return Array.from(groups.values());
}

function indicatorStatus(
  row: UnitPerformanceRow,
  indicator: UnitPerformanceIndicatorRow | undefined,
): UnitPerformanceIndicatorStatus {
  if (!indicator) return row.status === 'MATRIX_INCOMPLETE' ? 'MATRIX_INCOMPLETE' : 'NOT_CONFIGURED';
  if (indicator.status) return indicator.status;
  if (indicator.unitWeight == null) return 'NOT_CONFIGURED';
  if (row.status === 'MATRIX_INCOMPLETE') return 'MATRIX_INCOMPLETE';
  if (indicator.calculationStatus !== 'OK' || indicator.performance == null) return 'NO_KPI_DATA';
  return 'OK';
}

function statusLabel(status: UnitPerformanceIndicatorStatus): string {
  switch (status) {
    case 'OK': return 'Tersedia';
    case 'NOT_CONFIGURED': return 'Belum dikonfigurasi';
    case 'MATRIX_INCOMPLETE': return 'Konfigurasi belum lengkap';
    default: return 'Data belum tersedia';
  }
}

function statusShortLabel(status: UnitPerformanceIndicatorStatus): string {
  switch (status) {
    case 'NO_KPI_DATA': return 'N/A';
    case 'NOT_CONFIGURED': return 'Belum diatur';
    case 'MATRIX_INCOMPLETE': return 'Belum lengkap';
    default: return '';
  }
}

function statusClass(status: UnitPerformanceIndicatorStatus): string {
  switch (status) {
    case 'NO_KPI_DATA': return 'text-muted-foreground';
    case 'NOT_CONFIGURED': return 'text-warning';
    case 'MATRIX_INCOMPLETE': return 'text-danger';
    default: return 'text-foreground';
  }
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

function PerformanceCell({
  unit,
  indicator,
  descriptor,
}: {
  unit: UnitPerformanceRow;
  indicator: UnitPerformanceIndicatorRow | undefined;
  descriptor: MatrixIndicator;
}) {
  const status = indicatorStatus(unit, indicator);
  const hasPerformance = status === 'OK' && indicator?.performance != null;

  return (
    <Tooltip delay={0}>
      <Tooltip.Trigger
        aria-label={`Detail ${descriptor.code} untuk ${unit.unitName}`}
        className="flex min-h-10 w-full items-center justify-center rounded-md px-2 py-1 text-center transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {hasPerformance ? (
          <span className="font-medium text-foreground">{formatPercent(indicator.performance)}</span>
        ) : (
          <span className={`flex flex-col items-center leading-tight ${statusClass(status)}`}>
            <span className="font-semibold">—</span>
            <span className="text-[10px]">{statusShortLabel(status)}</span>
          </span>
        )}
      </Tooltip.Trigger>
      <Tooltip.Content placement="bottom" className="min-w-[240px] p-3">
        <div>
          <div className="mb-3 text-sm font-semibold text-foreground">
            {descriptor.code} · {descriptor.name}
          </div>
          <dl className="space-y-2 text-xs">
            <DetailItem label="Performa" value={formatPercent(indicator?.performance ?? null)} />
            <DetailItem label="Nilai Aktual" value={formatNumber(indicator?.actualValue ?? null)} />
            <DetailItem label="Target" value={formatNumber(indicator?.targetValue ?? null)} />
            <DetailItem label="Bobot Unit" value={formatPercent(indicator?.unitWeight ?? null)} />
            <DetailItem label="Kontribusi Unit" value={formatNumber(indicator?.contribution ?? null)} />
            <DetailItem label="Status" value={statusLabel(status)} />
          </dl>
        </div>
      </Tooltip.Content>
    </Tooltip>
  );
}

export const UnitPerformanceResultsTable: React.FC<UnitPerformanceResultsTableProps> = ({
  rows,
  isLoading,
  error,
  isTransitioning,
  searchQuery,
  onRetry,
  getDetailHref,
}) => {
  const indicatorGroups = useMemo(() => buildIndicatorGroups(rows), [rows]);
  const markDetailOrigin = useCallback((rowId: string) => {
    try {
      sessionStorage.setItem(UNIT_PERFORMANCE_DETAIL_ORIGIN_KEY, rowId);
    } catch {
      // Navigation still works if storage is unavailable; detail will use fallback.
    }
  }, []);
  const tableMinWidth = Math.max(760, 300 + rows.length * 156);

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content
          aria-label="Matrix Performa Unit"
          className="min-w-0"
          style={{ minWidth: `${tableMinWidth}px` }}
        >
          <Table.Header>
            <Table.Column id="indicator" isRowHeader className="sticky left-0 z-10 min-w-[280px] bg-background">
              Indikator
            </Table.Column>
            {rows.map((unit) => (
              <Table.Column key={unit.id} id={`unit-${unit.id}`} className="min-w-[156px] text-center">
                <Link
                  href={getDetailHref(unit.id)}
                  onClick={() => markDetailOrigin(unit.id)}
                  aria-label={unit.unitName}
                  className="flex flex-col items-center rounded-sm px-2 py-1 text-center underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span className="font-semibold">{unit.unitCode || '-'}</span>
                  <span className="max-w-[140px] truncate text-xs font-normal text-muted-foreground">{unit.unitName}</span>
                </Link>
              </Table.Column>
            ))}
          </Table.Header>
          <Table.Body
            renderEmptyState={() => {
              if (isLoading || isTransitioning) return <div className="flex h-24 items-center justify-center"><Spinner size="md" /></div>;
              if (error) return <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground"><span className="text-sm text-danger">{error}</span><Button variant="secondary" size="sm" onPress={onRetry}>Coba Lagi</Button></div>;
              const message = searchQuery.trim()
                ? `Tidak ada unit atau indikator yang cocok dengan "${searchQuery.trim()}".`
                : rows.length === 0
                  ? 'Belum ada unit peserta untuk periode yang dipilih.'
                  : 'Belum ada indikator yang dapat ditampilkan untuk periode yang dipilih.';
              return <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground"><Tray className="h-8 w-8" /><span className="text-sm">{message}</span></div>;
            }}
          >
            {!isLoading && !isTransitioning && !error && indicatorGroups.flatMap((group, groupIndex) => [
              <Table.Row key={`aspect-${group.name}`} id={`aspect-${groupIndex}`}>
                <Table.Cell colSpan={rows.length + 1} className="bg-muted/50 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.name}
                </Table.Cell>
              </Table.Row>,
              ...group.indicators.map((indicator) => (
                <Table.Row key={indicator.id} id={`indicator-${indicator.id}`}>
                  <Table.Cell className="sticky left-0 z-[1] min-w-[280px] bg-background">
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">{indicator.code || '-'}</span>
                      <span className="text-sm text-muted-foreground">{indicator.name || '-'}</span>
                    </div>
                  </Table.Cell>
                  {rows.map((unit) => {
                    const unitIndicator = unit.indicators?.find((item) => item.id === indicator.id);
                    return (
                      <Table.Cell key={`${unit.id}-${indicator.id}`} className="min-w-[156px] p-1 text-center">
                        <PerformanceCell unit={unit} indicator={unitIndicator} descriptor={indicator} />
                      </Table.Cell>
                    );
                  })}
                </Table.Row>
              )),
            ])}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
};
