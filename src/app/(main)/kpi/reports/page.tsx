'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Breadcrumbs, BreadcrumbsItem, Button } from '@heroui/react';
import { Plus, ArrowsClockwise, House } from '@phosphor-icons/react';
import { KPI_LABELS } from '@/modules/kpi/constants';
import { useReportData } from '@/modules/kpi/report/use-report-data';
import { ReportTable } from '@/modules/kpi/report/report-table';
import { ReportDetailModal } from '@/modules/kpi/report/report-detail-modal';
import { ReportSubmitModal } from '@/modules/kpi/report/report-submit-modal';
import type { KpiReportResponse } from '@/modules/kpi/report/report-v1.types';
import { KpiTableToolbar } from '@/modules/kpi/shared/kpi-table';
import { paginateKpiItems, useKpiTableState } from '@/modules/kpi/shared/use-kpi-table-state';
import { useDebounce } from '@/hooks/use-debounce';

const REPORT_TABLE_STATE = { sortOptions: ['activityName', 'createdAt'], defaultSort: 'activityName', defaultDirection: 'asc' as const, filterOptions: ['PENDING', 'APPROVED', 'REJECTED'] };

/**
 * My Reports (`/kpi/reports`) — execution reports submitted by the active user.
 *   - Data     → GET /api/v1/kpi-reports?scope=mine ONLY (never to-review).
 *   - Detail/evidence stay available; top-level root reports show their
 *     reviewer as "Company queue".
 *   - NO approve/reject here — review actions live on `/kpi/report-reviews`.
 * Any authenticated user may open this page (responsibility-based access).
 */
export default function KpiMyReportsPage() {
  const { myReports, isLoadingMy, myError, fetchMyReports, isSubmitting } = useReportData();
  const tableState = useKpiTableState(REPORT_TABLE_STATE);
  const { filters: tableFilters, setSearch } = tableState;
  const [searchInput, setSearchInput] = useState(tableState.filters.search);
  const debouncedSearch = useDebounce(searchInput, 400);
  useEffect(() => { if (debouncedSearch !== tableFilters.search) setSearch(debouncedSearch); }, [debouncedSearch, tableFilters.search, setSearch]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSearchInput(tableFilters.search); }, [tableFilters.search]);

  // Fetch on mount (direct-load / refresh safe)
  useEffect(() => {
    fetchMyReports();
  }, [fetchMyReports]);

  // ── Detail modal ──
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    mode: 'MY';
    report: KpiReportResponse | null;
  }>({ isOpen: false, mode: 'MY', report: null });

  const openDetail = useCallback((id: string) => {
    const found = myReports.find((r) => r.id === id);
    if (found) setDetailModal({ isOpen: true, mode: 'MY', report: found });
  }, [myReports]);

  const closeDetail = useCallback(() => {
    setDetailModal({ isOpen: false, mode: 'MY', report: null });
  }, []);

  // ── Submit modal ──
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  const handleSubmitSuccess = useCallback(() => {
    fetchMyReports();
  }, [fetchMyReports]);

  const visibleReports = myReports.filter((report) =>
    (!tableState.filters.search || report.activityName.toLowerCase().includes(tableState.filters.search.toLowerCase()))
    && (!tableState.filters.filter || report.status === tableState.filters.filter),
  ).sort((left, right) => {
    const leftValue = tableState.filters.sortBy === 'createdAt' ? left.createdAt : left.activityName;
    const rightValue = tableState.filters.sortBy === 'createdAt' ? right.createdAt : right.activityName;
    return leftValue.localeCompare(rightValue, 'id-ID') * (tableState.filters.direction === 'desc' ? -1 : 1);
  });
  const pagedReports = paginateKpiItems(visibleReports, tableState.filters.page);

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem>KPI</BreadcrumbsItem>
        <BreadcrumbsItem>{KPI_LABELS.reports}</BreadcrumbsItem>
      </Breadcrumbs>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.reports}</h1>
        <div className="flex items-center gap-2">
          <Button isIconOnly variant="tertiary" onPress={fetchMyReports} isDisabled={isLoadingMy} aria-label="Muat ulang laporan">
            <ArrowsClockwise className={`h-4 w-4 ${isLoadingMy ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="primary" size="sm" onPress={() => setSubmitModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Ajukan Laporan
          </Button>
        </div>
      </div>

      <KpiTableToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchLabel="Cari laporan"
        filterOptions={[{ id: 'PENDING', label: 'Menunggu Persetujuan' }, { id: 'APPROVED', label: 'Disetujui' }, { id: 'REJECTED', label: 'Ditolak' }]}
        selectedFilterIds={tableState.filters.filter ? new Set([tableState.filters.filter]) : new Set()}
        onFilterChange={(selection) => { const selected = selection instanceof Set ? Array.from(selection)[0] : undefined; tableState.setFilter(String(selected ?? '')); }}
        sortOptions={[{ id: 'activityName:asc', label: 'Nama (A-Z)' }, { id: 'activityName:desc', label: 'Nama (Z-A)' }, { id: 'createdAt:desc', label: 'Terbaru' }, { id: 'createdAt:asc', label: 'Terlama' }]}
        selectedSortId={`${tableState.filters.sortBy}:${tableState.filters.direction}`}
        onSortChange={(selection) => { const selected = selection instanceof Set ? String(Array.from(selection)[0] ?? '') : ''; const [field, direction] = selected.split(':') as ['activityName' | 'createdAt', 'asc' | 'desc']; if (field && direction) tableState.setSort(field, direction); }}
        hasActiveFilters={Boolean(tableState.filters.search || tableState.filters.filter || tableState.filters.sortBy !== REPORT_TABLE_STATE.defaultSort || tableState.filters.direction !== 'asc')}
        onReset={() => { setSearchInput(''); tableState.reset(); }}
      />

      <ReportTable
        items={pagedReports.items}
        isLoading={isLoadingMy || tableState.isQueryLoading}
        error={myError}
        mode="MY"
        onViewDetail={openDetail}
        totalItems={pagedReports.totalItems}
        currentPage={pagedReports.page}
        totalPages={pagedReports.totalPages}
        onPageChange={tableState.setPage}
      />

      {/* Detail Modal — read-only, never shows approve/reject */}
      <ReportDetailModal
        key={detailModal.isOpen ? detailModal.report?.id || 'detail' : 'closed'}
        isOpen={detailModal.isOpen}
        onClose={closeDetail}
        report={detailModal.report}
        mode={detailModal.mode}
      />

      {/* Submit Modal */}
      <ReportSubmitModal
        isOpen={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        onSuccess={handleSubmitSuccess}
      />

      {isSubmitting && (
        <div className="sr-only" aria-live="polite">Memproses laporan...</div>
      )}
    </div>
  );
}
