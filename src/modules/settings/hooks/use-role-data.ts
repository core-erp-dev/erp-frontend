'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@heroui/react';
import { roleApi } from '../services/role-api';
import type { Role, RoleFilterParams } from '../types';
import type { PaginatedResponse } from '@/types/api';
import { extractErrorMessage } from '@/types/api';

export type SortField = 'roleCode' | 'roleName' | 'createdAt';
export type SortDir = 'asc' | 'desc';
export type ScopeFilter = 'current' | 'deleted';

export interface RoleFilters {
  search: string;
  scope: ScopeFilter;
  sortBy: SortField;
  sortDirection: SortDir;
  page: number; // 1-based (UI)
  size: number;
}

const DEFAULT_FILTERS: RoleFilters = {
  search: '',
  scope: 'current',
  sortBy: 'roleName',
  sortDirection: 'asc',
  page: 1,
  size: 10,
};

interface UseRoleDataReturn {
  roles: Role[];
  isLoading: boolean;
  pagination: PaginatedResponse<Role> | null;
  filters: RoleFilters;
  setSearch: (search: string) => void;
  setScope: (scope: ScopeFilter) => void;
  setSort: (field: SortField, dir: SortDir) => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
  refresh: () => void;
  deleteRole: (id: number) => Promise<boolean>;
  restoreRole: (id: number) => Promise<boolean>;
}

export function useRoleData(): UseRoleDataReturn {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginatedResponse<Role> | null>(null);
  const [filters, setFilters] = useState<RoleFilters>(DEFAULT_FILTERS);

  const fetchRoles = useCallback(async (currentFilters: RoleFilters) => {
    try {
      setIsLoading(true);

      const params: RoleFilterParams = {
        search: currentFilters.search || undefined,
        scope: currentFilters.scope,
        sortBy: currentFilters.sortBy,
        sortDirection: currentFilters.sortDirection,
        page: currentFilters.page - 1, // Convert 1-based UI to 0-based BE
        size: currentFilters.size,
      };

      const data = await roleApi.getRoles(params);
      setRoles(data.content);
      setPagination(data);
    } catch (_error) {
      toast.danger('Failed to load role data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch roles whenever filters change
  useEffect(() => {
    fetchRoles(filters);
  }, [filters, fetchRoles]);

  // --- Filter setters (all reset page to 1) ---

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

  const refresh = useCallback(() => {
    fetchRoles(filters);
  }, [fetchRoles, filters]);

  // --- CRUD operations ---

  const deleteRole = useCallback(async (id: number): Promise<boolean> => {
    try {
      await roleApi.deleteRole(id);
      toast.success('Role deleted successfully');
      await fetchRoles(filters);
      return true;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Failed to delete role'));
      return false;
    }
  }, [fetchRoles, filters]);

  const restoreRole = useCallback(async (id: number): Promise<boolean> => {
    try {
      await roleApi.restoreRole(id);
      toast.success('Role restored successfully');
      await fetchRoles(filters);
      return true;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Failed to restore role'));
      return false;
    }
  }, [fetchRoles, filters]);

  return {
    roles,
    isLoading,
    pagination,
    filters,
    setSearch,
    setScope,
    setSort,
    setPage,
    resetFilters,
    refresh,
    deleteRole,
    restoreRole,
  };
}
