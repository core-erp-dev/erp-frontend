'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { activityV1Api } from '@/modules/kpi/activity/activity-v1-api';
import { reportV1Api } from '@/modules/kpi/report/report-v1-api';
import { corporateKpiApi } from '@/modules/kpi/corporate/corporate-kpi-api';
import { corporateKpiStructuresApi } from '@/modules/kpi/corporate/corporate-kpi-structures-api';
import { getMyPositions } from '@/modules/kpi/shared/my-positions';
import type { MyPositionResponse } from '@/modules/kpi/shared/my-positions';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import type { KpiActivityResponse } from '@/modules/kpi/activity/activity-v1.types';
import type { KpiActivityChangeRequestResponse } from '@/modules/kpi/activity/activity-v1.types';
import type { KpiReportResponse } from '@/modules/kpi/report/report-v1.types';
import type { CorporateKpiNode } from '@/modules/kpi/corporate/corporate-kpi.types';

/* ── Aggregate types returned by the hook ── */

export interface OverviewData {
  /* Identity — active position assignments (auth-only endpoint). */
  myPositions: MyPositionResponse[];

  /* Activities group */
  myActivities: KpiActivityResponse[];
  myActivitiesError: string | null;

  /* Pending Actions group */
  pendingRequests: KpiActivityChangeRequestResponse[];
  pendingRequestsError: string | null;
  pendingReviews: KpiReportResponse[];
  pendingReviewsError: string | null;

  /* Reports group */
  myReports: KpiReportResponse[];
  myReportsError: string | null;

  /* Corporate KPI group — the ACTIVE structure with the latest year.
     `corporateKpiYear` is null when no ACTIVE structure exists. */
  corporateKpiYear: number | null;
  corporateKpiIndicatorCount: number;
  corporateKpiError: string | null;

  /* Loading */
  isLoading: boolean;
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

/** Count INDICATOR nodes in a Corporate KPI tree (recursive). */
export function countIndicatorNodes(nodes: CorporateKpiNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.nodeType === 'INDICATOR') {
      count += 1;
    }
    if (node.children?.length) {
      count += countIndicatorNodes(node.children);
    }
  }
  return count;
}

/**
 * Pick the ACTIVE structure with the latest year. A DRAFT/INACTIVE structure
 * is never treated as an active KPI period — callers get null instead.
 */
export function pickActiveYear(structures: { year: number; status: string }[]): number | null {
  const active = structures
    .filter((s) => s.status === 'ACTIVE')
    .sort((a, b) => b.year - a.year)[0];
  return active ? active.year : null;
}

const EXTRACT_PATTERN = /^(\d{3})\s(.+)$/;

function extractOverviewError(error: unknown): string | null {
  if (!error) return null;
  const raw = String(error);
  const match = raw.match(EXTRACT_PATTERN);
  if (match) return match[2].substring(0, 120);
  return 'Could not load this section.';
}

/**
 * Dashboard data hook (V1 scopes, responsibility-based).
 *   - Identity      → GET /api/v1/users/me/positions (auth-only)
 *   - Activities    → GET /api/v1/kpi-activities?scope=mine
 *   - Pending       → GET /api/v1/kpi-activity-requests?scope=to-review (needs approve)
 *                   → GET /api/v1/kpi-reports?scope=to-review (stored reviewer)
 *   - Reports       → GET /api/v1/kpi-reports?scope=mine
 *   - Corporate KPI → GET /api/v1/corporate-kpi-structures, then
 *                     GET /api/v1/corporate-kpis/tree?year=<ACTIVE latest year>
 *                     (never assumes the current calendar year; DRAFT is not active)
 */
