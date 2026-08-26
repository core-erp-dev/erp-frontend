'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Breadcrumbs, BreadcrumbsItem, Button, Chip, toast } from '@heroui/react';
import {
  ArrowsClockwise,
  House,
  Plus,
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
import {
  ActingPositionSelector,
  useMyPositions,
} from '@/modules/kpi/shared/acting-position-selector';
import type { ActingPosition } from '@/modules/kpi/shared/acting-position';
import type { KpiActivityResponse } from '@/modules/kpi/activity/activity-v1.types';
import { KpiTableToolbar } from '@/modules/kpi/shared/kpi-table';
import { paginateKpiItems, useKpiTableState } from '@/modules/kpi/shared/use-kpi-table-state';
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
 *   - subordinates→ GET /api/v1/kpi-activities?scope=subordinates&actingPositionId=
 *   - my-requests → GET /api/v1/kpi-activity-requests?scope=mine
 *
 * Acting-Position rules (locked): the user EXPLICITLY selects an acting
 * Position (`core_positions.id`); nothing is guessed. `subordinates` reads
 * and every submission require the selection; `mine`/`all` reads never do.
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

  /* ── Acting-Position selection (explicit, never implicit) ── */
  const needsPosition = view === 'my-activities' || view === 'subordinates';
  const { positions, isLoading: isLoadingPositions, error: positionsError, refetch: refetchPositions } = useMyPositions(needsPosition);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const selectedActingPosition: ActingPosition | null = useMemo(
    () => positions.find((p) => p.positionId === selectedPositionId) ?? null,
    [positions, selectedPositionId],
  );

  const title = VIEW_TITLES[view];

  const {
    myActivities,
    isLoadingMy,
    myError,
    fetchMyActivities,

    allActivities,
    allPagination,
    isLoadingAll,
    allError,
    fetchAllActivities,

    subordinatesActivities,
    isLoadingSubordinates,
    subordinatesError,
    fetchSubordinatesActivities,

    superiorActivities,
    isLoadingSuperior,
    fetchSuperiorActivities,

    myRequests,
    isLoadingRequests,
    requestsError,
    fetchMyRequests,
  } = useActivityData();

  useEffect(() => {
    if (view === 'my-activities' && selectedActingPosition) void fetchMyActivities();
    // My Activities self-child: ACTIVE activities of the acting Position's
    // direct superior (scope=superior) feed the self-child parent selector.
    if (view === 'my-activities' && selectedActingPosition) {
      void fetchSuperiorActivities(selectedActingPosition.positionId);
    }
  }, [view, fetchMyActivities, selectedActingPosition, fetchSuperiorActivities]);

  /**
   * Subordinates: only after an explicit acting Position is selected, and the
   * call always sends `scope=subordinates&actingPositionId=<core_positions.id>`.
   * Switching Position refetches; the hook replaces the list (no mixing).
   * `mine` is fetched too — the child-subordinate modal's parents are the
   * acting Position's OWN ACTIVE activities (`ownActiveParents`).
   */
  useEffect(() => {
    if (view === 'subordinates' && selectedActingPosition) {
      void fetchSubordinatesActivities(selectedActingPosition.positionId);
      void fetchMyActivities();
    }
  }, [view, selectedActingPosition, fetchSubordinatesActivities, fetchMyActivities]);

  useEffect(() => {
    if (view === 'my-requests') void fetchMyRequests();
  }, [view, fetchMyRequests]);

  const tableState = useKpiTableState(view === 'my-requests' ? REQUEST_TABLE_STATE : ACTIVITY_TABLE_STATE);
  const { filters: tableFilters, setSearch } = tableState;
  const [searchInput, setSearchInput] = useState(tableState.filters.search);
  const debouncedSearch = useDebounce(searchInput, 400);
  useEffect(() => {
    if (debouncedSearch !== tableFilters.search) setSearch(debouncedSearch);
  }, [debouncedSearch, tableFilters.search, setSearch]);
  useEffect(() => { setSearchInput(tableFilters.search); }, [tableFilters.search]);
  const normalizedSearch = tableFilters.search.trim().toLowerCase();

  const allActivitiesQuery = useMemo(() => ({
    page: tableFilters.page,
    size: tableFilters.size,
    search: tableFilters.search,
    status: tableFilters.filter as 'ACTIVE' | 'CANCELLED' | '',
    sortBy: tableFilters.sortBy as 'activityName' | 'createdAt',
    sortDirection: tableFilters.direction as 'asc' | 'desc',
  }), [tableFilters.direction, tableFilters.filter, tableFilters.page, tableFilters.search, tableFilters.size, tableFilters.sortBy]);

  useEffect(() => {
    if (view === 'all-activities') void fetchAllActivities(allActivitiesQuery);
  }, [view, fetchAllActivities, allActivitiesQuery]);

  const filteredMyActivities = useMemo(() => {
    const items = myActivities ?? [];
    return items.filter((a) => (!normalizedSearch || a.activityName.toLowerCase().includes(normalizedSearch)) && (!tableState.filters.filter || a.status === tableState.filters.filter));
  }, [myActivities, normalizedSearch, tableState.filters.filter]);

  const filteredSubordinates = useMemo(() => {
    const items = subordinatesActivities ?? [];
    return items.filter((a) => (!normalizedSearch || a.activityName.toLowerCase().includes(normalizedSearch)) && (!tableState.filters.filter || a.status === tableState.filters.filter));
  }, [subordinatesActivities, normalizedSearch, tableState.filters.filter]);

  const filteredMyRequests = useMemo(() => {
    const items = myRequests ?? [];
    return items.filter((r) => (!normalizedSearch || (r.activityName ?? '').toLowerCase().includes(normalizedSearch) || r.id.toLowerCase().includes(normalizedSearch)) && (!tableState.filters.filter || r.status === tableState.filters.filter));
  }, [myRequests, normalizedSearch, tableState.filters.filter]);

  const sortItems = useCallback(<T extends { activityName?: string | null; createdAt?: string | null }>(items: T[]) => {
    const direction = tableState.filters.direction === 'desc' ? -1 : 1;
    return [...items].sort((left, right) => {
      const leftValue = tableState.filters.sortBy === 'createdAt' ? (left.createdAt ?? '') : (left.activityName ?? '');
      const rightValue = tableState.filters.sortBy === 'createdAt' ? (right.createdAt ?? '') : (right.activityName ?? '');
      return leftValue.localeCompare(rightValue, 'id-ID') * direction;
    });
  }, [tableState.filters.direction, tableState.filters.sortBy]);
  const pagedMyActivities = useMemo(() => paginateKpiItems(sortItems(filteredMyActivities), tableState.filters.page), [filteredMyActivities, sortItems, tableState.filters.page]);
  const pagedAllActivities = useMemo(() => ({
    items: allActivities,
    totalItems: allPagination?.totalElements ?? 0,
    totalPages: allPagination?.totalPages ?? 1,
    page: allPagination?.page ?? tableState.filters.page,
  }), [allActivities, allPagination, tableState.filters.page]);
  const pagedSubordinates = useMemo(() => paginateKpiItems(sortItems(filteredSubordinates), tableState.filters.page), [filteredSubordinates, sortItems, tableState.filters.page]);
  const pagedMyRequests = useMemo(() => paginateKpiItems(sortItems(filteredMyRequests), tableState.filters.page), [filteredMyRequests, sortItems, tableState.filters.page]);

  const totalItems = useMemo(() => {
    switch (view) {
      case 'my-activities': return myActivities?.length ?? 0;
      case 'all-activities': return allPagination?.totalElements ?? 0;
      case 'subordinates': return subordinatesActivities?.length ?? 0;
      case 'my-requests': return myRequests?.length ?? 0;
      default: return 0;
    }
  }, [view, myActivities, allPagination, subordinatesActivities, myRequests]);

  const isAnyLoading = isLoadingMy || isLoadingAll || isLoadingSubordinates || isLoadingSuperior || isLoadingRequests || tableState.isQueryLoading || isLoadingPositions;

  const handleRefresh = useCallback(() => {
    if (view === 'my-activities' && selectedActingPosition) void fetchMyActivities();
    if (view === 'all-activities') void fetchAllActivities();
    if (view === 'subordinates' && selectedActingPosition) void fetchSubordinatesActivities(selectedActingPosition.positionId);
    if (view === 'my-requests') void fetchMyRequests();
  }, [view, fetchMyActivities, fetchAllActivities, fetchMyRequests, fetchSubordinatesActivities, selectedActingPosition]);

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
      selectedActingPosition
        ? fetchSubordinatesActivities(selectedActingPosition.positionId)
        : Promise.resolve(),
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
          <div className="w-72">
            <ActingPositionSelector
              positions={positions}
              value={selectedPositionId}
              onChange={setSelectedPositionId}
              disabled={isLoadingPositions || Boolean(positionsError)}
            />
          </div>
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
        hasActiveFilters={Boolean(tableState.filters.search || tableState.filters.filter || tableState.filters.sortBy !== (view === 'my-requests' ? REQUEST_TABLE_STATE.defaultSort : ACTIVITY_TABLE_STATE.defaultSort) || tableState.filters.direction !== 'asc')}
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
              onRetry={() => { if (selectedActingPosition) void fetchSubordinatesActivities(selectedActingPosition.positionId); }}
              emptyLabel={positions.length === 0 && !isLoadingPositions ? 'Anda tidak memiliki posisi aktif — tindakan yang bergantung pada posisi (pengajuan, aktivitas bawahan, dan persetujuan) tidak tersedia. Hubungi administrator jika ini tidak terduga.' : 'Pilih posisi aktif untuk melihat aktivitas bawahan.'}
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
