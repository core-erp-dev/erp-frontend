'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Breadcrumbs, BreadcrumbsItem, Button, Chip, Dropdown, Label } from '@heroui/react';
import { ArrowsClockwise, CaretDown, House, X } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS } from '@/modules/kpi/constants';
import { useApprovalData } from '@/modules/kpi/activity/use-approval-data';
import { useActivityData } from '@/modules/kpi/activity/use-activity-data';
import { ApprovalTable } from '@/modules/kpi/activity/approval-table';
import { ApprovalDialog } from '@/modules/kpi/activity/approval-dialog';
import type { KpiActivityChangeRequestResponse } from '@/modules/kpi/activity/activity-v1.types';
import type { ActivityRequestListQuery } from '@/modules/kpi/activity/activity-v1.types';
import { KpiTableToolbar } from '@/modules/kpi/shared/kpi-table';
import { useKpiTableState } from '@/modules/kpi/shared/use-kpi-table-state';
import { useDebounce } from '@/hooks/use-debounce';
import { activityV1Api } from '@/modules/kpi/activity/activity-v1-api';
import { MONTH_NAMES_ID } from '@/modules/kpi/corporate/period-label';

const APPROVAL_TABLE_STATE = { sortOptions: ['activityName', 'createdAt'], defaultSort: 'activityName', defaultDirection: 'asc' as const, filterOptions: [] as string[], periodFilter: 'month' as const };

/**
 * Activity Approvals — standalone page (`/kpi/approvals`).
 *
 * Centralized approval queue (2026-08-05): every `kpi_activity:approve`
 * holder sees the SAME company-wide PENDING queue. Owns: request
 * `scope=to-review`, approval request detail, the unified APPROVE/REJECT
 * decision (T8), conditional rejection reason, self-processing UX (own
 * requests visible but not actionable — matched via `scope=mine` ids, and
 * the backend enforces CANNOT_APPROVE_OWN_REQUEST regardless),
 * already-processed recovery, and refetch after decisions. It is NOT a tab
 * of `/kpi/activities` and is NOT deleted or redirected. Guarded by exactly
 * `kpi_activity:approve` (sidebar + page). There is no reassignment UI —
 * T9 was removed.
 */
