'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Breadcrumbs, BreadcrumbsItem, Button, Chip } from '@heroui/react';
import { ArrowsClockwise, House } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { ForbiddenAccess } from '@/components/shared/forbidden-access';
import { KPI_LABELS, KPI_ROUTES } from '@/modules/kpi/constants';
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

function yearOptions(currentYear: number): number[] {
  return [currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
}

function filterRows(rows: UnitPerformanceRow[], searchQuery: string, selectedUnit: string): UnitPerformanceRow[] {
  const query = searchQuery.trim().toLowerCase();
  return rows.filter((row) => (!selectedUnit || row.organizationUnitId === selectedUnit) && (!query || row.unitCode.toLowerCase().includes(query) || row.unitName.toLowerCase().includes(query)));
}

export default function UnitPerformancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPerm } = usePermission();
  const canRead = hasPerm(PERM.UNIT_PERFORMANCE_READ);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const periodMode: 'monthly' | 'annual' = searchParams.get('period') === 'annual' ? 'annual' : 'monthly';
  const selectedYear = parseYear(searchParams.get('year'), currentYear);
  const selectedMonth = parseMonth(searchParams.get('month'), currentMonth);
  const selectedUnit = searchParams.get('unit') ?? '';
  const searchQuery = searchParams.get('search') ?? '';
  const selectedPage = parsePage(searchParams.get('page'));
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const transitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { rows, isLoading, error, fetchPerformance } = useUnitPerformanceResults();

  const updateUrl = useCallback((patch: Partial<{ period: 'monthly' | 'annual'; year: number; month: number; unit: string; search: string; page: number }>) => {
    const next = { period: periodMode, year: selectedYear, month: selectedMonth, unit: selectedUnit, search: searchQuery, page: selectedPage, ...patch };
    const params = new URLSearchParams();
    if (next.period === 'annual') params.set('period', 'annual');
    if (next.year !== currentYear) params.set('year', String(next.year));
    if (next.period === 'monthly' && next.month !== currentMonth) params.set('month', String(next.month));
    if (next.unit) params.set('unit', next.unit);
    if (next.search) params.set('search', next.search);
    if (next.page > 1) params.set('page', String(next.page));
    router.replace(params.toString() ? `${KPI_ROUTES.unitPerformance}?${params.toString()}` : KPI_ROUTES.unitPerformance, { scroll: false });
  }, [currentMonth, currentYear, periodMode, router, searchQuery, selectedMonth, selectedPage, selectedUnit, selectedYear]);

  const markTransition = useCallback(() => {
    setIsTransitioning(true);
    if (transitionRef.current) clearTimeout(transitionRef.current);
    transitionRef.current = setTimeout(() => setIsTransitioning(false), 150);
  }, []);
  useEffect(() => () => { if (transitionRef.current) clearTimeout(transitionRef.current); }, []);

  useEffect(() => {
    if (canRead) void fetchPerformance(selectedYear, periodMode === 'monthly' ? selectedMonth : undefined);
  }, [canRead, fetchPerformance, periodMode, selectedMonth, selectedYear]);

  const filteredRows = useMemo(() => filterRows(rows, searchQuery, selectedUnit), [rows, searchQuery, selectedUnit]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(selectedPage, totalPages);
  const pageRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const unitOptions = useMemo(() => rows.map((row) => ({ id: row.organizationUnitId, label: `${row.unitCode} — ${row.unitName}` })).filter((unit, index, all) => all.findIndex((candidate) => candidate.id === unit.id) === index), [rows]);

  useEffect(() => {
    if (selectedPage > totalPages) updateUrl({ page: totalPages });
  }, [selectedPage, totalPages, updateUrl]);

  const handlePeriodChange = useCallback((period: 'monthly' | 'annual') => { markTransition(); updateUrl({ period, page: 1 }); }, [markTransition, updateUrl]);
  const handleYearChange = useCallback((year: number) => { markTransition(); updateUrl({ year, page: 1 }); }, [markTransition, updateUrl]);
  const handleMonthChange = useCallback((month: number) => { markTransition(); updateUrl({ month, page: 1 }); }, [markTransition, updateUrl]);
  const handleUnitChange = useCallback((unit: string) => { markTransition(); updateUrl({ unit, page: 1 }); }, [markTransition, updateUrl]);
  const handleSearchChange = useCallback((search: string) => { markTransition(); updateUrl({ search, page: 1 }); }, [markTransition, updateUrl]);
  const handlePageChange = useCallback((page: number) => { markTransition(); updateUrl({ page }); }, [markTransition, updateUrl]);
  const handleRetry = useCallback(() => { void fetchPerformance(selectedYear, periodMode === 'monthly' ? selectedMonth : undefined); }, [fetchPerformance, periodMode, selectedMonth, selectedYear]);

  if (!canRead) return <ForbiddenAccess />;

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs><BreadcrumbsItem href="/" aria-label="Beranda"><House className="h-4 w-4" /></BreadcrumbsItem><BreadcrumbsItem>KPI</BreadcrumbsItem><BreadcrumbsItem>KPI Unit</BreadcrumbsItem><BreadcrumbsItem>{KPI_LABELS.unitPerformance}</BreadcrumbsItem></Breadcrumbs>
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.unitPerformance}</h1><Chip size="md" className="pointer-events-none" aria-label={`Total ${filteredRows.length} hasil`}>{filteredRows.length}</Chip></div><Button isIconOnly variant="tertiary" onPress={handleRetry} isDisabled={isLoading} aria-label="Muat ulang Performa Unit"><ArrowsClockwise className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /></Button></div>
      <UnitPerformanceFilters periodMode={periodMode} selectedYear={selectedYear} years={yearOptions(currentYear)} selectedMonth={selectedMonth} selectedUnit={selectedUnit} units={unitOptions} searchQuery={searchQuery} onPeriodModeChange={handlePeriodChange} onYearChange={handleYearChange} onMonthChange={handleMonthChange} onUnitChange={handleUnitChange} onSearchChange={handleSearchChange} />
      <UnitPerformanceResultsTable rows={pageRows} isLoading={isLoading} error={error} isTransitioning={isTransitioning} searchQuery={searchQuery} onRetry={handleRetry} />
      {!isLoading && !isTransitioning && !error && filteredRows.length > 0 && totalPages > 1 && <div className="flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground"><span>Menampilkan {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredRows.length)} dari {filteredRows.length} hasil</span><div className="flex items-center gap-2"><Button variant="tertiary" size="sm" isDisabled={safePage === 1} onPress={() => handlePageChange(safePage - 1)}>Sebelumnya</Button><span>Halaman {safePage} dari {totalPages}</span><Button variant="tertiary" size="sm" isDisabled={safePage === totalPages} onPress={() => handlePageChange(safePage + 1)}>Berikutnya</Button></div></div>}
      <p className="text-xs text-muted-foreground">Nilai dan hasil diambil dari evaluasi KPI Perusahaan pada periode yang dipilih. Bobot kontribusi per indikator dikelola di Konfigurasi Performa Unit.</p>
    </div>
  );
}
