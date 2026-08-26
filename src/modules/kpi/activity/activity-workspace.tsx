'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Breadcrumbs, BreadcrumbsItem, Button, Chip, Dropdown, Header, Label, toast } from '@heroui/react';
import {
  ArrowsClockwise,
  House,
  Plus,
  SlidersHorizontal,
} from '@phosphor-icons/react';

import { PERM } from '@/constants/permissions';
import { usePermission } from '@/hooks/use-permission';
import { KPI_LABELS } from '@/modules/kpi/constants';
import { ActivityTable } from '@/modules/kpi/activity/activity-table';
import { KpiActivityDetailModal } from '@/modules/kpi/activity/kpi-activity-detail-modal';
import { RequestTable } from '@/modules/kpi/activity/request-table';
import { ActivityRequestModal } from '@/modules/kpi/activity/activity-request-modal';
import { ActivityChangeModal } from '@/modules/kpi/activity/activity-change-modal';
import { useActivityData } from '@/modules/kpi/activity/use-activity-data';
import { AdminCreateActivityModal } from '@/modules/kpi/admin/admin-create-activity-modal';
import { AdminUpdateActivityModal } from '@/modules/kpi/admin/admin-update-activity-modal';
import { kpiAdminV1Api } from '@/modules/kpi/admin/kpi-admin-v1-api';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { useMyPositions } from '@/modules/kpi/shared/acting-position-selector';
import type { ActingPosition } from '@/modules/kpi/shared/acting-position';
import type { KpiActivityResponse } from '@/modules/kpi/activity/activity-v1.types';
import type { ActivityRequestListQuery } from '@/modules/kpi/activity/activity-v1.types';
import { KpiTableToolbar } from '@/modules/kpi/shared/kpi-table';
import { useKpiTableState } from '@/modules/kpi/shared/use-kpi-table-state';
import { useDebounce } from '@/hooks/use-debounce';
import { ForbiddenAccess } from '@/components/shared/forbidden-access';

export type ActivityViewId = 'my-activities' | 'all-activities' | 'subordinates' | 'my-requests';

const VIEW_TITLES: Record<ActivityViewId, string> = {
  'my-activities': KPI_LABELS.activitiesMine,
  'all-activities': KPI_LABELS.activitiesAll,
  'subordinates': KPI_LABELS.activitiesSubordinate,
  'my-requests': KPI_LABELS.activitiesMyRequests,
};

const ACTIVITY_TABLE_STATE = {
  sortOptions: ['activityName', 'createdAt'],
  defaultSort: 'activityName',
  defaultDirection: 'asc' as const,
  filterOptions: ['ACTIVE', 'CANCELLED'],
};
const REQUEST_TABLE_STATE = {
  sortOptions: ['activityName', 'createdAt'],
  defaultSort: 'activityName',
  defaultDirection: 'asc' as const,
  filterOptions: ['PENDING', 'APPROVED', 'REJECTED'],
};

/**
 * Activity workspace — shared scoped view container.
 *
 * Each route under `/kpi/activities/{all,mine,subordinate,my-requests}` mounts
 * this workspace with its view id; the view determines the dataset/API scope:
 *   - mine        → GET /api/v1/kpi-activities?scope=mine
 *   - all         → GET /api/v1/kpi-activities?scope=all  (read_all | manage)
 *   - subordinates→ GET /api/v1/kpi-activities?scope=subordinates (+ optional positionId)
 *   - my-requests → GET /api/v1/kpi-activity-requests?scope=mine
 *
 * Position filter rules: mine/subordinates default to all active positions
 * owned by the user; an optional URL `positionId` narrows the dataset. Actions
 * that create or change activities still require an explicitly selected position.
 * A Position-loading failure never hides ordinary Activity reads.
 *
 * Deliberately NOT here:
 *   - No Approval / To Review tab — the Activity Approval queue lives only
 *     on `/kpi/approvals` (sidebar: Activities > Approval).
 *   - No internal view tabs — every view is its own route/submenu.
 */
