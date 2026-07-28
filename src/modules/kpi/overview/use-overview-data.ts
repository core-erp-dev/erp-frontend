'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { activityApi } from '@/modules/kpi/activity/activity-api';
import { reportApi } from '@/modules/kpi/report/report-api';
import { corporateKpiApi } from '@/modules/kpi/corporate/corporate-kpi-api';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import type { KpiActivityResponse, KpiActivityChangeRequestResponse } from '@/modules/kpi/activity/activity.types';
import type { KpiReportResponse } from '@/modules/kpi/report/report.types';
import type { CorporateKpiNode } from '@/modules/kpi/corporate/corporate-kpi.types';

/* ── Aggregate types returned by the hook ── */

export interface OverviewData {
  /* Activities group */
  myActivities: KpiActivityResponse[];
  myActivitiesError: string | null;
  managedActivities: KpiActivityResponse[];
  managedActivitiesError: string | null;
  ownedActivities: KpiActivityResponse[];
  ownedActivitiesError: string | null;

  /* Pending Actions group */
  pendingRequests: KpiActivityChangeRequestResponse[];
  pendingRequestsError: string | null;
  pendingReviews: KpiReportResponse[];
  pendingReviewsError: string | null;

  /* Recent Reports group */
  myReports: KpiReportResponse[];
  myReportsError: string | null;

  /* Corporate KPI group */
  corporateKpiTree: CorporateKpiNode[];
  corporateKpiError: string | null;

  /* Loading */
  isLoading: boolean;
}

function countActiveIndicators(nodes: CorporateKpiNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.nodeType === 'INDICATOR' && node.status === 'ACTIVE') {
      count += 1;
    }
    if (node.children?.length) {
      count += countActiveIndicators(node.children);
    }
  }
  return count;
}

/**
 * Compute average progress from an activity array.
 * Returns null when the array is empty.
 */
export function averageProgress(activities: KpiActivityResponse[]): number | null {
  if (!activities.length) return null;
  const sum = activities.reduce((acc, a) => acc + (a.progressPercent ?? 0), 0);
  return Math.round(sum / activities.length);
}

/**
 * Target Reached count.
 */
export function targetReachedCount(activities: KpiActivityResponse[]): number {
  return activities.filter((a) => (a.progressPercent ?? 0) >= 100).length;
}

const EXTRACT_PATTERN = /^(\d{3})\s(.+)$/;

function extractOverviewError(error: unknown): string | null {
  if (!error) return null;
  const raw = String(error);
  // Try to extract "4xx Some message" or "5xx Some message"
  const match = raw.match(EXTRACT_PATTERN);
  if (match) return match[2].substring(0, 120);
  return 'Could not load this section.';
}

/* ── Hook ── */

