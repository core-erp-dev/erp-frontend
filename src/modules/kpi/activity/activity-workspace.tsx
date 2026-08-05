'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  Breadcrumbs,
  BreadcrumbsItem,
  Button,
  Chip,
  SearchField,
} from '@heroui/react';
import {
  ArrowsClockwise,
  House,
  Plus,
  SquaresFour,
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
import {
  ActingPositionPanel,
  useMyPositions,
} from '@/modules/kpi/shared/acting-position-selector';
import type { ActingPosition } from '@/modules/kpi/shared/acting-position';
import type { KpiActivityResponse } from '@/modules/kpi/activity/activity-v1.types';

export type ActivityViewId = 'my-activities' | 'all-activities' | 'subordinates' | 'my-requests';

const VIEW_TITLES: Record<ActivityViewId, string> = {
  'my-activities': KPI_LABELS.activitiesMine,
  'all-activities': KPI_LABELS.activitiesAll,
  'subordinates': KPI_LABELS.activitiesSubordinate,
  'my-requests': KPI_LABELS.activitiesMyRequests,
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
  const { hasAnyPerm, hasPerm } = usePermission();

  const canViewAll = hasAnyPerm(PERM.KPI_ACTIVITY_READ_ALL, PERM.KPI_ACTIVITY_MANAGE);
  // T4 root request — exactly `kpi_activity:root_request` (never read_all/manage).
  const canRequestRoot = hasPerm(PERM.KPI_ACTIVITY_ROOT_REQUEST);
  // T10/T11 administrative tools — exactly `kpi_activity:manage` (never an approval bypass).
  const canAdminManage = hasPerm(PERM.KPI_ACTIVITY_MANAGE);

  /* ── Acting-Position selection (explicit, never implicit) ── */
  const { positions, isLoading: isLoadingPositions, error: positionsError, refetch: refetchPositions } = useMyPositions();
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const selectedActingPosition: ActingPosition | null = useMemo(
    () => positions.find((p) => p.positionId === selectedPositionId) ?? null,
    [positions, selectedPositionId],
  );

  const title = VIEW_TITLES[view];

  /* ── Route direct-load guard: `all` is gated on read_all | manage. ── */
  if (view === 'all-activities' && !canViewAll) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Breadcrumbs>
          <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
          <BreadcrumbsItem>KPI</BreadcrumbsItem>
          <BreadcrumbsItem>{KPI_LABELS.activities}</BreadcrumbsItem>
          <BreadcrumbsItem>{title}</BreadcrumbsItem>
        </Breadcrumbs>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Access Denied</Alert.Title>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  const {
    myActivities,
    isLoadingMy,
    myError,
    fetchMyActivities,

    allActivities,
    isLoadingAll,
    allError,
    fetchAllActivities,

    subordinatesActivities,
    isLoadingSubordinates,
    subordinatesError,
    fetchSubordinatesActivities,

    myRequests,
    isLoadingRequests,
    requestsError,
    fetchMyRequests,
  } = useActivityData();

  useEffect(() => {
    if (view === 'my-activities') void fetchMyActivities();
  }, [view, fetchMyActivities]);

  useEffect(() => {
    if (view === 'all-activities') void fetchAllActivities();
  }, [view, fetchAllActivities]);

  /**
   * Subordinates: only after an explicit acting Position is selected, and the
   * call always sends `scope=subordinates&actingPositionId=<core_positions.id>`.
   * Switching Position refetches; the hook replaces the list (no mixing).
   */
  useEffect(() => {
    if (view === 'subordinates' && selectedActingPosition) {
      void fetchSubordinatesActivities(selectedActingPosition.positionId);
    }
  }, [view, selectedActingPosition, fetchSubordinatesActivities]);

  useEffect(() => {
    if (view === 'my-requests') void fetchMyRequests();
  }, [view, fetchMyRequests]);

  const [searchQuery, setSearchQuery] = useState('');
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredMyActivities = useMemo(() => {
    const items = myActivities ?? [];
    if (!normalizedSearch) return items;
    return items.filter((a) => a.activityName.toLowerCase().includes(normalizedSearch));
  }, [myActivities, normalizedSearch]);

  const filteredAllActivities = useMemo(() => {
    const items = allActivities ?? [];
    if (!normalizedSearch) return items;
    return items.filter((a) => a.activityName.toLowerCase().includes(normalizedSearch));
  }, [allActivities, normalizedSearch]);

  const filteredSubordinates = useMemo(() => {
    const items = subordinatesActivities ?? [];
    if (!normalizedSearch) return items;
    return items.filter((a) => a.activityName.toLowerCase().includes(normalizedSearch));
  }, [subordinatesActivities, normalizedSearch]);

  const filteredMyRequests = useMemo(() => {
    const items = myRequests ?? [];
    if (!normalizedSearch) return items;
    return items.filter((r) =>
      (r.activityName ?? '').toLowerCase().includes(normalizedSearch)
      || r.id.toLowerCase().includes(normalizedSearch),
    );
  }, [myRequests, normalizedSearch]);

  const totalItems = useMemo(() => {
    switch (view) {
      case 'my-activities': return myActivities?.length ?? 0;
      case 'all-activities': return allActivities?.length ?? 0;
      case 'subordinates': return subordinatesActivities?.length ?? 0;
      case 'my-requests': return myRequests?.length ?? 0;
      default: return 0;
    }
  }, [view, myActivities, allActivities, subordinatesActivities, myRequests]);

  const isAnyLoading = isLoadingMy || isLoadingAll || isLoadingSubordinates || isLoadingRequests;

  const handleRefresh = useCallback(() => {
    void Promise.allSettled([
      fetchMyActivities(),
      fetchAllActivities(),
      fetchMyRequests(),
      selectedActingPosition
        ? fetchSubordinatesActivities(selectedActingPosition.positionId)
        : Promise.resolve(),
    ]);
  }, [fetchMyActivities, fetchAllActivities, fetchMyRequests, fetchSubordinatesActivities, selectedActingPosition]);

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
    initialParentId?: string | null;
  }>({ isOpen: false, mode: 'root', initialParentId: null });

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
  }>({ isOpen: false, activity: null });

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
    ]);
  }, [fetchMyActivities, fetchAllActivities, fetchMyRequests, fetchSubordinatesActivities, selectedActingPosition]);

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
            aria-label={`Total ${totalItems} items`}
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
            aria-label="Refresh"
          >
            <ArrowsClockwise
              className={`h-4 w-4 ${isAnyLoading ? 'animate-spin' : ''}`}
            />
          </Button>

          {canRequestRoot && (
            <Button
              variant="primary"
              onPress={() => setRequestModal({ isOpen: true, mode: 'root' })}
              isDisabled={!selectedActingPosition}
            >
              <Plus className="h-4 w-4" />
              Request Activity
            </Button>
          )}

          {canAdminManage && (
            <Button
              variant="primary"
              onPress={() => setAdminCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Admin Create Activity
            </Button>
          )}
        </div>
      </div>

      {/* Row 2: Acting Position + Search */}
      <div className="flex min-w-0 items-center justify-between gap-4">
        <div className="flex shrink-0 items-center gap-4">
          <div className="w-72">
            <ActingPositionPanel
              positions={positions}
              isLoading={isLoadingPositions}
              error={positionsError}
              onRetry={() => { setSelectedPositionId(null); void refetchPositions(); }}
              value={selectedPositionId}
              onChange={setSelectedPositionId}
            />
          </div>
          <SearchField
            name="search"
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-72 shrink-0"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input
                aria-label="Search activities"
                placeholder="Search activities"
              />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>
      </div>

      {/* Active view table */}
      <div className="w-full">
        {view === 'my-activities' && (
          <ActivityTable
            items={filteredMyActivities}
            isLoading={isLoadingMy}
            error={myError}
            onViewDetail={openActivityDetail}
            onRetry={fetchMyActivities}
            ownAssignmentUserPositionId={selectedActingPosition?.userPositionId ?? null}
            onAddChild={selectedActingPosition
              ? (item) => setRequestModal({ isOpen: true, mode: 'child', initialParentId: item.id })
              : undefined}
            onRequestChange={selectedActingPosition
              ? (item, mode) => setChangeModal({ isOpen: true, mode, activity: item })
              : undefined}
            canAdminEdit={canAdminManage}
            onAdminEdit={canAdminManage ? (item) => setAdminEditModal({ isOpen: true, activity: item }) : undefined}
          />
        )}

        {view === 'all-activities' && (
          <ActivityTable
            items={filteredAllActivities}
            isLoading={isLoadingAll}
            error={allError}
            onViewDetail={openActivityDetail}
            onRetry={fetchAllActivities}
            showAssignee
            canAdminEdit={canAdminManage}
            onAdminEdit={canAdminManage ? (item) => setAdminEditModal({ isOpen: true, activity: item }) : undefined}
          />
        )}

        {view === 'subordinates' && (
          selectedActingPosition ? (
            <ActivityTable
              items={filteredSubordinates}
              isLoading={isLoadingSubordinates}
              error={subordinatesError}
              onViewDetail={openActivityDetail}
              onRetry={() => fetchSubordinatesActivities(selectedActingPosition.positionId)}
              showAssignee
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-default-300 py-12 text-muted-foreground">
              <SquaresFour className="h-8 w-8" />
              <span className="text-sm">
                Select an acting position above to view subordinate activities.
              </span>
            </div>
          )
        )}

        {view === 'my-requests' && (
          <RequestTable
            items={filteredMyRequests}
            isLoading={isLoadingRequests}
            error={requestsError}
            onViewDetail={openRequestDetail}
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
          onClose={() => setRequestModal({ isOpen: false, mode: 'root', initialParentId: null })}
          mode={requestModal.mode}
          actingPosition={selectedActingPosition}
          parents={ownActiveParents}
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
          onClose={() => setAdminEditModal({ isOpen: false, activity: null })}
          activity={adminEditModal.activity}
          onSuccess={refetchAll}
          onConflict={refetchAll}
        />
      )}
    </div>
  );
}
