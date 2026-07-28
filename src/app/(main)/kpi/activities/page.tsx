'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Alert, Button, Tabs } from '@heroui/react';
import { Plus } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS, KPI_DESCRIPTIONS } from '@/modules/kpi/constants';
import { useActivityData } from '@/modules/kpi/activity/use-activity-data';
import { ActivityTable } from '@/modules/kpi/activity/activity-table';
import { RequestTable } from '@/modules/kpi/activity/request-table';
import { KpiActivityDetailModal } from '@/modules/kpi/activity/kpi-activity-detail-modal';
import { ActivityFormModal } from '@/modules/kpi/activity/activity-form-modal';
import { ActivityCancelDialog } from '@/modules/kpi/activity/activity-cancel-dialog';
import type { ActivityFormMode, KpiActivityResponse } from '@/modules/kpi/activity/activity.types';

type TabId = 'my-activities' | 'managed-activities' | 'owned-activities' | 'my-requests';

export default function KpiActivitiesPage() {
  const { hasPerm, hasAnyPerm } = usePermission();

  // Page access: any of the three activity permissions
  const canAccess = hasAnyPerm(PERM.KPI_ACTIVITY_READ, PERM.KPI_ACTIVITY_REQUEST, PERM.KPI_ACTIVITY_ROOT_REQUEST);

  // Tab-level permissions (match backend endpoint annotations)
  const canRead = hasPerm(PERM.KPI_ACTIVITY_READ);
  const canOwned = hasAnyPerm(PERM.KPI_ACTIVITY_ROOT_REQUEST, PERM.KPI_ACTIVITY_REQUEST);
  const canRequest = hasPerm(PERM.KPI_ACTIVITY_REQUEST);
  const canMyRequests = hasAnyPerm(PERM.KPI_ACTIVITY_REQUEST, PERM.KPI_ACTIVITY_ROOT_REQUEST);

  // Root Create: requires both root_request and corporate_kpi:read
  const canCreateRoot = hasPerm(PERM.KPI_ACTIVITY_ROOT_REQUEST) && hasPerm(PERM.CORPORATE_KPI_READ);

  // ── Tabs (permission-aware) ──
  const tabs = useMemo(() => {
    const result: { id: TabId; label: string }[] = [];
    if (canRead) {
      result.push({ id: 'my-activities', label: 'My Activities' });
      result.push({ id: 'managed-activities', label: 'Managed Activities' });
    }
    if (canOwned) result.push({ id: 'owned-activities', label: 'Owned Activities' });
    if (canMyRequests) result.push({ id: 'my-requests', label: 'My Requests' });
    return result;
  }, [canRead, canOwned, canMyRequests]);

  const [activeTab, setActiveTab] = useState<TabId>('my-activities');

  // Compute the effective tab — always valid for current tabs
  const effectiveTab = tabs.some((t) => t.id === activeTab) ? activeTab : tabs[0]?.id || 'my-activities';

  // ── Server data ──
  const {
    myActivities, isLoadingMy, myError, fetchMyActivities,
    managedActivities, isLoadingManaged, managedError, fetchManagedActivities,
    ownedActivities, isLoadingOwned, ownedError, fetchOwnedActivities,
    myRequests, isLoadingRequests, requestsError, fetchMyRequests,
  } = useActivityData();

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

  // ── Permission guard ──
  if (!canAccess) {
    return (
      <div className="flex w-full flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.activities}</h1>
          <p className="text-sm text-muted-foreground">{KPI_DESCRIPTIONS.activities}</p>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.activities}</h1>
          <p className="text-sm text-muted-foreground">{KPI_DESCRIPTIONS.activities}</p>
        </div>
        {canCreateRoot && (
          <Button variant="primary" size="sm" onPress={openCreateRoot}>
            <Plus className="h-4 w-4" />
            Create Activity
          </Button>
        )}
      </div>

      <Tabs
        className="w-full"
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

        {tabs.map((tab) => (
          <Tabs.Panel key={tab.id} id={tab.id} className="pt-4">
            {tab.id === 'my-activities' && (
              <ActivityTable
                items={myActivities}
                isLoading={isLoadingMy}
                error={myError}
                onViewDetail={openActivityDetail}
                canRequest={canRequest}
                onCreateChild={canRequest ? openCreateChild : undefined}
                // No onUpdate, onCancel — My Activities shows assignee-only actions
              />
            )}
            {tab.id === 'managed-activities' && (
              <ActivityTable
                items={managedActivities}
                isLoading={isLoadingManaged}
                error={managedError}
                onViewDetail={openActivityDetail}
                // No mutation actions — read-only
              />
            )}
            {tab.id === 'owned-activities' && (
              <ActivityTable
                items={ownedActivities}
                isLoading={isLoadingOwned}
                error={ownedError}
                onViewDetail={openActivityDetail}
                canRequest={canRequest}
                onUpdate={canRequest ? openUpdate : undefined}
                onCancel={canRequest ? openCancel : undefined}
                // No onCreateChild — Owned Activities shows owner-only actions
              />
            )}
            {tab.id === 'my-requests' && (
              <RequestTable
                items={myRequests}
                isLoading={isLoadingRequests}
                error={requestsError}
                onViewDetail={openRequestDetail}
              />
            )}
          </Tabs.Panel>
        ))}
      </Tabs>

      {/* Detail Modal */}
      <KpiActivityDetailModal
        key={detailModal.entityId || 'closed'}
        isOpen={detailModal.isOpen}
        onClose={closeDetail}
        mode={detailModal.mode}
        entityId={detailModal.entityId}
      />

      {/* Form Modal (P2.2) */}
      <ActivityFormModal
        key={formModal.isOpen ? `${formModal.mode}-${formModal.activity?.id || 'new'}` : 'closed'}
        isOpen={formModal.isOpen}
        onClose={closeFormModal}
        mode={formModal.mode}
        activity={formModal.activity}
      />

      {/* Cancel Dialog (P2.2) */}
      {cancelDialog.activity && (
        <ActivityCancelDialog
          key={cancelDialog.isOpen ? cancelDialog.activity.id : 'closed'}
          isOpen={cancelDialog.isOpen}
          onClose={closeCancel}
          activity={cancelDialog.activity}
        />
      )}
    </div>
  );
}