export function ActivityWorkspace({ view }: { view: ActivityViewId }) {
  const { hasAnyPerm } = usePermission();

  const canViewAll = hasAnyPerm(PERM.KPI_ACTIVITY_READ_ALL, PERM.KPI_ACTIVITY_MANAGE);
  if (view === 'all-activities' && !canViewAll) return <ForbiddenAccess />;
  return <ActivityWorkspaceContent view={view} />;
}

function ActivityWorkspaceContent({ view }: { view: ActivityViewId }) {
  const { hasPerm } = usePermission();
  // T4 root request — exactly `kpi_activity:root_request` (never read_all/manage).
  const canRequestRoot = hasPerm(PERM.KPI_ACTIVITY_ROOT_REQUEST);
  // T10/T11 administrative tools — exactly `kpi_activity:manage` (never an approval bypass).
  const canAdminManage = hasPerm(PERM.KPI_ACTIVITY_MANAGE);

  const tableState = useKpiTableState(view === 'my-requests' ? REQUEST_TABLE_STATE : ACTIVITY_TABLE_STATE);
  const { filters: tableFilters, setSearch } = tableState;

  /* ── Position filter (URL-controlled; default is all active positions) ── */
  const needsPosition = view === 'my-activities' || view === 'subordinates';
  const { positions, isLoading: isLoadingPositions, error: positionsError, refetch: refetchPositions } = useMyPositions(needsPosition);
  const selectedPositionId = tableFilters.positionId || null;
  const subordinateScope = tableFilters.subordinateScope as 'all' | 'direct';
  const selectedActingPosition: ActingPosition | null = useMemo(
    () => positions.find((p) => p.positionId === selectedPositionId) ?? null,
    [positions, selectedPositionId],
  );

  const title = VIEW_TITLES[view];

  const {
    myActivities,
    myPagination,
    isLoadingMy,
    myError,
    fetchMyActivities,

    allActivities,
    allPagination,
    isLoadingAll,
    allError,
    fetchAllActivities,

    subordinatesActivities,
    subordinatesPagination,
    isLoadingSubordinates,
    subordinatesError,
    fetchSubordinatesActivities,

    superiorActivities,
    isLoadingSuperior,
    fetchSuperiorActivities,

    myRequests,
    myRequestsPagination,
    isLoadingRequests,
    requestsError,
    fetchMyRequests,
  } = useActivityData();

  const [searchInput, setSearchInput] = useState(tableState.filters.search);
  const debouncedSearch = useDebounce(searchInput, 400);
  useEffect(() => {
    if (debouncedSearch !== tableFilters.search) setSearch(debouncedSearch);
  }, [debouncedSearch, tableFilters.search, setSearch]);
  useEffect(() => { setSearchInput(tableFilters.search); }, [tableFilters.search]);
  const allActivitiesQuery = useMemo(() => ({
    page: tableFilters.page,
    size: tableFilters.size,
    search: tableFilters.search,
    status: tableFilters.filter as 'ACTIVE' | 'CANCELLED' | '',
    positionId: needsPosition ? (tableFilters.positionId || undefined) : undefined,
    subordinateScope: view === 'subordinates' ? subordinateScope : undefined,
    sortBy: tableFilters.sortBy as 'activityName' | 'createdAt',
    sortDirection: tableFilters.direction as 'asc' | 'desc',
  }), [needsPosition, subordinateScope, tableFilters.direction, tableFilters.filter, tableFilters.page, tableFilters.positionId, tableFilters.search, tableFilters.size, tableFilters.sortBy, view]);

  const parentActivityQuery = useMemo(() => ({
    ...allActivitiesQuery,
    page: 1,
    size: 100,
    search: '',
    status: 'ACTIVE' as const,
  }), [allActivitiesQuery]);

  const requestQuery: ActivityRequestListQuery = useMemo(() => ({
    page: tableFilters.page,
    size: tableFilters.size,
    search: tableFilters.search,
    status: tableFilters.filter as ActivityRequestListQuery['status'],
    sortBy: tableFilters.sortBy as ActivityRequestListQuery['sortBy'],
    sortDirection: tableFilters.direction as ActivityRequestListQuery['sortDirection'],
  }), [tableFilters.direction, tableFilters.filter, tableFilters.page, tableFilters.search, tableFilters.size, tableFilters.sortBy]);

  useEffect(() => {
    if (view === 'all-activities') void fetchAllActivities(allActivitiesQuery);
  }, [view, fetchAllActivities, allActivitiesQuery]);

  useEffect(() => {
    if (view === 'my-activities') {
      void fetchMyActivities(allActivitiesQuery);
      if (selectedActingPosition) void fetchSuperiorActivities(selectedActingPosition.positionId);
    }
    if (view === 'subordinates') {
      void fetchSubordinatesActivities(undefined, allActivitiesQuery);
      if (selectedActingPosition) void fetchMyActivities(parentActivityQuery);
    }
    if (view === 'my-requests') void fetchMyRequests(requestQuery);
  }, [view, selectedActingPosition, allActivitiesQuery, parentActivityQuery, requestQuery, fetchMyActivities, fetchMyRequests, fetchSubordinatesActivities, fetchSuperiorActivities]);
  const pagedMyActivities = useMemo(() => ({
    items: myActivities,
    totalItems: myPagination?.totalElements ?? 0,
    totalPages: myPagination?.totalPages ?? 1,
    page: myPagination?.page ?? tableState.filters.page,
  }), [myActivities, myPagination, tableState.filters.page]);
  const pagedAllActivities = useMemo(() => ({
    items: allActivities,
    totalItems: allPagination?.totalElements ?? 0,
    totalPages: allPagination?.totalPages ?? 1,
    page: allPagination?.page ?? tableState.filters.page,
  }), [allActivities, allPagination, tableState.filters.page]);
  const pagedSubordinates = useMemo(() => ({
    items: subordinatesActivities,
    totalItems: subordinatesPagination?.totalElements ?? 0,
    totalPages: subordinatesPagination?.totalPages ?? 1,
    page: subordinatesPagination?.page ?? tableState.filters.page,
  }), [subordinatesActivities, subordinatesPagination, tableState.filters.page]);
  const pagedMyRequests = useMemo(() => ({
    items: myRequests,
    totalItems: myRequestsPagination?.totalElements ?? 0,
    totalPages: myRequestsPagination?.totalPages ?? 1,
    page: myRequestsPagination?.page ?? tableState.filters.page,
  }), [myRequests, myRequestsPagination, tableState.filters.page]);

  const totalItems = useMemo(() => {
    switch (view) {
      case 'my-activities': return myPagination?.totalElements ?? 0;
      case 'all-activities': return allPagination?.totalElements ?? 0;
      case 'subordinates': return subordinatesPagination?.totalElements ?? 0;
      case 'my-requests': return myRequestsPagination?.totalElements ?? 0;
      default: return 0;
    }
  }, [view, myPagination, allPagination, subordinatesPagination, myRequestsPagination]);

  const isAnyLoading = isLoadingMy || isLoadingAll || isLoadingSubordinates || isLoadingSuperior || isLoadingRequests || tableState.isQueryLoading || isLoadingPositions;

  const handleRefresh = useCallback(() => {
    if (view === 'my-activities') void fetchMyActivities();
    if (view === 'all-activities') void fetchAllActivities();
    if (view === 'subordinates') void fetchSubordinatesActivities();
    if (view === 'my-requests') void fetchMyRequests();
  }, [view, fetchMyActivities, fetchAllActivities, fetchMyRequests, fetchSubordinatesActivities]);

  /* ── Detail modal ── */
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    mode: 'ACTIVITY' | 'REQUEST';
    entityId: string | null;
  }>({ isOpen: false, mode: 'ACTIVITY', entityId: null });

  const openActivityDetail = useCallback((id: string) => {
    setDetailModal({ isOpen: true, mode: 'ACTIVITY', entityId: id });
  }, []);

  const openRequestDetail = useCallback((id: string) => {
    setDetailModal({ isOpen: true, mode: 'REQUEST', entityId: id });
  }, []);

  const closeDetail = useCallback(() => {
    setDetailModal({ isOpen: false, mode: 'ACTIVITY', entityId: null });
  }, []);

  /* ── T10 admin create modal ── */
  const [adminCreateOpen, setAdminCreateOpen] = useState(false);

  /* ── T4 request modal (root | child) ── */
  const [requestModal, setRequestModal] = useState<{
    isOpen: boolean;
    mode: 'root' | 'child';
    /** `own` = the acting Position's OWN ACTIVE activities; `superior` = the
     *  direct superior's ACTIVE activities (self-child parent source). */
    parentsSource: 'own' | 'superior';
    initialParentId?: string | null;
  }>({ isOpen: false, mode: 'root', parentsSource: 'own', initialParentId: null });

  /* ── T5 change modal (update | cancel) ── */
  const [changeModal, setChangeModal] = useState<{
    isOpen: boolean;
    mode: 'update' | 'cancel';
    activity: KpiActivityResponse | null;
  }>({ isOpen: false, mode: 'update', activity: null });

  /* ── T11 admin update modal ── */
  const [adminEditModal, setAdminEditModal] = useState<{
    isOpen: boolean;
    activity: KpiActivityResponse | null;
    initialAction: 'UPDATE' | 'CANCEL';
  }>({ isOpen: false, activity: null, initialAction: 'UPDATE' });
  const [adminCancelTarget, setAdminCancelTarget] = useState<KpiActivityResponse | null>(null);
  const [isAdminCancelling, setIsAdminCancelling] = useState(false);

  /* Eligible parents for child create: the actor's own ACTIVE activities
   * (exact-assignment ownership — backend requires parent-assignee or self). */
  const ownActiveParents = useMemo(() => {
    if (!selectedActingPosition) return [];
    return (myActivities ?? []).filter(
      (a) => a.status === 'ACTIVE' && a.assignedToUserPositionId === selectedActingPosition.userPositionId,
    );
  }, [myActivities, selectedActingPosition]);

  /** Refetch every relevant dataset after a successful mutation or conflict. */
  const refetchAll = useCallback(() => {
    void Promise.allSettled([
      fetchMyActivities(),
      fetchAllActivities(),
      fetchMyRequests(),
      fetchSubordinatesActivities(),
      selectedActingPosition
        ? fetchSuperiorActivities(selectedActingPosition.positionId)
        : Promise.resolve(),
    ]);
  }, [fetchMyActivities, fetchAllActivities, fetchMyRequests, fetchSubordinatesActivities, fetchSuperiorActivities, selectedActingPosition]);

  const handleAdminCancel = useCallback(async () => {
    if (!adminCancelTarget || adminCancelTarget.version == null) return;
    setIsAdminCancelling(true);
    try {
      await kpiAdminV1Api.adminUpdateActivity(adminCancelTarget.id, {
        action: 'CANCEL',
        reason: 'Pembatalan administratif dari menu Semua Aktivitas.',
        expectedVersion: adminCancelTarget.version,
      });
      toast.success('Aktivitas berhasil dibatalkan.');
      setAdminCancelTarget(null);
      refetchAll();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : 'Gagal membatalkan aktivitas.');
    } finally {
      setIsAdminCancelling(false);
    }
  }, [adminCancelTarget, refetchAll]);

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/">
          <House className="h-4 w-4" />
        </BreadcrumbsItem>
        <BreadcrumbsItem>KPI</BreadcrumbsItem>
        <BreadcrumbsItem>{KPI_LABELS.activities}</BreadcrumbsItem>
        <BreadcrumbsItem>{title}</BreadcrumbsItem>
      </Breadcrumbs>

      {/* Row 1: Title + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">
            {title}
          </h1>
          <Chip
            size="md"
            className="pointer-events-none"
            aria-label={`Total ${totalItems} data`}
          >
            {totalItems}
          </Chip>
        </div>

        <div className="flex items-center gap-2">
          <Button
            isIconOnly
            variant="tertiary"
            onPress={handleRefresh}
            isDisabled={isAnyLoading}
            aria-label="Muat ulang data"
          >
            <ArrowsClockwise
              className={`h-4 w-4 ${isAnyLoading ? 'animate-spin' : ''}`}
            />
          </Button>

          {view === 'my-activities' && canRequestRoot && selectedActingPosition && (
            <Button
              variant="primary"
              onPress={() => setRequestModal({ isOpen: true, mode: 'root', parentsSource: 'own' })}
            >
              <Plus className="h-4 w-4" />
              Ajukan Aktivitas
            </Button>
          )}

          {/* Self-child request (My Activities): parent = the direct superior's
              ACTIVE activities (scope=superior); assignee = the actor (T3
              self-child returns only the actor's own assignment). No permission. */}
          {view === 'my-activities' && selectedActingPosition && superiorActivities.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onPress={() => setRequestModal({ isOpen: true, mode: 'child', parentsSource: 'superior', initialParentId: null })}
              >
                <Plus className="h-4 w-4" />
                Ajukan Aktivitas Turunan
              </Button>
            </div>
          )}

          {/* Child-for-subordinate request (Subordinate): parent = the acting
              Position's OWN ACTIVE activities; assignee = a direct subordinate
              chosen from assignable-assignees. No permission. */}
          {view === 'subordinates' && selectedActingPosition && ownActiveParents.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onPress={() => setRequestModal({ isOpen: true, mode: 'child', parentsSource: 'own', initialParentId: null })}
              >
                <Plus className="h-4 w-4" />
                Ajukan Aktivitas Bawahan
              </Button>
            </div>
          )}

          {view === 'all-activities' && canAdminManage && (
            <Button
              variant="primary"
              onPress={() => setAdminCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Buat Aktivitas
            </Button>
          )}
        </div>
      </div>

      <KpiTableToolbar
        leading={needsPosition ? (
          <Dropdown>
            <Button variant="tertiary" aria-label="Filter Posisi" isDisabled={isLoadingPositions || Boolean(positionsError)}>
              <SlidersHorizontal className="h-4 w-4" />
              Filter
              {(selectedPositionId || (view === 'subordinates' && subordinateScope === 'direct')) && (
                <>
                  <span className="mx-0.5 h-4 w-px bg-border" />
                  <span className="text-sm font-medium text-foreground">
                    {Number(Boolean(selectedPositionId)) + Number(view === 'subordinates' && subordinateScope === 'direct')}
                  </span>
                </>
              )}
            </Button>
            <Dropdown.Popover className="min-w-[220px]">
              <Dropdown.Menu
                selectedKeys={new Set([
                  `position:${selectedPositionId ?? 'all'}`,
                  ...(view === 'subordinates' ? [`scope:${subordinateScope}`] : []),
                ])}
                selectionMode="multiple"
                onSelectionChange={(selection) => {
                  const selected = selection instanceof Set ? Array.from(selection).map(String) : [];
                  // The shared Pegawai filter uses a multi-selection menu. Keep
                  // one effective value per section so switching is immediate.
                  const positionKey = selected.filter((key) => key.startsWith('position:')).at(-1);
                  const scopeKey = selected.filter((key) => key.startsWith('scope:')).at(-1);
                  const nextPositionId = positionKey && positionKey !== 'position:all'
                    ? positionKey.replace('position:', '')
                    : '';
                  if (nextPositionId !== (selectedPositionId ?? '')) {
                    tableState.setPositionId(nextPositionId);
                  }
                  const nextSubordinateScope = scopeKey === 'scope:direct' ? 'direct' : 'all';
                  if (view === 'subordinates' && nextSubordinateScope !== subordinateScope) {
                    tableState.setSubordinateScope(nextSubordinateScope);
                  }
                }}
              >
                <Dropdown.Section>
                  <Header>Posisi</Header>
                  <Dropdown.Item key="position:all" id="position:all" textValue="Semua Posisi">
                    <Dropdown.ItemIndicator />
                    <Label>Semua Posisi</Label>
                  </Dropdown.Item>
                  {positions.map((position) => (
                    <Dropdown.Item key={`position:${position.positionId}`} id={`position:${position.positionId}`} textValue={position.positionName}>
                      <Dropdown.ItemIndicator />
                      <Label>{position.positionName}</Label>
                    </Dropdown.Item>
                  ))}
                </Dropdown.Section>
                {view === 'subordinates' && (
                  <Dropdown.Section>
                    <Header>Cakupan Bawahan</Header>
                    <Dropdown.Item key="scope:all" id="scope:all" textValue="Semua Bawahan">
                      <Dropdown.ItemIndicator />
                      <Label>Semua Bawahan</Label>
                    </Dropdown.Item>
                    <Dropdown.Item key="scope:direct" id="scope:direct" textValue="Bawahan Langsung">
                      <Dropdown.ItemIndicator />
                      <Label>Bawahan Langsung</Label>
                    </Dropdown.Item>
                  </Dropdown.Section>
                )}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        ) : undefined}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchLabel="Cari aktivitas"
        filterOptions={view === 'my-requests' ? [{ id: 'PENDING', label: 'Menunggu Persetujuan' }, { id: 'APPROVED', label: 'Disetujui' }, { id: 'REJECTED', label: 'Ditolak' }] : [{ id: 'ACTIVE', label: 'Aktif' }, { id: 'CANCELLED', label: 'Dibatalkan' }]}
        filterSelectionMode="single"
        selectedFilterIds={tableState.filters.filter ? new Set([tableState.filters.filter]) : new Set()}
        onFilterChange={(selection) => {
          const selected = selection instanceof Set ? Array.from(selection)[0] : undefined;
          tableState.setFilter(String(selected ?? ''));
        }}
        sortOptions={[{ id: 'activityName:asc', label: 'Nama (A-Z)' }, { id: 'activityName:desc', label: 'Nama (Z-A)' }, { id: 'createdAt:desc', label: 'Terbaru' }, { id: 'createdAt:asc', label: 'Terlama' }]}
        selectedSortId={`${tableState.filters.sortBy}:${tableState.filters.direction}`}
        onSortChange={(selection) => {
          const selected = selection instanceof Set ? String(Array.from(selection)[0] ?? '') : '';
          const [field, direction] = selected.split(':') as ['activityName' | 'createdAt', 'asc' | 'desc'];
          if (field && direction) tableState.setSort(field, direction);
        }}
        hasActiveFilters={Boolean(tableState.filters.search || tableState.filters.filter || tableState.filters.positionId || (view === 'subordinates' && subordinateScope === 'direct') || tableState.filters.sortBy !== (view === 'my-requests' ? REQUEST_TABLE_STATE.defaultSort : ACTIVITY_TABLE_STATE.defaultSort) || tableState.filters.direction !== 'asc')}
        onReset={() => { setSearchInput(''); tableState.reset(); }}
      />

      {/* Active view table */}
      <div className="w-full">
        {view === 'my-activities' && (
          <ActivityTable
            items={pagedMyActivities.items}
            isLoading={isLoadingMy || tableState.isQueryLoading || isLoadingPositions}
            error={positionsError || myError}
            onViewDetail={openActivityDetail}
            onRetry={positionsError ? refetchPositions : fetchMyActivities}
            ownAssignmentUserPositionId={selectedActingPosition?.userPositionId ?? null}
            onAddChild={selectedActingPosition
              ? (item) => setRequestModal({ isOpen: true, mode: 'child', parentsSource: 'own', initialParentId: item.id })
              : undefined}
            onRequestChange={selectedActingPosition
              ? (item, mode) => setChangeModal({ isOpen: true, mode, activity: item })
              : undefined}
            canAdminEdit={false}
            onAdminEdit={undefined}
            emptyLabel={positions.length === 0 && !isLoadingPositions ? 'Anda tidak memiliki posisi aktif — tindakan yang bergantung pada posisi (pengajuan, aktivitas bawahan, dan persetujuan) tidak tersedia. Hubungi administrator jika ini tidak terduga.' : 'Belum ada aktivitas.'}
            totalItems={pagedMyActivities.totalItems}
            currentPage={pagedMyActivities.page}
            totalPages={pagedMyActivities.totalPages}
            onPageChange={tableState.setPage}
          />
        )}

        {view === 'all-activities' && (
          <ActivityTable
            items={pagedAllActivities.items}
            isLoading={isLoadingAll || tableState.isQueryLoading}
            error={allError}
            onViewDetail={openActivityDetail}
            onRetry={fetchAllActivities}
            canAdminEdit={canAdminManage}
            onAdminEdit={canAdminManage ? (item) => setAdminEditModal({ isOpen: true, activity: item, initialAction: 'UPDATE' }) : undefined}
            onAdminCancel={canAdminManage ? setAdminCancelTarget : undefined}
            totalItems={pagedAllActivities.totalItems}
            currentPage={pagedAllActivities.page}
            totalPages={pagedAllActivities.totalPages}
            onPageChange={tableState.setPage}
          />
        )}

        {view === 'subordinates' && (
            <ActivityTable
              items={pagedSubordinates.items}
              isLoading={isLoadingSubordinates || tableState.isQueryLoading || isLoadingPositions}
              error={positionsError || subordinatesError}
              onViewDetail={openActivityDetail}
              onRetry={() => { void fetchSubordinatesActivities(undefined, allActivitiesQuery); }}
              emptyLabel={positions.length === 0 && !isLoadingPositions ? 'Anda tidak memiliki posisi aktif — tindakan yang bergantung pada posisi (pengajuan, aktivitas bawahan, dan persetujuan) tidak tersedia. Hubungi administrator jika ini tidak terduga.' : 'Belum ada aktivitas bawahan.'}
              totalItems={pagedSubordinates.totalItems}
              currentPage={pagedSubordinates.page}
              totalPages={pagedSubordinates.totalPages}
              onPageChange={tableState.setPage}
            />
        )}

        {view === 'my-requests' && (
          <RequestTable
            items={pagedMyRequests.items}
            isLoading={isLoadingRequests || tableState.isQueryLoading}
            error={requestsError}
            onViewDetail={openRequestDetail}
            totalItems={pagedMyRequests.totalItems}
            currentPage={pagedMyRequests.page}
            totalPages={pagedMyRequests.totalPages}
            onPageChange={tableState.setPage}
          />
        )}
      </div>

      <KpiActivityDetailModal
        key={detailModal.entityId ?? 'detail-closed'}
        isOpen={detailModal.isOpen}
        onClose={closeDetail}
        mode={detailModal.mode}
        entityId={detailModal.entityId}
      />

      {/* T4 — root/child CREATE request */}
      {selectedActingPosition && (
        <ActivityRequestModal
          isOpen={requestModal.isOpen}
          onClose={() => setRequestModal({ isOpen: false, mode: 'root', parentsSource: 'own', initialParentId: null })}
          mode={requestModal.mode}
          actingPosition={selectedActingPosition}
          parents={requestModal.parentsSource === 'superior' ? superiorActivities : ownActiveParents}
          initialParentId={requestModal.initialParentId}
          onSuccess={refetchAll}
          onConflict={refetchAll}
        />
      )}

      {/* T5 — UPDATE/CANCEL change request */}
      {selectedActingPosition && changeModal.activity && (
        <ActivityChangeModal
          isOpen={changeModal.isOpen}
          onClose={() => setChangeModal({ isOpen: false, mode: 'update', activity: null })}
          mode={changeModal.mode}
          activity={changeModal.activity}
          actingPosition={selectedActingPosition}
          onSuccess={refetchAll}
          onConflict={refetchAll}
        />
      )}

      {/* T10 — administrative Activity create */}
      <AdminCreateActivityModal
        isOpen={adminCreateOpen}
        onClose={() => setAdminCreateOpen(false)}
        onSuccess={refetchAll}
      />

      {/* T11 — administrative Activity update (authoritative expectedVersion) */}
      {adminEditModal.activity && (
        <AdminUpdateActivityModal
          isOpen={adminEditModal.isOpen}
          onClose={() => setAdminEditModal({ isOpen: false, activity: null, initialAction: 'UPDATE' })}
          activity={adminEditModal.activity}
          onSuccess={refetchAll}
          onConflict={refetchAll}
          initialAction={adminEditModal.initialAction}
        />
      )}

      <DeleteConfirmDialog
        isOpen={Boolean(adminCancelTarget)}
        onClose={() => setAdminCancelTarget(null)}
        onConfirm={handleAdminCancel}
        name={adminCancelTarget?.activityName ?? ''}
        entityLabel="aktivitas"
        title="Konfirmasi Pembatalan"
        actionVerb="membatalkan"
        confirmLabel="Batalkan Aktivitas"
        pendingLabel="Membatalkan..."
        warning="Aktivitas yang dibatalkan tidak dapat digunakan untuk pengajuan atau persetujuan baru."
        isDeleting={isAdminCancelling}
      />
    </div>
  );
}