export default function KpiApprovalsPage() {
  const router = useRouter();
  const { hasPerm } = usePermission();
  const canApprove = hasPerm(PERM.KPI_ACTIVITY_APPROVE);

  const {
    toReview, pagination, isLoading, error, fetchToReview,
    isDeciding,
    recoverable, clearRecoverable,
  } = useApprovalData();
  const { myRequests, fetchMyRequests } = useActivityData();
  const tableState = useKpiTableState(APPROVAL_TABLE_STATE);
  const { filters: tableFilters, setSearch } = tableState;
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const periodYear = tableFilters.periodYear ?? currentYear;
  const periodMonth = tableFilters.periodMonth ?? currentMonth;
  const [periodYears, setPeriodYears] = useState<number[]>([currentYear]);
  const [isLoadingPeriodOptions, setIsLoadingPeriodOptions] = useState(false);
  const [searchInput, setSearchInput] = useState(tableState.filters.search);
  const debouncedSearch = useDebounce(searchInput, 400);
  useEffect(() => { if (debouncedSearch !== tableFilters.search) setSearch(debouncedSearch); }, [debouncedSearch, tableFilters.search, setSearch]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSearchInput(tableFilters.search); }, [tableFilters.search]);

  useEffect(() => {
    let active = true;
    // The loading flag represents the external period-options request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingPeriodOptions(true);
    void activityV1Api.getRequestPeriodOptions('to-review')
      .then((options) => {
        if (active) setPeriodYears(options.years.length > 0 ? options.years : [currentYear]);
      })
      .catch(() => {
        if (active) setPeriodYears([currentYear]);
      })
      .finally(() => {
        if (active) setIsLoadingPeriodOptions(false);
      });
    return () => { active = false; };
  }, [currentYear]);

  const approvalQuery: ActivityRequestListQuery = useMemo(() => ({
    page: tableFilters.page,
    size: tableFilters.size,
    search: tableFilters.search,
    status: '',
    sortBy: tableFilters.sortBy as ActivityRequestListQuery['sortBy'],
    sortDirection: tableFilters.direction as ActivityRequestListQuery['sortDirection'],
    periodYear,
    periodMonth,
  }), [periodMonth, periodYear, tableFilters.direction, tableFilters.page, tableFilters.search, tableFilters.size, tableFilters.sortBy]);

  const ownRequestsQuery: ActivityRequestListQuery = useMemo(() => ({
    page: 1,
    size: 100,
    search: '',
    status: '',
    sortBy: 'createdAt',
    sortDirection: 'desc',
    periodYear,
    periodMonth,
  }), [periodMonth, periodYear]);

  // Own request ids (scope=mine) — used only to disable self-processing UI;
  // the backend is the authoritative self-approval ban.
  const ownRequestIds = useMemo(() => new Set(myRequests.map((r) => r.id)), [myRequests]);

  // Fetch on mount: company queue + own requests (for the self-processing UX)
  useEffect(() => {
    if (canApprove) {
      fetchToReview(approvalQuery);
      fetchMyRequests(ownRequestsQuery);
    }
  }, [approvalQuery, canApprove, fetchMyRequests, fetchToReview, ownRequestsQuery]);

  // ── Approval dialog state ──
  const [dialogMode, setDialogMode] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [dialogRequest, setDialogRequest] = useState<KpiActivityChangeRequestResponse | null>(null);

  const openApprove = useCallback((req: KpiActivityChangeRequestResponse) => {
    setDialogMode('APPROVE');
    setDialogRequest(req);
  }, []);

  const openReject = useCallback((req: KpiActivityChangeRequestResponse) => {
    setDialogMode('REJECT');
    setDialogRequest(req);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogMode(null);
    setDialogRequest(null);
  }, []);

  const handleDecisionSuccess = useCallback(() => {
    closeDialog();
    // ApprovalDialog owns the mutation hook instance, so explicitly refresh
    // this page's queue after a successful decision.
    void fetchToReview(approvalQuery);
    void fetchMyRequests(ownRequestsQuery);
  }, [approvalQuery, closeDialog, fetchMyRequests, fetchToReview, ownRequestsQuery]);

  // ── Permission guard ──
  if (!canApprove) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Breadcrumbs>
          <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
          <BreadcrumbsItem>KPI</BreadcrumbsItem>
            <BreadcrumbsItem>Aktivitas</BreadcrumbsItem>
            <BreadcrumbsItem>Persetujuan Aktivitas</BreadcrumbsItem>
        </Breadcrumbs>
        <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.approvals}</h1>
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Akses Ditolak</Alert.Title>
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
        <BreadcrumbsItem>Aktivitas</BreadcrumbsItem>
        <BreadcrumbsItem>Persetujuan Aktivitas</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.approvals}</h1>
        <Button isIconOnly variant="tertiary" onPress={() => { void fetchToReview(approvalQuery); }} isDisabled={isLoading} aria-label="Muat ulang persetujuan aktivitas">
          <ArrowsClockwise className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Recoverable conflict banner (already-processed / version-conflict) */}
      {recoverable && (
        <div className="relative">
          <Alert status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Pengajuan Sudah Diproses</Alert.Title>
              <Alert.Description>{recoverable.message}</Alert.Description>
            </Alert.Content>
          </Alert>
          <Button
            isIconOnly
            variant="tertiary"
            size="sm"
            className="absolute right-2 top-2"
            onPress={clearRecoverable}
            aria-label="Tutup pesan"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <KpiTableToolbar
        leading={
          <div className="flex flex-wrap items-center gap-2">
            <Dropdown>
              <Button
                variant="tertiary"
                aria-label="Pilih tahun periode aktivitas"
                isDisabled={isLoadingPeriodOptions || tableState.isQueryLoading}
              >
                {periodYear}
                <CaretDown className="h-4 w-4" />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu
                  selectedKeys={new Set([String(periodYear)])}
                  selectionMode="single"
                  onSelectionChange={(selection) => {
                    const selected = selection instanceof Set ? Array.from(selection)[0] : undefined;
                    if (selected != null) tableState.setPeriod(Number(selected), periodMonth);
                  }}
                >
                  {periodYears.map((year) => (
                    <Dropdown.Item key={year} id={String(year)} textValue={String(year)}>
                      <Dropdown.ItemIndicator />
                      <Label>{year}</Label>
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
            <Dropdown>
              <Button
                variant="tertiary"
                aria-label="Pilih bulan periode aktivitas"
                isDisabled={isLoadingPeriodOptions || tableState.isQueryLoading}
              >
                {MONTH_NAMES_ID[periodMonth - 1] ?? periodMonth}
                <CaretDown className="h-4 w-4" />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu
                  selectedKeys={new Set([String(periodMonth)])}
                  selectionMode="single"
                  onSelectionChange={(selection) => {
                    const selected = selection instanceof Set ? Array.from(selection)[0] : undefined;
                    if (selected != null) tableState.setPeriod(periodYear, Number(selected));
                  }}
                >
                  {MONTH_NAMES_ID.map((month, index) => (
                    <Dropdown.Item key={month} id={String(index + 1)} textValue={month}>
                      <Dropdown.ItemIndicator />
                      <Label>{month}</Label>
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
            <Chip size="sm" variant="soft">
              Periode: {MONTH_NAMES_ID[periodMonth - 1] ?? periodMonth} {periodYear}
            </Chip>
          </div>
        }
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchLabel="Cari pengajuan aktivitas"
        sortOptions={[{ id: 'activityName:asc', label: 'Nama (A-Z)' }, { id: 'activityName:desc', label: 'Nama (Z-A)' }, { id: 'createdAt:desc', label: 'Terbaru' }, { id: 'createdAt:asc', label: 'Terlama' }]}
        selectedSortId={`${tableState.filters.sortBy}:${tableState.filters.direction}`}
        onSortChange={(selection) => { const selected = selection instanceof Set ? String(Array.from(selection)[0] ?? '') : ''; const [field, direction] = selected.split(':') as ['activityName' | 'createdAt', 'asc' | 'desc']; if (field && direction) tableState.setSort(field, direction); }}
        hasActiveFilters={Boolean(tableState.filters.search || periodYear !== currentYear || periodMonth !== currentMonth || tableState.filters.sortBy !== APPROVAL_TABLE_STATE.defaultSort || tableState.filters.direction !== 'asc')}
        onReset={() => { setSearchInput(''); tableState.reset(); }}
      />

      <ApprovalTable
        items={toReview}
        isLoading={isLoading || tableState.isQueryLoading}
        error={error}
        getDetailHref={(item) => `/kpi/activity-requests/${item.id}?from=approval`}
        onViewDetail={(item) => router.push(`/kpi/activity-requests/${item.id}?from=approval`)}
        onApprove={openApprove}
        onReject={openReject}
        ownRequestIds={ownRequestIds}
        onRetry={fetchToReview}
        totalItems={pagination?.totalElements ?? 0}
        currentPage={pagination?.page ?? tableFilters.page}
        totalPages={pagination?.totalPages ?? 1}
        onPageChange={tableState.setPage}
      />

      {/* Approve / Reject Dialog — unified decision */}
      {dialogMode && dialogRequest && (
        <ApprovalDialog
          key={`${dialogMode}-${dialogRequest.id}`}
          isOpen={true}
          onClose={closeDialog}
          onSuccess={handleDecisionSuccess}
          mode={dialogMode}
          request={dialogRequest}
        />
      )}

      {isDeciding && (
        <div className="sr-only" aria-live="polite">Memproses keputusan...</div>
      )}
    </div>
  );
}
