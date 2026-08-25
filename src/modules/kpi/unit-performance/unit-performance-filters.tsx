'use client';

import React from 'react';
import { Button, Dropdown, SearchField, Tabs } from '@heroui/react';
import { CaretDown } from '@phosphor-icons/react';
import { MONTH_NAMES_ID } from '@/modules/kpi/corporate/period-label';

export interface UnitPerformanceFiltersProps {
  periodMode: 'monthly' | 'annual';
  selectedYear: number;
  years: number[];
  selectedMonth: number;
  searchQuery: string;
  onPeriodModeChange: (mode: 'monthly' | 'annual') => void;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onSearchChange: (value: string) => void;
}

export const UnitPerformanceFilters: React.FC<UnitPerformanceFiltersProps> = ({
  periodMode,
  selectedYear,
  years,
  selectedMonth,
  searchQuery,
  onPeriodModeChange,
  onYearChange,
  onMonthChange,
  onSearchChange,
}) => (
  <div className="flex items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      <Tabs selectedKey={periodMode} onSelectionChange={(key) => onPeriodModeChange(key as 'monthly' | 'annual')}>
        <Tabs.ListContainer>
          <Tabs.List aria-label="Periode Performa Unit">
            <Tabs.Tab id="monthly">Bulan<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="annual">Tahun<Tabs.Indicator /></Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>

      <Dropdown>
        <Button variant="tertiary" aria-label="Pilih tahun">
          {selectedYear}<CaretDown className="h-4 w-4" />
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu onAction={(key) => onYearChange(Number(key))}>
            {years.map((year) => <Dropdown.Item key={year} id={String(year)} textValue={String(year)}>{year}</Dropdown.Item>)}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      {periodMode === 'monthly' && (
        <Dropdown>
          <Button variant="tertiary" aria-label="Pilih bulan">
            {MONTH_NAMES_ID[selectedMonth - 1] ?? selectedMonth}<CaretDown className="h-4 w-4" />
          </Button>
          <Dropdown.Popover>
            <Dropdown.Menu onAction={(key) => onMonthChange(Number(key))}>
              {MONTH_NAMES_ID.map((month, index) => <Dropdown.Item key={month} id={String(index + 1)} textValue={month}>{month}</Dropdown.Item>)}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      )}

    </div>

    <SearchField aria-label="Cari Performa Unit" value={searchQuery} onChange={onSearchChange} className="w-72">
      <SearchField.Group>
        <SearchField.SearchIcon />
        <SearchField.Input placeholder="Cari unit" />
        <SearchField.ClearButton aria-label="Hapus pencarian" />
      </SearchField.Group>
    </SearchField>
  </div>
);
