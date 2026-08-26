'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Breadcrumbs, BreadcrumbsItem, Button, Chip } from '@heroui/react';
import { ArrowsClockwise, House } from '@phosphor-icons/react';
import { useDebounce } from '@/hooks/use-debounce';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { ForbiddenAccess } from '@/components/shared/forbidden-access';
import { KPI_LABELS, KPI_ROUTES } from '@/modules/kpi/constants';
import { getCorporateKpiDefaultValueYear } from '@/modules/kpi/corporate/corporate-kpi-year-options';
import { useUnitPerformancePeriods } from '@/modules/kpi/unit-performance/use-unit-performance-periods';
import { useUnitPerformanceResults } from '@/modules/kpi/unit-performance/use-unit-performance-results';
import { UnitPerformanceFilters } from '@/modules/kpi/unit-performance/unit-performance-filters';
import { UnitPerformanceResultsTable } from '@/modules/kpi/unit-performance/unit-performance-results-table';
import type { UnitPerformanceRow } from '@/modules/kpi/unit-performance/unit-performance.types';

function parseYear(value: string | null): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseMonth(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 12 ? parsed : fallback;
}

function filterRows(rows: UnitPerformanceRow[], searchQuery: string): UnitPerformanceRow[] {
  const query = searchQuery.trim().toLowerCase();
  return rows.filter((row) => !query || row.unitCode.toLowerCase().includes(query) || row.unitName.toLowerCase().includes(query));
}