export function useOverviewData(): OverviewData {
  const { hasPerm } = usePermission();
  const mountedRef = useRef(true);

  const canApprove = hasPerm(PERM.KPI_ACTIVITY_APPROVE);
  const canReadCorporateKpi = hasPerm(PERM.CORPORATE_KPI_READ);

  /* State */
  const [isLoading, setIsLoading] = useState(true);
  const [myPositions, setMyPositions] = useState<MyPositionResponse[]>([]);
  const [myActivities, setMyActivities] = useState<KpiActivityResponse[]>([]);
  const [myActivitiesError, setMyActivitiesError] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<KpiActivityChangeRequestResponse[]>([]);
  const [pendingRequestsError, setPendingRequestsError] = useState<string | null>(null);
  const [pendingReviews, setPendingReviews] = useState<KpiReportResponse[]>([]);
  const [pendingReviewsError, setPendingReviewsError] = useState<string | null>(null);
  const [myReports, setMyReports] = useState<KpiReportResponse[]>([]);
  const [myReportsError, setMyReportsError] = useState<string | null>(null);
  const [corporateKpiYear, setCorporateKpiYear] = useState<number | null>(null);
  const [corporateKpiIndicatorCount, setCorporateKpiIndicatorCount] = useState(0);
  const [corporateKpiError, setCorporateKpiError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const fetches: Promise<void>[] = [];

    fetches.push((async () => {
      try {
        const positions = await getMyPositions();
        if (mountedRef.current) { setMyPositions(positions); }
      } catch {
        if (mountedRef.current) { setMyPositions([]); }
      }
    })());

    fetches.push((async () => {
      try {
        const data = await activityV1Api.getActivities('mine');
        if (mountedRef.current) { setMyActivities(data); setMyActivitiesError(null); }
      } catch (err: unknown) {
        if (mountedRef.current) { setMyActivities([]); setMyActivitiesError(extractOverviewError(err)); }
      }
    })());

    if (canApprove) {
      fetches.push((async () => {
        try {
          const data = await activityV1Api.getRequests('to-review');
          if (mountedRef.current) { setPendingRequests(data); setPendingRequestsError(null); }
        } catch (err: unknown) {
          if (mountedRef.current) { setPendingRequests([]); setPendingRequestsError(extractOverviewError(err)); }
        }
      })());
    }

    fetches.push((async () => {
      try {
        const data = await reportV1Api.getReports('to-review');
        if (mountedRef.current) { setPendingReviews(data); setPendingReviewsError(null); }
      } catch (err: unknown) {
        if (mountedRef.current) { setPendingReviews([]); setPendingReviewsError(extractOverviewError(err)); }
      }
    })());

    fetches.push((async () => {
      try {
        const data = await reportV1Api.getReports('mine');
        if (mountedRef.current) { setMyReports(data); setMyReportsError(null); }
      } catch (err: unknown) {
        if (mountedRef.current) { setMyReports([]); setMyReportsError(extractOverviewError(err)); }
      }
    })());

    if (canReadCorporateKpi) {
      fetches.push((async () => {
        try {
          // Resolve the ACTIVE structure first (latest year), then fetch its
          // tree — the tree call depends on the resolved year.
          const structures = await corporateKpiStructuresApi.list();
          const activeYear = pickActiveYear(structures);
          if (activeYear == null) {
            if (mountedRef.current) {
              setCorporateKpiYear(null);
              setCorporateKpiIndicatorCount(0);
              setCorporateKpiError(null);
            }
            return;
          }
          const tree = await corporateKpiApi.getTreeByYear(activeYear);
          if (mountedRef.current) {
            setCorporateKpiYear(activeYear);
            setCorporateKpiIndicatorCount(countIndicatorNodes(tree));
            setCorporateKpiError(null);
          }
        } catch (err: unknown) {
          if (mountedRef.current) {
            setCorporateKpiYear(null);
            setCorporateKpiIndicatorCount(0);
            setCorporateKpiError(extractOverviewError(err));
          }
        }
      })());
    }

    await Promise.allSettled(fetches);

    if (mountedRef.current) setIsLoading(false);
  }, [canApprove, canReadCorporateKpi]);

  const initialLoadRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      load();
    }
    return () => { mountedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    myPositions,
    myActivities, myActivitiesError,
    pendingRequests, pendingRequestsError,
    pendingReviews, pendingReviewsError,
    myReports, myReportsError,
    corporateKpiYear, corporateKpiIndicatorCount, corporateKpiError,
    isLoading,
  };
}
