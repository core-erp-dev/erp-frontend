'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@heroui/react';

import { organizationUnitApi } from '../services/organization-unit-api';
import type { OrganizationUnitResponse, OrganizationUnitFilterParams } from '../types';
import type { PaginatedResponse } from '@/types/api';
import { extractErrorMessage } from '@/types/api';

export type SortField = 'unitName' | 'unitCode' | 'unitType' | 'createdAt' | 'updatedAt';
export type SortDir = 'asc' | 'desc';
export type ScopeFilter = 'current' | 'deleted';
export type ViewMode = 'table' | 'tree';

export interface OrgUnitFilters {
  search: string;
  scope: ScopeFilter;
  type: string | null;
  sortBy: SortField;
  sortDirection: SortDir;
  page: number;
  size: number;
  view: ViewMode;
}

const DEFAULT_FILTERS: OrgUnitFilters = {
  search: '',
  scope: 'current',
  type: null,
  sortBy: 'unitName',
  sortDirection: 'asc',
  page: 1,
  size: 10,
  view: 'table',
};

const VALID_SORT_FIELDS: SortField[] = ['unitName', 'unitCode', 'unitType', 'createdAt', 'updatedAt'];
const VALID_SORT_DIRS: SortDir[] = ['asc', 'desc'];

/** Parse the URL search params into filters — defaults apply when absent/invalid. */
function parseFilters(searchParams: URLSearchParams): OrgUnitFilters {
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
  const typeParam = searchParams.get('type');
  const type = typeParam && typeParam.length > 0 ? typeParam : null;
  const viewParam = searchParams.get('view');

  return {
    search: searchParams.get('search') ?? DEFAULT_FILTERS.search,
    scope: searchParams.get('scope') === 'deleted' ? 'deleted' : 'current',
    type,
    sortBy,
    sortDirection,
    page,
    size: DEFAULT_FILTERS.size,
    view: viewParam === 'tree' ? 'tree' : 'table',
  };
}

interface UseOrgUnitDataReturn {
  // Table view (paginated, server-side)
  units: OrganizationUnitResponse[];
  isLoading: boolean;
  error: string | null;
  pagination: PaginatedResponse<OrganizationUnitResponse> | null;
  filters: OrgUnitFilters;
  setSearch: (search: string) => void;
  setScope: (scope: ScopeFilter, view?: ViewMode) => void;
  setType: (type: string | null) => void;
  setSort: (field: SortField, dir: SortDir) => void;
  setPage: (page: number) => void;
  setView: (view: ViewMode) => void;
  resetFilters: () => void;
  refresh: () => void;
  deleteUnit: (id: string) => Promise<boolean>;
  restoreUnit: (id: string) => Promise<boolean>;

  // Tree view (full hierarchy, client-side)
  treeUnits: OrganizationUnitResponse[];
  isLoadingTree: boolean;
  refreshTree: () => void;
}

export function useOrganizationUnitData(): UseOrgUnitDataReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  // URL search params are the source of truth — refresh/deep-link/copy-URL all
  // reproduce the same view (search, filter, sort, page, view mode, scope).
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const [units, setUnits] = useState<OrganizationUnitResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginatedResponse<OrganizationUnitResponse> | null>(null);

  // ── Tree state (full hierarchy) ──
  const [treeUnits, setTreeUnits] = useState<OrganizationUnitResponse[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState(true);

  const updateUrl = useCallback(
    (patch: Partial<OrgUnitFilters>) => {
      const next = { ...filters, ...patch };
      const params = new URLSearchParams();
      if (next.search) params.set('search', next.search);
      if (next.scope === 'deleted') params.set('scope', 'deleted');
      if (next.type) params.set('type', next.type);
      if (next.sortBy !== 'unitName' || next.sortDirection !== 'asc') {
        params.set('sortBy', next.sortBy);
        params.set('sortDirection', next.sortDirection);
      }
      if (next.page > 1) params.set('page', String(next.page));
      if (next.view === 'tree') params.set('view', 'tree');
      const qs = params.toString();
      router.replace(qs ? `/organization/organization-units?${qs}` : '/organization/organization-units', { scroll: false });
    },
    [filters, router],
  );

  const fetchUnits = useCallback(async (currentFilters: OrgUnitFilters) => {
    try {
      setIsLoading(true);
      setError(null);

      const params: OrganizationUnitFilterParams = {
        search: currentFilters.search || undefined,
        scope: currentFilters.scope,
        page: currentFilters.page,
        size: currentFilters.size,
        sortBy: currentFilters.sortBy,
        sortDirection: currentFilters.sortDirection,
      };

      if (currentFilters.type !== null) {
        params.type = currentFilters.type as OrganizationUnitFilterParams['type'];
      }

      const data = await organizationUnitApi.getFilteredUnits(params);
      setUnits(data.content);
      setPagination(data);
    } catch {
      setError('Gagal memuat data unit organisasi');
      toast.danger('Gagal memuat data unit organisasi');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnits(filters);
  }, [filters, fetchUnits]);

  // ── Fetch tree (tree view) ──
  const fetchTree = useCallback(async () => {
    setIsLoadingTree(true);
    try {
      const tree = await organizationUnitApi.getUnitTree();
      setTreeUnits(tree);
    } catch {
      toast.danger('Gagal memuat hierarki unit organisasi');
    } finally {
      setIsLoadingTree(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // --- Filter setters (all reset page to 1) ---

  const setSearch = useCallback((search: string) => {
    updateUrl({ search, page: 1 });
  }, [updateUrl]);

  const setScope = useCallback((scope: ScopeFilter, view?: ViewMode) => {
    // One atomic URL update — calling two separate setters would issue two
    // router.replace() calls racing on a stale filters closure.
    updateUrl({ scope, page: 1, ...(view !== undefined ? { view } : {}) });
  }, [updateUrl]);

  const setType = useCallback((type: string | null) => {
    updateUrl({ type, page: 1 });
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

  /** Reset only filter+sort — the active/deleted scope toggle is its own control. */
  const resetFilters = useCallback(() => {
    updateUrl({ search: '', type: null, sortBy: 'unitName', sortDirection: 'asc', page: 1 });
  }, [updateUrl]);

  const refresh = useCallback(() => {
    fetchUnits(filters);
  }, [fetchUnits, filters]);

  const refreshTree = useCallback(() => {
    fetchTree();
  }, [fetchTree]);

  // --- CRUD operations ---

  const deleteUnit = async (id: string): Promise<boolean> => {
    try {
      await organizationUnitApi.deleteUnit(id);
      toast.success('Unit organisasi berhasil dihapus');
      await fetchUnits(filters);
      await fetchTree();
      return true;
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Gagal menghapus unit organisasi'));
      return false;
    }
  };

  const restoreUnit = async (id: string): Promise<boolean> => {
    try {
      await organizationUnitApi.restoreUnit(id);
      toast.success('Unit organisasi berhasil dipulihkan');
      await fetchUnits(filters);
      await fetchTree();
      return true;
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Gagal memulihkan unit organisasi'));
      return false;
    }
  };

  return {
    units,
    isLoading,
    error,
    pagination,
    filters,
    setSearch,
    setScope,
    setType,
    setSort,
    setPage,
    setView,
    resetFilters,
    refresh,
    deleteUnit,
    restoreUnit,
    treeUnits,
    isLoadingTree,
    refreshTree,
  };
}
