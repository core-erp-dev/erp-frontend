'use client';

import React, { useMemo } from 'react';
import { Surface, Tabs } from '@heroui/react';
import { Info } from '@phosphor-icons/react';
import type { KpiIndicatorWarning, KpiDashboardSummary } from '../kpi-dashboard.types';
import { reasonLabel } from '../kpi-dashboard.types';
import type { StatusFilterKey } from './status-cards';

export type IndicatorTabKey = 'all' | StatusFilterKey;

interface IndicatorListProps {
  indicators: KpiIndicatorWarning[];
  summary: KpiDashboardSummary | null;
  selected: IndicatorTabKey;
  onSelect: (key: IndicatorTabKey) => void;
}

const TABS: { key: IndicatorTabKey; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'red', label: 'Merah' },
  { key: 'yellow', label: 'Kuning' },
  { key: 'green', label: 'Hijau' },
  { key: 'notEvaluated', label: 'Tidak Dievaluasi' },
];

function tabCount(tab: IndicatorTabKey, summary: KpiDashboardSummary | null): number | null {
  if (!summary) return null;
  switch (tab) {
    case 'all': return summary.totalIndicatorCount;
    case 'red': return summary.redCount;
    case 'yellow': return summary.yellowCount;
    case 'green': return summary.greenCount;
    case 'notEvaluated': return summary.notEvaluatedCount;
  }
}

function matches(tab: IndicatorTabKey, indicator: KpiIndicatorWarning): boolean {
  switch (tab) {
    case 'all': return true;
    case 'red': return indicator.warningLevel === 'RED';
    case 'yellow': return indicator.warningLevel === 'YELLOW';
    case 'green': return indicator.warningLevel === 'GREEN';
    case 'notEvaluated': return indicator.evaluationStatus !== 'OK';
  }
}

function formatScore(value: number | null): string {
  return value == null ? '—' : String(value);
}

function formatDecimal(value: number | null): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(value);
}

function formatPercent(value: number | null): string {
  if (value == null) return '—';
  return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value)}%`;
}

const LEVEL_DOT: Record<string, string> = {
  RED: 'bg-red-500',
  YELLOW: 'bg-yellow-400',
  GREEN: 'bg-green-500',
};

const LEVEL_LABEL: Record<string, string> = {
  RED: 'Merah',
  YELLOW: 'Kuning',
  GREEN: 'Hijau',
};

/**
 * Flat indicator list — the backend's `indicators` array, filtered ONLY for
 * display. Warning colors appear solely on OK indicators; every non-OK row
 * shows a neutral "Tidak Dievaluasi" state with a user-friendly reason mapped
 * from `reasonCode`. All 18 indicators stay reachable via the "Semua" tab.
 */
export const IndicatorList: React.FC<IndicatorListProps> = ({
  indicators,
  summary,
  selected,
  onSelect,
}) => {
  const visible = useMemo(
    () => indicators.filter((indicator) => matches(selected, indicator)),
    [indicators, selected],
  );

  return (
    <Surface className="rounded-3xl p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Daftar Indikator
        </h2>
        <Tabs
          selectedKey={selected}
          onSelectionChange={(key) => onSelect(key as IndicatorTabKey)}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="Filter indikator">
              {TABS.map((tab) => {
                const count = tabCount(tab.key, summary);
                return (
                  <Tabs.Tab key={tab.key} id={tab.key}>
                    {tab.label}
                    {count != null ? ` (${count})` : ''}
                    <Tabs.Indicator />
                  </Tabs.Tab>
                );
              })}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface-secondary px-4 py-10 text-center">
          <Info className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Tidak ada indikator pada filter ini.</p>
        </div>
      ) : (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border">
          {/* Header row — desktop only */}
          <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)] gap-4 border-b border-border bg-surface-secondary px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid">
            <span>Indikator</span>
            <span>Skor (Aktual / Target)</span>
            <span>Capaian</span>
            <span>Hasil (Aktual / Target)</span>
            <span className="text-right">Status</span>
          </div>

          {visible.map((indicator) => {
            const isOk = indicator.evaluationStatus === 'OK';
            const reason = isOk ? null : reasonLabel(indicator.reasonCode);
            return (
              <div
                key={indicator.id}
                data-testid="indicator-row"
                className="grid grid-cols-1 gap-2 border-b border-border px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)] md:items-center md:gap-4"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-foreground">{indicator.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {indicator.code}
                    {indicator.aspectName ? ` · ${indicator.aspectName}` : ''}
                  </span>
                </div>

                <div className="flex md:block">
                  <span className="w-32 shrink-0 text-xs text-muted-foreground md:hidden">Skor</span>
                  <span className="text-sm text-foreground">
                    {formatScore(indicator.actualScore)} / {formatScore(indicator.targetScore)}
                  </span>
                </div>

                <div className="flex md:block">
                  <span className="w-32 shrink-0 text-xs text-muted-foreground md:hidden">Capaian</span>
                  <span className="text-sm font-medium text-foreground">
                    {formatPercent(indicator.achievement)}
                  </span>
                </div>

                <div className="flex md:block">
                  <span className="w-32 shrink-0 text-xs text-muted-foreground md:hidden">Hasil</span>
                  <span className="text-sm text-foreground">
                    {formatDecimal(indicator.actualResult)} / {formatDecimal(indicator.targetResult)}
                  </span>
                </div>

                <div className="flex flex-col items-start gap-0.5 md:items-end">
                  {isOk ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          indicator.warningLevel ? LEVEL_DOT[indicator.warningLevel] : 'bg-muted-foreground'
                        }`}
                      />
                      {indicator.warningLevel ? LEVEL_LABEL[indicator.warningLevel] : 'OK'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      <Info className="h-3.5 w-3.5" />
                      Tidak Dievaluasi
                    </span>
                  )}
                  {reason && (
                    <span className="max-w-[260px] text-right text-[11px] leading-snug text-muted-foreground">
                      {reason}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Surface>
  );
};
