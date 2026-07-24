'use client';

import React from 'react';
import { Button, Select, ListBox, SearchField } from '@heroui/react';
import { CaretDown, CaretRight } from '@phosphor-icons/react';

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
}) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear + i - 3);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* View mode toggle */}
      <div className="flex gap-1">
        <Button
          variant={viewMode === 'current' ? 'primary' : 'secondary'}
          size="sm"
          onPress={() => onViewModeChange('current')}
        >
          Current KPIs
        </Button>
        {canViewDeleted && (
          <Button
            variant={viewMode === 'deleted' ? 'primary' : 'secondary'}
            size="sm"
            onPress={() => onViewModeChange('deleted')}
          >
            Deleted KPIs
          </Button>
        )}
      </div>

      {/* Search */}
      <SearchField aria-label="Search Corporate KPIs" value={searchQuery} onChange={onSearchChange}>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search Corporate KPIs" className="min-w-[200px]" />
          <SearchField.ClearButton aria-label="Clear search" />
        </SearchField.Group>
      </SearchField>

      {/* Year select */}
      <Select
        variant="secondary"
        className="min-w-[120px]"
        selectedKey={String(selectedYear)}
        onSelectionChange={(key) => {
          if (key) onYearChange(Number(key));
        }}
        placeholder="Year"
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {years.map((y) => (
              <ListBox.Item key={String(y)} textValue={String(y)}>
                {String(y)}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      {/* Expand / Collapse (only in current view) */}
      {viewMode === 'current' && (
        <div className="flex gap-1">
          <Button
            variant="secondary"
            size="sm"
            onPress={onExpandAll}
            aria-label="Expand All"
          >
            <CaretDown className="h-4 w-4" />
            Expand All
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onPress={onCollapseAll}
            aria-label="Collapse All"
          >
            <CaretRight className="h-4 w-4" />
            Collapse All
          </Button>
        </div>
      )}
    </div>
  );
};
