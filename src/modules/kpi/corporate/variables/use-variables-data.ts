'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@heroui/react';
import { variablesApi, extractVariablesError } from './variables-api';
import { mapVariableError } from './variables-error-mapper';
import type { Variable, CreateVariableRequest, UpdateVariableRequest } from './variables.types';

export interface UseVariablesDataReturn {
  variables: Variable[];
  deletedList: Variable[];
  isLoading: boolean;
  isLoadingDeleted: boolean;
  error: string | null;
  deletedError: string | null;
  hasLoadedDeleted: boolean;
  fetchList: (search?: string) => Promise<void>;
  fetchDeleted: () => Promise<void>;
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
  const currentSearchRef = useRef<string | undefined>(undefined);

  const fetchList = useCallback(async (search?: string) => {
    setIsLoading(true);
    setError(null);
    currentSearchRef.current = search;
    try {
      const data = await variablesApi.list(search);
      if (mountedRef.current) setVariables(data);
    } catch (err: unknown) {
      const msg = extractVariablesError(err);
      if (mountedRef.current) { setError(msg); setVariables([]); }
      toast.danger(msg);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  const fetchDeleted = useCallback(async () => {
    setIsLoadingDeleted(true);
    setDeletedError(null);
    try {
      const data = await variablesApi.getDeleted();
      if (mountedRef.current) { setDeletedList(data); setHasLoadedDeleted(true); }
    } catch (err: unknown) {
      const msg = extractVariablesError(err);
      if (mountedRef.current) setDeletedError(msg);
      toast.danger(msg);
    } finally {
      if (mountedRef.current) setIsLoadingDeleted(false);
    }
  }, []);

  const refreshListSilent = useCallback(async () => {
    try {
      const data = await variablesApi.list(currentSearchRef.current);
      if (mountedRef.current) setVariables(data);
    } catch {
      toast.danger('Variables refresh failed. You may retry manually.');
    }
  }, []);

  const refreshDeletedSilent = useCallback(async () => {
    if (!hasLoadedDeleted) return;
    try {
      const data = await variablesApi.getDeleted();
      if (mountedRef.current) setDeletedList(data);
    } catch {
      toast.danger('Deleted-variables refresh failed. You may retry manually.');
    }
  }, [hasLoadedDeleted]);

  const createVariable = useCallback(async (payload: CreateVariableRequest): Promise<Variable | null> => {
    setIsMutating(true);
    try {
      const result = await variablesApi.create(payload);
      await refreshListSilent();
      return result;
    } catch (err: unknown) {
      const msg = mapVariableError(err, 'Something went wrong while creating the variable.');
      toast.danger(msg);
      return null;
    } finally {
      if (mountedRef.current) setIsMutating(false);
    }
  }, [refreshListSilent]);

  const updateVariable = useCallback(async (id: string, payload: UpdateVariableRequest): Promise<Variable | null> => {
    setIsMutating(true);
    try {
      const result = await variablesApi.update(id, payload);
      await refreshListSilent();
      return result;
    } catch (err: unknown) {
      const msg = mapVariableError(err, 'Something went wrong while saving the variable.');
      toast.danger(msg);
      return null;
    } finally {
      if (mountedRef.current) setIsMutating(false);
    }
  }, [refreshListSilent]);

  const deleteVariable = useCallback(async (id: string): Promise<boolean> => {
    setIsMutating(true);
    try {
      await variablesApi.softDelete(id);
      toast.success('Variable deleted successfully.');
      await refreshListSilent();
      await refreshDeletedSilent();
      return true;
    } catch (err: unknown) {
      const msg = mapVariableError(err, 'Something went wrong while deleting the variable.');
      toast.danger(msg);
      return false;
    } finally {
      if (mountedRef.current) setIsMutating(false);
    }
  }, [refreshListSilent, refreshDeletedSilent]);

  const restoreVariable = useCallback(async (id: string): Promise<boolean> => {
    setIsMutating(true);
    try {
      await variablesApi.restore(id);
      toast.success('Variable restored successfully.');
      await refreshListSilent();
      await refreshDeletedSilent();
      return true;
    } catch (err: unknown) {
      const msg = mapVariableError(err, 'Something went wrong while restoring the variable.');
      toast.danger(msg);
      return false;
    } finally {
      if (mountedRef.current) setIsMutating(false);
    }
  }, [refreshListSilent, refreshDeletedSilent]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  return {
    variables, deletedList, isLoading, isLoadingDeleted, error, deletedError, hasLoadedDeleted,
    fetchList, fetchDeleted, isMutating, createVariable, updateVariable, deleteVariable, restoreVariable,
  };
}
