'use client';

import React, { useMemo, useState } from 'react';
import { Button, TextField, Input, Chip } from '@heroui/react';
import type {
  UnitPerformanceWeightEntry,
  UnitPerformanceWeightMatrix as UnitPerformanceWeightMatrixData,
} from './unit-performance.types';

interface UnitPerformanceWeightMatrixProps {
  matrix: UnitPerformanceWeightMatrixData;
  isMutating: boolean;
  onSave: (entries: UnitPerformanceWeightEntry[]) => Promise<boolean>;
}

const WEIGHT_PATTERN = /^\d{1,3}(\.\d{1,2})?$/;

/** Parse a weight input into integer cents (exact integer math — no float drift). */
function toCents(value: string): number | null {
  const trimmed = value.trim();
  if (!WEIGHT_PATTERN.test(trimmed)) return null;
  const cents = Math.round(Number(trimmed) * 100);
  if (cents <= 0 || cents > 10000) return null;
  return cents;
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2).replace(/\.00$/, '');
}

/**
 * The Indicator × Unit weight matrix editor. Rows = indicators of the year's
 * structure; columns = active participating units (dynamic — a new unit
 * automatically becomes a new column); every cell is a percentage input; the
 * Total column shows each indicator's sum live. Save is enabled only when
 * every indicator totals EXACTLY 100% with all cells filled (> 0).
 */
export const UnitPerformanceWeightMatrix: React.FC<UnitPerformanceWeightMatrixProps> = ({
  matrix,
  isMutating,
  onSave,
}) => {
  // cell values keyed by indicatorId -> unitPerformanceId -> string
  const [cells, setCells] = useState<Record<string, Record<string, string>>>(() => {
    const initial: Record<string, Record<string, string>> = {};
    for (const w of matrix.weights) {
      initial[w.indicatorId] = { ...(initial[w.indicatorId] ?? {}), [w.unitPerformanceId]: String(w.weight) };
    }
    return initial;
  });

  const setCell = React.useCallback((indicatorId: string, unitId: string, value: string) => {
    setCells((prev) => ({
      ...prev,
      [indicatorId]: { ...(prev[indicatorId] ?? {}), [unitId]: value },
    }));
  }, []);

  const perIndicator = useMemo(() => {
    const result = new Map<string, { totalCents: number; allFilled: boolean }>();
    for (const indicator of matrix.indicators) {
      let totalCents = 0;
      let allFilled = true;
      for (const unit of matrix.units) {
        const cents = toCents(cells[indicator.id]?.[unit.id] ?? '');
        if (cents == null) { allFilled = false; continue; }
        totalCents += cents;
      }
      result.set(indicator.id, { totalCents, allFilled });
    }
    return result;
  }, [cells, matrix.indicators, matrix.units]);

  const allValid = useMemo(
    () => matrix.indicators.every((ind) => {
      const info = perIndicator.get(ind.id);
      return info != null && info.allFilled && info.totalCents === 10000;
    }),
    [matrix.indicators, perIndicator],
  );

  const handleSave = React.useCallback(async () => {
    const entries: UnitPerformanceWeightEntry[] = [];
    for (const indicator of matrix.indicators) {
      for (const unit of matrix.units) {
        const cents = toCents(cells[indicator.id]?.[unit.id] ?? '');
        if (cents == null) continue; // guarded by allValid
        entries.push({
          indicatorId: indicator.id,
          unitPerformanceId: unit.id,
          weight: Number((cents / 100).toFixed(2)),
        });
      }
    }
    await onSave(entries);
  }, [cells, matrix.indicators, matrix.units, onSave]);

  if (matrix.indicators.length === 0 || matrix.units.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface-secondary px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          {matrix.units.length === 0
            ? 'No participating units yet — add a unit to start configuring the weight matrix.'
            : 'No indicators for this year — configure the Corporate KPI structure first.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border-b border-r border-border bg-surface-secondary px-4 py-3 text-left font-semibold text-foreground">
                Indicator
              </th>
              {matrix.units.map((unit) => (
                <th
                  key={unit.id}
                  className="min-w-[140px] border-b border-r border-border bg-surface-secondary px-3 py-3 text-left font-semibold text-foreground"
                >
                  <span className="block truncate">{unit.unitName}</span>
                  <span className="block text-xs font-normal text-muted-foreground">{unit.unitCode}</span>
                </th>
              ))}
              <th className="min-w-[110px] border-b border-border bg-surface-secondary px-3 py-3 text-left font-semibold text-foreground">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {matrix.indicators.map((indicator) => {
              const info = perIndicator.get(indicator.id);
              const totalCents = info?.totalCents ?? 0;
              const complete = info?.allFilled === true && totalCents === 10000;
              return (
                <tr key={indicator.id}>
                  <td className="sticky left-0 z-10 border-b border-r border-border bg-surface-secondary px-4 py-2.5 align-top">
                    <span className="block truncate font-medium text-foreground">{indicator.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {indicator.code} · {indicator.aspectName}
                    </span>
                  </td>
                  {matrix.units.map((unit) => (
                    <td key={unit.id} className="border-b border-r border-border px-3 py-2 align-top">
                      <TextField
                        className="w-full"
                        value={cells[indicator.id]?.[unit.id] ?? ''}
                        onChange={(v) => setCell(indicator.id, unit.id, v)}
                        isDisabled={isMutating}
                        validationBehavior="aria"
                        variant="secondary"
                        aria-label={`${indicator.name} — ${unit.unitName} weight`}
                      >
                        <Input placeholder="0" inputMode="decimal" />
                      </TextField>
                    </td>
                  ))}
                  <td className="border-b border-border px-3 py-2 align-top">
                    {info?.allFilled ? (
                      <Chip
                        size="sm"
                        variant="soft"
                        color={complete ? 'success' : 'danger'}
                        className="font-medium"
                      >
                        {formatCents(totalCents)}%
                      </Chip>
                    ) : (
                      <Chip size="sm" variant="soft" color="warning" className="font-medium">—</Chip>
                    )}
                    {!complete && (
                      <p className="mt-1 text-[11px] text-danger">
                        {info?.allFilled ? 'Must total exactly 100%' : 'Fill every unit weight (> 0)'}
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {allValid
            ? 'Every indicator totals exactly 100% — the matrix is ready to save.'
            : 'Save is disabled until every indicator totals exactly 100% with a weight for every unit.'}
        </p>
        <Button
          variant="primary"
          onPress={handleSave}
          isDisabled={!allValid || isMutating}
          isPending={isMutating}
        >
          Save Matrix
        </Button>
      </div>
    </div>
  );
};
