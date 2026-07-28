'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Alert, Breadcrumbs, BreadcrumbsItem, Button, Chip, SearchField, Tabs } from '@heroui/react';
import { House, Plus, ArrowsClockwise } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS, KPI_DESCRIPTIONS } from '@/modules/kpi/constants';
import { useActivityData } from '@/modules/kpi/activity/use-activity-data';
import { ActivityTable } from '@/modules/kpi/activity/activity-table';
import { RequestTable } from '@/modules/kpi/activity/request-table';
import { KpiActivityDetailModal } from '@/modules/kpi/activity/kpi-activity-detail-modal';
import { ActivityFormModal } from '@/modules/kpi/activity/activity-form-modal';
import { ActivityCancelDialog } from '@/modules/kpi/activity/activity-cancel-dialog';
import { useApprovalData } from '@/modules/kpi/activity/use-approval-data';
import { ApprovalTable } from '@/modules/kpi/activity/approval-table';
import { ApprovalDialog } from '@/modules/kpi/activity/approval-dialog';
import type { ActivityFormMode, KpiActivityResponse, KpiActivityChangeRequestResponse } from '@/modules/kpi/activity/activity.types';

type TabId = 'my-activities' | 'managed-activities' | 'owned-activities' | 'my-requests' | 'approvals';

