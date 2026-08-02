'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Breadcrumbs,
  BreadcrumbsItem,
  Button,
  Chip,
  SearchField,
  Tabs,
} from '@heroui/react';
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
import { useActivityData } from '@/modules/kpi/activity/use-activity-data';
import { AdminCreateActivityModal } from '@/modules/kpi/admin/admin-create-activity-modal';

type ViewId = 'my-activities' | 'all-activities' | 'my-requests';

/**
 * Activity workspace (`/kpi/activities`) — V1 scoped views.
 *
 * Owns: Activity lists (`mine` / `all` as view controls), Activity detail, and
 * submitted-request history (`requests?scope=mine`).
 *
 * Deliberately NOT here:
 *   - No Approval / To Review tab — the queue lives only on `/kpi/approvals`.
 *   - No `subordinates` view and no create/child/update/cancel actions — they
 *     require an explicit acting Position (`core_positions.id`) and the
 *     frontend has no self-accessible position source yet (plan §15.1).
 *     No position is ever guessed.
 */
export default function KpiActivitiesPage() {
  const { hasAnyPerm, hasPerm } = usePermission();

  const canViewAll = hasAnyPerm(PERM.KPI_ACTIVITY_READ_ALL, PERM.KPI_ACTIVITY_MANAGE);
  // T10 administrative tool — direct Activity creation for `kpi_activity:manage` holders.
  const canAdminCreate = hasPerm(PERM.KPI_ACTIVITY_MANAGE);

  const views = useMemo(() => {
    const result: { id: ViewId; label: string }[] = [
      { id: 'my-activities', label: 'My Activities' },
    ];
    if (canViewAll) {
      result.push({ id: 'all-activities', label: 'All Activities' });
    }
    result.push({ id: 'my-requests', label: 'My Requests' });
    return result;
  }, [canViewAll]);

  const [activeView, setActiveView] = useState<ViewId>('my-activities');
  const [searchQuery, setSearchQuery] = useState('');

  const effectiveView = views.some((v) => v.id === activeView)
    ? activeView
    : views[0]?.id ?? 'my-activities';

  const {
    myActivities,
    isLoadingMy,
    myError,
    fetchMyActivities,

    allActivities,
    isLoadingAll,
    allError,
    fetchAllActivities,

    myRequests,
    isLoadingRequests,
    requestsError,
    fetchMyRequests,
  } = useActivityData();

  useEffect(() => {
    if (effectiveView === 'my-activities') fetchMyActivities();
  }, [effectiveView, fetchMyActivities]);

  useEffect(() => {
    if (effectiveView === 'all-activities') fetchAllActivities();
  }, [effectiveView, fetchAllActivities]);

  useEffect(() => {
    if (effectiveView === 'my-requests') fetchMyRequests();
  }, [effectiveView, fetchMyRequests]);

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

  const filteredMyRequests = useMemo(() => {
    const items = myRequests ?? [];
    if (!normalizedSearch) return items;
    return items.filter((r) =>
      (r.activityName ?? '').toLowerCase().includes(normalizedSearch)
      || r.id.toLowerCase().includes(normalizedSearch),
    );
  }, [myRequests, normalizedSearch]);

  const totalItems = useMemo(() => {
    switch (effectiveView) {
      case 'my-activities': return myActivities?.length ?? 0;
      case 'all-activities': return allActivities?.length ?? 0;
      case 'my-requests': return myRequests?.length ?? 0;
      default: return 0;
    }
  }, [effectiveView, myActivities, allActivities, myRequests]);

  const isAnyLoading = isLoadingMy || isLoadingAll || isLoadingRequests;

  const handleRefresh = useCallback(() => {
    void Promise.allSettled([
      fetchMyActivities(),
      fetchAllActivities(),
      fetchMyRequests(),
    ]);
  }, [fetchMyActivities, fetchAllActivities, fetchMyRequests]);

  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    mode: 'ACTIVITY' | 'REQUEST';
    entityId: string | null;
  }>({
    isOpen: false,
    mode: 'ACTIVITY',
    entityId: null,
  });

  const openActivityDetail = useCallback((id: string) => {
    setDetailModal({ isOpen: true, mode: 'ACTIVITY', entityId: id });
  }, []);

  const openRequestDetail = useCallback((id: string) => {
    setDetailModal({ isOpen: true, mode: 'REQUEST', entityId: id });
  }, []);

  const closeDetail = useCallback(() => {
    setDetailModal({ isOpen: false, mode: 'ACTIVITY', entityId: null });
  }, []);

  // ── Admin create modal state (T10, kpi_activity:manage) ──
  const [adminCreateOpen, setAdminCreateOpen] = useState(false);

  const handleAdminCreateSuccess = useCallback(() => {
    if (effectiveView === 'my-requests') {
      fetchMyRequests();
    } else {
      fetchMyActivities();
      if (canViewAll) fetchAllActivities();
    }
  }, [effectiveView, fetchMyActivities, fetchAllActivities, fetchMyRequests, canViewAll]);

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/">
          <House className="h-4 w-4" />
        </BreadcrumbsItem>
        <BreadcrumbsItem>KPI</BreadcrumbsItem>
        <BreadcrumbsItem>Activities</BreadcrumbsItem>
      </Breadcrumbs>

      {/* Row 1: Title + Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">
            {KPI_LABELS.activities}
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

          {canAdminCreate && (
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

      {/* Row 2: Views (left) | Search (right) */}
      <div className="flex min-w-0 items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Tabs
            className="w-full min-w-0"
            selectedKey={effectiveView}
            onSelectionChange={(key) => setActiveView(key as ViewId)}
          >
            <Tabs.ListContainer>
              <Tabs.List
                aria-label="KPI Activities"
                className="w-max flex-nowrap"
              >
                {views.map((view) => (
                  <Tabs.Tab
                    key={view.id}
                    id={view.id}
                    className="w-fit shrink-0 whitespace-nowrap"
                  >
                    {view.label}
                    <Tabs.Indicator />
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
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

      {/* Active view table */}
      <div className="w-full">
        {effectiveView === 'my-activities' && (
          <ActivityTable
            items={filteredMyActivities}
            isLoading={isLoadingMy}
            error={myError}
            onViewDetail={openActivityDetail}
            onRetry={fetchMyActivities}
          />
        )}

        {effectiveView === 'all-activities' && (
          <ActivityTable
            items={filteredAllActivities}
            isLoading={isLoadingAll}
            error={allError}
            onViewDetail={openActivityDetail}
            onRetry={fetchAllActivities}
          />
        )}

        {effectiveView === 'my-requests' && (
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

      {/* T10 — administrative Activity create */}
      <AdminCreateActivityModal
        isOpen={adminCreateOpen}
        onClose={() => setAdminCreateOpen(false)}
        onSuccess={handleAdminCreateSuccess}
      />
    </div>
  );
}
