'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@heroui/react';
import { corporateKpiApi, extractKpiError } from './corporate-kpi-api';
import { mapKpiError } from './corporate-kpi-error-mapper';
import type { CorporateKpiNode, CreateKpiRequest, UpdateKpiRequest } from './corporate-kpi.types';

export interface UseCorporateKpiDataReturn {
  /* ── Read state (P1.1) ── */
  tree: CorporateKpiNode[];
  deletedList: CorporateKpiNode[];
  isLoadingTree: boolean;
  isLoadingDeleted: boolean;
  treeError: string | null;
  deletedError: string | null;
  hasLoadedDeleted: boolean;
  fetchTree: (year: number) => Promise<void>;
  fetchDeleted: () => Promise<void>;

  /* ── Mutation state (P1.2) ── */
  isMutating: boolean;
  createNode: (payload: CreateKpiRequest) => Promise<CorporateKpiNode | null>;
  updateNode: (id: string, payload: UpdateKpiRequest) => Promise<CorporateKpiNode | null>;
  refreshTree: (year: number) => Promise<void>;
}

export function useCorporateKpiData(): UseCorporateKpiDataReturn {
  const [tree, setTree] = useState<CorporateKpiNode[]>([]);
  const [deletedList, setDeletedList] = useState<CorporateKpiNode[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState(true);
  const [isLoadingDeleted, setIsLoadingDeleted] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [deletedError, setDeletedError] = useState<string | null>(null);
  const [hasLoadedDeleted, setHasLoadedDeleted] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const mountedRef = useRef(true);
  const currentYearRef = useRef<number | null>(null);

  const fetchTree = useCallback(async (year: number) => {
    setIsLoadingTree(true);
    setTreeError(null);
    currentYearRef.current = year;
    try {
      const data = await corporateKpiApi.getTreeByYear(year);
      if (mountedRef.current) {
        setTree(data);
      }
    } catch (err: unknown) {
      const msg = extractKpiError(err);
      if (mountedRef.current) {
        setTreeError(msg);
        setTree([]);
      }
      toast.danger(msg);
    } finally {
      if (mountedRef.current) {
        setIsLoadingTree(false);
      }
    }
  }, []);

  const fetchDeleted = useCallback(async () => {
    setIsLoadingDeleted(true);
    setDeletedError(null);
    try {
      const data = await corporateKpiApi.getDeleted();
      if (mountedRef.current) {
        setDeletedList(data);
        setHasLoadedDeleted(true);
      }
    } catch (err: unknown) {
      const msg = extractKpiError(err);
      if (mountedRef.current) {
        setDeletedError(msg);
      }
      toast.danger(msg);
    } finally {
      if (mountedRef.current) {
        setIsLoadingDeleted(false);
      }
    }
  }, []);

  /** Server-confirmed tree refresh after mutation. */
  const refreshTree = useCallback(async (year: number) => {
    try {
      const data = await corporateKpiApi.getTreeByYear(year);
      if (mountedRef.current) {
        setTree(data);
      }
    } catch (err: unknown) {
      const msg = extractKpiError(err);
      if (mountedRef.current) {
        setTreeError(msg);
      }
      toast.danger(msg + ' — please retry.');
    }
  }, []);

  const createNode = useCallback(async (payload: CreateKpiRequest): Promise<CorporateKpiNode | null> => {
    setIsMutating(true);
    try {
      const result = await corporateKpiApi.create(payload);
      // Refresh tree silently
      if (currentYearRef.current != null) {
        try {
          const data = await corporateKpiApi.getTreeByYear(currentYearRef.current);
          if (mountedRef.current) setTree(data);
        } catch {
          // Refresh failure is non-fatal; mutation already succeeded
          toast.danger('Corporate KPI saved, but the tree refresh failed. You may retry manually.');
        }
      }
      return result;
    } catch (err: unknown) {
      const msg = mapKpiError(err, 'Something went wrong while saving the Corporate KPI.');
      toast.danger(msg);
      return null;
    } finally {
      if (mountedRef.current) setIsMutating(false);
    }
  }, []);

  const updateNode = useCallback(async (id: string, payload: UpdateKpiRequest): Promise<CorporateKpiNode | null> => {
    setIsMutating(true);
    try {
      const result = await corporateKpiApi.update(id, payload);
      // Refresh tree silently
      if (currentYearRef.current != null) {
        try {
          const data = await corporateKpiApi.getTreeByYear(currentYearRef.current);
          if (mountedRef.current) setTree(data);
        } catch {
          // Refresh failure is non-fatal
          toast.danger('Corporate KPI saved, but the tree refresh failed. You may retry manually.');
        }
      }
      return result;
    } catch (err: unknown) {
      const msg = mapKpiError(err, 'Something went wrong while saving the Corporate KPI.');
      toast.danger(msg);
      return null;
    } finally {
      if (mountedRef.current) setIsMutating(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    tree,
    deletedList,
    isLoadingTree,
    isLoadingDeleted,
    treeError,
    deletedError,
    hasLoadedDeleted,
    fetchTree,
    fetchDeleted,
    isMutating,
    createNode,
    updateNode,
    refreshTree,
  };
}
