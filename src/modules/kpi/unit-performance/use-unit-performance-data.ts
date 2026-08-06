'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@heroui/react';
import { unitPerformanceApi, extractUnitPerformanceError } from './unit-performance-api';
import type {
  UnitPerformanceRow,
  CreateUnitPerformanceRequest,
  UpdateUnitPerformanceRequest,
} from './unit-performance.types';

export interface UseUnitPerformanceDataReturn {
  rows: UnitPerformanceRow[];
  isLoading: boolean;
  error: string | null;
  isMutating: boolean;
  /** month omitted → the yearly (annual) list; month given → the monthly list. */
  fetchRows: (year: number, month?: number) => Promise<void>;
  createRow: (payload: CreateUnitPerformanceRequest) => Promise<boolean>;
  updateRow: (id: string, payload: UpdateUnitPerformanceRequest) => Promise<boolean>;
  deleteRow: (id: string) => Promise<boolean>;
}

export function useUnitPerformanceData(): UseUnitPerformanceDataReturn {
  const [rows, setRows] = useState<UnitPerformanceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const mountedRef = useRef(true);
  const currentYearRef = useRef<number | null>(null);
  const currentMonthRef = useRef<number | undefined>(undefined);

  const fetchRows = useCallback(async (year: number, month?: number) => {
    setIsLoading(true);
    setError(null);
    currentYearRef.current = year;
    currentMonthRef.current = month;
    try {
      const data = await unitPerformanceApi.getPerformance(year, month);
      if (mountedRef.current) setRows(data);
    } catch (err: unknown) {
      const msg = extractUnitPerformanceError(err);
      if (mountedRef.current) { setError(msg); setRows([]); }
      toast.danger(msg);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  /** Refresh the current-period list silently (uses the refs). */
  const refreshSilent = useCallback(async () => {
    const year = currentYearRef.current;
    if (year == null) return;
    try {
      const data = await unitPerformanceApi.getPerformance(year, currentMonthRef.current);
      if (mountedRef.current) setRows(data);
    } catch {
      toast.danger('Unit performance refresh failed. You may retry manually.');
    }
  }, []);

  const createRow = useCallback(async (payload: CreateUnitPerformanceRequest): Promise<boolean> => {
    setIsMutating(true);
    try {
      await unitPerformanceApi.create(payload);
      toast.success('Unit performance configured successfully.');
      await refreshSilent();
      return true;
    } catch (err: unknown) {
      toast.danger(extractUnitPerformanceError(err));
      return false;
    } finally {
      if (mountedRef.current) setIsMutating(false);
    }
  }, [refreshSilent]);

  const updateRow = useCallback(async (id: string, payload: UpdateUnitPerformanceRequest): Promise<boolean> => {
    setIsMutating(true);
    try {
      await unitPerformanceApi.update(id, payload);
      toast.success('Unit performance updated successfully.');
      await refreshSilent();
      return true;
    } catch (err: unknown) {
      toast.danger(extractUnitPerformanceError(err));
      return false;
    } finally {
      if (mountedRef.current) setIsMutating(false);
    }
  }, [refreshSilent]);

  const deleteRow = useCallback(async (id: string): Promise<boolean> => {
    setIsMutating(true);
    try {
      await unitPerformanceApi.delete(id);
      toast.success('Unit performance deleted successfully.');
      await refreshSilent();
      return true;
    } catch (err: unknown) {
      toast.danger(extractUnitPerformanceError(err));
      return false;
    } finally {
      if (mountedRef.current) setIsMutating(false);
    }
  }, [refreshSilent]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  return {
    rows, isLoading, error, isMutating,
    fetchRows, createRow, updateRow, deleteRow,
  };
}
