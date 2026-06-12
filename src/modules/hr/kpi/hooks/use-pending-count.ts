import { useState, useEffect, useCallback, useRef } from 'react';
import { kpiReportApi } from '../services/report-api';

interface UsePendingCountReturn {
  pendingCount: number;
  refresh: () => void;
}

/**
 * Lightweight polling hook for KPI pending report count.
 * Polls every 45 seconds. Only counts when > 0.
 * Cleans up on unmount.
 */
export function usePendingCount(intervalMs = 45000): UsePendingCountReturn {
  const [pendingCount, setPendingCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const result = await kpiReportApi.getPendingCount();
      setPendingCount(result.pendingReportCount);
    } catch {
      // Silently fail -- badge is non-critical
    }
  }, []);

  const refresh = useCallback(() => {
    fetchCount();
  }, [fetchCount]);

  useEffect(() => {
    // Initial fetch
    fetchCount();

    // Start polling
    intervalRef.current = setInterval(fetchCount, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchCount, intervalMs]);

  return { pendingCount, refresh };
}
