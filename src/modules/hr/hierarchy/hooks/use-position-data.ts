'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@heroui/react';
import { organizationApi } from '../services/organization-api';
import type { PositionTree } from '../types';
import { extractErrorMessage } from '@/types/api';

export interface PositionFilters {
  search: string;
  page: number;
  size: number;
}

export interface UsePositionDataReturn {
  positions: PositionTree[];
  flatPositions: PositionTree[];
  isLoading: boolean;
  filters: PositionFilters;
  setSearch: (search: string) => void;
  setPage: (page: number) => void;
  refresh: () => void;
  deletePosition: (id: string) => Promise<boolean>;
}

export function usePositionData(): UsePositionDataReturn {
  const [positions, setPositions] = useState<PositionTree[]>([]);
  const [flatPositions, setFlatPositions] = useState<PositionTree[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<PositionFilters>({
    search: '',
    page: 1,
    size: 10,
  });

  const fetchPositions = useCallback(async () => {
    setIsLoading(true);
    try {
      const tree = await organizationApi.fetchPositionTree();
      setPositions(tree);
      setFlatPositions(flattenTree(tree));
    } catch {
      toast.danger('Gagal memuat data jabatan');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPositions(); }, [fetchPositions]);

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const refresh = useCallback(() => {
    fetchPositions();
  }, [fetchPositions]);

  const deletePosition = useCallback(async (id: string): Promise<boolean> => {
    try {
      await organizationApi.deletePosition(id);
      toast.success('Jabatan berhasil dihapus');
      await fetchPositions();
      return true;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Gagal menghapus jabatan'));
      return false;
    }
  }, [fetchPositions]);

  return {
    positions,
    flatPositions,
    isLoading,
    filters,
    setSearch,
    setPage,
    refresh,
    deletePosition,
  };
}

function flattenTree(tree: PositionTree[]): PositionTree[] {
  const result: PositionTree[] = [];
  const walk = (nodes: PositionTree[]) => {
    for (const n of nodes) {
      result.push(n);
      if (n.children.length > 0) walk(n.children);
    }
  };
  walk(tree);
  return result;
}
