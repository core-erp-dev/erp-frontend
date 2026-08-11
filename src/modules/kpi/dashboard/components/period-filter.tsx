'use client';

import React from 'react';
import { Button, Label, ListBox, Select } from '@heroui/react';
import { ArrowsClockwise, CalendarBlank } from '@phosphor-icons/react';
import type { DashboardPeriod } from '../kpi-dashboard.types';

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const;

interface PeriodFilterProps {
  period: DashboardPeriod;
  years: number[];
  validationError: string | null;
  onChange: (patch: Partial<DashboardPeriod>) => void;
  onResetToAnnual: () => void;
  onRefresh: () => void;
  isRefetching: boolean;
}

/**
 * Period controls — year + inclusive month range. Both month selectors empty
 * = annual evaluation. Picking "Dari bulan" defaults "Sampai bulan" to the
 * same month (single-month period); an inverted or incomplete range is blocked
 * before any request. The backend contract (year only for annual, both months
 * for a range) is enforced by `useKpiDashboardData`.
 */
export const PeriodFilter: React.FC<PeriodFilterProps> = ({
  period,
  years,
  validationError,
  onChange,
  onResetToAnnual,
  onRefresh,
  isRefetching,
}) => {
  const isAnnual = period.fromMonth == null && period.toMonth == null;

  const handleFromChange = (key: React.Key | null) => {
    if (key === NIL_UUID) { onResetToAnnual(); return; }
    const from = Number(key);
    const to = period.toMonth != null && period.toMonth >= from ? period.toMonth : from;
    onChange({ fromMonth: from, toMonth: to });
  };

  const handleToChange = (key: React.Key | null) => {
    if (key === NIL_UUID) { onResetToAnnual(); return; }
    const to = Number(key);
    const from = period.fromMonth != null && period.fromMonth <= to ? period.fromMonth : to;
    onChange({ fromMonth: from, toMonth: to });
  };

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-wrap items-end gap-3">
        <Select
          variant="secondary"
          selectedKey={String(period.year)}
          onSelectionChange={(key) => onChange({ year: Number(key) })}
          className="w-36"
        >
          <Label>Tahun</Label>
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              {years.map((y) => (
                <ListBox.Item key={String(y)} id={String(y)} textValue={String(y)}>
                  {y}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <Select
          variant="secondary"
          selectedKey={period.fromMonth != null ? String(period.fromMonth) : NIL_UUID}
          onSelectionChange={handleFromChange}
          className="w-40"
        >
          <Label>Dari bulan</Label>
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item key={NIL_UUID} id={NIL_UUID} textValue="Tahunan">
                Tahunan
              </ListBox.Item>
              {MONTH_NAMES_ID.map((name, i) => (
                <ListBox.Item key={String(i + 1)} id={String(i + 1)} textValue={name}>
                  {name}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <Select
          variant="secondary"
          selectedKey={period.toMonth != null ? String(period.toMonth) : NIL_UUID}
          onSelectionChange={handleToChange}
          className="w-40"
        >
          <Label>Sampai bulan</Label>
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item key={NIL_UUID} id={NIL_UUID} textValue="Tahunan">
                Tahunan
              </ListBox.Item>
              {MONTH_NAMES_ID.map((name, i) => (
                <ListBox.Item key={String(i + 1)} id={String(i + 1)} textValue={name}>
                  {name}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        {!isAnnual && (
          <Button variant="secondary" onPress={onResetToAnnual}>
            <CalendarBlank className="h-4 w-4" />
            Tahunan
          </Button>
        )}
        <Button
          isIconOnly
          variant="tertiary"
          onPress={onRefresh}
          isDisabled={isRefetching}
          aria-label="Muat ulang"
        >
          <ArrowsClockwise className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {validationError && (
        <p className="text-sm text-danger">{validationError}</p>
      )}
    </div>
  );
};
