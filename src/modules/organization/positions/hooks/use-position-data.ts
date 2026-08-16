'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@heroui/react';
import { organizationApi, type PositionFilterParams } from '../services/organization-api';
import type { Position, PositionTree } from '../types';
import type { PaginatedResponse } from '@/types/api';
import { extractErrorMessage } from '@/types/api';

export type SortField = 'positionName' | 'positionCode' | 'positionLevel';
export type SortDir = 'asc' | 'desc';
export type ScopeFilter = 'current' | 'deleted';
export type ViewMode = 'table' | 'tree';

export interface PositionFilters {
  search: string;
  scope: ScopeFilter;
  sortBy: SortField;
  sortDirection: SortDir;
  page: number; // 1-based
  size: number;
  view: ViewMode;
}

const DEFAULT_FILTERS: PositionFilters = {
  search: '',
  scope: 'current',
  sortBy: 'positionName',
  sortDirection: 'asc',
  page: 1,
  size: 10,
  view: 'table',
};

const VALID_SORT_FIELDS: SortField[] = ['positionName', 'positionCode', 'positionLevel'];
const VALID_SORT_DIRS: SortDir[] = ['asc', 'desc'];

/** Parse the URL search params into filters — defaults apply when absent/invalid. */
function parseFilters(searchParams: URLSearchParams): PositionFilters {
  const sortByParam = searchParams.get('sortBy');
  const sortBy = (VALID_SORT_FIELDS as string[]).includes(sortByParam ?? '')
    ? (sortByParam as SortField)
    : DEFAULT_FILTERS.sortBy;
  const sortDirectionParam = searchParams.get('sortDirection');
  const sortDirection = (VALID_SORT_DIRS as string[]).includes(sortDirectionParam ?? '')
    ? (sortDirectionParam as SortDir)
    : DEFAULT_FILTERS.sortDirection;
  const pageParam = Number(searchParams.get('page'));
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam : DEFAULT_FILTERS.page;
  const viewParam = searchParams.get('view');

  return {
    search: searchParams.get('search') ?? DEFAULT_FILTERS.search,
    scope: searchParams.get('scope') === 'deleted' ? 'deleted' : 'current',
    sortBy,
    sortDirection,
    page,
    size: DEFAULT_FILTERS.size,
    view: viewParam === 'tree' ? 'tree' : 'table',
  };
}

export interface UsePositionDataReturn {
  // Table view (paginated, server-side)
  positions: Position[];
  pagination: PaginatedResponse<Position> | null;
  isLoading: boolean;
  error: string | null;
  filters: PositionFilters;
  setSearch: (search: string) => void;
  setScope: (scope: ScopeFilter, view?: ViewMode) => void;
  setSort: (field: SortField, dir: SortDir) => void;
  setPage: (page: number) => void;
  setView: (view: ViewMode) => void;
  resetFilters: () => void;
  refreshTable: () => void;
  deletePosition: (id: string) => Promise<boolean>;
  restorePosition: (id: string) => Promise<boolean>;

  // Tree view (full hierarchy, client-side)
  treePositions: PositionTree[];
  isLoadingTree: boolean;
  treeError: string | null;
  refreshTree: () => void;
}

