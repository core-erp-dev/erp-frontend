'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@heroui/react';
import { organizationApi, type PositionFilterParams } from '../services/organization-api';
import type { Position, PositionTree } from '../types';
import type { PaginatedResponse } from '@/types/api';
import { extractErrorMessage } from '@/types/api';

export type SortField = 'positionName' | 'positionCode' | 'positionLevel';
export type SortDir = 'asc' | 'desc';

export interface PositionFilters {
  search: string;
  includeDeleted: boolean;
  sortBy: SortField;
  sortDirection: SortDir;
  page: number; // 1-based
  size: number;
}

const DEFAULT_FILTERS: PositionFilters = {
  search: '',
  includeDeleted: false,
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
  setIncludeDeleted: (include: boolean) => void;
  setSort: (field: SortField, dir: SortDir) => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
  refreshTable: () => void;
  deletePosition: (id: string) => Promise<boolean>;

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
        includeDeleted: currentFilters.includeDeleted || undefined,
        page: currentFilters.page - 1, // 1-based UI → 0-based BE
        size: currentFilters.size,
        sortBy: currentFilters.sortBy,
        sortDirection: currentFilters.sortDirection,
      };
      const data = await organizationApi.getPositions(params);
      setPositions(data.content);
      setPagination(data);
    } catch {
      toast.danger('Gagal memuat data jabatan');
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
      toast.danger('Gagal memuat struktur jabatan');
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

  const setIncludeDeleted = useCallback((includeDeleted: boolean) => {
    setFilters((prev) => ({ ...prev, includeDeleted, page: 1 }));
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
      toast.success('Jabatan berhasil dihapus');
      await fetchPositions(filters);
      await fetchTree();
      return true;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Gagal menghapus jabatan'));
      return false;
    }
  }, [fetchPositions, fetchTree, filters]);

  return {
    positions,
    pagination,
    isLoading,
    filters,
    setSearch,
    setIncludeDeleted,
    setSort,
    setPage,
    resetFilters,
    refreshTable,
    deletePosition,
    treePositions,
    isLoadingTree,
    refreshTree,
  };
}
