'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { corporateKpiStructuresApi, extractStructureError } from '@/modules/kpi/corporate/corporate-kpi-structures-api';
import { getCorporateKpiValueYearOptions } from '@/modules/kpi/corporate/corporate-kpi-year-options';

interface UseUnitPerformancePeriodsReturn {
  years: number[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/** Period source for evaluation pages: only non-DRAFT KPI structures are valid. */
export function useUnitPerformancePeriods(enabled: boolean): UseUnitPerformancePeriodsReturn {
  const [years, setYears] = useState<number[] | null>(enabled ? null : []);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const refetch = useCallback(async () => {
    const requestId = ++requestRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const structures = await corporateKpiStructuresApi.list();
      if (requestId !== requestRef.current) return;
      setYears(getCorporateKpiValueYearOptions(structures));
    } catch (err: unknown) {
      if (requestId !== requestRef.current) return;
      setYears([]);
      setError(extractStructureError(err));
    } finally {
      if (requestId === requestRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      ++requestRef.current;
      setYears([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    void refetch();
  }, [enabled, refetch]);

  return { years, isLoading, error, refetch };
}
