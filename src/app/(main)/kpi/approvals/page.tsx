'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, Breadcrumbs, BreadcrumbsItem, Button } from '@heroui/react';
import { ArrowsClockwise, House, X } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS } from '@/modules/kpi/constants';
import { useApprovalData } from '@/modules/kpi/activity/use-approval-data';
import { useActivityData } from '@/modules/kpi/activity/use-activity-data';
import { ApprovalTable } from '@/modules/kpi/activity/approval-table';
import { ApprovalDialog } from '@/modules/kpi/activity/approval-dialog';
import { KpiActivityDetailModal } from '@/modules/kpi/activity/kpi-activity-detail-modal';
import type { KpiActivityChangeRequestResponse } from '@/modules/kpi/activity/activity-v1.types';
import { KpiTableToolbar } from '@/modules/kpi/shared/kpi-table';
import { paginateKpiItems, useKpiTableState } from '@/modules/kpi/shared/use-kpi-table-state';
import { useDebounce } from '@/hooks/use-debounce';

const APPROVAL_TABLE_STATE = { sortOptions: ['activityName', 'createdAt'], defaultSort: 'activityName', defaultDirection: 'asc' as const, filterOptions: [] as string[] };

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
  const { hasPerm } = usePermission();
  const canApprove = hasPerm(PERM.KPI_ACTIVITY_APPROVE);

  const {
    toReview, isLoading, error, fetchToReview,
    isDeciding,
    recoverable, clearRecoverable,
  } = useApprovalData();
  const { myRequests, fetchMyRequests } = useActivityData();
  const tableState = useKpiTableState(APPROVAL_TABLE_STATE);
  const { filters: tableFilters, setSearch } = tableState;
  const [searchInput, setSearchInput] = useState(tableState.filters.search);
  const debouncedSearch = useDebounce(searchInput, 400);
  useEffect(() => { if (debouncedSearch !== tableFilters.search) setSearch(debouncedSearch); }, [debouncedSearch, tableFilters.search, setSearch]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSearchInput(tableFilters.search); }, [tableFilters.search]);

  // Own request ids (scope=mine) — used only to disable self-processing UI;
  // the backend is the authoritative self-approval ban.
  const ownRequestIds = useMemo(() => new Set(myRequests.map((r) => r.id)), [myRequests]);

  // Fetch on mount: company queue + own requests (for the self-processing UX)
  useEffect(() => {
    if (canApprove) {
      fetchToReview();
      fetchMyRequests();
    }
  }, [canApprove, fetchToReview, fetchMyRequests]);

  // ── Detail modal state ──
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const openDetail = useCallback((id: string) => {
    setDetailId(id);
    setDetailOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailId(null);
    setDetailOpen(false);
  }, []);

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

  const visibleRequests = toReview.filter((request) =>
    !tableState.filters.search
    || (request.activityName ?? '').toLowerCase().includes(tableState.filters.search.toLowerCase())
    || request.requestedByUserName.toLowerCase().includes(tableState.filters.search.toLowerCase()),
  ).sort((left, right) => {
    const leftValue = tableState.filters.sortBy === 'createdAt' ? left.createdAt : (left.activityName ?? '');
    const rightValue = tableState.filters.sortBy === 'createdAt' ? right.createdAt : (right.activityName ?? '');
    return leftValue.localeCompare(rightValue, 'id-ID') * (tableState.filters.direction === 'desc' ? -1 : 1);
  });
  const pagedRequests = paginateKpiItems(visibleRequests, tableState.filters.page);

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
        <Button isIconOnly variant="tertiary" onPress={fetchToReview} isDisabled={isLoading} aria-label="Refresh">
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
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <KpiTableToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchLabel="Cari pengajuan aktivitas"
        sortOptions={[{ id: 'activityName:asc', label: 'Nama (A-Z)' }, { id: 'activityName:desc', label: 'Nama (Z-A)' }, { id: 'createdAt:desc', label: 'Terbaru' }, { id: 'createdAt:asc', label: 'Terlama' }]}
        selectedSortId={`${tableState.filters.sortBy}:${tableState.filters.direction}`}
        onSortChange={(selection) => { const selected = selection instanceof Set ? String(Array.from(selection)[0] ?? '') : ''; const [field, direction] = selected.split(':') as ['activityName' | 'createdAt', 'asc' | 'desc']; if (field && direction) tableState.setSort(field, direction); }}
        hasActiveFilters={Boolean(tableState.filters.search || tableState.filters.sortBy !== APPROVAL_TABLE_STATE.defaultSort || tableState.filters.direction !== 'asc')}
        onReset={() => { setSearchInput(''); tableState.reset(); }}
      />

      <ApprovalTable
        items={pagedRequests.items}
        isLoading={isLoading || tableState.isQueryLoading}
        error={error}
        onViewDetail={openDetail}
        onApprove={openApprove}
        onReject={openReject}
        ownRequestIds={ownRequestIds}
        onRetry={fetchToReview}
        totalItems={pagedRequests.totalItems}
        currentPage={pagedRequests.page}
        totalPages={pagedRequests.totalPages}
        onPageChange={tableState.setPage}
      />

      {/* Detail Modal — shared with /kpi/activities */}
      <KpiActivityDetailModal
        key={detailId || 'closed'}
        isOpen={detailOpen}
        onClose={closeDetail}
        mode="REQUEST"
        entityId={detailId}
      />

      {/* Approve / Reject Dialog — unified decision */}
      {dialogMode && dialogRequest && (
        <ApprovalDialog
          key={`${dialogMode}-${dialogRequest.id}`}
          isOpen={true}
          onClose={closeDialog}
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
