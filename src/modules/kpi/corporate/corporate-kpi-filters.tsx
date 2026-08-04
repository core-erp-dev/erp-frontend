'use client';

import React from 'react';
import { Button, Dropdown, SearchField, Tabs } from '@heroui/react';
import { CaretDown, ArrowsOutSimple, ArrowsInSimple } from '@phosphor-icons/react';

export interface CorporateKpiFiltersProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
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
  selectedYear,
  onYearChange,
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

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {/* View mode — HeroUI Tabs */}
        <Tabs
          selectedKey={viewMode}
          onSelectionChange={(key) => onViewModeChange(key as 'current' | 'deleted')}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="View">
              <Tabs.Tab id="current">Current<Tabs.Indicator /></Tabs.Tab>
              {canViewDeleted && (
                <Tabs.Tab id="deleted">Deleted<Tabs.Indicator /></Tabs.Tab>
              )}
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
