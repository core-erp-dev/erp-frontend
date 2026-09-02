'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Breadcrumbs, BreadcrumbsItem, Button, Chip, Dropdown, Label, toast, type Selection } from '@heroui/react';
import {
  ArrowsClockwise,
  House,
  Plus,
  CaretDown,
} from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

import { PERM } from '@/constants/permissions';
import { usePermission } from '@/hooks/use-permission';
import { KPI_LABELS } from '@/modules/kpi/constants';
import { ActivityTable } from '@/modules/kpi/activity/activity-table';
import { RequestTable } from '@/modules/kpi/activity/request-table';
import { ActivityChangeModal } from '@/modules/kpi/activity/activity-change-modal';
import { useActivityData } from '@/modules/kpi/activity/use-activity-data';
import { AdminReassignActivityModal } from '@/modules/kpi/admin/admin-reassign-activity-modal';
import { kpiAdminV1Api } from '@/modules/kpi/admin/kpi-admin-v1-api';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { useMyPositions } from '@/modules/kpi/shared/acting-position-selector';
import type { ActingPosition } from '@/modules/kpi/shared/acting-position';
import type { KpiActivityResponse } from '@/modules/kpi/activity/activity-v1.types';
import type { ActivityRequestListQuery } from '@/modules/kpi/activity/activity-v1.types';
import { KpiTableToolbar, type KpiTableFilterSection } from '@/modules/kpi/shared/kpi-table';
import { useKpiTableState } from '@/modules/kpi/shared/use-kpi-table-state';
import { useDebounce } from '@/hooks/use-debounce';
import { ForbiddenAccess } from '@/components/shared/forbidden-access';
import { activityV1Api } from '@/modules/kpi/activity/activity-v1-api';
import { MONTH_NAMES_ID } from '@/modules/kpi/corporate/period-label';

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
  periodFilter: 'month' as const,
};
const REQUEST_TABLE_STATE = {
  sortOptions: ['activityName', 'createdAt'],
  defaultSort: 'activityName',
  defaultDirection: 'asc' as const,
  filterOptions: ['PENDING', 'APPROVED', 'REJECTED'],
  periodFilter: 'month' as const,
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
 * owned by the user; an optional URL `positionId` narrows the dataset. Position
 * selection required for submission lives on the dedicated form pages.
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
  const router = useRouter();
  const { hasPerm } = usePermission();
  // T10/T11 administrative tools — exactly `kpi_activity:manage` (never an approval bypass).
  const canAdminManage = hasPerm(PERM.KPI_ACTIVITY_MANAGE);

  const tableState = useKpiTableState(view === 'my-requests' ? REQUEST_TABLE_STATE : ACTIVITY_TABLE_STATE);
  const { filters: tableFilters, setSearch } = tableState;
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const periodYear = tableFilters.periodYear ?? currentYear;
  const periodMonth = tableFilters.periodMonth ?? currentMonth;
  const [periodYears, setPeriodYears] = useState<number[]>([currentYear]);
  const [isLoadingPeriodOptions, setIsLoadingPeriodOptions] = useState(false);

  /* ── Position filter (URL-controlled; default is all active positions) ── */
  const needsPosition = view === 'my-activities' || view === 'subordinates';
  const { positions, isLoading: isLoadingPositions, error: positionsError } = useMyPositions(needsPosition);
  const selectedPositionId = tableFilters.positionId || null;
  const subordinateScope = tableFilters.subordinateScope as 'all' | 'direct';

  useEffect(() => {
    let active = true;
    setIsLoadingPeriodOptions(true);
    const loadPeriodOptions = async () => {
      try {
        const options = view === 'my-requests'
          ? await activityV1Api.getRequestPeriodOptions('mine')
          : await activityV1Api.getActivityPeriodOptions(
              view === 'all-activities' ? 'all' : view === 'subordinates' ? 'subordinates' : 'mine',
              undefined,
              { positionId: selectedPositionId ?? undefined, subordinateScope },
            );
        if (active) setPeriodYears(options.years.length > 0 ? options.years : [currentYear]);
      } catch {
        if (active) setPeriodYears([currentYear]);
      } finally {
        if (active) setIsLoadingPeriodOptions(false);
      }
    };
    void loadPeriodOptions();
    return () => { active = false; };
  }, [currentYear, selectedPositionId, subordinateScope, view]);

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
    periodYear,
    periodMonth,
    sortBy: tableFilters.sortBy as 'activityName' | 'createdAt',
    sortDirection: tableFilters.direction as 'asc' | 'desc',
  }), [needsPosition, periodMonth, periodYear, subordinateScope, tableFilters.direction, tableFilters.filter, tableFilters.page, tableFilters.positionId, tableFilters.search, tableFilters.size, tableFilters.sortBy, view]);

  const activityFilterSections = useMemo<KpiTableFilterSection[]>(() => [
    {
      id: 'position',
      label: 'Posisi',
      options: [
        { id: 'position:all', label: 'Semua Posisi' },
        ...positions.map((position) => ({ id: `position:${position.positionId}`, label: position.positionName })),
      ],
    },
    ...(view === 'subordinates' ? [{
      id: 'scope',
      label: 'Cakupan Bawahan',
      options: [
        { id: 'scope:all', label: 'Semua Bawahan' },
        { id: 'scope:direct', label: 'Bawahan Langsung' },
      ],
    }] : []),
    {
      id: 'status',
      label: 'Status',
      options: [{ id: 'status:ACTIVE', label: 'Aktif' }, { id: 'status:CANCELLED', label: 'Dibatalkan' }],
    },
  ], [positions, view]);

  const selectedActivityFilterIds = useMemo(() => new Set([
    `position:${selectedPositionId ?? 'all'}`,
    ...(view === 'subordinates' ? [`scope:${subordinateScope}`] : []),
    ...(tableFilters.filter ? [`status:${tableFilters.filter}`] : []),
  ]), [selectedPositionId, subordinateScope, tableFilters.filter, view]);

  const handleActivityFilterChange = useCallback((selection: Selection) => {
    const selected = selection instanceof Set ? Array.from(selection).map(String) : [];
    const positionKey = selected.filter((key) => key.startsWith('position:')).at(-1);
    const nextPositionId = positionKey && positionKey !== 'position:all'
      ? positionKey.replace('position:', '')
      : '';
    if (nextPositionId !== (selectedPositionId ?? '')) tableState.setPositionId(nextPositionId);

    if (view === 'subordinates') {
      const scopeKey = selected.filter((key) => key.startsWith('scope:')).at(-1);
      const nextScope = scopeKey === 'scope:direct' ? 'direct' : 'all';
      if (nextScope !== subordinateScope) tableState.setSubordinateScope(nextScope);
    }

    const statusKey = selected.filter((key) => key.startsWith('status:')).at(-1);
    const nextStatus = statusKey ? statusKey.replace('status:', '') : '';
    if (nextStatus !== tableFilters.filter) tableState.setFilter(nextStatus);
  }, [selectedPositionId, subordinateScope, tableFilters.filter, tableState, view]);

  const requestQuery: ActivityRequestListQuery = useMemo(() => ({
    page: tableFilters.page,
    size: tableFilters.size,
    search: tableFilters.search,
    status: tableFilters.filter as ActivityRequestListQuery['status'],
    periodYear,
    periodMonth,
    sortBy: tableFilters.sortBy as ActivityRequestListQuery['sortBy'],
    sortDirection: tableFilters.direction as ActivityRequestListQuery['sortDirection'],
  }), [periodMonth, periodYear, tableFilters.direction, tableFilters.filter, tableFilters.page, tableFilters.search, tableFilters.size, tableFilters.sortBy]);

  useEffect(() => {
    if (view === 'all-activities') void fetchAllActivities(allActivitiesQuery);
  }, [view, fetchAllActivities, allActivitiesQuery]);

  useEffect(() => {
    if (view === 'my-activities') void fetchMyActivities(allActivitiesQuery);
    if (view === 'subordinates') void fetchSubordinatesActivities(undefined, allActivitiesQuery);
    if (view === 'my-requests') void fetchMyRequests(requestQuery);
  }, [view, allActivitiesQuery, requestQuery, fetchMyActivities, fetchMyRequests, fetchSubordinatesActivities]);
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

  const isAnyLoading = isLoadingMy || isLoadingAll || isLoadingSubordinates || isLoadingRequests || tableState.isQueryLoading;

  const handleRefresh = useCallback(() => {
    if (view === 'my-activities') void fetchMyActivities(allActivitiesQuery);
    if (view === 'all-activities') void fetchAllActivities(allActivitiesQuery);
    if (view === 'subordinates') void fetchSubordinatesActivities(undefined, allActivitiesQuery);
    if (view === 'my-requests') void fetchMyRequests(requestQuery);
  }, [allActivitiesQuery, fetchAllActivities, fetchMyActivities, fetchMyRequests, fetchSubordinatesActivities, requestQuery, view]);

  const openActivityDetail = useCallback((id: string) => {
    const from = view === 'subordinates' ? 'subordinate' : view === 'my-activities' ? 'mine' : 'all';
    router.push(`/kpi/activities/${id}?from=${from}`);
  }, [router, view]);

  const getActivityHref = useCallback((item: KpiActivityResponse) => {
    const from = view === 'subordinates' ? 'subordinate' : view === 'my-activities' ? 'mine' : 'all';
    return `/kpi/activities/${item.id}?from=${from}`;
  }, [view]);

  const getRequestHref = useCallback((id: string) => `/kpi/activity-requests/${id}?from=mine`, []);

  /* ── T5 change modal (update | cancel) ── */
  const [changeModal, setChangeModal] = useState<{
    isOpen: boolean;
    mode: 'update' | 'cancel';
    activity: KpiActivityResponse | null;
    actingPosition: ActingPosition | null;
  }>({ isOpen: false, mode: 'update', activity: null, actingPosition: null });

  const [adminReassignTarget, setAdminReassignTarget] = useState<KpiActivityResponse | null>(null);
  const [adminCancelTarget, setAdminCancelTarget] = useState<KpiActivityResponse | null>(null);
  const [isAdminCancelling, setIsAdminCancelling] = useState(false);

  /** Refetch every relevant dataset after a successful mutation or conflict. */
  const refetchAll = useCallback(() => {
    void Promise.allSettled([
      fetchMyActivities(allActivitiesQuery),
      fetchAllActivities(allActivitiesQuery),
      fetchMyRequests(requestQuery),
      fetchSubordinatesActivities(undefined, allActivitiesQuery),
    ]);
  }, [allActivitiesQuery, fetchAllActivities, fetchMyActivities, fetchMyRequests, fetchSubordinatesActivities, requestQuery]);

  const refetchCurrent = useCallback(() => {
    if (view === 'my-activities') void fetchMyActivities(allActivitiesQuery);
    if (view === 'subordinates') void fetchSubordinatesActivities(undefined, allActivitiesQuery);
    if (view === 'my-requests') void fetchMyRequests(requestQuery);
  }, [allActivitiesQuery, fetchMyActivities, fetchMyRequests, fetchSubordinatesActivities, requestQuery, view]);

  const handleAdminCancel = useCallback(async () => {
    if (!adminCancelTarget) return;
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

          {view === 'my-activities' && (
            <Button
              variant="primary"
              onPress={() => router.push('/kpi/activities/mine/create')}
              isDisabled={isLoadingPositions || (!positionsError && positions.length === 0)}
            >
              <Plus className="h-4 w-4" />
              Ajukan Aktivitas
            </Button>
          )}

          {view === 'subordinates' && (
            <Button
              variant="primary"
              onPress={() => router.push('/kpi/activities/subordinate/create')}
              isDisabled={isLoadingPositions || (!positionsError && positions.length === 0)}
            >
              <Plus className="h-4 w-4" />
              Ajukan Aktivitas Bawahan
            </Button>
          )}

          {view === 'all-activities' && canAdminManage && (
            <Button
              variant="primary"
              onPress={() => router.push('/kpi/activities/create')}
            >
              <Plus className="h-4 w-4" />
              Buat Aktivitas
            </Button>
          )}
        </div>
      </div>

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
          </div>
        }
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchLabel="Cari aktivitas"
        filterSections={needsPosition ? activityFilterSections : undefined}
        filterOptions={!needsPosition ? (view === 'my-requests' ? [{ id: 'PENDING', label: 'Menunggu Persetujuan' }, { id: 'APPROVED', label: 'Disetujui' }, { id: 'REJECTED', label: 'Ditolak' }] : [{ id: 'ACTIVE', label: 'Aktif' }, { id: 'CANCELLED', label: 'Dibatalkan' }]) : undefined}
        filterSelectionMode={needsPosition ? 'multiple' : 'single'}
        selectedFilterIds={needsPosition ? selectedActivityFilterIds : (tableState.filters.filter ? new Set([tableState.filters.filter]) : new Set())}
        filterCount={needsPosition ? Number(Boolean(selectedPositionId)) + Number(view === 'subordinates' && subordinateScope === 'direct') + Number(Boolean(tableFilters.filter)) : undefined}
        onFilterChange={needsPosition ? handleActivityFilterChange : (selection) => {
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
        hasActiveFilters={Boolean(tableState.filters.search || tableState.filters.filter || tableState.filters.positionId || (view === 'subordinates' && subordinateScope === 'direct') || periodYear !== currentYear || periodMonth !== currentMonth || tableState.filters.sortBy !== (view === 'my-requests' ? REQUEST_TABLE_STATE.defaultSort : ACTIVITY_TABLE_STATE.defaultSort) || tableState.filters.direction !== 'asc')}
        onReset={() => { setSearchInput(''); tableState.reset(); }}
      />

      {/* Active view table */}
      <div className="w-full">
        {view === 'my-activities' && (
          <ActivityTable
            items={pagedMyActivities.items}
            isLoading={isLoadingMy || tableState.isQueryLoading}
            error={myError}
            onViewDetail={openActivityDetail}
            getActivityHref={getActivityHref}
            onRetry={() => { void fetchMyActivities(allActivitiesQuery); }}
            ownAssignmentUserPositionIds={positions.map((position) => position.userPositionId)}
            onRequestChange={(item, mode) => {
              if (mode === 'update') router.push(`/kpi/activities/${item.id}/request-edit?from=mine`);
              else setChangeModal({
                isOpen: true,
                mode,
                activity: item,
                actingPosition: positions.find((position) => position.userPositionId === item.assignedToUserPositionId) ?? null,
              });
            }}
            canAdminEdit={false}
            onAdminEdit={undefined}
            emptyLabel={positions.length === 0 && !isLoadingPositions && !positionsError ? 'Anda tidak memiliki posisi aktif. Hubungi administrator jika ini tidak terduga.' : 'Belum ada aktivitas.'}
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
            getActivityHref={getActivityHref}
            onRetry={() => { void fetchAllActivities(allActivitiesQuery); }}
            canAdminEdit={canAdminManage}
            onAdminEdit={canAdminManage ? (item) => router.push(`/kpi/activities/${item.id}/edit?from=all`) : undefined}
            onAdminReassign={canAdminManage ? setAdminReassignTarget : undefined}
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
              isLoading={isLoadingSubordinates || tableState.isQueryLoading}
              error={subordinatesError}
              onViewDetail={openActivityDetail}
              getActivityHref={getActivityHref}
              onRetry={() => { void fetchSubordinatesActivities(undefined, allActivitiesQuery); }}
              emptyLabel={positions.length === 0 && !isLoadingPositions && !positionsError ? 'Anda tidak memiliki posisi aktif. Hubungi administrator jika ini tidak terduga.' : 'Belum ada aktivitas bawahan.'}
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
            getDetailHref={(item) => getRequestHref(item.id)}
            onViewDetail={(item) => router.push(getRequestHref(item.id))}
            totalItems={pagedMyRequests.totalItems}
            currentPage={pagedMyRequests.page}
            totalPages={pagedMyRequests.totalPages}
            onPageChange={tableState.setPage}
          />
        )}
      </div>

      {view === 'all-activities' && adminReassignTarget && (
        <AdminReassignActivityModal
          isOpen
          onClose={() => setAdminReassignTarget(null)}
          activity={adminReassignTarget}
          onSuccess={refetchAll}
          onConflict={refetchAll}
        />
      )}

      {view === 'all-activities' && (
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
      )}

      {changeModal.activity && changeModal.actingPosition && (
        <ActivityChangeModal
          isOpen={changeModal.isOpen}
          onClose={() => setChangeModal({ isOpen: false, mode: 'cancel', activity: null, actingPosition: null })}
          mode="cancel"
          activity={changeModal.activity}
          actingPosition={changeModal.actingPosition}
          onSuccess={refetchCurrent}
          onConflict={refetchCurrent}
        />
      )}

    </div>
  );
}
