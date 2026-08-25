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

function normalizeNodes(nodes: CorporateKpiNode[] | null | undefined): CorporateKpiNode[] {
  return Array.isArray(nodes)
    ? nodes.map((node) => ({ ...node, children: normalizeNodes(node.children) }))
    : [];
}

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
  deleteKpi: (id: string, year?: number) => Promise<boolean>;
  restoreKpi: (id: string, year?: number) => Promise<boolean>;
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
  const treeRequestRef = useRef(0);
  const deletedRequestRef = useRef(0);
  const structuresRequestRef = useRef(0);

  const fetchStructures = useCallback(async () => {
    const requestId = ++structuresRequestRef.current;
    setIsLoadingStructures(true);
    setStructuresError(null);
    try {
      const data = await corporateKpiStructuresApi.list();
      if (mountedRef.current && requestId === structuresRequestRef.current) setStructures(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const msg = extractKpiError(err);
      if (mountedRef.current && requestId === structuresRequestRef.current) {
        setStructuresError(msg);
        toast.danger(msg);
      }
    } finally {
      if (mountedRef.current && requestId === structuresRequestRef.current) setIsLoadingStructures(false);
    }
  }, []);

  const fetchTree = useCallback(async (year: number, month?: number) => {
    const requestId = ++treeRequestRef.current;
    setIsLoadingTree(true);
    setTreeError(null);
    currentYearRef.current = year;
    currentMonthRef.current = month;
    try {
      const data = await corporateKpiApi.getTreeByYear(year, month);
      if (mountedRef.current && requestId === treeRequestRef.current) setTree(normalizeNodes(data));
    } catch (err: unknown) {
      const msg = extractKpiError(err);
      if (mountedRef.current && requestId === treeRequestRef.current) {
        setTreeError(msg);
        setTree([]);
        toast.danger(msg);
      }
    } finally {
      if (mountedRef.current && requestId === treeRequestRef.current) setIsLoadingTree(false);
    }
  }, []);

  const fetchDeleted = useCallback(async () => {
    const requestId = ++deletedRequestRef.current;
    setIsLoadingDeleted(true);
    setDeletedError(null);
    try {
      const data = await corporateKpiApi.getDeleted();
      if (mountedRef.current && requestId === deletedRequestRef.current) {
        setDeletedList(normalizeNodes(data));
        setHasLoadedDeleted(true);
      }
    } catch (err: unknown) {
      const msg = extractKpiError(err);
      if (mountedRef.current && requestId === deletedRequestRef.current) {
        setDeletedError(msg);
        toast.danger(msg);
      }
    } finally {
      if (mountedRef.current && requestId === deletedRequestRef.current) setIsLoadingDeleted(false);
    }
  }, []);

  const refreshTree = useCallback(async (year: number, month?: number) => {
    await fetchTree(year, month);
  }, [fetchTree]);

  /** Refresh the current-period tree (silent — uses the refs). */
  const refreshTreeSilent = useCallback(async () => {
    const year = currentYearRef.current;
    if (year == null) return;
    await fetchTree(year, currentMonthRef.current);
  }, [fetchTree]);

  /** Refresh deleted data silently (only if previously loaded). */
  const refreshDeletedSilent = useCallback(async () => {
    if (!hasLoadedDeleted) return;
    try {
      const data = await corporateKpiApi.getDeleted();
      if (mountedRef.current) setDeletedList(normalizeNodes(data));
    } catch {
      toast.danger('Penyegaran KPI terhapus gagal. Silakan coba lagi.');
    }
  }, [hasLoadedDeleted]);

  // ── Structure lifecycle ──

  const createStructure = useCallback(async (payload: CreateStructureRequest): Promise<CorporateKpiStructure | null> => {
    setIsStructureMutating(true);
    try {
      const result = await corporateKpiStructuresApi.create(payload);
      await fetchStructures();
      toast.success('Struktur KPI Perusahaan berhasil dibuat.');
      return result;
    } catch (err: unknown) {
      const msg = mapKpiError(err, 'Terjadi kesalahan saat membuat struktur KPI Perusahaan.');
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
        ? 'Struktur KPI Perusahaan berhasil diaktifkan.'
        : 'Struktur KPI Perusahaan berhasil dinonaktifkan.');
      await fetchStructures();
      const year = currentYearRef.current;
      if (year != null) await refreshTreeSilent();
      return true;
    } catch (err: unknown) {
      const msg = mapKpiError(err, 'Terjadi kesalahan saat mengubah status struktur.');
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
      await fetchStructures();
      const year = payload.year ?? currentYearRef.current;
      if (year != null) await fetchTree(year, currentMonthRef.current);
      return result;
    } catch (err: unknown) {
      const msg = mapKpiError(err, 'Terjadi kesalahan saat menyimpan KPI Perusahaan.');
      toast.danger(msg);
      return null;
    } finally {
      if (mountedRef.current) setIsMutating(false);
    }
  }, [fetchStructures, fetchTree]);

  const updateNode = useCallback(async (id: string, payload: UpdateKpiRequest): Promise<CorporateKpiNode | null> => {
    setIsMutating(true);
    try {
      const result = await corporateKpiApi.update(id, payload);
      await fetchStructures();
      await refreshTreeSilent();
      return result;
    } catch (err: unknown) {
      const msg = mapKpiError(err, 'Terjadi kesalahan saat menyimpan KPI Perusahaan.');
      toast.danger(msg);
      return null;
    } finally {
      if (mountedRef.current) setIsMutating(false);
    }
  }, [fetchStructures, refreshTreeSilent]);

  // ── node lifecycle ──

  const deleteKpi = useCallback(async (id: string, year?: number): Promise<boolean> => {
    setPendingLifecycle({ kind: 'node', type: 'delete', targetId: id });
    try {
      await corporateKpiApi.deleteNode(id);
      toast.success('KPI Perusahaan berhasil dihapus.');
      await fetchStructures();
      if (year != null && currentYearRef.current !== year) currentYearRef.current = year;
      await refreshTreeSilent();
      await refreshDeletedSilent();
      return true;
    } catch (err: unknown) {
      const msg = mapKpiError(err, 'Terjadi kesalahan saat menghapus KPI Perusahaan.');
      toast.danger(msg);
      return false;
    } finally {
      if (mountedRef.current) setPendingLifecycle(null);
    }
  }, [fetchStructures, refreshTreeSilent, refreshDeletedSilent]);

  const restoreKpi = useCallback(async (id: string, year?: number): Promise<boolean> => {
    setPendingLifecycle({ kind: 'node', type: 'restore', targetId: id });
    try {
      await corporateKpiApi.restoreNode(id);
      toast.success('KPI Perusahaan berhasil dipulihkan.');
      await fetchStructures();
      if (year != null && currentYearRef.current !== year) currentYearRef.current = year;
      await refreshTreeSilent();
      await refreshDeletedSilent();
      return true;
    } catch (err: unknown) {
      const msg = mapKpiError(err, 'Terjadi kesalahan saat memulihkan KPI Perusahaan.');
      toast.danger(msg);
      return false;
    } finally {
      if (mountedRef.current) setPendingLifecycle(null);
    }
  }, [fetchStructures, refreshTreeSilent, refreshDeletedSilent]);

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
