'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Breadcrumbs, BreadcrumbsItem, Button } from '@heroui/react';
import { ArrowsClockwise, House, X } from '@phosphor-icons/react';
import { KPI_LABELS } from '@/modules/kpi/constants';
import { useReportData } from '@/modules/kpi/report/use-report-data';
import type { ReportListQuery } from '@/modules/kpi/report/report-v1.types';
import { ReportTable } from '@/modules/kpi/report/report-table';
import { KpiTableToolbar } from '@/modules/kpi/shared/kpi-table';
import { getLocalTodayIso, useKpiTableState } from '@/modules/kpi/shared/use-kpi-table-state';
import { useDebounce } from '@/hooks/use-debounce';
import { DateFieldPicker } from '@/components/shared/date-field-picker';

const REPORT_REVIEW_TABLE_STATE = {
  sortOptions: ['activityName', 'createdAt'],
  defaultSort: 'activityName',
  defaultDirection: 'asc' as const,
  periodFilter: 'date' as const,
};

/** Perlu Direview — the responsibility-based PENDING Report queue. */
export default function KpiReportReviewsPage() {
  const router = useRouter();
  const {
    toReview,
    reviewPagination,
    isLoadingReview,
    reviewError,
    fetchToReview,
    recoverable,
    clearRecoverable,
  } = useReportData();
  const tableState = useKpiTableState(REPORT_REVIEW_TABLE_STATE);
  const { filters: tableFilters, setSearch } = tableState;
  const reportDate = tableFilters.reportDate ?? getLocalTodayIso();
  const todayIso = getLocalTodayIso();
  const [searchInput, setSearchInput] = useState(tableState.filters.search);
  const debouncedSearch = useDebounce(searchInput, 400);

  useEffect(() => {
    if (debouncedSearch !== tableFilters.search) setSearch(debouncedSearch);
  }, [debouncedSearch, tableFilters.search, setSearch]);

  // Follow external URL changes (deep link / Back / forward) into the input.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSearchInput(tableFilters.search); }, [tableFilters.search]);

  const query = useMemo<ReportListQuery>(() => ({
    page: tableFilters.page,
    size: tableFilters.size,
    search: tableFilters.search,
    status: '',
    sortBy: tableFilters.sortBy as ReportListQuery['sortBy'],
    sortDirection: tableFilters.direction,
    reportDate,
  }), [reportDate, tableFilters]);

  useEffect(() => { void fetchToReview(query); }, [fetchToReview, query]);

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem>KPI</BreadcrumbsItem>
        <BreadcrumbsItem>{KPI_LABELS.reportReviews}</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.reportReviews}</h1>
        <Button isIconOnly variant="tertiary" onPress={() => void fetchToReview(query)} isDisabled={isLoadingReview} aria-label="Muat ulang laporan">
          <ArrowsClockwise className={`h-4 w-4 ${isLoadingReview ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {recoverable && (
        <div className="relative">
          <Alert status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Laporan Sudah Diproses</Alert.Title>
              <Alert.Description>{recoverable.message}</Alert.Description>
            </Alert.Content>
          </Alert>
          <Button isIconOnly variant="tertiary" size="sm" className="absolute right-2 top-2" onPress={clearRecoverable} aria-label="Tutup pesan">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <KpiTableToolbar
        leading={
          <div className="w-full sm:w-56">
            <DateFieldPicker
              label="Tanggal laporan"
              value={reportDate}
              onChange={tableState.setReportDate}
              isDisabled={isLoadingReview || tableState.isQueryLoading}
            />
          </div>
        }
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchLabel="Cari laporan"
        sortOptions={[{ id: 'activityName:asc', label: 'Nama (A-Z)' }, { id: 'activityName:desc', label: 'Nama (Z-A)' }, { id: 'createdAt:desc', label: 'Terbaru' }, { id: 'createdAt:asc', label: 'Terlama' }]}
        selectedSortId={`${tableState.filters.sortBy}:${tableState.filters.direction}`}
        onSortChange={(selection) => { const selected = selection instanceof Set ? String(Array.from(selection)[0] ?? '') : ''; const [field, direction] = selected.split(':') as ['activityName' | 'createdAt', 'asc' | 'desc']; if (field && direction) tableState.setSort(field, direction); }}
        hasActiveFilters={Boolean(tableState.filters.search || reportDate !== todayIso || tableState.filters.sortBy !== REPORT_REVIEW_TABLE_STATE.defaultSort || tableState.filters.direction !== 'asc')}
        onReset={() => { setSearchInput(''); tableState.reset(); }}
      />

      <ReportTable
        items={toReview}
        isLoading={isLoadingReview || tableState.isQueryLoading}
        error={reviewError}
        mode="TO_REVIEW"
        getDetailHref={(item) => `/kpi/reports/${item.id}?from=review`}
        onViewDetail={(item) => router.push(`/kpi/reports/${item.id}?from=review`)}
        totalItems={reviewPagination?.totalElements ?? 0}
        currentPage={reviewPagination?.page ?? query.page}
        totalPages={reviewPagination?.totalPages ?? 0}
        onPageChange={tableState.setPage}
      />
    </div>
  );
}
