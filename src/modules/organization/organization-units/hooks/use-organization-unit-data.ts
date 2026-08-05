'use client';
import { useState, useEffect, useCallback } from 'react';
import { toast } from '@heroui/react';

import { organizationUnitApi } from '../services/organization-unit-api';
import type { OrganizationUnitResponse, OrganizationUnitFilterParams } from '../types';
import type { PaginatedResponse } from '@/types/api';
import { extractErrorMessage } from '@/types/api';

export type SortField = 'unitName' | 'unitCode' | 'unitType' | 'createdAt' | 'updatedAt';
export type SortDir = 'asc' | 'desc';
export type ScopeFilter = 'current' | 'deleted';

export interface OrgUnitFilters {
  search: string;
  scope: ScopeFilter;
  type: string | null;
  sortBy: SortField;
  sortDirection: SortDir;
  page: number;
  size: number;
}

const DEFAULT_FILTERS: OrgUnitFilters = {
  search: '',
  scope: 'current',
  type: null,
  sortBy: 'unitName',
  sortDirection: 'asc',
  page: 1,
  size: 10,
};

interface UseOrgUnitDataReturn {
  // Table view (paginated, server-side)
  units: OrganizationUnitResponse[];
  isLoading: boolean;
  pagination: PaginatedResponse<OrganizationUnitResponse> | null;
  filters: OrgUnitFilters;
  setSearch: (search: string) => void;
  setScope: (scope: ScopeFilter) => void;
  setType: (type: string | null) => void;
  setSort: (field: SortField, dir: SortDir) => void;
  setPage: (page: number) => void;
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
  // ── Table state (server-side paginated) ──
  const [units, setUnits] = useState<OrganizationUnitResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginatedResponse<OrganizationUnitResponse> | null>(null);
  const [filters, setFilters] = useState<OrgUnitFilters>(DEFAULT_FILTERS);

  // ── Tree state (full hierarchy) ──
  const [treeUnits, setTreeUnits] = useState<OrganizationUnitResponse[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState(true);

  const fetchUnits = useCallback(async (currentFilters: OrgUnitFilters) => {
    try {
      setIsLoading(true);

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
      toast.danger('Failed to load organization unit data');
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
      toast.danger('Failed to load organization unit hierarchy');
    } finally {
      setIsLoadingTree(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // --- Filter setters (all reset page to 1) ---

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }));
  }, []);

  const setScope = useCallback((scope: ScopeFilter) => {
    setFilters((prev) => ({ ...prev, scope, page: 1 }));
  }, []);

  const setType = useCallback((type: string | null) => {
    setFilters((prev) => ({ ...prev, type, page: 1 }));
  }, []);

  const setSort = useCallback((sortBy: SortField, sortDirection: SortDir) => {
    setFilters((prev) => ({ ...prev, sortBy, sortDirection, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

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
      toast.success('Organization unit deleted successfully');
      await fetchUnits(filters);
      await fetchTree();
      return true;
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Failed to delete organization unit'));
      return false;
    }
  };

  const restoreUnit = async (id: string): Promise<boolean> => {
    try {
      await organizationUnitApi.restoreUnit(id);
      toast.success('Organization unit restored successfully');
      await fetchUnits(filters);
      await fetchTree();
      return true;
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Failed to restore organization unit'));
      return false;
    }
  };

  return {
    units,
    isLoading,
    pagination,
    filters,
    setSearch,
    setScope,
    setType,
    setSort,
    setPage,
    resetFilters,
    refresh,
    deleteUnit,
    restoreUnit,
    treeUnits,
    isLoadingTree,
    refreshTree,
  };
}
