'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const PAGE_SIZE = 10;

function parseYear(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseMonth(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 12 ? parsed : fallback;
}

function parsePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
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
  const selectedYear = parseYear(searchParams.get('year'), currentYear);
  const selectedMonth = parseMonth(searchParams.get('month'), currentMonth);
  const searchQuery = searchParams.get('search') ?? '';
  const selectedPage = parsePage(searchParams.get('page'));
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [isSearchTransitioning, setIsSearchTransitioning] = useState(false);
  const transitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { years: availableYears, isLoading: isPeriodLoading, error: periodError, refetch: refetchPeriods } = useUnitPerformancePeriods(canReadCorporateKpi);
  const { rows, isLoading, error, fetchPerformance } = useUnitPerformanceResults();

  const updateUrl = useCallback((patch: Partial<{ period: 'monthly' | 'annual'; year: number; month: number; search: string; page: number }>) => {
    const next = { period: periodMode, year: selectedYear, month: selectedMonth, search: searchQuery, page: selectedPage, ...patch };
    const params = new URLSearchParams();
    if (next.period === 'annual') params.set('period', 'annual');
    if (next.year !== currentYear) params.set('year', String(next.year));
    if (next.period === 'monthly' && next.month !== currentMonth) params.set('month', String(next.month));
    if (next.search) params.set('search', next.search);
    if (next.page > 1) params.set('page', String(next.page));
    router.replace(params.toString() ? `${KPI_ROUTES.unitPerformance}?${params.toString()}` : KPI_ROUTES.unitPerformance, { scroll: false });
  }, [currentMonth, currentYear, periodMode, router, searchQuery, selectedMonth, selectedPage, selectedYear]);

  const markTransition = useCallback(() => {
    setIsTransitioning(true);
    if (transitionRef.current) clearTimeout(transitionRef.current);
    transitionRef.current = setTimeout(() => setIsTransitioning(false), 150);
  }, []);

  useEffect(() => () => {
    if (transitionRef.current) clearTimeout(transitionRef.current);
  }, []);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  const debouncedSearch = useDebounce(searchInput, 400);
  useEffect(() => {
    if (debouncedSearch === searchQuery) {
      setIsSearchTransitioning(false);
      return;
    }
    updateUrl({ search: debouncedSearch, page: 1 });
  }, [debouncedSearch, searchQuery, updateUrl]);

  const hasValidSelectedYear = !canReadCorporateKpi
    ? true
    : availableYears !== null && availableYears.length > 0 && availableYears.includes(selectedYear);

  useEffect(() => {
    if (!canReadCorporateKpi || availableYears === null || availableYears.length === 0 || hasValidSelectedYear) return;
    const fallbackYear = getCorporateKpiDefaultValueYear(availableYears, currentYear);
    if (fallbackYear !== null) {
      markTransition();
      updateUrl({ year: fallbackYear, page: 1 });
    }
  }, [availableYears, canReadCorporateKpi, currentYear, hasValidSelectedYear, markTransition, updateUrl]);

  useEffect(() => {
    const rawMonth = searchParams.get('month');
    if (periodMode === 'monthly' && rawMonth !== null && Number(rawMonth) !== selectedMonth) {
      markTransition();
      updateUrl({ month: selectedMonth, page: 1 });
    }
  }, [markTransition, periodMode, searchParams, selectedMonth, updateUrl]);

  useEffect(() => {
    if (!canRead || isPeriodLoading || periodError || !hasValidSelectedYear) return;
    void fetchPerformance(selectedYear, periodMode === 'monthly' ? selectedMonth : undefined);
  }, [canRead, fetchPerformance, hasValidSelectedYear, isPeriodLoading, periodError, periodMode, selectedMonth, selectedYear]);

  const filteredRows = useMemo(() => filterRows(rows, searchQuery), [rows, searchQuery]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(selectedPage, totalPages);
  const pageRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    if (selectedPage > totalPages) updateUrl({ page: totalPages });
  }, [selectedPage, totalPages, updateUrl]);

  const handlePeriodChange = useCallback((period: 'monthly' | 'annual') => { markTransition(); updateUrl({ period, page: 1 }); }, [markTransition, updateUrl]);
  const handleYearChange = useCallback((year: number) => { markTransition(); updateUrl({ year, page: 1 }); }, [markTransition, updateUrl]);
  const handleMonthChange = useCallback((month: number) => { markTransition(); updateUrl({ month, page: 1 }); }, [markTransition, updateUrl]);
  const handleSearchChange = useCallback((search: string) => { setSearchInput(search); setIsSearchTransitioning(true); }, []);
  const handlePageChange = useCallback((page: number) => { markTransition(); updateUrl({ page }); }, [markTransition, updateUrl]);
  const handleRetry = useCallback(() => {
    if (periodError) {
      void refetchPeriods();
      return;
    }
    void fetchPerformance(selectedYear, periodMode === 'monthly' ? selectedMonth : undefined);
  }, [fetchPerformance, periodError, periodMode, refetchPeriods, selectedMonth, selectedYear]);

  const getDetailHref = useCallback((id: string) => {
    const query = new URLSearchParams();
    query.set('year', String(selectedYear));
    if (periodMode === 'annual') query.set('period', 'annual');
    else query.set('month', String(selectedMonth));
    for (const key of ['period', 'year', 'month', 'search', 'page']) {
      const value = searchParams.get(key);
      if (value !== null && !((periodMode === 'annual' && key === 'month') || key === 'year')) query.set(key, value);
    }
    query.set('from', 'unit-performance');
    return KPI_ROUTES.unitPerformanceDetailRoute(id, query.toString());
  }, [periodMode, searchParams, selectedMonth, selectedYear]);

  if (!canRead) return <ForbiddenAccess />;

  const tableError = periodError ?? error;
  const tableLoading = isLoading || isPeriodLoading;

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs><BreadcrumbsItem href="/" aria-label="Beranda"><House className="h-4 w-4" /></BreadcrumbsItem><BreadcrumbsItem>KPI</BreadcrumbsItem><BreadcrumbsItem>KPI Unit</BreadcrumbsItem><BreadcrumbsItem>{KPI_LABELS.unitPerformance}</BreadcrumbsItem></Breadcrumbs>
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.unitPerformance}</h1><Chip size="md" className="pointer-events-none" aria-label={`Total ${filteredRows.length} hasil`}>{filteredRows.length}</Chip></div><Button isIconOnly variant="tertiary" onPress={handleRetry} isDisabled={tableLoading} aria-label="Muat ulang Performa Unit"><ArrowsClockwise className={`h-4 w-4 ${tableLoading ? 'animate-spin' : ''}`} /></Button></div>
      <UnitPerformanceFilters periodMode={periodMode} selectedYear={selectedYear} years={availableYears ?? [selectedYear]} selectedMonth={selectedMonth} searchQuery={searchInput} onPeriodModeChange={handlePeriodChange} onYearChange={handleYearChange} onMonthChange={handleMonthChange} onSearchChange={handleSearchChange} />
      <UnitPerformanceResultsTable rows={pageRows} isLoading={tableLoading} error={tableError} isTransitioning={isTransitioning || isSearchTransitioning} searchQuery={searchQuery} onRetry={handleRetry} currentPage={safePage} totalPages={totalPages} totalItems={filteredRows.length} pageSize={PAGE_SIZE} onPageChange={handlePageChange} getDetailHref={getDetailHref} />
    </div>
  );
}
