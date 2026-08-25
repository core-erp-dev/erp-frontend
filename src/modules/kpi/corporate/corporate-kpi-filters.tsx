'use client';

import React from 'react';
import { Button, Dropdown, SearchField, Tabs } from '@heroui/react';
import { CaretDown, ArrowsOutSimple, ArrowsInSimple, Trash, CheckCircle } from '@phosphor-icons/react';
import { MONTH_NAMES_ID } from './period-label';

export interface CorporateKpiFiltersProps {
  periodMode: 'monthly' | 'annual';
  onPeriodModeChange: (mode: 'monthly' | 'annual') => void;
  /** All selectable years with existing structures plus the next available year. */
  years: number[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  selectedMonth: number;
  onMonthChange: (month: number) => void;
  viewMode: 'current' | 'deleted';
  onViewModeChange: (mode: 'current' | 'deleted') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  canViewDeleted: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  allExpanded: boolean;
}

export const CorporateKpiFilters: React.FC<CorporateKpiFiltersProps> = ({
  periodMode,
  onPeriodModeChange,
  years,
  selectedYear,
  onYearChange,
  selectedMonth,
  onMonthChange,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  canViewDeleted,
  onExpandAll,
  onCollapseAll,
  allExpanded,
}) => {
  const selectedMonthName = MONTH_NAMES_ID[selectedMonth - 1] ?? String(selectedMonth);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {/* Period mode — Month | Year */}
        <Tabs
          selectedKey={periodMode}
          onSelectionChange={(key) => onPeriodModeChange(key as 'monthly' | 'annual')}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="Periode">
              <Tabs.Tab id="monthly">Bulan<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="annual">Tahun<Tabs.Indicator /></Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>

        {/* Year — existing structures plus the next available year */}
        <Dropdown>
          <Button variant="tertiary" aria-label="Pilih tahun">
            {selectedYear}
            <CaretDown className="h-4 w-4" />
          </Button>
          <Dropdown.Popover>
            <Dropdown.Menu onAction={(key) => onYearChange(Number(key))}>
              {years.map((y) => (
                <Dropdown.Item key={y} id={String(y)} textValue={String(y)}>
                  {String(y)}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>

        {/* Month — relevant only to the Month tab */}
        {periodMode === 'monthly' && (
          <Dropdown>
            <Button variant="tertiary" aria-label="Pilih bulan">
              {selectedMonthName}
              <CaretDown className="h-4 w-4" />
            </Button>
            <Dropdown.Popover>
              <Dropdown.Menu onAction={(key) => onMonthChange(Number(key))}>
                {MONTH_NAMES_ID.map((name, i) => (
                  <Dropdown.Item key={name} id={String(i + 1)} textValue={name}>
                    {name}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        )}

        {/* Expand / Collapse */}
        {viewMode === 'current' && (
          <Button
            variant="tertiary"
            onPress={allExpanded ? onCollapseAll : onExpandAll}
            aria-label={allExpanded ? 'Tutup semua' : 'Buka semua'}
          >
            {allExpanded ? (
              <ArrowsInSimple className="h-4 w-4" />
            ) : (
              <ArrowsOutSimple className="h-4 w-4" />
            )}
            {allExpanded ? 'Tutup Semua' : 'Buka Semua'}
          </Button>
        )}

        {/* Deleted scope toggle — last in row order (matches Positions) */}
        {canViewDeleted && (
          <Button
            variant="tertiary"
            aria-label={viewMode === 'deleted' ? 'Tampilkan data aktif' : 'Tampilkan data terhapus'}
            onPress={() => onViewModeChange(viewMode === 'deleted' ? 'current' : 'deleted')}
          >
            {viewMode === 'deleted' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <Trash className="h-4 w-4" />
            )}
            {viewMode === 'deleted' ? 'Aktif' : 'Data Terhapus'}
          </Button>
        )}
      </div>

      {/* Search — right side */}
      <SearchField aria-label="Cari KPI Perusahaan" value={searchQuery} onChange={onSearchChange} className="w-72">
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Cari" />
          <SearchField.ClearButton aria-label="Hapus pencarian" />
        </SearchField.Group>
      </SearchField>
    </div>
  );
};
