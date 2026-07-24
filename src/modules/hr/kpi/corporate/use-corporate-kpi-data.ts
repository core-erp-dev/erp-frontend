'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@heroui/react';
import { corporateKpiApi, extractKpiError } from './corporate-kpi-api';
import type { CorporateKpiNode } from './corporate-kpi.types';

export interface UseCorporateKpiDataReturn {
  /** Non-deleted hierarchy tree for the selected year. */
  tree: CorporateKpiNode[];
  /** Deleted KPIs (flat, all years). */
  deletedList: CorporateKpiNode[];
  /** Whether the current-year tree is loading. */
  isLoadingTree: boolean;
  /** Whether deleted data is being fetched. */
  isLoadingDeleted: boolean;
  /** Tree fetch error, if any. */
  treeError: string | null;
  /** Deleted fetch error, if any. */
  deletedError: string | null;
  /** Whether deleted data has been fetched at least once. */
  hasLoadedDeleted: boolean;
  /** Fetch tree for a given year. */
  fetchTree: (year: number) => Promise<void>;
  /** Fetch deleted list (lazy — called on demand). */
  fetchDeleted: () => Promise<void>;
}

export function useCorporateKpiData(): UseCorporateKpiDataReturn {
  const [tree, setTree] = useState<CorporateKpiNode[]>([]);
  const [deletedList, setDeletedList] = useState<CorporateKpiNode[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState(true);
  const [isLoadingDeleted, setIsLoadingDeleted] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [deletedError, setDeletedError] = useState<string | null>(null);
  const [hasLoadedDeleted, setHasLoadedDeleted] = useState(false);
  const mountedRef = useRef(true);

  const fetchTree = useCallback(async (year: number) => {
    setIsLoadingTree(true);
    setTreeError(null);
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
  };
}
