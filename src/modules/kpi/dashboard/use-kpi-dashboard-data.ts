'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { corporateKpiStructuresApi } from '@/modules/kpi/corporate/corporate-kpi-structures-api';
import { kpiDashboardApi, extractDashboardError } from './kpi-dashboard-api';
import type { DashboardPeriod, KpiDashboardResponse } from './kpi-dashboard.types';

/** Pick the ACTIVE structure with the latest year (never a DRAFT/INACTIVE year). */
export function pickActiveYear(structures: { year: number; status: string }[]): number | null {
  const active = structures
    .filter((s) => s.status === 'ACTIVE')
    .sort((a, b) => b.year - a.year)[0];
  return active ? active.year : null;
}

function parseMonthParam(value: string | null): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null;
}

function validatePeriod(period: DashboardPeriod): string | null {
  const { fromMonth, toMonth } = period;
  if ((fromMonth == null) !== (toMonth == null)) {
    return 'Pilih rentang bulan lengkap (Dari dan Sampai).';
  }
  if (fromMonth != null && toMonth != null && fromMonth > toMonth) {
    return 'Bulan awal tidak boleh melebihi bulan akhir.';
  }
  return null;
}

/**
 * KPI Dashboard data hook — the URL search params are the single source of
 * truth for the period (refresh keeps the selection). One dashboard request
 * per valid period change; invalid periods (lone month, inverted range) are
 * blocked client-side and never sent.
 *
 * Initial year: URL ?year → else the ACTIVE structure's latest year (resolved
 * once) → else the current calendar year.
 */
export function useKpiDashboardData() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const yearParam = searchParams.get('year');
  const fromParam = searchParams.get('fromMonth');
  const toParam = searchParams.get('toMonth');

  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const [initialYearReady, setInitialYearReady] = useState(false);
  const [data, setData] = useState<KpiDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolvedOnceRef = useRef(false);

  // Resolve the ACTIVE structure year once (for the year dropdown AND the
  // no-URL default). The dashboard request waits for this resolution so the
  // initial period never fetches twice (current-year guess + correction).
  useEffect(() => {
    if (resolvedOnceRef.current) return;
    resolvedOnceRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const structures = await corporateKpiStructuresApi.list();
        if (cancelled) return;
        setAvailableYears(
          Array.from(new Set([new Date().getFullYear(), ...structures.map((s) => s.year)]))
            .sort((a, b) => b - a),
        );
        const active = pickActiveYear(structures);
        setActiveYear(active);
        if (yearParam == null && active != null) {
          router.replace(`?year=${active}`);
        }
      } catch {
        if (!cancelled) setAvailableYears([new Date().getFullYear()]);
      } finally {
        if (!cancelled) setInitialYearReady(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const period: DashboardPeriod = useMemo(() => {
    const year = yearParam != null ? Number(yearParam) : activeYear ?? new Date().getFullYear();
    return {
      year: Number.isInteger(year) ? year : new Date().getFullYear(),
      fromMonth: parseMonthParam(fromParam),
      toMonth: parseMonthParam(toParam),
    };
  }, [yearParam, fromParam, toParam, activeYear]);

  const validationError = useMemo(() => validatePeriod(period), [period]);

  const updateUrl = useCallback(
    (next: DashboardPeriod) => {
      const params = new URLSearchParams();
      params.set('year', String(next.year));
      if (next.fromMonth != null && next.toMonth != null) {
        params.set('fromMonth', String(next.fromMonth));
        params.set('toMonth', String(next.toMonth));
      }
      router.replace(`?${params.toString()}`);
    },
    [router],
  );

  const setPeriod = useCallback(
    (patch: Partial<DashboardPeriod>) => {
      updateUrl({ ...period, ...patch });
    },
    [period, updateUrl],
  );

  const resetToAnnual = useCallback(() => {
    updateUrl({ year: period.year, fromMonth: null, toMonth: null });
  }, [period.year, updateUrl]);

  const refresh = useCallback(() => {
    updateUrl({ ...period });
  }, [period, updateUrl]);

  // One dashboard request per VALID period change — the initial request waits
  // for the ACTIVE-year resolution when the URL carries no year.
  useEffect(() => {
    if (!initialYearReady || validationError) return;
    let cancelled = false;
    const { year, fromMonth, toMonth } = period;
    setIsRefetching(true);
    kpiDashboardApi
      .getDashboard(year, fromMonth, toMonth)
      .then((response) => {
        if (cancelled) return;
        setData(response);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setData(null);
        setError(extractDashboardError(err));
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
        setIsRefetching(false);
      });
    return () => { cancelled = true; };
  }, [period, validationError, initialYearReady]);

  return {
    period,
    setPeriod,
    resetToAnnual,
    refresh,
    data,
    isLoading,
    isRefetching,
    error,
    validationError,
    availableYears,
  };
}
