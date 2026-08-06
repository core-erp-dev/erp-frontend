'use client';

import React from 'react';
import { Button, Dropdown, Tabs } from '@heroui/react';
import { CaretDown } from '@phosphor-icons/react';
import { MONTH_NAMES_EN } from '../corporate/period-label';

export interface UnitPerformanceFiltersProps {
  periodMode: 'monthly' | 'annual';
  onPeriodModeChange: (mode: 'monthly' | 'annual') => void;
  selectedYear: number;
  onYearChange: (year: number) => void;
  selectedMonth: number;
  onMonthChange: (month: number) => void;
}

export const UnitPerformanceFilters: React.FC<UnitPerformanceFiltersProps> = ({
  periodMode,
  onPeriodModeChange,
  selectedYear,
  onYearChange,
  selectedMonth,
  onMonthChange,
}) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear + i - 3);
  const selectedMonthName = MONTH_NAMES_EN[selectedMonth - 1] ?? String(selectedMonth);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {/* Period mode — Month | Year (Corporate KPI pattern) */}
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
      </div>
    </div>
  );
};
