'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@heroui/react';
import { valuesApi, extractValuesError } from './values-api';
import { variablesApi } from '../variables/variables-api';
import { extractErrorMessage } from '@/types/api';
import type { VariableValueSheetRow, BatchVariableValueItem } from './values.types';

export interface UseVariableValuesDataReturn {
  sheet: VariableValueSheetRow[];
  isLoading: boolean;
  error: string | null;
  isSaving: boolean;
  saveError: string | null;
  loadedKey: string | null; // `${year}-${month}` of the currently loaded sheet
  fetchSheet: (year: number, month: number) => Promise<void>;
  saveBatch: (items: BatchVariableValueItem[]) => Promise<boolean>;
}

export function useVariableValuesData(): UseVariableValuesDataReturn {
  const [sheet, setSheet] = useState<VariableValueSheetRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchSheet = useCallback(async (year: number, month: number) => {
    setIsLoading(true);
    setError(null);
    try {
      // Merge the monthly sheet with variable metadata (name/unit) — the
      // backend sheet returns code only, so we join with the variables list.
      const [rows, variables] = await Promise.all([
        valuesApi.getSheet(year, month),
        variablesApi.list(),
      ]);
      const meta = new Map(variables.map((v) => [v.id, v]));
      const merged: VariableValueSheetRow[] = rows.map((row) => {
        const variable = meta.get(row.variableId);
        return {
          ...row,
          name: variable?.name ?? row.variableCode,
          unit: variable?.unit ?? null,
        };
      });
      if (mountedRef.current) {
        setSheet(merged);
        setLoadedKey(`${year}-${month}`);
      }
    } catch (err: unknown) {
      const msg = extractValuesError(err);
      if (mountedRef.current) { setError(msg); setSheet([]); }
      toast.danger(msg);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  const saveBatch = useCallback(async (items: BatchVariableValueItem[]): Promise<boolean> => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const result = await valuesApi.saveBatch({ items });
      // Refetch the sheet to reflect server state; keep the returned values as
      // a fallback if the refetch fails.
      const key = loadedKey;
      if (key) {
        const [year, month] = key.split('-').map(Number);
        try {
          const [rows, variables] = await Promise.all([
            valuesApi.getSheet(year, month),
            variablesApi.list(),
          ]);
          const meta = new Map(variables.map((v) => [v.id, v]));
          if (mountedRef.current) {
            setSheet(rows.map((row) => ({
              ...row,
              name: meta.get(row.variableId)?.name ?? row.variableCode,
              unit: meta.get(row.variableId)?.unit ?? null,
            })));
          }
        } catch {
          if (mountedRef.current) setSheet(result as VariableValueSheetRow[]);
        }
      }
      toast.success('Monthly values saved successfully.');
      return true;
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Something went wrong while saving the monthly values.');
      if (mountedRef.current) setSaveError(msg);
      toast.danger(msg);
      return false;
    } finally {
      if (mountedRef.current) setIsSaving(false);
    }
  }, [loadedKey]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  return { sheet, isLoading, error, isSaving, saveError, loadedKey, fetchSheet, saveBatch };
}
