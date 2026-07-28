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
import { ActivityCancelDialog } from '@/modules/kpi/activity/activity-cancel-dialog';
import { ActivityFormModal } from '@/modules/kpi/activity/activity-form-modal';
import { ActivityTable } from '@/modules/kpi/activity/activity-table';
import { ApprovalDialog } from '@/modules/kpi/activity/approval-dialog';
import { ApprovalTable } from '@/modules/kpi/activity/approval-table';
import { KpiActivityDetailModal } from '@/modules/kpi/activity/kpi-activity-detail-modal';
import { RequestTable } from '@/modules/kpi/activity/request-table';
import { useActivityData } from '@/modules/kpi/activity/use-activity-data';
import { useApprovalData } from '@/modules/kpi/activity/use-approval-data';
import type {
  ActivityFormMode,
  KpiActivityChangeRequestResponse,
  KpiActivityResponse,
} from '@/modules/kpi/activity/activity.types';

type TabId =
  | 'my-activities'
  | 'managed-activities'
  | 'owned-activities'
  | 'my-requests'
  | 'approvals';

export default function KpiActivitiesPage() {
  const { hasPerm, hasAnyPerm } = usePermission();

  const canRead = hasPerm(PERM.KPI_ACTIVITY_READ);

  const canOwned = hasAnyPerm(
    PERM.KPI_ACTIVITY_ROOT_REQUEST,
    PERM.KPI_ACTIVITY_REQUEST,
  );

  const canRequest = hasPerm(PERM.KPI_ACTIVITY_REQUEST);

  const canMyRequests = hasAnyPerm(
    PERM.KPI_ACTIVITY_REQUEST,
    PERM.KPI_ACTIVITY_ROOT_REQUEST,
  );

  const canApprove = hasPerm(PERM.KPI_ACTIVITY_APPROVE);

  const canAccess = hasAnyPerm(
    PERM.KPI_ACTIVITY_READ,
    PERM.KPI_ACTIVITY_REQUEST,
    PERM.KPI_ACTIVITY_ROOT_REQUEST,
    PERM.KPI_ACTIVITY_APPROVE,
  );

  const canCreateRoot =
    hasPerm(PERM.KPI_ACTIVITY_ROOT_REQUEST) &&
    hasPerm(PERM.CORPORATE_KPI_READ);

  const tabs = useMemo(() => {
    const result: { id: TabId; label: string }[] = [];

    if (canRead) {
      result.push({
        id: 'my-activities',
        label: 'My Activities',
      });

      result.push({
        id: 'managed-activities',
        label: 'Managed',
      });
    }

    if (canOwned) {
      result.push({
        id: 'owned-activities',
        label: 'Owned',
      });
    }

    if (canMyRequests) {
      result.push({
        id: 'my-requests',
        label: 'My Requests',
      });
    }

    if (canApprove) {
      result.push({
        id: 'approvals',
        label: 'Approvals',
      });
    }

    return result;
  }, [
    canApprove,
    canMyRequests,
    canOwned,
    canRead,
  ]);

  const [activeTab, setActiveTab] =
    useState<TabId>('my-activities');

  const [searchQuery, setSearchQuery] = useState('');

  const effectiveTab = tabs.some(
    (tab) => tab.id === activeTab,
  )
    ? activeTab
    : tabs[0]?.id ?? 'my-activities';

  const {
    myActivities,
    isLoadingMy,
    myError,
    fetchMyActivities,

    managedActivities,
    isLoadingManaged,
    managedError,
    fetchManagedActivities,

    ownedActivities,
    isLoadingOwned,
    ownedError,
    fetchOwnedActivities,

    myRequests,
    isLoadingRequests,
    requestsError,
    fetchMyRequests,
  } = useActivityData();

  const {
    pendingRequests,
    isLoadingPending,
    pendingError,
    fetchPending,
  } = useApprovalData();

  useEffect(() => {
    if (effectiveTab === 'my-activities') {
      fetchMyActivities();
    }
  }, [
    effectiveTab,
    fetchMyActivities,
  ]);

  useEffect(() => {
    if (effectiveTab === 'managed-activities') {
      fetchManagedActivities();
    }
  }, [
    effectiveTab,
    fetchManagedActivities,
  ]);

  useEffect(() => {
    if (effectiveTab === 'owned-activities') {
      fetchOwnedActivities();
    }
  }, [
    effectiveTab,
    fetchOwnedActivities,
  ]);

  useEffect(() => {
    if (effectiveTab === 'my-requests') {
      fetchMyRequests();
    }
  }, [
    effectiveTab,
    fetchMyRequests,
  ]);

  useEffect(() => {
    if (effectiveTab === 'approvals') {
      fetchPending();
    }
  }, [
    effectiveTab,
    fetchPending,
  ]);

  const normalizedSearch = searchQuery
    .trim()
    .toLowerCase();

  const filteredMyActivities = useMemo(() => {
    const items = myActivities ?? [];

    if (!normalizedSearch) {
      return items;
    }

    return items.filter((activity) =>
      activity.activityName
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [
    myActivities,
    normalizedSearch,
  ]);

  const filteredManagedActivities = useMemo(() => {
    const items = managedActivities ?? [];

    if (!normalizedSearch) {
      return items;
    }

    return items.filter((activity) =>
      activity.activityName
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [
    managedActivities,
    normalizedSearch,
  ]);

  const filteredOwnedActivities = useMemo(() => {
    const items = ownedActivities ?? [];

    if (!normalizedSearch) {
      return items;
    }

    return items.filter((activity) =>
      activity.activityName
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [
    normalizedSearch,
    ownedActivities,
  ]);

  const filteredMyRequests = useMemo(() => {
    const items = myRequests ?? [];

    if (!normalizedSearch) {
      return items;
    }

    return items.filter((request) => {
      const activityName =
        request.activityName?.toLowerCase() ?? '';

      return (
        activityName.includes(normalizedSearch) ||
        request.id
          .toLowerCase()
          .includes(normalizedSearch)
      );
    });
  }, [
    myRequests,
    normalizedSearch,
  ]);

  const filteredPendingRequests = useMemo(() => {
    const items = pendingRequests ?? [];

    if (!normalizedSearch) {
      return items;
    }

    return items.filter((request) => {
      const activityName =
        request.activityName?.toLowerCase() ?? '';

      return (
        activityName.includes(normalizedSearch) ||
        request.id
          .toLowerCase()
          .includes(normalizedSearch)
      );
    });
  }, [
    normalizedSearch,
    pendingRequests,
  ]);

  const totalItems = useMemo(() => {
    switch (effectiveTab) {
      case 'my-activities': return myActivities?.length ?? 0;
      case 'managed-activities': return managedActivities?.length ?? 0;
      case 'owned-activities': return ownedActivities?.length ?? 0;
      case 'my-requests': return myRequests?.length ?? 0;
      case 'approvals': return pendingRequests?.length ?? 0;
      default: return 0;
    }
  }, [effectiveTab, myActivities, managedActivities, ownedActivities, myRequests, pendingRequests]);

  const isAnyLoading =
    isLoadingMy ||
    isLoadingManaged ||
    isLoadingOwned ||
    isLoadingRequests ||
    isLoadingPending;

  const handleRefresh = useCallback(() => {
    void Promise.allSettled([
      fetchMyActivities(),
      fetchManagedActivities(),
      fetchOwnedActivities(),
      fetchMyRequests(),
      fetchPending(),
    ]);
  }, [
    fetchManagedActivities,
    fetchMyActivities,
    fetchMyRequests,
    fetchOwnedActivities,
    fetchPending,
  ]);

  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    mode: 'ACTIVITY' | 'REQUEST';
    entityId: string | null;
  }>({
    isOpen: false,
    mode: 'ACTIVITY',
    entityId: null,
  });

  const openActivityDetail = useCallback(
    (id: string) => {
      setDetailModal({
        isOpen: true,
        mode: 'ACTIVITY',
        entityId: id,
      });
    },
    [],
  );

  const openRequestDetail = useCallback(
    (id: string) => {
      setDetailModal({
        isOpen: true,
        mode: 'REQUEST',
        entityId: id,
      });
    },
    [],
  );

  const closeDetail = useCallback(() => {
    setDetailModal({
      isOpen: false,
      mode: 'ACTIVITY',
      entityId: null,
    });
  }, []);

  const [formModal, setFormModal] = useState<{
    isOpen: boolean;
    mode: ActivityFormMode;
    activity: KpiActivityResponse | null;
  }>({
    isOpen: false,
    mode: 'CREATE_ROOT',
    activity: null,
  });

  const openCreateRoot = useCallback(() => {
    setFormModal({
      isOpen: true,
      mode: 'CREATE_ROOT',
      activity: null,
    });
  }, []);

  const openCreateChild = useCallback(
    (activity: KpiActivityResponse) => {
      setFormModal({
        isOpen: true,
        mode: 'CREATE_CHILD',
        activity,
      });
    },
    [],
  );

  const openUpdate = useCallback(
    (activity: KpiActivityResponse) => {
      setFormModal({
        isOpen: true,
        mode: 'UPDATE',
        activity,
      });
    },
    [],
  );

  const closeFormModal = useCallback(() => {
    setFormModal({
      isOpen: false,
      mode: 'CREATE_ROOT',
      activity: null,
    });
  }, []);

  const [cancelDialog, setCancelDialog] = useState<{
    isOpen: boolean;
    activity: KpiActivityResponse | null;
  }>({
    isOpen: false,
    activity: null,
  });

  const openCancel = useCallback(
    (activity: KpiActivityResponse) => {
      setCancelDialog({
        isOpen: true,
        activity,
      });
    },
    [],
  );

  const closeCancel = useCallback(() => {
    setCancelDialog({
      isOpen: false,
      activity: null,
    });
  }, []);

  const [approvalDialog, setApprovalDialog] = useState<{
    mode: 'APPROVE' | 'REJECT' | null;
    request: KpiActivityChangeRequestResponse | null;
  }>({
    mode: null,
    request: null,
  });

  const openApprove = useCallback(
    (request: KpiActivityChangeRequestResponse) => {
      setApprovalDialog({
        mode: 'APPROVE',
        request,
      });
    },
    [],
  );

  const openReject = useCallback(
    (request: KpiActivityChangeRequestResponse) => {
      setApprovalDialog({
        mode: 'REJECT',
        request,
      });
    },
    [],
  );

  const closeApprovalDialog = useCallback(() => {
    setApprovalDialog({
      mode: null,
      request: null,
    });
  }, []);

  if (!canAccess) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Breadcrumbs>
          <BreadcrumbsItem href="/">
            <House className="h-4 w-4" />
          </BreadcrumbsItem>

          <BreadcrumbsItem>KPI</BreadcrumbsItem>
          <BreadcrumbsItem>Activities</BreadcrumbsItem>
        </Breadcrumbs>

        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {KPI_LABELS.activities}
          </h1>
        </div>

        <Alert status="danger">
          <Alert.Indicator />

          <Alert.Content>
            <Alert.Title>
              Access Denied
            </Alert.Title>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/">
          <House className="h-4 w-4" />
        </BreadcrumbsItem>

        <BreadcrumbsItem>KPI</BreadcrumbsItem>
        <BreadcrumbsItem>Activities</BreadcrumbsItem>
      </Breadcrumbs>

      {/* Row 1: Title + Refresh + Create */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">
            {KPI_LABELS.activities}
          </h1>

          <Chip
            size="md"
            className="pointer-events-none"
            aria-label={`Total ${totalItems} activities`}
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
              className={`h-4 w-4 ${
                isAnyLoading ? 'animate-spin' : ''
              }`}
            />
          </Button>

          {canCreateRoot && (
            <Button
              variant="primary"
              onPress={openCreateRoot}
            >
              <Plus className="h-4 w-4" />
              Create Activity
            </Button>
          )}
        </div>
      </div>

      {/* Row 2: Tabs (left) | Search (right) */}
      <div className="flex min-w-0 items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Tabs
            className="w-full min-w-0"
            selectedKey={effectiveTab}
            onSelectionChange={(key) =>
              setActiveTab(key as TabId)
            }
          >
            <Tabs.ListContainer>
              <Tabs.List
                aria-label="KPI Activities"
                className="w-max flex-nowrap"
              >
                {tabs.map((tab) => (
                  <Tabs.Tab
                    key={tab.id}
                    id={tab.id}
                    className="w-fit shrink-0 whitespace-nowrap"
                  >
                    {tab.label}
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

      {/* Active tab table */}
      <div className="w-full">
        {effectiveTab === 'my-activities' && (
          <ActivityTable
            items={filteredMyActivities}
            isLoading={isLoadingMy}
            error={myError}
            onViewDetail={openActivityDetail}
            canRequest={canRequest}
            onCreateChild={
              canRequest
                ? openCreateChild
                : undefined
            }
            onRetry={fetchMyActivities}
          />
        )}

        {effectiveTab === 'managed-activities' && (
          <ActivityTable
            items={filteredManagedActivities}
            isLoading={isLoadingManaged}
            error={managedError}
            onViewDetail={openActivityDetail}
            onRetry={fetchManagedActivities}
          />
        )}

        {effectiveTab === 'owned-activities' && (
          <ActivityTable
            items={filteredOwnedActivities}
            isLoading={isLoadingOwned}
            error={ownedError}
            onViewDetail={openActivityDetail}
            canRequest={canRequest}
            onUpdate={
              canRequest
                ? openUpdate
                : undefined
            }
            onCancel={
              canRequest
                ? openCancel
                : undefined
            }
            onRetry={fetchOwnedActivities}
          />
        )}

        {effectiveTab === 'my-requests' && (
          <RequestTable
            items={filteredMyRequests}
            isLoading={isLoadingRequests}
            error={requestsError}
            onViewDetail={openRequestDetail}
          />
        )}

        {effectiveTab === 'approvals' && (
          <ApprovalTable
            items={filteredPendingRequests}
            isLoading={isLoadingPending}
            error={pendingError}
            onViewDetail={openRequestDetail}
            onApprove={openApprove}
            onReject={openReject}
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

      <ActivityFormModal
        key={
          formModal.isOpen
            ? `${formModal.mode}-${formModal.activity?.id ?? 'new'}`
            : 'form-closed'
        }
        isOpen={formModal.isOpen}
        onClose={closeFormModal}
        mode={formModal.mode}
        activity={formModal.activity}
      />

      {cancelDialog.activity && (
        <ActivityCancelDialog
          key={
            cancelDialog.isOpen
              ? cancelDialog.activity.id
              : 'cancel-closed'
          }
          isOpen={cancelDialog.isOpen}
          onClose={closeCancel}
          activity={cancelDialog.activity}
        />
      )}

      {approvalDialog.request && (
        <ApprovalDialog
          key={`${approvalDialog.mode}-${approvalDialog.request.id}`}
          isOpen={approvalDialog.mode !== null}
          onClose={closeApprovalDialog}
          mode={approvalDialog.mode!}
          request={approvalDialog.request}
        />
      )}
    </div>
  );
}
