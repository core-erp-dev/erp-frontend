'use client';
import { useState, useEffect, useCallback } from 'react';
import { toast } from '@heroui/react';

import { employeeApi, UserFilterParams } from '../services/employee-api';
import { organizationApi } from '@/modules/organization/positions/services/organization-api';
import { CoreUser, UserCreateRequest, UserUpdateRequest, AssignUserPositionRequest, PaginatedResponse } from '../types';
import { PositionTree } from '@/modules/organization/positions/types';
import { extractErrorMessage } from '@/types/api';

export type SortField = 'fullName' | 'nip' | 'createdAt';
export type SortDir = 'asc' | 'desc';
export type StatusFilter = 'all' | 'deleted';

export interface EmployeeFilters {
  search: string;
  includeDeleted: boolean;
  jabatanId: number | null;
  sortBy: SortField;
  sortDirection: SortDir;
  page: number; // 1-based (UI)
  size: number;
}

const DEFAULT_FILTERS: EmployeeFilters = {
  search: '',
  includeDeleted: false,
  jabatanId: null,
  sortBy: 'fullName',
  sortDirection: 'asc',
  page: 1,
  size: 10,
};

interface UseEmployeeDataReturn {
  users: CoreUser[];
  positions: PositionTree[];
  isLoading: boolean;
  pagination: PaginatedResponse<CoreUser> | null;
  filters: EmployeeFilters;
  setSearch: (search: string) => void;
  setIncludeDeleted: (include: boolean) => void;
  setJabatanId: (id: number | null) => void;
  setSort: (field: SortField, dir: SortDir) => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
  refresh: () => void;
  createUser: (data: UserCreateRequest) => Promise<boolean>;
  updateUser: (id: string, data: UserUpdateRequest) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  restoreUser: (id: string) => Promise<boolean>;
  assignPosition: (data: AssignUserPositionRequest) => Promise<boolean>;
}

export function useEmployeeData(): UseEmployeeDataReturn {
  const [users, setUsers] = useState<CoreUser[]>([]);
  const [positions, setPositions] = useState<PositionTree[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginatedResponse<CoreUser> | null>(null);
  const [filters, setFilters] = useState<EmployeeFilters>(DEFAULT_FILTERS);

  const fetchUsers = useCallback(async (currentFilters: EmployeeFilters) => {
    try {
      setIsLoading(true);

      const params: UserFilterParams = {
        search: currentFilters.search || undefined,
        page: currentFilters.page - 1, // Convert 1-based UI to 0-based BE
        size: currentFilters.size,
        sortBy: currentFilters.sortBy,
        sortDirection: currentFilters.sortDirection,
      };

      // Include deleted filter
      if (currentFilters.includeDeleted) {
        params.includeDeleted = true;
      }

      // Jabatan filter
      if (currentFilters.jabatanId !== null) {
        params.jabatanId = currentFilters.jabatanId;
      }

      const data = await employeeApi.getUsers(params);
      setUsers(data.content);
      setPagination(data);
    } catch (_error) {
      toast.danger('Failed to load employee data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch users whenever filters change
  useEffect(() => {
    fetchUsers(filters);
  }, [filters, fetchUsers]);

  // Fetch positions tree once on mount
  const fetchPositions = useCallback(async () => {
    try {
      const data = await organizationApi.fetchPositionTree();
      setPositions(data);
    } catch {
      // Positions are supplementary data - fail silently
    }
  }, []);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  // --- Filter setters (all reset page to 1) ---

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }));
  }, []);

  const setIncludeDeleted = useCallback((include: boolean) => {
    setFilters((prev) => ({ ...prev, includeDeleted: include, page: 1 }));
  }, []);

  const setJabatanId = useCallback((jabatanId: number | null) => {
    setFilters((prev) => ({ ...prev, jabatanId, page: 1 }));
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
    fetchUsers(filters);
  }, [fetchUsers, filters]);

  // --- CRUD operations ---

  const createUser = async (data: UserCreateRequest): Promise<boolean> => {
    try {
      await employeeApi.createUser(data);
      toast.success('Employee created successfully', {
        description: 'Employee data saved successfully.',
      });
      await fetchUsers(filters);
      return true;
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Failed to create employee'));
      return false;
    }
  };

  const updateUser = async (id: string, data: UserUpdateRequest): Promise<boolean> => {
    try {
      await employeeApi.updateUser(id, data);
      toast.success('Employee updated successfully', {
        description: 'Employee changes saved.',
      });
      await fetchUsers(filters);
      return true;
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Failed to update employee'));
      return false;
    }
  };

  const deleteUser = async (id: string): Promise<boolean> => {
    try {
      await employeeApi.deleteUser(id);
      toast.success('Employee deleted successfully', {
        description: 'Employee is no longer active in the system.',
      });
      await fetchUsers(filters);
      return true;
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Failed to delete employee'));
      return false;
    }
  };

  const restoreUser = async (id: string): Promise<boolean> => {
    try {
      await employeeApi.restoreUser(id);
      toast.success('Employee restored successfully', {
        description: 'Employee data has been recovered.',
      });
      await fetchUsers(filters);
      return true;
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Failed to restore employee'));
      return false;
    }
  };

  const assignPosition = async (data: AssignUserPositionRequest): Promise<boolean> => {
    try {
      await employeeApi.assignUserToPosition(data);
      toast.success('Position assigned successfully', {
        description: 'Employee has been assigned to the position.',
      });
      await fetchUsers(filters);
      return true;
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Failed to assign employee position'));
      return false;
    }
  };

  return {
    users,
    positions,
    isLoading,
    pagination,
    filters,
    setSearch,
    setIncludeDeleted,
    setJabatanId,
    setSort,
    setPage,
    resetFilters,
    refresh,
    createUser,
    updateUser,
    deleteUser,
    restoreUser,
    assignPosition,
  };
}
