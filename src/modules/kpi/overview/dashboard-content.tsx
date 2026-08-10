'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Spinner, Surface } from '@heroui/react';
import {
  Article,
  Briefcase,
  Buildings,
  CaretRight,
  Checks,
  ClipboardText,
  Crown,
  Eye,
  PencilSimple,
  Plus,
  UploadSimple,
  Wrench,
} from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { useAuthStore } from '@/store/auth-store';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS, KPI_ROUTES } from '@/modules/kpi/constants';
import { averageProgress, useOverviewData } from '@/modules/kpi/overview/use-overview-data';
import { SummaryCard } from '@/modules/kpi/overview/summary-card';
import { REPORT_STATUS_LABEL } from '@/modules/kpi/report/report-v1.types';
import type { KpiReportStatus } from '@/modules/kpi/report/report-v1.types';
import type { MyPositionResponse } from '@/modules/kpi/shared/my-positions';

interface QuickAction {
  href: string;
  icon: React.FC<{ className?: string }>;
  label: string;
}

/**
 * Main Dashboard (`/`) and KPI Dashboard (`/kpi`) content — V1 scopes,
 * responsibility-based. Any authenticated user can open it; sections are
 * data-driven with per-card error/empty states.
 *
 *   - Identity        → GET /api/v1/users/me/positions (auth-only; chip is
 *                       omitted entirely when the user has no position).
 *   - Summary cards   → my activities (scope=mine), my reports (scope=mine),
 *                       approval queue (scope=to-review, kpi_activity:approve),
 *                       report review queue (scope=to-review, standalone).
 *   - Corporate KPI   → gated corporate_kpi:read; ACTIVE structure with the
 *                       latest year is resolved from the structures list and
 *                       its tree is fetched for THAT year (never assumed).
 *   - Quick actions   → permission-based action shortcuts only.
 */
export function DashboardContent() {
  const user = useAuthStore((s) => s.user);
  const { hasPerm } = usePermission();
  const {
    myPositions,
    myActivities, myActivitiesError,
    pendingRequests, pendingRequestsError,
    pendingReviews, pendingReviewsError,
    myReports, myReportsError,
    corporateKpiYear, corporateKpiIndicatorCount, corporateKpiError,
    isLoading,
  } = useOverviewData();

  const canApprove = hasPerm(PERM.KPI_ACTIVITY_APPROVE);
  const canReadCorporateKpi = hasPerm(PERM.CORPORATE_KPI_READ);
  const canRequestRoot = hasPerm(PERM.KPI_ACTIVITY_ROOT_REQUEST);
  const canAdminManage = hasPerm(PERM.KPI_ACTIVITY_MANAGE);

  const displayName = user?.username || 'there';
  const activePosition: MyPositionResponse | null =
    myPositions.find((p) => p.isPrimary) ?? myPositions[0] ?? null;

  const activitiesCaption = useMemo(() => {
    if (myActivitiesError) return null;
    const avg = averageProgress(myActivities);
    return myActivities.length > 0 && avg != null
      ? `Avg progress ${avg}%`
      : 'No active activities';
  }, [myActivities, myActivitiesError]);

  const reportCaption = useMemo(() => {
    if (myReportsError) return null;
    const counts: Record<KpiReportStatus, number> = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    for (const report of myReports) {
      counts[report.status] += 1;
    }
    const parts = (Object.keys(REPORT_STATUS_LABEL) as KpiReportStatus[])
      .filter((status) => counts[status] > 0)
      .map((status) => `${REPORT_STATUS_LABEL[status]} ${counts[status]}`);
    return parts.length > 0 ? parts.join(' · ') : 'No reports yet';
  }, [myReports, myReportsError]);

  const quickActions: QuickAction[] = [
    ...(canRequestRoot
      ? [{ href: KPI_ROUTES.activitiesMine, icon: Plus, label: 'Request Activity' }]
      : []),
    { href: KPI_ROUTES.reports, icon: UploadSimple, label: 'Submit Report' },
    ...(canReadCorporateKpi
      ? [{ href: KPI_ROUTES.corporateVariableValues, icon: PencilSimple, label: 'Enter KPI Values' }]
      : []),
    ...(canAdminManage
      ? [{ href: KPI_ROUTES.activitiesAll, icon: Wrench, label: 'Admin Create Activity' }]
      : []),
  ];

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Header — compact greeting + active position */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.overview}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>Welcome back, {displayName}</span>
          {activePosition && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-default-100 px-2.5 py-0.5 text-xs font-medium text-foreground">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
              {activePosition.positionName}
              {activePosition.isPrimary && <Crown className="h-3 w-3 text-amber-500" />}
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="md" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              href={KPI_ROUTES.activitiesMine}
              icon={ClipboardText}
              title="My Activities"
              value={myActivities.length}
              caption={activitiesCaption}
              error={myActivitiesError}
            />
            <SummaryCard
              href={KPI_ROUTES.reports}
              icon={Article}
              title="My Reports"
              value={myReports.length}
              caption={reportCaption}
              error={myReportsError}
            />
            {canApprove && (
              <SummaryCard
                href={KPI_ROUTES.approvals}
                icon={Checks}
                title="Activity Approvals"
                value={pendingRequests.length}
                caption={pendingRequests.length > 0 ? 'requests awaiting decision' : 'Queue is clear'}
                error={pendingRequestsError}
              />
            )}
            <SummaryCard
              href={KPI_ROUTES.reportReviews}
              icon={Eye}
              title="Report Reviews"
              value={pendingReviews.length}
              caption={pendingReviews.length > 0 ? 'reports awaiting review' : 'Queue is clear'}
              error={pendingReviewsError}
            />
          </div>

          {/* Corporate KPI — prominent section, ACTIVE structure year only */}
          {canReadCorporateKpi && (
            <Surface className="flex flex-col gap-4 rounded-3xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-default-100 text-foreground">
                    <Buildings className="h-5 w-5" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <h2 className="text-base font-semibold text-foreground">Corporate KPI</h2>
                    {corporateKpiError ? (
                      <p className="text-sm text-danger">{corporateKpiError}</p>
                    ) : corporateKpiYear == null ? (
                      <p className="text-sm text-muted-foreground">
                        No active Corporate KPI structure.
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Year {corporateKpiYear} · {corporateKpiIndicatorCount} indicator
                        {corporateKpiIndicatorCount === 1 ? '' : 's'}
                      </p>
                    )}
                  </div>
                </div>
                <Link
                  href={KPI_ROUTES.corporate}
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Open
                  <CaretRight className="h-4 w-4" />
                </Link>
              </div>
            </Surface>
          )}

          {/* Quick actions — only actions the user can actually perform */}
          {quickActions.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-foreground">Quick Actions</h2>
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-default-100 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-default-200"
                  >
                    <action.icon className="h-4 w-4" />
                    {action.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
