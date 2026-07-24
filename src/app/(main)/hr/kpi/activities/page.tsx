'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Alert, Tabs } from '@heroui/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS, KPI_DESCRIPTIONS } from '@/modules/hr/kpi/constants';
import { useActivityData } from '@/modules/hr/kpi/activity/use-activity-data';
import { ActivityTable } from '@/modules/hr/kpi/activity/activity-table';
import { RequestTable } from '@/modules/hr/kpi/activity/request-table';
import { KpiActivityDetailModal } from '@/modules/hr/kpi/activity/kpi-activity-detail-modal';

type TabId = 'my-activities' | 'managed-activities' | 'my-requests';

export default function KpiActivitiesPage() {
  const { hasPerm, hasAnyPerm } = usePermission();
  const canRead = hasPerm(PERM.KPI_ACTIVITY_READ);
  const canRequest = hasPerm(PERM.KPI_ACTIVITY_REQUEST);
  const canAccess = hasAnyPerm(PERM.KPI_ACTIVITY_READ, PERM.KPI_ACTIVITY_REQUEST);

  // ── Tabs (permission-aware) ──
  const tabs = useMemo(() => {
    const result: { id: TabId; label: string }[] = [];
    if (canRead) {
      result.push({ id: 'my-activities', label: 'My Activities' });
      result.push({ id: 'managed-activities', label: 'Managed Activities' });
    }
    if (canRequest) result.push({ id: 'my-requests', label: 'My Requests' });
    return result;
  }, [canRead, canRequest]);

  const firstTab = tabs[0]?.id || 'my-activities';
  const [activeTab, setActiveTab] = useState<TabId>(firstTab);

  const initialTab = tabs.find((t) => t.id === activeTab) ? activeTab : firstTab;

  // ── Server data ──
  const {
    myActivities, isLoadingMy, myError, fetchMyActivities,
    managedActivities, isLoadingManaged, managedError, fetchManagedActivities,
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
      <div>
        <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.activities}</h1>
        <p className="text-sm text-muted-foreground">{KPI_DESCRIPTIONS.activities}</p>
      </div>

      <Tabs
        className="w-full"
        selectedKey={initialTab}
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
              />
            )}
            {tab.id === 'managed-activities' && (
              <ActivityTable
                items={managedActivities}
                isLoading={isLoadingManaged}
                error={managedError}
                onViewDetail={openActivityDetail}
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
    </div>
  );
}
