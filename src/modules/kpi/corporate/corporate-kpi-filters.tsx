'use client';

import React from 'react';
import { Button, Dropdown, SearchField, Tabs } from '@heroui/react';
import { CaretDown, ArrowsOutSimple, ArrowsInSimple, Trash, CheckCircle } from '@phosphor-icons/react';
import { MONTH_NAMES_EN } from './period-label';

export interface CorporateKpiFiltersProps {
  periodMode: 'monthly' | 'annual';
  onPeriodModeChange: (mode: 'monthly' | 'annual') => void;
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
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear + i - 3);
  const selectedMonthName = MONTH_NAMES_EN[selectedMonth - 1] ?? String(selectedMonth);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {/* Period mode — Month | Year */}
        <Tabs
          selectedKey={periodMode}
          onSelectionChange={(key) => onPeriodModeChange(key as 'monthly' | 'annual')}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="Period">
              <Tabs.Tab id="monthly">Month<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="annual">Year<Tabs.Indicator /></Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>

        {/* Year — HeroUI Dropdown */}
        <Dropdown>
          <Button variant="tertiary" aria-label="Select year">
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
            <Button variant="tertiary" aria-label="Select month">
              {selectedMonthName}
              <CaretDown className="h-4 w-4" />
            </Button>
            <Dropdown.Popover>
              <Dropdown.Menu onAction={(key) => onMonthChange(Number(key))}>
                {MONTH_NAMES_EN.map((name, i) => (
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
            aria-label={allExpanded ? 'Collapse all' : 'Expand all'}
          >
            {allExpanded ? (
              <ArrowsInSimple className="h-4 w-4" />
            ) : (
              <ArrowsOutSimple className="h-4 w-4" />
            )}
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </Button>
        )}

        {/* Deleted scope toggle — last in row order (matches Positions) */}
        {canViewDeleted && (
          <Button
            variant="tertiary"
            aria-label={viewMode === 'deleted' ? 'Show current' : 'Show deleted'}
            onPress={() => onViewModeChange(viewMode === 'deleted' ? 'current' : 'deleted')}
          >
            {viewMode === 'deleted' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <Trash className="h-4 w-4" />
            )}
            {viewMode === 'deleted' ? 'Current' : 'Deleted'}
          </Button>
        )}
      </div>

      {/* Search — right side */}
      <SearchField aria-label="Search Corporate KPIs" value={searchQuery} onChange={onSearchChange} className="w-72">
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search" />
          <SearchField.ClearButton aria-label="Clear search" />
        </SearchField.Group>
      </SearchField>
    </div>
  );
};