export function usePositionData(): UsePositionDataReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  // URL search params are the source of truth — refresh / direct URL / copied
  // link all reproduce the same view (search, sort, page, view, scope).
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const [positions, setPositions] = useState<Position[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<Position> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [treePositions, setTreePositions] = useState<PositionTree[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState(true);
  const [treeError, setTreeError] = useState<string | null>(null);

  // Sequence guards: a stale (slower) response must never overwrite the result
  // of a newer request, nor end the loading state of the newer one.
  const tableSeqRef = useRef(0);
  const treeSeqRef = useRef(0);

  const updateUrl = useCallback(
    (patch: Partial<PositionFilters>) => {
      const next = { ...filters, ...patch };
      const params = new URLSearchParams();
      if (next.search) params.set('search', next.search);
      if (next.scope === 'deleted') params.set('scope', 'deleted');
      if (next.sortBy !== 'positionName' || next.sortDirection !== 'asc') {
        params.set('sortBy', next.sortBy);
        params.set('sortDirection', next.sortDirection);
      }
      if (next.page > 1) params.set('page', String(next.page));
      if (next.view === 'tree') params.set('view', 'tree');
      const qs = params.toString();
      router.replace(qs ? `/organization/positions?${qs}` : '/organization/positions', { scroll: false });
    },
    [filters, router],
  );

  // ── Fetch paginated positions (table) ──
  const fetchPositions = useCallback(async (currentFilters: PositionFilters) => {
    const seq = ++tableSeqRef.current;
    try {
      setIsLoading(true);
      setError(null);
      const params: PositionFilterParams = {
        search: currentFilters.search || undefined,
        scope: currentFilters.scope,
        page: currentFilters.page,
        size: currentFilters.size,
        sortBy: currentFilters.sortBy,
        sortDirection: currentFilters.sortDirection,
      };
      const data = await organizationApi.getPositions(params);
      if (seq !== tableSeqRef.current) return; // stale response — drop
      setPositions(data.content);
      setPagination(data);
    } catch {
      if (seq !== tableSeqRef.current) return;
      setError('Gagal memuat data jabatan');
      toast.danger('Gagal memuat data jabatan');
    } finally {
      if (seq === tableSeqRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPositions(filters);
  }, [filters, fetchPositions]);

  // ── Fetch tree (tree view) ──
  const fetchTree = useCallback(async () => {
    const seq = ++treeSeqRef.current;
    setIsLoadingTree(true);
    setTreeError(null);
    try {
      const tree = await organizationApi.fetchPositionTree();
      if (seq !== treeSeqRef.current) return; // stale response — drop
      setTreePositions(tree);
    } catch {
      if (seq !== treeSeqRef.current) return;
      setTreeError('Gagal memuat struktur jabatan');
      toast.danger('Gagal memuat struktur jabatan');
    } finally {
      if (seq === treeSeqRef.current) setIsLoadingTree(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // ── Filter setters (all reset page to 1) ──
  const setSearch = useCallback((search: string) => {
    updateUrl({ search, page: 1 });
  }, [updateUrl]);

  const setScope = useCallback((scope: ScopeFilter, view?: ViewMode) => {
    // One atomic URL update — two separate setters would race on a stale
    // filters closure and drop one of the params.
    updateUrl({ scope, page: 1, ...(view !== undefined ? { view } : {}) });
  }, [updateUrl]);

  const setSort = useCallback((sortBy: SortField, sortDirection: SortDir) => {
    updateUrl({ sortBy, sortDirection, page: 1 });
  }, [updateUrl]);

  const setPage = useCallback((page: number) => {
    updateUrl({ page });
  }, [updateUrl]);

  const setView = useCallback((view: ViewMode) => {
    updateUrl({ view });
  }, [updateUrl]);

  const resetFilters = useCallback(() => {
    updateUrl({ search: '', sortBy: 'positionName', sortDirection: 'asc', page: 1 });
  }, [updateUrl]);

  const refreshTable = useCallback(() => {
    fetchPositions(filters);
  }, [fetchPositions, filters]);

  const refreshTree = useCallback(() => {
    fetchTree();
  }, [fetchTree]);

  // ── Delete ──
  const deletePosition = useCallback(async (id: string): Promise<boolean> => {
    try {
      await organizationApi.deletePosition(id);
      toast.success('Jabatan berhasil dihapus');
      await fetchPositions(filters);
      await fetchTree();
      return true;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Gagal menghapus jabatan'));
      return false;
    }
  }, [fetchPositions, fetchTree, filters]);

  // ── Restore ──
  const restorePosition = useCallback(async (id: string): Promise<boolean> => {
    try {
      await organizationApi.restorePosition(id);
      toast.success('Jabatan berhasil dipulihkan');
      await fetchPositions(filters);
      await fetchTree();
      return true;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Gagal memulihkan jabatan'));
      return false;
    }
  }, [fetchPositions, fetchTree, filters]);

  return {
    positions,
    pagination,
    isLoading,
    error,
    filters,
    setSearch,
    setScope,
    setSort,
    setPage,
    setView,
    resetFilters,
    refreshTable,
    deletePosition,
    restorePosition,
    treePositions,
    isLoadingTree,
    treeError,
    refreshTree,
  };
}
