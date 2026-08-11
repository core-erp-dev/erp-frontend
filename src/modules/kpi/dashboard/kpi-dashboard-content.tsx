'use client';

import React, { useState } from 'react';
import { Alert, Button, Surface } from '@heroui/react';
import { ChartBar } from '@phosphor-icons/react';
import { useKpiDashboardData } from './use-kpi-dashboard-data';
import { PeriodFilter, MONTH_NAMES_ID } from './components/period-filter';
import { StatusCards, type StatusFilterKey } from './components/status-cards';
import { SummaryValues } from './components/summary-values';
import { UnitPerformanceList } from './components/unit-performance-list';
import { IndicatorList, type IndicatorTabKey } from './components/indicator-list';
import { DashboardSkeleton } from './components/dashboard-skeleton';

function periodLabel(year: number, fromMonth: number | null, toMonth: number | null): string {
  if (fromMonth == null || toMonth == null) return `Tahun ${year}`;
  if (fromMonth === toMonth) return `${MONTH_NAMES_ID[fromMonth - 1]} ${year}`;
  return `${MONTH_NAMES_ID[fromMonth - 1]} – ${MONTH_NAMES_ID[toMonth - 1]} ${year}`;
}

/**
 * KPI Dashboard (PMS) — "Dashboard Kinerja". Everything comes from ONE backend
 * call per period (`GET /api/v1/kpi-dashboard`); this page only formats and
 * filters display data. The filter selection is URL-synced (refresh keeps the
 * period). Non-OK indicators are never colored as evaluated.
 */
export const KpiDashboardContent: React.FC = () => {
  const {
    period,
    setPeriod,
    resetToAnnual,
    refresh,
    data,
    isLoading,
    isRefetching,
    error,
    validationError,
    availableYears,
  } = useKpiDashboardData();

  const [selectedTab, setSelectedTab] = useState<IndicatorTabKey>('all');
  const selectedCard: StatusFilterKey | null =
    selectedTab === 'all' ? null : selectedTab;

  const subtitle = data
    ? `Periode ${periodLabel(period.year, period.fromMonth, period.toMonth)} · ${
        data.summary.evaluatedIndicatorCount
      } indikator dievaluasi, ${data.summary.redCount} merah, ${
        data.summary.yellowCount
      } kuning, ${data.summary.greenCount} hijau, ${data.summary.notEvaluatedCount} tidak dievaluasi`
    : `Periode ${periodLabel(period.year, period.fromMonth, period.toMonth)}`;

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <ChartBar className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">Dashboard Kinerja</h1>
        </div>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {/* Period filter */}
      <PeriodFilter
        period={period}
        years={availableYears.length > 0 ? availableYears : [period.year]}
        validationError={validationError}
        onChange={setPeriod}
        onResetToAnnual={resetToAnnual}
        onRefresh={refresh}
        isRefetching={isRefetching}
      />

      {validationError ? (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{validationError}</Alert.Title>
          </Alert.Content>
        </Alert>
      ) : isLoading ? (
        <DashboardSkeleton />
      ) : error ? (
        <Surface className="flex flex-col items-start gap-4 rounded-3xl p-6">
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{error}</Alert.Title>
            </Alert.Content>
          </Alert>
          <Button variant="primary" onPress={refresh}>
            Coba Lagi
          </Button>
        </Surface>
      ) : data == null || data.indicators.length === 0 ? (
        <Surface className="flex flex-col items-center gap-2 rounded-3xl p-12 text-center">
          <ChartBar className="h-10 w-10 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Belum ada data KPI</h2>
          <p className="text-sm text-muted-foreground">
            Data KPI untuk periode yang dipilih belum tersedia. Pilih tahun atau periode lain.
          </p>
        </Surface>
      ) : (
        <div
          className={`flex w-full flex-col gap-6 transition-opacity ${
            isRefetching ? 'opacity-60' : 'opacity-100'
          }`}
        >
          {/* Status summary cards (click to filter the list) */}
          <StatusCards
            summary={data.summary}
            selected={selectedCard}
            onSelect={(key) => setSelectedTab(key ?? 'all')}
          />

          {/* Four backend totals */}
          <SummaryValues summary={data.summary} />

          {/* Performance per Unit */}
          <UnitPerformanceList rows={data.unitPerformance} />

          {/* Flat indicator list with display-only tabs */}
          <IndicatorList
            indicators={data.indicators}
            summary={data.summary}
            selected={selectedTab}
            onSelect={setSelectedTab}
          />
        </div>
      )}
    </div>
  );
};
