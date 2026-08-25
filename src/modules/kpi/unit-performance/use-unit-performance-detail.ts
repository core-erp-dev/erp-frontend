'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { extractUnitPerformanceError, unitPerformanceApi } from './unit-performance-api';
import type { UnitPerformanceDetail } from './unit-performance.types';

interface UseUnitPerformanceDetailReturn {
  detail: UnitPerformanceDetail | null;
  isLoading: boolean;
  error: string | null;
  isForbidden: boolean;
  load: (year: number, month?: number) => Promise<void>;
}

function isForbiddenError(error: unknown): boolean {
  return (error as { response?: { status?: number } })?.response?.status === 403;
}

/** Detail-period reader with request ownership so stale periods cannot win. */
export function useUnitPerformanceDetail(id: string): UseUnitPerformanceDetailReturn {
  const [detail, setDetail] = useState<UnitPerformanceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const requestRef = useRef(0);

  const load = useCallback(async (year: number, month?: number) => {
    const requestId = ++requestRef.current;
    setIsLoading(true);
    setError(null);
    setIsForbidden(false);
    setDetail(null);
    try {
      const result = await unitPerformanceApi.getPerformanceDetail(id, year, month);
      if (requestId === requestRef.current) setDetail(result);
    } catch (err: unknown) {
      if (requestId !== requestRef.current) return;
      if (isForbiddenError(err)) {
        setIsForbidden(true);
        return;
      }
      setError(extractUnitPerformanceError(err).replace(
        'Failed to load unit performance.',
        'Gagal memuat detail Performa Unit.',
      ));
    } finally {
      if (requestId === requestRef.current) setIsLoading(false);
    }
  }, [id]);

  useEffect(() => () => { ++requestRef.current; }, []);

  return { detail, isLoading, error, isForbidden, load };
}
