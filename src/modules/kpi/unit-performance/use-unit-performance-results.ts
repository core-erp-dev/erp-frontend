'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@heroui/react';
import { unitPerformanceApi, extractUnitPerformanceError } from './unit-performance-api';
import type { UnitPerformanceRow } from './unit-performance.types';

export interface UseUnitPerformanceResultsReturn {
  rows: UnitPerformanceRow[];
  isLoading: boolean;
  error: string | null;
  fetchPerformance: (year: number, month?: number) => Promise<void>;
}

/** Read-only result surface. Each period request owns its loading/data state. */
export function useUnitPerformanceResults(): UseUnitPerformanceResultsReturn {
  const [rows, setRows] = useState<UnitPerformanceRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const requestRef = useRef(0);

  const fetchPerformance = useCallback(async (year: number, month?: number) => {
    const requestId = ++requestRef.current;
    setIsLoading(true);
    setError(null);
    setRows([]);
    try {
      const result = await unitPerformanceApi.getPerformance(year, month);
      if (mountedRef.current && requestId === requestRef.current) setRows(Array.isArray(result) ? result : []);
    } catch (err: unknown) {
      if (mountedRef.current && requestId === requestRef.current) {
        const message = extractUnitPerformanceError(err).replace(
          'Failed to load unit performance.',
          'Gagal memuat hasil Performa Unit.',
        );
        setError(message);
        setRows([]);
        toast.danger(message);
      }
    } finally {
      if (mountedRef.current && requestId === requestRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  return { rows, isLoading, error, fetchPerformance };
}