export default function UnitPerformancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPerm } = usePermission();
  const canRead = hasPerm(PERM.UNIT_PERFORMANCE_READ);
  const canReadCorporateKpi = hasPerm(PERM.CORPORATE_KPI_READ) || hasPerm(PERM.CORPORATE_KPI_MANAGE);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const periodMode: 'monthly' | 'annual' = searchParams.get('period') === 'annual' ? 'annual' : 'monthly';
  const urlYear = parseYear(searchParams.get('year'));
  const selectedMonth = parseMonth(searchParams.get('month'), currentMonth);
  const searchQuery = searchParams.get('search') ?? '';
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [isSearchTransitioning, setIsSearchTransitioning] = useState(false);
  const { years: availableYears, isLoading: isPeriodLoading, error: periodError, refetch: refetchPeriods } = useUnitPerformancePeriods(canReadCorporateKpi);
  const { rows, isLoading, error, fetchPerformance } = useUnitPerformanceResults();

  // A period backed by KPI structures is not valid until that metadata has
  // loaded. Keep the selector at '-' and do not issue a request for a
  // calendar-year guess while the valid year is being resolved.
  const selectedYear = canReadCorporateKpi
    ? availableYears !== null && availableYears.length > 0
      ? urlYear != null && availableYears.includes(urlYear)
        ? urlYear
        : getCorporateKpiDefaultValueYear(availableYears, currentYear)
      : null
    : urlYear ?? currentYear;

  const updateUrl = useCallback((patch: Partial<{ period: 'monthly' | 'annual'; year: number; month: number; search: string }>) => {
    const next = { period: periodMode, year: selectedYear, month: selectedMonth, search: searchQuery, ...patch };
    const params = new URLSearchParams();
    if (next.period === 'annual') params.set('period', 'annual');
    if (next.year != null && next.year !== currentYear) params.set('year', String(next.year));
    if (next.period === 'monthly' && next.month !== currentMonth) params.set('month', String(next.month));
    if (next.search) params.set('search', next.search);
    router.replace(params.toString() ? `${KPI_ROUTES.unitPerformance}?${params.toString()}` : KPI_ROUTES.unitPerformance, { scroll: false });
  }, [currentMonth, currentYear, periodMode, router, searchQuery, selectedMonth, selectedYear]);

  const markTransition = useCallback(() => setIsTransitioning(true), []);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (!searchParams.has('page')) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    router.replace(params.toString() ? `${KPI_ROUTES.unitPerformance}?${params.toString()}` : KPI_ROUTES.unitPerformance, { scroll: false });
  }, [router, searchParams]);

  const debouncedSearch = useDebounce(searchInput, 400);
  useEffect(() => {
    if (debouncedSearch === searchQuery) {
      setIsSearchTransitioning(false);
      return;
    }
    updateUrl({ search: debouncedSearch });
  }, [debouncedSearch, searchQuery, updateUrl]);

  const hasValidSelectedYear = !canReadCorporateKpi
    ? true
    : selectedYear != null && availableYears !== null && availableYears.includes(selectedYear);
  const rawMonth = searchParams.get('month');
  const monthNeedsResolution = periodMode === 'monthly' && rawMonth !== null && Number(rawMonth) !== selectedMonth;
  const periodNeedsResolution = monthNeedsResolution || (canReadCorporateKpi
    && (availableYears === null || (selectedYear != null && urlYear !== selectedYear && !(urlYear == null && selectedYear === currentYear))));

  useEffect(() => {
    const yearIsCanonical = selectedYear != null && (urlYear === selectedYear || (urlYear == null && selectedYear === currentYear));
    if (!canReadCorporateKpi || availableYears === null || availableYears.length === 0 || selectedYear == null || yearIsCanonical) return;
    updateUrl({ year: selectedYear });
  }, [availableYears, canReadCorporateKpi, currentYear, selectedYear, updateUrl, urlYear]);

  useEffect(() => {
    if (monthNeedsResolution) {
      markTransition();
      updateUrl({ month: selectedMonth });
    }
  }, [markTransition, monthNeedsResolution, selectedMonth, updateUrl]);

  useEffect(() => {
    if (!canRead || isPeriodLoading || periodError || !hasValidSelectedYear || selectedYear == null || periodNeedsResolution) return;
    setIsTransitioning(false);
    void fetchPerformance(selectedYear, periodMode === 'monthly' ? selectedMonth : undefined);
  }, [canRead, fetchPerformance, hasValidSelectedYear, isPeriodLoading, periodError, periodMode, periodNeedsResolution, selectedMonth, selectedYear]);

  const filteredRows = useMemo(() => filterRows(rows, searchQuery), [rows, searchQuery]);
  const selectableYears = canReadCorporateKpi ? availableYears ?? [] : selectedYear != null ? [selectedYear] : [];
  const handlePeriodChange = useCallback((period: 'monthly' | 'annual') => { markTransition(); updateUrl({ period }); }, [markTransition, updateUrl]);
  const handleYearChange = useCallback((year: number) => { markTransition(); updateUrl({ year }); }, [markTransition, updateUrl]);
  const handleMonthChange = useCallback((month: number) => { markTransition(); updateUrl({ month }); }, [markTransition, updateUrl]);
  const handleSearchChange = useCallback((search: string) => { setSearchInput(search); setIsSearchTransitioning(true); }, []);
  const handleRetry = useCallback(() => {
    if (periodError) {
      void refetchPeriods();
      return;
    }
    if (selectedYear == null) return;
    void fetchPerformance(selectedYear, periodMode === 'monthly' ? selectedMonth : undefined);
  }, [fetchPerformance, periodError, periodMode, refetchPeriods, selectedMonth, selectedYear]);

  const getDetailHref = useCallback((id: string) => {
    const query = new URLSearchParams();
    if (selectedYear != null) query.set('year', String(selectedYear));
    if (periodMode === 'annual') query.set('period', 'annual');
    else query.set('month', String(selectedMonth));
    for (const key of ['period', 'year', 'month', 'search']) {
      const value = searchParams.get(key);
      if (value !== null && !((periodMode === 'annual' && key === 'month') || key === 'year')) query.set(key, value);
    }
    query.set('from', 'unit-performance');
    return KPI_ROUTES.unitPerformanceDetailRoute(id, query.toString());
  }, [periodMode, searchParams, selectedMonth, selectedYear]);

  if (!canRead) return <ForbiddenAccess />;

  const tableError = periodError ?? error;
  const tableLoading = !tableError && ((selectedYear != null && isLoading) || isPeriodLoading || periodNeedsResolution);

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs><BreadcrumbsItem href="/" aria-label="Beranda"><House className="h-4 w-4" /></BreadcrumbsItem><BreadcrumbsItem>KPI</BreadcrumbsItem><BreadcrumbsItem>KPI Unit</BreadcrumbsItem><BreadcrumbsItem>{KPI_LABELS.unitPerformance}</BreadcrumbsItem></Breadcrumbs>
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.unitPerformance}</h1><Chip size="md" className="pointer-events-none" aria-label={`Total ${filteredRows.length} hasil`}>{filteredRows.length}</Chip></div><Button isIconOnly variant="tertiary" onPress={handleRetry} isDisabled={tableLoading} aria-label="Muat ulang Performa Unit"><ArrowsClockwise className={`h-4 w-4 ${tableLoading ? 'animate-spin' : ''}`} /></Button></div>
      <UnitPerformanceFilters periodMode={periodMode} selectedYear={selectedYear} years={selectableYears} selectedMonth={selectedMonth} searchQuery={searchInput} onPeriodModeChange={handlePeriodChange} onYearChange={handleYearChange} onMonthChange={handleMonthChange} onSearchChange={handleSearchChange} />
      <UnitPerformanceResultsTable rows={filteredRows} isLoading={tableLoading} error={tableError} isTransitioning={isTransitioning || isSearchTransitioning} searchQuery={searchQuery} onRetry={handleRetry} getDetailHref={getDetailHref} />
    </div>
  );
}
