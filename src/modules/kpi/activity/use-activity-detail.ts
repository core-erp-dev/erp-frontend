'use client';

import { useState, useEffect, useCallback } from 'react';
import { activityV1Api, extractActivityV1Error } from './activity-v1-api';
import type { KpiActivityResponse } from './activity-v1.types';

interface UseActivityDetailReturn {
  activity: KpiActivityResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Detail data hook following the same load/refresh pattern as Position detail. */
export function useActivityDetail(id: string, enabled = true, actingPositionId?: string): UseActivityDetailReturn {
  const [activity, setActivity] = useState<KpiActivityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await activityV1Api.getActivityById(id, actingPositionId);
        if (!cancelled) setActivity(result);
      } catch (err: unknown) {
        if (!cancelled) {
          setActivity(null);
          setError(extractActivityV1Error(err));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, enabled, actingPositionId]);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const result = await activityV1Api.getActivityById(id, actingPositionId);
      setActivity(result);
      setError(null);
    } catch (err: unknown) {
      setError(extractActivityV1Error(err));
    }
  }, [id, actingPositionId]);

  return { activity, isLoading, error, refresh };
}
