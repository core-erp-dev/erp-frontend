'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@heroui/react';
import { organizationApi, type PositionFilterParams } from '../services/organization-api';
import type { Position, PositionTree } from '../types';
import type { PaginatedResponse } from '@/types/api';
import { extractErrorMessage } from '@/types/api';

export type SortField = 'positionName' | 'positionCode' | 'positionLevel';
export type SortDir = 'asc' | 'desc';
export type ScopeFilter = 'current' | 'deleted';

export interface PositionFilters {
  search: string;
  scope: ScopeFilter;
  sortBy: SortField;
  sortDirection: SortDir;
  page: number; // 1-based
  size: number;
}

const DEFAULT_FILTERS: PositionFilters = {
  search: '',
  scope: 'current',
  sortBy: 'positionName',
  sortDirection: 'asc',
  page: 1,
  size: 10,
};

export interface UsePositionDataReturn {
  // Table view (paginated, server-side)
  positions: Position[];
  pagination: PaginatedResponse<Position> | null;
  isLoading: boolean;
  filters: PositionFilters;
  setSearch: (search: string) => void;
  setScope: (scope: ScopeFilter) => void;
  setSort: (field: SortField, dir: SortDir) => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
  refreshTable: () => void;
  deletePosition: (id: string) => Promise<boolean>;
  restorePosition: (id: string) => Promise<boolean>;

  // Tree view (full hierarchy, client-side)
  treePositions: PositionTree[];
  isLoadingTree: boolean;
  refreshTree: () => void;
}

export function usePositionData(): UsePositionDataReturn {
  // ── Table state (server-side paginated) ──
  const [positions, setPositions] = useState<Position[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<Position> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<PositionFilters>(DEFAULT_FILTERS);

  // ── Tree state (full hierarchy) ──
  const [treePositions, setTreePositions] = useState<PositionTree[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState(true);

  // ── Fetch paginated positions (table) ──
  const fetchPositions = useCallback(async (currentFilters: PositionFilters) => {
    setIsLoading(true);
    try {
      const params: PositionFilterParams = {
        search: currentFilters.search || undefined,
        scope: currentFilters.scope,
        page: currentFilters.page,
        size: currentFilters.size,
        sortBy: currentFilters.sortBy,
        sortDirection: currentFilters.sortDirection,
      };
      const data = await organizationApi.getPositions(params);
      setPositions(data.content);
      setPagination(data);
    } catch {
      toast.danger('Failed to load position data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPositions(filters);
  }, [filters, fetchPositions]);

  // ── Fetch tree (tree view) ──
  const fetchTree = useCallback(async () => {
    setIsLoadingTree(true);
    try {
      const tree = await organizationApi.fetchPositionTree();
      setTreePositions(tree);
    } catch {
      toast.danger('Failed to load position structure');
    } finally {
      setIsLoadingTree(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // ── Filter setters (reset page to 1) ──
  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }));
  }, []);

  const setScope = useCallback((scope: ScopeFilter) => {
    setFilters((prev) => ({ ...prev, scope, page: 1 }));
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
      toast.success('Position deleted successfully');
      await fetchPositions(filters);
      await fetchTree();
      return true;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Failed to delete position'));
      return false;
    }
  }, [fetchPositions, fetchTree, filters]);

  // ── Restore ──
  const restorePosition = useCallback(async (id: string): Promise<boolean> => {
    try {
      await organizationApi.restorePosition(id);
      toast.success('Position restored successfully');
      await fetchPositions(filters);
      await fetchTree();
      return true;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Failed to restore position'));
      return false;
    }
  }, [fetchPositions, fetchTree, filters]);

  return {
    positions,
    pagination,
    isLoading,
    filters,
    setSearch,
    setScope,
    setSort,
    setPage,
    resetFilters,
    refreshTable,
    deletePosition,
    restorePosition,
    treePositions,
    isLoadingTree,
    refreshTree,
  };
}
