'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@heroui/react';
import { corporateKpiApi, extractKpiError } from './corporate-kpi-api';
import { corporateKpiStructuresApi } from './corporate-kpi-structures-api';
import { mapKpiError } from './corporate-kpi-error-mapper';
import type {
  CorporateKpiNode,
  CorporateKpiStructure,
  CreateKpiRequest,
  CreateStructureRequest,
  KpiStatus,
  UpdateKpiRequest,
} from './corporate-kpi.types';

/* ── Lifecycle action type for tracking pending state ── */

export type PendingLifecycleAction =
  | { kind: 'node'; type: 'delete' | 'restore'; targetId: string }
  | { kind: 'structure'; type: 'activate' | 'deactivate'; targetId: string }
  | null;

export interface UseCorporateKpiDataReturn {
  /* ── Read state ── */
  tree: CorporateKpiNode[];
  deletedList: CorporateKpiNode[];
  structures: CorporateKpiStructure[];
  isLoadingTree: boolean;
  isLoadingDeleted: boolean;
  isLoadingStructures: boolean;
  treeError: string | null;
  deletedError: string | null;
  structuresError: string | null;
  hasLoadedDeleted: boolean;
  /** month omitted → the ANNUAL tree; month given → the MONTHLY tree. */
  fetchTree: (year: number, month?: number) => Promise<void>;
  fetchDeleted: () => Promise<void>;
  fetchStructures: () => Promise<void>;

  /* ── Structure lifecycle (yearly aggregate) ── */
  isStructureMutating: boolean;
  createStructure: (payload: CreateStructureRequest) => Promise<CorporateKpiStructure | null>;
  changeStructureStatus: (id: string, status: KpiStatus) => Promise<boolean>;

  /* ── Create/update node mutations ── */
  isMutating: boolean;
  createNode: (payload: CreateKpiRequest) => Promise<CorporateKpiNode | null>;
  updateNode: (id: string, payload: UpdateKpiRequest) => Promise<CorporateKpiNode | null>;
  refreshTree: (year: number, month?: number) => Promise<void>;

  /* ── Node lifecycle ── */
  pendingLifecycle: PendingLifecycleAction;
  deleteKpi: (id: string) => Promise<boolean>;
  restoreKpi: (id: string) => Promise<boolean>;
}

export function useCorporateKpiData(): UseCorporateKpiDataReturn {
  const [tree, setTree] = useState<CorporateKpiNode[]>([]);
  const [deletedList, setDeletedList] = useState<CorporateKpiNode[]>([]);
  const [structures, setStructures] = useState<CorporateKpiStructure[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState(true);
  const [isLoadingDeleted, setIsLoadingDeleted] = useState(false);
  const [isLoadingStructures, setIsLoadingStructures] = useState(true);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [deletedError, setDeletedError] = useState<string | null>(null);
  const [structuresError, setStructuresError] = useState<string | null>(null);
  const [hasLoadedDeleted, setHasLoadedDeleted] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [isStructureMutating, setIsStructureMutating] = useState(false);
  const [pendingLifecycle, setPendingLifecycle] = useState<PendingLifecycleAction>(null);
  const mountedRef = useRef(true);
  const currentYearRef = useRef<number | null>(null);
  const currentMonthRef = useRef<number | undefined>(undefined);

  const fetchStructures = useCallback(async () => {
    setIsLoadingStructures(true);
    setStructuresError(null);
    try {
      const data = await corporateKpiStructuresApi.list();
      if (mountedRef.current) setStructures(data);
    } catch (err: unknown) {
      const msg = extractKpiError(err);
      if (mountedRef.current) setStructuresError(msg);
      toast.danger(msg);
    } finally {
      if (mountedRef.current) setIsLoadingStructures(false);
    }
  }, []);

  const fetchTree = useCallback(async (year: number, month?: number) => {
    setIsLoadingTree(true);
    setTreeError(null);
    currentYearRef.current = year;
    currentMonthRef.current = month;
    try {
      const data = await corporateKpiApi.getTreeByYear(year, month);
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

  const refreshTree = useCallback(async (year: number, month?: number) => {
    try {
      const data = await corporateKpiApi.getTreeByYear(year, month);
      if (mountedRef.current) setTree(data);
    } catch (err: unknown) {
      const msg = extractKpiError(err);
      if (mountedRef.current) setTreeError(msg);
      toast.danger(msg + ' — please retry.');
    }
  }, []);

  /** Refresh the current-period tree (silent — uses the refs). */
  const refreshTreeSilent = useCallback(async () => {
    const year = currentYearRef.current;
    if (year == null) return;
    try {
      const data = await corporateKpiApi.getTreeByYear(year, currentMonthRef.current);
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

  // ── Structure lifecycle ──

  const createStructure = useCallback(async (payload: CreateStructureRequest): Promise<CorporateKpiStructure | null> => {
    setIsStructureMutating(true);
    try {
      const result = await corporateKpiStructuresApi.create(payload);
      await fetchStructures();
      toast.success('Corporate KPI structure created.');
      return result;
    } catch (err: unknown) {
      const msg = mapKpiError(err, 'Something went wrong while creating the Corporate KPI structure.');
      toast.danger(msg);
      return null;
    } finally {
      if (mountedRef.current) setIsStructureMutating(false);
    }
  }, [fetchStructures]);

  const changeStructureStatus = useCallback(async (id: string, status: KpiStatus): Promise<boolean> => {
    const actionType = status === 'ACTIVE' ? 'activate' : 'deactivate';
    setPendingLifecycle({ kind: 'structure', type: actionType, targetId: id });
    try {
      await corporateKpiStructuresApi.changeStatus(id, { status });
      toast.success(status === 'ACTIVE'
        ? 'Corporate KPI structure activated.'
        : 'Corporate KPI structure deactivated.');
      await fetchStructures();
      const year = currentYearRef.current;
      if (year != null) await refreshTreeSilent();
      return true;
    } catch (err: unknown) {
      const msg = mapKpiError(err, 'Something went wrong while changing the structure status.');
      toast.danger(msg);
      return false;
    } finally {
      if (mountedRef.current) setPendingLifecycle(null);
    }
  }, [fetchStructures, refreshTreeSilent]);

  // ── node create/update ──

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

  // ── node lifecycle ──

  const deleteKpi = useCallback(async (id: string): Promise<boolean> => {
    setPendingLifecycle({ kind: 'node', type: 'delete', targetId: id });
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
    setPendingLifecycle({ kind: 'node', type: 'restore', targetId: id });
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
    tree, deletedList, structures, isLoadingTree, isLoadingDeleted, isLoadingStructures,
    treeError, deletedError, structuresError, hasLoadedDeleted,
    fetchTree, fetchDeleted, fetchStructures,
    isStructureMutating, createStructure, changeStructureStatus,
    isMutating, createNode, updateNode, refreshTree,
    pendingLifecycle, deleteKpi, restoreKpi,
  };
}