export default function KpiActivitiesPage() {
  const { hasPerm, hasAnyPerm } = usePermission();

  // Page access: any of the three activity permissions
  const canAccess = hasAnyPerm(PERM.KPI_ACTIVITY_READ, PERM.KPI_ACTIVITY_REQUEST, PERM.KPI_ACTIVITY_ROOT_REQUEST);

  // Tab-level permissions (match backend endpoint annotations)
  const canRead = hasPerm(PERM.KPI_ACTIVITY_READ);
  const canOwned = hasAnyPerm(PERM.KPI_ACTIVITY_ROOT_REQUEST, PERM.KPI_ACTIVITY_REQUEST);
  const canRequest = hasPerm(PERM.KPI_ACTIVITY_REQUEST);
  const canMyRequests = hasAnyPerm(PERM.KPI_ACTIVITY_REQUEST, PERM.KPI_ACTIVITY_ROOT_REQUEST);
  const canApprove = hasPerm(PERM.KPI_ACTIVITY_APPROVE);

  // Root Create: requires both root_request and corporate_kpi:read
  const canCreateRoot = hasPerm(PERM.KPI_ACTIVITY_ROOT_REQUEST) && hasPerm(PERM.CORPORATE_KPI_READ);

  // ── Tabs (permission-aware) ──
  const tabs = useMemo(() => {
    const result: { id: TabId; label: string }[] = [];
    if (canRead) {
      result.push({ id: 'my-activities', label: 'My Activities' });
      result.push({ id: 'managed-activities', label: 'Managed' });
    }
    if (canOwned) result.push({ id: 'owned-activities', label: 'Owned' });
    if (canMyRequests) result.push({ id: 'my-requests', label: 'My Requests' });
    if (canApprove) result.push({ id: 'approvals', label: 'Approvals' });
    return result;
  }, [canRead, canOwned, canMyRequests, canApprove]);

  const [activeTab, setActiveTab] = useState<TabId>('my-activities');
  const [searchQuery, setSearchQuery] = useState('');

  // Compute the effective tab — always valid for current tabs
  const effectiveTab = tabs.some((t) => t.id === activeTab) ? activeTab : tabs[0]?.id || 'my-activities';

  // ── Server data ──
  const {
    myActivities, isLoadingMy, myError, fetchMyActivities,
    managedActivities, isLoadingManaged, managedError, fetchManagedActivities,
    ownedActivities, isLoadingOwned, ownedError, fetchOwnedActivities,
    myRequests, isLoadingRequests, requestsError, fetchMyRequests,
  } = useActivityData();

  const {
    pendingRequests, isLoadingPending, pendingError, fetchPending,
  } = useApprovalData();

  // ── Fetch on tab activation ──
  useEffect(() => {
    if (activeTab === 'my-activities') fetchMyActivities();
  }, [activeTab, fetchMyActivities]);

  useEffect(() => {
    if (activeTab === 'managed-activities') fetchManagedActivities();
  }, [activeTab, fetchManagedActivities]);

  useEffect(() => {
    if (activeTab === 'owned-activities') fetchOwnedActivities();
  }, [activeTab, fetchOwnedActivities]);

  useEffect(() => {
    if (activeTab === 'my-requests') fetchMyRequests();
  }, [activeTab, fetchMyRequests]);

  useEffect(() => {
    if (activeTab === 'approvals') fetchPending();
  }, [activeTab, fetchPending]);

  // ── Search filtering ──
  const q = searchQuery.trim().toLowerCase();
  const filteredMyActivities = useMemo(
    () => q ? (myActivities ?? []).filter((a) => a.activityName.toLowerCase().includes(q)) : (myActivities ?? []),
    [myActivities, q],
  );
  const filteredManagedActivities = useMemo(
    () => q ? (managedActivities ?? []).filter((a) => a.activityName.toLowerCase().includes(q)) : (managedActivities ?? []),
    [managedActivities, q],
  );
  const filteredOwnedActivities = useMemo(
    () => q ? (ownedActivities ?? []).filter((a) => a.activityName.toLowerCase().includes(q)) : (ownedActivities ?? []),
    [ownedActivities, q],
  );
  const filteredMyRequests = useMemo(
    () => q ? (myRequests ?? []).filter((a) => (a.activityName ?? '').toLowerCase().includes(q) || a.id.toLowerCase().includes(q)) : (myRequests ?? []),
    [myRequests, q],
  );
  const filteredPendingRequests = useMemo(
    () => q ? (pendingRequests ?? []).filter((a) => (a.activityName ?? '').toLowerCase().includes(q) || a.id.toLowerCase().includes(q)) : (pendingRequests ?? []),
    [pendingRequests, q],
  );

  // ── Detail modal state ──
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

  // ── Form modal state (P2.2) ──
  const [formModal, setFormModal] = useState<{
    isOpen: boolean;
    mode: ActivityFormMode;
    activity: KpiActivityResponse | null;
  }>({ isOpen: false, mode: 'CREATE_ROOT', activity: null });

  const openCreateRoot = useCallback(() => {
    setFormModal({ isOpen: true, mode: 'CREATE_ROOT', activity: null });
  }, []);

  const openCreateChild = useCallback((activity: KpiActivityResponse) => {
    setFormModal({ isOpen: true, mode: 'CREATE_CHILD', activity });
  }, []);

  const openUpdate = useCallback((activity: KpiActivityResponse) => {
    setFormModal({ isOpen: true, mode: 'UPDATE', activity });
  }, []);

  const closeFormModal = useCallback(() => {
    setFormModal({ isOpen: false, mode: 'CREATE_ROOT', activity: null });
  }, []);

  // ── Cancel dialog state (P2.2) ──
  const [cancelDialog, setCancelDialog] = useState<{
    isOpen: boolean;
    activity: KpiActivityResponse | null;
  }>({ isOpen: false, activity: null });

  const openCancel = useCallback((activity: KpiActivityResponse) => {
    setCancelDialog({ isOpen: true, activity });
  }, []);

  const closeCancel = useCallback(() => {
    setCancelDialog({ isOpen: false, activity: null });
  }, []);

  // ── Approval dialog state (P2.2) ──
  const [approvalDialog, setApprovalDialog] = useState<{
    mode: 'APPROVE' | 'REJECT' | null;
    request: KpiActivityChangeRequestResponse | null;
  }>({ mode: null, request: null });

  const openApprove = useCallback((req: KpiActivityChangeRequestResponse) => {
    setApprovalDialog({ mode: 'APPROVE', request: req });
  }, []);

  const openReject = useCallback((req: KpiActivityChangeRequestResponse) => {
    setApprovalDialog({ mode: 'REJECT', request: req });
  }, []);

  const closeApprovalDialog = useCallback(() => {
    setApprovalDialog({ mode: null, request: null });
  }, []);

  // ── Permission guard ──
  if (!canAccess) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Breadcrumbs>
          <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
          <BreadcrumbsItem>KPI</BreadcrumbsItem>
          <BreadcrumbsItem>Activities</BreadcrumbsItem>
        </Breadcrumbs>
        <div>
          <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.activities}</h1>
        </div>
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Access Denied</Alert.Title>
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
        <BreadcrumbsItem>Activities</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.activities}</h1>
          <Chip size="md" className="pointer-events-none" aria-label="Total activities">
            {tabs.reduce((sum, tab) => {
              if (tab.id === 'my-activities') return sum + (myActivities?.length ?? 0);
              if (tab.id === 'managed-activities') return sum + (managedActivities?.length ?? 0);
              if (tab.id === 'owned-activities') return sum + (ownedActivities?.length ?? 0);
              if (tab.id === 'my-requests') return sum + (myRequests?.length ?? 0);
              if (tab.id === 'approvals') return sum + (pendingRequests?.length ?? 0);
              return sum;
            }, 0)}
          </Chip>
        </div>
        <div className="flex items-center gap-2">
          {(() => {
            const isAnyLoading = isLoadingMy || isLoadingManaged || isLoadingOwned || isLoadingRequests || isLoadingPending;
            const anyRefresh = [fetchMyActivities, fetchManagedActivities, fetchOwnedActivities, fetchMyRequests, fetchPending];
            return (
              <Button
                isIconOnly
                variant="tertiary"
                onPress={() => anyRefresh.forEach(fn => fn?.())}
                isDisabled={isAnyLoading}
                aria-label="Refresh"
              >
                <ArrowsClockwise className={`h-4 w-4 ${isAnyLoading ? 'animate-spin' : ''}`} />
              </Button>
            );
          })()}
          {canCreateRoot && (
            <Button variant="primary" onPress={openCreateRoot}>
              <Plus className="h-4 w-4" />
              Create Activity
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Tabs
          selectedKey={effectiveTab}
          onSelectionChange={(key) => setActiveTab(key as TabId)}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="KPI Activities">
              {tabs.map((tab) => (
                <Tabs.Tab key={tab.id} id={tab.id}>
                  {tab.label}
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
        <SearchField
          name="search"
          value={searchQuery}
          onChange={setSearchQuery}
          className="w-72"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input aria-label="Search activities" placeholder="Search" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </div>

      {/* Tab content — rendered below tabs+search row */}
      {tabs.find((t) => t.id === effectiveTab) && (
        <div key={effectiveTab} className="pt-4">
          {effectiveTab === 'my-activities' && (
            <ActivityTable
              items={filteredMyActivities}
              isLoading={isLoadingMy}
              error={myError}
              onViewDetail={openActivityDetail}
              canRequest={canRequest}
              onCreateChild={canRequest ? openCreateChild : undefined}
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
              onUpdate={canRequest ? openUpdate : undefined}
              onCancel={canRequest ? openCancel : undefined}
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
      )}

      {/* Detail Modal */}
      <KpiActivityDetailModal
        key={detailModal.entityId || 'detail-closed'}
        isOpen={detailModal.isOpen}
        onClose={closeDetail}
        mode={detailModal.mode}
        entityId={detailModal.entityId}
      />

      {/* Form Modal (P2.2) */}
      <ActivityFormModal
        key={formModal.isOpen ? `${formModal.mode}-${formModal.activity?.id || 'new'}` : 'form-closed'}
        isOpen={formModal.isOpen}
        onClose={closeFormModal}
        mode={formModal.mode}
        activity={formModal.activity}
      />

      {/* Cancel Dialog (P2.2) */}
      {cancelDialog.activity && (
        <ActivityCancelDialog
          key={cancelDialog.isOpen ? cancelDialog.activity.id : 'cancel-closed'}
          isOpen={cancelDialog.isOpen}
          onClose={closeCancel}
          activity={cancelDialog.activity}
        />
      )}

      {/* Approve / Reject Dialog */}
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
