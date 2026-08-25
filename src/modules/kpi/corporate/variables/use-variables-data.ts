'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@heroui/react';
import { variablesApi, extractVariablesError } from './variables-api';
import { mapVariableError } from './variables-error-mapper';
import type {
  Variable,
  CreateVariableRequest,
  UpdateVariableRequest,
  VariableSortDirection,
  VariableSortField,
} from './variables.types';

export interface VariableListOptions {
  search?: string;
  sortBy?: VariableSortField;
  sortDirection?: VariableSortDirection;
}

export interface UseVariablesDataReturn {
  variables: Variable[];
  deletedList: Variable[];
  isLoading: boolean;
  isLoadingDeleted: boolean;
  error: string | null;
  deletedError: string | null;
  hasLoadedDeleted: boolean;
  fetchList: (options?: VariableListOptions) => Promise<void>;
  fetchDeleted: (sortBy?: VariableSortField, sortDirection?: VariableSortDirection) => Promise<void>;
  isMutating: boolean;
  createVariable: (payload: CreateVariableRequest) => Promise<Variable | null>;
  updateVariable: (id: string, payload: UpdateVariableRequest) => Promise<Variable | null>;
  deleteVariable: (id: string) => Promise<boolean>;
  restoreVariable: (id: string) => Promise<boolean>;
}

export function useVariablesData(): UseVariablesDataReturn {
  const [variables, setVariables] = useState<Variable[]>([]);
  const [deletedList, setDeletedList] = useState<Variable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDeleted, setIsLoadingDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletedError, setDeletedError] = useState<string | null>(null);
  const [hasLoadedDeleted, setHasLoadedDeleted] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const mountedRef = useRef(true);
  const currentOptionsRef = useRef<VariableListOptions>({ sortBy: 'name', sortDirection: 'asc' });
  const currentSortRef = useRef<{ sortBy: VariableSortField; sortDirection: VariableSortDirection }>({ sortBy: 'name', sortDirection: 'asc' });
  const listRequestRef = useRef(0);
  const deletedRequestRef = useRef(0);

  const fetchList = useCallback(async (options: VariableListOptions = {}) => {
    const requestId = ++listRequestRef.current;
    const normalized = {
      search: options.search || undefined,
      sortBy: options.sortBy ?? 'name',
      sortDirection: options.sortDirection ?? 'asc',
    } satisfies VariableListOptions;
    setIsLoading(true);
    setError(null);
    setVariables([]);
    currentOptionsRef.current = normalized;
    currentSortRef.current = { sortBy: normalized.sortBy, sortDirection: normalized.sortDirection };
    try {
      const data = await variablesApi.list(normalized.search, normalized.sortBy, normalized.sortDirection);
      if (mountedRef.current && requestId === listRequestRef.current) setVariables(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const msg = extractVariablesError(err);
      if (mountedRef.current && requestId === listRequestRef.current) { setError(msg); setVariables([]); }
      toast.danger(msg);
    } finally {
      if (mountedRef.current && requestId === listRequestRef.current) setIsLoading(false);
    }
  }, []);

  const fetchDeleted = useCallback(async (
    sortBy: VariableSortField = 'name',
    sortDirection: VariableSortDirection = 'asc',
  ) => {
    const requestId = ++deletedRequestRef.current;
    setIsLoadingDeleted(true);
    setDeletedError(null);
    setDeletedList([]);
    currentSortRef.current = { sortBy, sortDirection };
    try {
      const data = await variablesApi.getDeleted(sortBy, sortDirection);
      if (mountedRef.current && requestId === deletedRequestRef.current) {
        setDeletedList(Array.isArray(data) ? data : []);
        setHasLoadedDeleted(true);
      }
    } catch (err: unknown) {
      const msg = extractVariablesError(err);
      if (mountedRef.current && requestId === deletedRequestRef.current) setDeletedError(msg);
      toast.danger(msg);
    } finally {
      if (mountedRef.current && requestId === deletedRequestRef.current) setIsLoadingDeleted(false);
    }
  }, []);

  const createVariable = useCallback(async (payload: CreateVariableRequest): Promise<Variable | null> => {
    setIsMutating(true);
    try {
      const result = await variablesApi.create(payload);
      await fetchList(currentOptionsRef.current);
      return result;
    } catch (err: unknown) {
      const msg = mapVariableError(err, 'Terjadi kesalahan saat membuat variabel.');
      toast.danger(msg);
      return null;
    } finally {
      if (mountedRef.current) setIsMutating(false);
    }
  }, [fetchList]);

  const updateVariable = useCallback(async (id: string, payload: UpdateVariableRequest): Promise<Variable | null> => {
    setIsMutating(true);
    try {
      const result = await variablesApi.update(id, payload);
      await fetchList(currentOptionsRef.current);
      return result;
    } catch (err: unknown) {
      const msg = mapVariableError(err, 'Terjadi kesalahan saat menyimpan variabel.');
      toast.danger(msg);
      return null;
    } finally {
      if (mountedRef.current) setIsMutating(false);
    }
  }, [fetchList]);

  const deleteVariable = useCallback(async (id: string): Promise<boolean> => {
    setIsMutating(true);
    try {
      await variablesApi.softDelete(id);
      toast.success('Variabel berhasil dihapus.');
      await fetchList(currentOptionsRef.current);
      if (hasLoadedDeleted) await fetchDeleted(currentSortRef.current.sortBy, currentSortRef.current.sortDirection);
      return true;
    } catch (err: unknown) {
      const msg = mapVariableError(err, 'Terjadi kesalahan saat menghapus variabel.');
      toast.danger(msg);
      return false;
    } finally {
      if (mountedRef.current) setIsMutating(false);
    }
  }, [fetchDeleted, fetchList, hasLoadedDeleted]);

  const restoreVariable = useCallback(async (id: string): Promise<boolean> => {
    setIsMutating(true);
    try {
      await variablesApi.restore(id);
      toast.success('Variabel berhasil dipulihkan.');
      await fetchList(currentOptionsRef.current);
      if (hasLoadedDeleted) await fetchDeleted(currentSortRef.current.sortBy, currentSortRef.current.sortDirection);
      return true;
    } catch (err: unknown) {
      const msg = mapVariableError(err, 'Terjadi kesalahan saat memulihkan variabel.');
      toast.danger(msg);
      return false;
    } finally {
      if (mountedRef.current) setIsMutating(false);
    }
  }, [fetchDeleted, fetchList, hasLoadedDeleted]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  return {
    variables, deletedList, isLoading, isLoadingDeleted, error, deletedError, hasLoadedDeleted,
    fetchList, fetchDeleted, isMutating, createVariable, updateVariable, deleteVariable, restoreVariable,
  };
}
