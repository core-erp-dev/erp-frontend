'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@heroui/react';
import { corporateKpiApi, extractKpiError } from './corporate-kpi-api';
import { mapKpiError } from './corporate-kpi-error-mapper';
import type { CorporateKpiNode, CreateKpiRequest, UpdateKpiRequest, KpiStatus } from './corporate-kpi.types';

/* ── Lifecycle action type for tracking pending state ── */

export type PendingLifecycleAction = {
  type: 'activate' | 'deactivate' | 'delete' | 'restore';
  nodeId: string;
} | null;

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

  /* ── Create/update mutations (P1.2) ── */
  isMutating: boolean;
  createNode: (payload: CreateKpiRequest) => Promise<CorporateKpiNode | null>;
  updateNode: (id: string, payload: UpdateKpiRequest) => Promise<CorporateKpiNode | null>;
  refreshTree: (year: number) => Promise<void>;

  /* ── Lifecycle (P1.3) ── */
  pendingLifecycle: PendingLifecycleAction;
  changeStatus: (id: string, status: KpiStatus) => Promise<boolean>;
  deleteKpi: (id: string) => Promise<boolean>;
  restoreKpi: (id: string) => Promise<boolean>;
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
  const [pendingLifecycle, setPendingLifecycle] = useState<PendingLifecycleAction>(null);
  const mountedRef = useRef(true);
  const currentYearRef = useRef<number | null>(null);

  const fetchTree = useCallback(async (year: number) => {
    setIsLoadingTree(true);
    setTreeError(null);
    currentYearRef.current = year;
    try {
      const data = await corporateKpiApi.getTreeByYear(year);
      if (mountedRef.current) setTree(data);
    } catch (err: unknown) {
      const msg = extractKpiError(err);
      if (mountedRef.current) { setTreeError(msg); setTree([]); }
      toast.danger(msg);
    } finally {
      if (mountedRef.current) setIsLoadingTree(false);
    }
  }, []);

  const fetchDeleted = useCallback(async () => {
    setIsLoadingDeleted(true);
    setDeletedError(null);
    try {
      const data = await corporateKpiApi.getDeleted();
      if (mountedRef.current) { setDeletedList(data); setHasLoadedDeleted(true); }
    } catch (err: unknown) {
      const msg = extractKpiError(err);
      if (mountedRef.current) setDeletedError(msg);
      toast.danger(msg);
    } finally {
      if (mountedRef.current) setIsLoadingDeleted(false);
    }
  }, []);

  const refreshTree = useCallback(async (year: number) => {
    try {
      const data = await corporateKpiApi.getTreeByYear(year);
      if (mountedRef.current) setTree(data);
    } catch (err: unknown) {
      const msg = extractKpiError(err);
      if (mountedRef.current) setTreeError(msg);
      toast.danger(msg + ' — please retry.');
    }
  }, []);

  /** Refresh the current-year tree (silent — uses currentYearRef). */
  const refreshTreeSilent = useCallback(async () => {
    const year = currentYearRef.current;
    if (year == null) return;
    try {
      const data = await corporateKpiApi.getTreeByYear(year);
      if (mountedRef.current) setTree(data);
    } catch {
      toast.danger('Tree refresh failed. You may retry manually.');
    }
  }, []);

  /** Refresh deleted data silently (only if previously loaded). */
  const refreshDeletedSilent = useCallback(async () => {
    if (!hasLoadedDeleted) return;
    try {
      const data = await corporateKpiApi.getDeleted();
      if (mountedRef.current) setDeletedList(data);
    } catch {
      toast.danger('Deleted-KPI refresh failed. You may retry manually.');
    }
  }, [hasLoadedDeleted]);

  // ── P1.2 create/update ──

  const createNode = useCallback(async (payload: CreateKpiRequest): Promise<CorporateKpiNode | null> => {
    setIsMutating(true);
    try {
      const result = await corporateKpiApi.create(payload);
      await refreshTreeSilent();
      return result;
    } catch (err: unknown) {
      const msg = mapKpiError(err, 'Something went wrong while saving the Corporate KPI.');
      toast.danger(msg);
      return null;
    } finally {
      if (mountedRef.current) setIsMutating(false);
    }
  }, [refreshTreeSilent]);

  const updateNode = useCallback(async (id: string, payload: UpdateKpiRequest): Promise<CorporateKpiNode | null> => {
    setIsMutating(true);
    try {
      const result = await corporateKpiApi.update(id, payload);
      await refreshTreeSilent();
      return result;
    } catch (err: unknown) {
      const msg = mapKpiError(err, 'Something went wrong while saving the Corporate KPI.');
      toast.danger(msg);
      return null;
    } finally {
      if (mountedRef.current) setIsMutating(false);
    }
  }, [refreshTreeSilent]);

  // ── P1.3 lifecycle ──

  const changeStatus = useCallback(async (id: string, status: KpiStatus): Promise<boolean> => {
    const actionType = status === 'ACTIVE' ? 'activate' : status === 'INACTIVE' ? 'deactivate' : 'activate';
    setPendingLifecycle({ type: actionType, nodeId: id });
    try {
      await corporateKpiApi.changeStatus(id, { status });
      toast.success('Corporate KPI status updated successfully.');
      await refreshTreeSilent();
      return true;
    } catch (err: unknown) {
      const msg = mapKpiError(err, 'Something went wrong while changing the status.');
      toast.danger(msg);
      return false;
    } finally {
      if (mountedRef.current) setPendingLifecycle(null);
    }
  }, [refreshTreeSilent]);

  const deleteKpi = useCallback(async (id: string): Promise<boolean> => {
    setPendingLifecycle({ type: 'delete', nodeId: id });
    try {
      await corporateKpiApi.deleteNode(id);
      toast.success('Corporate KPI deleted successfully.');
      await refreshTreeSilent();
      await refreshDeletedSilent();
      return true;
    } catch (err: unknown) {
      const msg = mapKpiError(err, 'Something went wrong while deleting the Corporate KPI.');
      toast.danger(msg);
      return false;
    } finally {
      if (mountedRef.current) setPendingLifecycle(null);
    }
  }, [refreshTreeSilent, refreshDeletedSilent]);

  const restoreKpi = useCallback(async (id: string): Promise<boolean> => {
    setPendingLifecycle({ type: 'restore', nodeId: id });
    try {
      await corporateKpiApi.restoreNode(id);
      toast.success('Corporate KPI restored successfully.');
      await refreshTreeSilent();
      await refreshDeletedSilent();
      return true;
    } catch (err: unknown) {
      const msg = mapKpiError(err, 'Something went wrong while restoring the Corporate KPI.');
      toast.danger(msg);
      return false;
    } finally {
      if (mountedRef.current) setPendingLifecycle(null);
    }
  }, [refreshTreeSilent, refreshDeletedSilent]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  return {
    tree, deletedList, isLoadingTree, isLoadingDeleted, treeError, deletedError,
    hasLoadedDeleted, fetchTree, fetchDeleted,
    isMutating, createNode, updateNode, refreshTree,
    pendingLifecycle, changeStatus, deleteKpi, restoreKpi,
  };
}
