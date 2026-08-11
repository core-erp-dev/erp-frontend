'use client';

import React from 'react';
import { Button } from '@heroui/react';
import { CircleNotch, Warning, CheckCircle, Prohibit } from '@phosphor-icons/react';
import type { KpiDashboardSummary } from '../kpi-dashboard.types';

export type StatusFilterKey = 'red' | 'yellow' | 'green' | 'notEvaluated';

interface StatusCardsProps {
  summary: KpiDashboardSummary | null;
  selected: StatusFilterKey | null;
  onSelect: (key: StatusFilterKey | null) => void;
}

const CARD_DEFS: {
  key: StatusFilterKey;
  label: string;
  count: (s: KpiDashboardSummary) => number;
  icon: React.FC<{ className?: string }>;
  dotClass: string;
  activeClass: string;
}[] = [
  {
    key: 'red',
    label: 'Merah',
    count: (s) => s.redCount,
    icon: Warning,
    dotClass: 'bg-red-500',
    activeClass: 'ring-2 ring-red-500/60 border-red-500/60',
  },
  {
    key: 'yellow',
    label: 'Kuning',
    count: (s) => s.yellowCount,
    icon: CircleNotch,
    dotClass: 'bg-yellow-400',
    activeClass: 'ring-2 ring-yellow-400/60 border-yellow-400/60',
  },
  {
    key: 'green',
    label: 'Hijau',
    count: (s) => s.greenCount,
    icon: CheckCircle,
    dotClass: 'bg-green-500',
    activeClass: 'ring-2 ring-green-500/60 border-green-500/60',
  },
  {
    key: 'notEvaluated',
    label: 'Tidak Dievaluasi',
    count: (s) => s.notEvaluatedCount,
    icon: Prohibit,
    dotClass: 'bg-muted-foreground',
    activeClass: 'ring-2 ring-muted-foreground/50 border-muted-foreground/50',
  },
];

/**
 * Status summary cards — counts come straight from `summary` (never recomputed
 * here). Clicking a card filters the indicator list below; clicking again
 * clears the filter. The selected card gets a visible ring immediately.
 */
export const StatusCards: React.FC<StatusCardsProps> = ({ summary, selected, onSelect }) => {
  if (!summary) return null;

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {CARD_DEFS.map((def) => {
        const isSelected = selected === def.key;
        return (
          <Button
            key={def.key}
            variant="ghost"
            onPress={() => onSelect(isSelected ? null : def.key)}
            aria-label={`Filter indikator ${def.label}`}
            className={`h-auto w-full cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-secondary ${
              isSelected ? def.activeClass : ''
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-secondary">
              <def.icon
                className={`h-5 w-5 ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}
              />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-2xl font-semibold leading-tight text-foreground">
                {def.count(summary)}
              </span>
              <span className="truncate text-xs text-muted-foreground">{def.label}</span>
            </span>
            <span className={`ml-auto h-2.5 w-2.5 shrink-0 rounded-full ${def.dotClass}`} />
          </Button>
        );
      })}
    </div>
  );
};
