'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Alert, Button, Breadcrumbs, BreadcrumbsItem, Chip, Tabs, Dropdown, SearchField } from '@heroui/react';
import { House, CaretDown } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS, KPI_ROUTES } from '@/modules/kpi/constants';
import { useVariableValuesData } from '@/modules/kpi/corporate/values/use-variable-values-data';
import { ValuesSheetTable } from '@/modules/kpi/corporate/values/values-sheet-table';
import { MONTH_NAMES_EN } from '@/modules/kpi/corporate/period-label';

type PeriodMode = 'monthly' | 'annual';

export default function KpiCorporateVariableValuesPage() {
  const { hasPerm } = usePermission();
  const canRead = hasPerm(PERM.CORPORATE_KPI_READ);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const years = useMemo(
    () => Array.from({ length: 7 }, (_, i) => currentYear + i - 3),
    [currentYear],
  );

  // ── Page-local UI state ──
  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Server data ──
  const { sheet, isLoading, error, fetchSheet } = useVariableValuesData();

  // Auto-fetch on mount and when the period changes.
  // Monthly: year + month. Annual: year only — the month parameter is omitted.
  useEffect(() => {
    if (canRead) {
      fetchSheet({ year: selectedYear, ...(periodMode === 'monthly' ? { month: selectedMonth } : {}) });
    }
  }, [canRead, selectedYear, periodMode, selectedMonth, fetchSheet]);

  // ── Handlers ──

  const handleModeChange = useCallback((mode: PeriodMode) => {
    setPeriodMode(mode);
    // Annual scope omits the month entirely; keep the month selection for the Month tab.
    if (mode === 'annual') setSelectedMonth(currentMonth);
  }, [currentMonth]);

  const handleYearChange = useCallback((year: number) => setSelectedYear(year), []);
  const handleMonthChange = useCallback((month: number) => setSelectedMonth(month), []);
  const handleRetry = useCallback(() => {
    fetchSheet({ year: selectedYear, ...(periodMode === 'monthly' ? { month: selectedMonth } : {}) });
  }, [fetchSheet, selectedYear, periodMode, selectedMonth]);

  // Client-side search over code/name — same pattern as the Corporate KPI list page.
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sheet;
    return sheet.filter(
      (row) =>
        row.variableCode.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q),
    );
  }, [sheet, searchQuery]);

  const selectedMonthName = MONTH_NAMES_EN[selectedMonth - 1] ?? String(selectedMonth);

  const emptyLabel = searchQuery.trim()
    ? `No values match "${searchQuery.trim()}".`
    : periodMode === 'annual'
      ? 'No variables require an annual value for this year.'
      : 'No variable values found for the selected period.';

  // ── Permission guard ──

  if (!canRead) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Breadcrumbs>
          <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
          <BreadcrumbsItem>KPI</BreadcrumbsItem>
          <BreadcrumbsItem>Corporate KPI</BreadcrumbsItem>
          <BreadcrumbsItem>{KPI_LABELS.corporateVariableValues}</BreadcrumbsItem>
        </Breadcrumbs>
        <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.corporateVariableValues}</h1>
        <Alert status="danger">Access Denied</Alert>
      </div>
    );
  }

  // ── Rendered page ──

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem>KPI</BreadcrumbsItem>
        <BreadcrumbsItem href={KPI_ROUTES.corporate}>Corporate KPI</BreadcrumbsItem>
        <BreadcrumbsItem>{KPI_LABELS.corporateVariableValues}</BreadcrumbsItem>
      </Breadcrumbs>

      {/* Row 1: Title + Chip counter — no page-level action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.corporateVariableValues}</h1>
          <Chip
            size="md"
            className="pointer-events-none"
            aria-label={`Total ${sheet.length} variable values`}
          >
            {sheet.length}
          </Chip>
        </div>
      </div>

      {/* Row 2: Period tabs + Year/Month dropdowns | Search */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Period mode — Month | Year */}
          <Tabs
            selectedKey={periodMode}
            onSelectionChange={(key) => handleModeChange(key as PeriodMode)}
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
              <Dropdown.Menu onAction={(key) => handleYearChange(Number(key))}>
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
                <Dropdown.Menu onAction={(key) => handleMonthChange(Number(key))}>
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

        {/* Search — right side */}
        <SearchField aria-label="Search KPI values" value={searchQuery} onChange={setSearchQuery} className="w-72">
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search" />
            <SearchField.ClearButton aria-label="Clear search" />
          </SearchField.Group>
        </SearchField>
      </div>

      {/* Read-only values table (values are entered on the Year/Month sheet views) */}
      <ValuesSheetTable
        sheet={filteredRows}
        isLoading={isLoading}
        error={error}
        onRetry={handleRetry}
        canEdit={false}
        tableKey={`kpi-values-${periodMode}`}
        emptyLabel={emptyLabel}
      />
    </div>
  );
}
