'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from '@heroui/react';
import { unitPerformanceApi, extractUnitPerformanceError } from './unit-performance-api';
import type {
  CreateUnitPerformanceRequest,
  UnitPerformanceWeightMatrix,
  UpdateUnitPerformanceWeightMatrixRequest,
} from './unit-performance.types';

export interface UseUnitPerformanceDataReturn {
  /** The weight matrix for the selected year (indicators × participating units). */
  matrix: UnitPerformanceWeightMatrix | null;
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  fetchMatrix: (year: number) => Promise<void>;
  saveMatrix: (year: number, payload: UpdateUnitPerformanceWeightMatrixRequest) => Promise<boolean>;
  createUnit: (payload: CreateUnitPerformanceRequest) => Promise<boolean>;
  deleteUnit: (id: string) => Promise<boolean>;
}

export function useUnitPerformanceData(): UseUnitPerformanceDataReturn {
  const [matrix, setMatrix] = useState<UnitPerformanceWeightMatrix | null>(null);
  // The first request starts from an effect. Start in the loading state so
  // the matrix cannot render an empty state for the render before that effect.
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const currentRequestRef = useRef(0);
  const currentYearRef = useRef<number | null>(null);

  const fetchMatrix = useCallback(async (year: number) => {
    const requestId = ++currentRequestRef.current;
    currentYearRef.current = year;
    setIsLoading(true);
    setError(null);
    setMatrix(null);
    try {
      const data = await unitPerformanceApi.getWeightMatrix(year);
      if (mountedRef.current && requestId === currentRequestRef.current) setMatrix(data);
    } catch (err: unknown) {
      const msg = extractUnitPerformanceError(err);
      if (mountedRef.current && requestId === currentRequestRef.current) {
        setError(msg);
        setMatrix(null);
        toast.danger(msg);
      }
    } finally {
      if (mountedRef.current && requestId === currentRequestRef.current) setIsLoading(false);
    }
  }, []);

  /** Refresh the current-year matrix silently (after create/delete). */
  const refreshSilent = useCallback(async () => {
    const year = currentYearRef.current;
    if (year == null) return;
    const requestId = ++currentRequestRef.current;
    try {
      const data = await unitPerformanceApi.getWeightMatrix(year);
      if (mountedRef.current && requestId === currentRequestRef.current) setMatrix(data);
    } catch {
      if (mountedRef.current && requestId === currentRequestRef.current) {
        toast.danger('Gagal memuat ulang konfigurasi Performa Unit. Coba lagi secara manual.');
      }
    }
  }, []);

  const saveMatrix = useCallback(
    async (year: number, payload: UpdateUnitPerformanceWeightMatrixRequest): Promise<boolean> => {
      setIsMutating(true);
      try {
        const data = await unitPerformanceApi.saveWeightMatrix(year, payload);
        const refreshed = await unitPerformanceApi.getWeightMatrix(year);
        if (mountedRef.current) setMatrix(refreshed ?? data);
        toast.success('Matriks bobot berhasil disimpan.');
        return true;
      } catch (err: unknown) {
        toast.danger(extractUnitPerformanceError(err));
        return false;
      } finally {
        if (mountedRef.current) setIsMutating(false);
      }
    },
    [],
  );

  const createUnit = useCallback(async (payload: CreateUnitPerformanceRequest): Promise<boolean> => {
    setIsMutating(true);
    try {
      await unitPerformanceApi.create(payload);
      toast.success('Unit peserta berhasil dikonfigurasi.');
      await refreshSilent();
      return true;
    } catch (err: unknown) {
      toast.danger(extractUnitPerformanceError(err));
      return false;
    } finally {
      if (mountedRef.current) setIsMutating(false);
    }
  }, [refreshSilent]);

  const deleteUnit = useCallback(async (id: string): Promise<boolean> => {
    setIsMutating(true);
    try {
      await unitPerformanceApi.delete(id);
      toast.success('Unit peserta berhasil dihapus.');
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
    matrix, isLoading, isMutating, error,
    fetchMatrix, saveMatrix, createUnit, deleteUnit,
  };
}
