'use client';

import React from 'react';
import { Spinner } from '@heroui/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS, KPI_DESCRIPTIONS, KPI_ROUTES } from '@/modules/kpi/constants';
import { useOverviewData, averageProgress, targetReachedCount, countActiveIndicators } from '@/modules/kpi/overview/use-overview-data';
import { OverviewSection, MetricBlock } from '@/modules/kpi/overview/overview-section';
import { REPORT_STATUS_LABEL } from '@/modules/kpi/report/report.types';
import type { KpiActivityResponse } from '@/modules/kpi/activity/activity.types';
import type { KpiReportResponse } from '@/modules/kpi/report/report.types';

export function DashboardContent() {
  const {
    myActivities, myActivitiesError,
    managedActivities, managedActivitiesError,
    ownedActivities, ownedActivitiesError,
    pendingRequests, pendingRequestsError,
    pendingReviews, pendingReviewsError,
    myReports, myReportsError,
    corporateKpiTree, corporateKpiError,
    isLoading,
  } = useOverviewData();

  const { hasPerm, hasAnyPerm } = usePermission();

  const canReadActivities = hasPerm(PERM.KPI_ACTIVITY_READ);
  const canRequest = hasAnyPerm(PERM.KPI_ACTIVITY_REQUEST, PERM.KPI_ACTIVITY_ROOT_REQUEST);
  const canApprove = hasPerm(PERM.KPI_ACTIVITY_APPROVE);
  const canReadReports = hasPerm(PERM.KPI_REPORT_READ);
  const canReviewReports = hasPerm(PERM.KPI_REPORT_REVIEW);
  const canReadCorporateKpi = hasPerm(PERM.CORPORATE_KPI_READ);

  const hasActivitiesContent = canReadActivities || canRequest;
  const hasPendingContent = canApprove || canReviewReports;

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.overview}</h1>
          <p className="text-sm text-muted-foreground">{KPI_DESCRIPTIONS.overview}</p>
        </div>
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.overview}</h1>
        <p className="text-sm text-muted-foreground">{KPI_DESCRIPTIONS.overview}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          {hasActivitiesContent && (
            <OverviewSection
              title="Activities"
              error={null}
              isEmpty={false}
              footerLink={{ href: KPI_ROUTES.activities, label: 'Open Activities' }}
            >
              {canReadActivities && (
                <ActivitiesMetricBlock
                  label="My Activities"
                  activities={myActivities}
                  error={myActivitiesError}
                />
              )}

              {canReadActivities && (
                <ActivitiesMetricBlock
                  label="Managed Activities"
                  activities={managedActivities}
                  error={managedActivitiesError}
                />
              )}

              {canRequest && (
                <ActivitiesMetricBlock
                  label="Owned Activities"
                  activities={ownedActivities}
                  error={ownedActivitiesError}
                  showActiveCancelled
                />
              )}
            </OverviewSection>
          )}

          {hasPendingContent && (
            <OverviewSection
              title="Pending Actions"
              error={null}
              isEmpty={false}
            >
              {canApprove && (
                <MetricBlock
                  label="Activity Requests"
                  metrics={
                    pendingRequestsError
                      ? []
                      : pendingRequests.length > 0
                        ? [{ label: 'pending', value: pendingRequests.length }]
                        : []
                  }
                />
              )}
              {canApprove && !pendingRequestsError && pendingRequests.length === 0 && (
                <p className="text-sm text-muted-foreground">No pending items.</p>
              )}
              {canApprove && pendingRequestsError && (
                <p className="text-sm text-danger">{pendingRequestsError}</p>
              )}

              {canReviewReports && (
                <MetricBlock
                  label="Report Reviews"
                  metrics={
                    pendingReviewsError
                      ? []
                      : pendingReviews.length > 0
                        ? [{ label: 'pending', value: pendingReviews.length }]
                        : []
                  }
                />
              )}
              {canReviewReports && !pendingReviewsError && pendingReviews.length === 0 && (
                <p className="text-sm text-muted-foreground">No pending items.</p>
              )}
              {canReviewReports && pendingReviewsError && (
                <p className="text-sm text-danger">{pendingReviewsError}</p>
              )}

              {(canApprove || canReviewReports) && (
                <div className="mt-2 flex gap-3">
                  {canApprove && (
                    <a
                      href={KPI_ROUTES.approvals}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Open Approvals
                    </a>
                  )}
                  {canReviewReports && (
                    <a
                      href={KPI_ROUTES.reports}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Open Reports
                    </a>
                  )}
                </div>
              )}
            </OverviewSection>
          )}

          {canReadCorporateKpi && (
            <OverviewSection
              title="Corporate KPI"
              error={corporateKpiError}
              isEmpty={!corporateKpiError && corporateKpiTree.length === 0}
              emptyMessage="No active Corporate KPI indicators."
              footerLink={{ href: KPI_ROUTES.corporate, label: 'Open Corporate KPI' }}
            >
              {!corporateKpiError && corporateKpiTree.length > 0 && (
                <MetricBlock
                  label="Active Indicators"
                  metrics={[
                    { label: 'active', value: countActiveIndicators(corporateKpiTree) },
                  ]}
                />
              )}
            </OverviewSection>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {canReadReports && (
            <OverviewSection
              title="Recent Reports"
              error={myReportsError}
              isEmpty={!myReportsError && myReports.length === 0}
              emptyMessage="No reports found."
              footerLink={{ href: KPI_ROUTES.reports, label: 'Open Reports' }}
            >
              {!myReportsError && myReports.length > 0 && (
                <div className="flex flex-col gap-2">
                  {myReports.slice(0, 5).map((report) => (
                    <ReportRow key={report.id} report={report} />
                  ))}
                </div>
              )}
            </OverviewSection>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function ActivitiesMetricBlock({
  label,
  activities,
  error,
  showActiveCancelled,
}: {
  label: string;
  activities: KpiActivityResponse[];
  error: string | null;
  showActiveCancelled?: boolean;
}) {
  if (error) {
    return <p className="text-sm text-danger">{error}</p>;
  }

  if (activities.length === 0) {
    return <MetricBlock label={label} metrics={[]} />;
  }

  const metrics: { label: string; value: string | number }[] = [
    { label: 'total', value: activities.length },
    { label: 'avg', value: `${averageProgress(activities) ?? '—'}%` },
    { label: 'target reached', value: targetReachedCount(activities) },
  ];

  if (showActiveCancelled) {
    const activeCount = activities.filter((a) => a.status === 'ACTIVE').length;
    const cancelledCount = activities.filter((a) => a.status === 'CANCELLED').length;
    metrics.push({ label: 'active', value: activeCount });
    metrics.push({ label: 'cancelled', value: cancelledCount });
  }

  return <MetricBlock label={label} metrics={metrics} />;
}

function ReportRow({ report }: { report: KpiReportResponse }) {
  const statusLabel = REPORT_STATUS_LABEL[report.status] ?? report.status;

  return (
    <div className="flex items-center justify-between rounded-xl bg-default-50 px-3 py-2 text-sm">
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-foreground">{report.activityName}</span>
        <span className="text-xs text-muted-foreground">{report.reportDate}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{report.realizedValue}</span>
        <span className="rounded-md bg-default-200 px-2 py-0.5 text-xs font-medium">
          {statusLabel}
        </span>
      </div>
    </div>
  );
}
