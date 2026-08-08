'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@heroui/react';
import { valuesApi, extractValuesError } from './values-api';
import { variablesApi } from '../variables/variables-api';
import { extractErrorMessage } from '@/types/api';
import type { VariableValueSheetRow, BatchVariableValueItem, SheetPeriod } from './values.types';

export interface UseVariableValuesDataReturn {
  sheet: VariableValueSheetRow[];
  isLoading: boolean;
  error: string | null;
  isSaving: boolean;
  saveError: string | null;
  /**
   * Cache/query key of the loaded sheet — monthly: `${year}-${month}`,
   * annual: `${year}-annual`. Monthly and annual scopes NEVER share a key.
   */
  loadedKey: string | null;
  fetchSheet: (period: SheetPeriod) => Promise<void>;
  saveBatch: (items: BatchVariableValueItem[]) => Promise<boolean>;
  /** Delete the explicit annual value (month = null) for a variable + year. */
  deleteAnnual: (variableId: string, year: number) => Promise<boolean>;
  /** Delete a monthly value by natural key — cleared cells are removed, not nulled. */
  deleteMonthly: (variableId: string, year: number, month: number) => Promise<boolean>;
}

function mergeRows(rows: VariableValueSheetRow[], variables: Array<{ id: string; name: string; unit: string | null; aggregationMode: string | null }>): VariableValueSheetRow[] {
  const meta = new Map(variables.map((v) => [v.id, v]));
  return rows.map((row) => {
    const variable = meta.get(row.variableId);
    return {
      ...row,
      name: variable?.name ?? row.variableCode,
      unit: variable?.unit ?? null,
      aggregationMode: variable?.aggregationMode ?? null,
    };
  });
}

export function useVariableValuesData(): UseVariableValuesDataReturn {
  const [sheet, setSheet] = useState<VariableValueSheetRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const loadedKeyRef = useRef<string | null>(null);

  const keyFor = useCallback((period: SheetPeriod) =>
    period.month != null ? `${period.year}-${period.month}` : `${period.year}-annual`, []);

  const fetchSheet = useCallback(async (period: SheetPeriod) => {
    setIsLoading(true);
    setError(null);
    try {
      // Merge the sheet with variable metadata (name/unit/mode) — the backend
      // sheet returns code only, so we join with the variables list.
      const [rows, variables] = await Promise.all([
        valuesApi.getSheet(period),
        variablesApi.list(),
      ]);
      const merged = mergeRows(rows as VariableValueSheetRow[], variables);
      if (mountedRef.current) {
        setSheet(merged);
        const key = keyFor(period);
        setLoadedKey(key);
        loadedKeyRef.current = key;
      }
    } catch (err: unknown) {
      const msg = extractValuesError(err);
      if (mountedRef.current) { setError(msg); setSheet([]); }
      toast.danger(msg);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [keyFor]);

  const refetchLoaded = useCallback(async () => {
    const key = loadedKeyRef.current;
    if (!key) return;
    const [yearStr, scope] = key.split('-');
    const year = Number(yearStr);
    const period: SheetPeriod = scope === 'annual' ? { year } : { year, month: Number(scope) };
    const [rows, variables] = await Promise.all([
      valuesApi.getSheet(period),
      variablesApi.list(),
    ]);
    if (mountedRef.current) {
      setSheet(mergeRows(rows as VariableValueSheetRow[], variables));
    }
  }, []);

  const saveBatch = useCallback(async (items: BatchVariableValueItem[]): Promise<boolean> => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await valuesApi.saveBatch({ items });
      // Refetch only the active sheet — monthly and annual scopes stay distinct.
      try {
        await refetchLoaded();
      } catch {
        // keep the optimistic state if the refetch fails
      }
      toast.success('Values saved successfully.');
      return true;
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Something went wrong while saving the values.');
      if (mountedRef.current) setSaveError(msg);
      toast.danger(msg);
      return false;
    } finally {
      if (mountedRef.current) setIsSaving(false);
    }
  }, [refetchLoaded]);

  const deleteAnnual = useCallback(async (variableId: string, year: number): Promise<boolean> => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await valuesApi.deleteAnnual(variableId, year);
      try {
        await refetchLoaded();
      } catch {
        // keep the sheet as-is if the refetch fails
      }
      toast.success('Annual value deleted.');
      return true;
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Something went wrong while deleting the annual value.');
      if (mountedRef.current) setSaveError(msg);
      toast.danger(msg);
      return false;
    } finally {
      if (mountedRef.current) setIsSaving(false);
    }
  }, [refetchLoaded]);

  const deleteMonthly = useCallback(async (variableId: string, year: number, month: number): Promise<boolean> => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await valuesApi.deleteMonthly(variableId, year, month);
      try {
        await refetchLoaded();
      } catch {
        // keep the sheet as-is if the refetch fails
      }
      toast.success('Value removed.');
      return true;
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Something went wrong while deleting the value.');
      if (mountedRef.current) setSaveError(msg);
      toast.danger(msg);
      return false;
    } finally {
      if (mountedRef.current) setIsSaving(false);
    }
  }, [refetchLoaded]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  return { sheet, isLoading, error, isSaving, saveError, loadedKey, fetchSheet, saveBatch, deleteAnnual, deleteMonthly };
}
