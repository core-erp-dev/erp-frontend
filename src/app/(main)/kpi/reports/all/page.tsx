'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Breadcrumbs, BreadcrumbsItem, Button } from '@heroui/react';
import { ArrowsClockwise, House } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS } from '@/modules/kpi/constants';
import { useReportData } from '@/modules/kpi/report/use-report-data';
import type { KpiReportResponse, ReportListQuery } from '@/modules/kpi/report/report-v1.types';
import { ReportTable } from '@/modules/kpi/report/report-table';
import { ReassignReviewerDialog } from '@/modules/kpi/admin/reassign-reviewer-dialog';
import { KpiTableToolbar } from '@/modules/kpi/shared/kpi-table';
import { getLocalTodayIso, useKpiTableState } from '@/modules/kpi/shared/use-kpi-table-state';
import { useDebounce } from '@/hooks/use-debounce';
import { DateFieldPicker } from '@/components/shared/date-field-picker';

const ALL_REPORTS_TABLE_STATE = {
  sortOptions: ['activityName', 'createdAt'],
  defaultSort: 'activityName',
  defaultDirection: 'asc' as const,
  filterOptions: ['PENDING', 'APPROVED', 'REJECTED'],
  periodFilter: 'date' as const,
};

/** All Reports — administrative Report list. */
export default function KpiAllReportsPage() {
  const router = useRouter();
  const { hasPerm } = usePermission();
  const canManage = hasPerm(PERM.KPI_REPORT_MANAGE);
  const {
    allReports,
    allPagination,
    isLoadingAll,
    allError,
    fetchAllReports,
  } = useReportData();
  const tableState = useKpiTableState(ALL_REPORTS_TABLE_STATE);
  const { filters: tableFilters, setSearch } = tableState;
  const reportDate = tableFilters.reportDate ?? getLocalTodayIso();
  const todayIso = getLocalTodayIso();
  const [searchInput, setSearchInput] = useState(tableState.filters.search);
  const [reassignReport, setReassignReport] = useState<KpiReportResponse | null>(null);
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
    status: tableFilters.filter as ReportListQuery['status'],
    sortBy: tableFilters.sortBy as ReportListQuery['sortBy'],
    sortDirection: tableFilters.direction,
    reportDate,
  }), [reportDate, tableFilters]);

  useEffect(() => {
    if (canManage) void fetchAllReports(query);
  }, [canManage, fetchAllReports, query]);

  if (!canManage) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Breadcrumbs>
          <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
          <BreadcrumbsItem>KPI</BreadcrumbsItem>
          <BreadcrumbsItem>{KPI_LABELS.allReports}</BreadcrumbsItem>
        </Breadcrumbs>
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Akses ditolak</Alert.Title>
            <Alert.Description>Anda tidak memiliki izin untuk mengelola semua laporan.</Alert.Description>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem>KPI</BreadcrumbsItem>
        <BreadcrumbsItem>{KPI_LABELS.allReports}</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.allReports}</h1>
        <Button isIconOnly variant="tertiary" onPress={() => void fetchAllReports(query)} isDisabled={isLoadingAll} aria-label="Muat ulang laporan">
          <ArrowsClockwise className={`h-4 w-4 ${isLoadingAll ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <KpiTableToolbar
        leading={
          <div className="w-full sm:w-56">
            <DateFieldPicker
              label="Tanggal laporan"
              value={reportDate}
              onChange={tableState.setReportDate}
              isDisabled={isLoadingAll || tableState.isQueryLoading}
            />
          </div>
        }
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchLabel="Cari laporan"
        filterOptions={[{ id: 'PENDING', label: 'Menunggu Persetujuan' }, { id: 'APPROVED', label: 'Disetujui' }, { id: 'REJECTED', label: 'Ditolak' }]}
        filterSelectionMode="single"
        selectedFilterIds={tableState.filters.filter ? new Set([tableState.filters.filter]) : new Set()}
        onFilterChange={(selection) => { const selected = selection instanceof Set ? Array.from(selection)[0] : undefined; tableState.setFilter(String(selected ?? '')); }}
        sortOptions={[{ id: 'activityName:asc', label: 'Nama (A-Z)' }, { id: 'activityName:desc', label: 'Nama (Z-A)' }, { id: 'createdAt:desc', label: 'Terbaru' }, { id: 'createdAt:asc', label: 'Terlama' }]}
        selectedSortId={`${tableState.filters.sortBy}:${tableState.filters.direction}`}
        onSortChange={(selection) => { const selected = selection instanceof Set ? String(Array.from(selection)[0] ?? '') : ''; const [field, direction] = selected.split(':') as ['activityName' | 'createdAt', 'asc' | 'desc']; if (field && direction) tableState.setSort(field, direction); }}
        hasActiveFilters={Boolean(tableState.filters.search || tableState.filters.filter || reportDate !== todayIso || tableState.filters.sortBy !== ALL_REPORTS_TABLE_STATE.defaultSort || tableState.filters.direction !== 'asc')}
        onReset={() => { setSearchInput(''); tableState.reset(); }}
      />

      <ReportTable
        items={allReports}
        isLoading={isLoadingAll || tableState.isQueryLoading}
        error={allError}
        mode="ALL"
        getDetailHref={(item) => `/kpi/reports/${item.id}?from=all`}
        onViewDetail={(item) => router.push(`/kpi/reports/${item.id}?from=all`)}
        onReassignReviewer={setReassignReport}
        totalItems={allPagination?.totalElements ?? 0}
        currentPage={allPagination?.page ?? query.page}
        totalPages={allPagination?.totalPages ?? 0}
        onPageChange={tableState.setPage}
      />

      {reassignReport && (
        <ReassignReviewerDialog
          key={reassignReport.id}
          isOpen
          onClose={() => setReassignReport(null)}
          report={reassignReport}
          onSuccess={() => { setReassignReport(null); void fetchAllReports(query); }}
        />
      )}
    </div>
  );
}