export function useOverviewData(): OverviewData {
  const { hasPerm, hasAnyPerm } = usePermission();
  const mountedRef = useRef(true);

  /* Activities */
  const canReadActivities = hasPerm(PERM.KPI_ACTIVITY_READ);
  const canRequest = hasAnyPerm(PERM.KPI_ACTIVITY_REQUEST, PERM.KPI_ACTIVITY_ROOT_REQUEST);
  const canApprove = hasPerm(PERM.KPI_ACTIVITY_APPROVE);
  const canReadReports = hasPerm(PERM.KPI_REPORT_READ);
  const canReviewReports = hasPerm(PERM.KPI_REPORT_REVIEW);
  const canReadCorporateKpi = hasPerm(PERM.CORPORATE_KPI_READ);

  /* State */
  const [isLoading, setIsLoading] = useState(true);
  const [myActivities, setMyActivities] = useState<KpiActivityResponse[]>([]);
  const [myActivitiesError, setMyActivitiesError] = useState<string | null>(null);
  const [managedActivities, setManagedActivities] = useState<KpiActivityResponse[]>([]);
  const [managedActivitiesError, setManagedActivitiesError] = useState<string | null>(null);
  const [ownedActivities, setOwnedActivities] = useState<KpiActivityResponse[]>([]);
  const [ownedActivitiesError, setOwnedActivitiesError] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<KpiActivityChangeRequestResponse[]>([]);
  const [pendingRequestsError, setPendingRequestsError] = useState<string | null>(null);
  const [pendingReviews, setPendingReviews] = useState<KpiReportResponse[]>([]);
  const [pendingReviewsError, setPendingReviewsError] = useState<string | null>(null);
  const [myReports, setMyReports] = useState<KpiReportResponse[]>([]);
  const [myReportsError, setMyReportsError] = useState<string | null>(null);
  const [corporateKpiTree, setCorporateKpiTree] = useState<CorporateKpiNode[]>([]);
  const [corporateKpiError, setCorporateKpiError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const fetches: Promise<void>[] = [];

    /* Build fetch array — only permitted endpoints */
    if (canReadActivities) {
      fetches.push(
        (async () => {
          try {
            const data = await activityApi.getMyActivities();
            if (mountedRef.current) { setMyActivities(data); setMyActivitiesError(null); }
          } catch (err: unknown) {
            if (mountedRef.current) { setMyActivities([]); setMyActivitiesError(extractOverviewError(err)); }
          }
        })(),
      );
      fetches.push(
        (async () => {
          try {
            const data = await activityApi.getManagedActivities();
            if (mountedRef.current) { setManagedActivities(data); setManagedActivitiesError(null); }
          } catch (err: unknown) {
            if (mountedRef.current) { setManagedActivities([]); setManagedActivitiesError(extractOverviewError(err)); }
          }
        })(),
      );
    }

    if (canRequest) {
      fetches.push(
        (async () => {
          try {
            const data = await activityApi.getOwnedActivities();
            if (mountedRef.current) { setOwnedActivities(data); setOwnedActivitiesError(null); }
          } catch (err: unknown) {
            if (mountedRef.current) { setOwnedActivities([]); setOwnedActivitiesError(extractOverviewError(err)); }
          }
        })(),
      );
    }

    if (canApprove) {
      fetches.push(
        (async () => {
          try {
            const data = await activityApi.getPendingRequests();
            if (mountedRef.current) { setPendingRequests(data); setPendingRequestsError(null); }
          } catch (err: unknown) {
            if (mountedRef.current) { setPendingRequests([]); setPendingRequestsError(extractOverviewError(err)); }
          }
        })(),
      );
    }

    if (canReadReports) {
      fetches.push(
        (async () => {
          try {
            const data = await reportApi.getMyReports();
            if (mountedRef.current) { setMyReports(data); setMyReportsError(null); }
          } catch (err: unknown) {
            if (mountedRef.current) { setMyReports([]); setMyReportsError(extractOverviewError(err)); }
          }
        })(),
      );
    }

    if (canReviewReports) {
      fetches.push(
        (async () => {
          try {
            const data = await reportApi.getReportsToReview();
            if (mountedRef.current) { setPendingReviews(data); setPendingReviewsError(null); }
          } catch (err: unknown) {
            if (mountedRef.current) { setPendingReviews([]); setPendingReviewsError(extractOverviewError(err)); }
          }
        })(),
      );
    }

    if (canReadCorporateKpi) {
      fetches.push(
        (async () => {
          try {
            const year = new Date().getFullYear();
            const data = await corporateKpiApi.getTreeByYear(year);
            if (mountedRef.current) { setCorporateKpiTree(data); setCorporateKpiError(null); }
          } catch (err: unknown) {
            if (mountedRef.current) { setCorporateKpiTree([]); setCorporateKpiError(extractOverviewError(err)); }
          }
        })(),
      );
    }

    await Promise.allSettled(fetches);

    if (mountedRef.current) setIsLoading(false);
  }, [canReadActivities, canRequest, canApprove, canReadReports, canReviewReports, canReadCorporateKpi]);

  const initialLoadRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      load();
    }
    return () => { mountedRef.current = false; };
    // Note: load() is a stable useCallback — empty deps are intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    myActivities, myActivitiesError,
    managedActivities, managedActivitiesError,
    ownedActivities, ownedActivitiesError,
    pendingRequests, pendingRequestsError,
    pendingReviews, pendingReviewsError,
    myReports, myReportsError,
    corporateKpiTree, corporateKpiError,
    isLoading,
  };
}

export { countActiveIndicators };
