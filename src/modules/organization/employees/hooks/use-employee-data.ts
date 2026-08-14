'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@heroui/react';

import { employeeApi, UserFilterParams } from '../services/employee-api';
import { organizationApi } from '@/modules/organization/positions/services/organization-api';
import { CoreUser, UserCreateRequest, UserUpdateRequest, AssignUserPositionRequest, PaginatedResponse } from '../types';
import { PositionTree } from '@/modules/organization/positions/types';
import { extractErrorMessage } from '@/types/api';

export type SortField = 'fullName' | 'nip' | 'createdAt';
export type SortDir = 'asc' | 'desc';
export type ScopeFilter = 'current' | 'deleted';

export interface EmployeeFilters {
  search: string;
  scope: ScopeFilter;
  positionId: string | null;
  sortBy: SortField;
  sortDirection: SortDir;
  page: number; // 1-based (UI)
  size: number;
}

const DEFAULT_FILTERS: EmployeeFilters = {
  search: '',
  scope: 'current',
  positionId: null,
  sortBy: 'fullName',
  sortDirection: 'asc',
  page: 1,
  size: 10,
};

const VALID_SORT_FIELDS: SortField[] = ['fullName', 'nip', 'createdAt'];
const VALID_SORT_DIRS: SortDir[] = ['asc', 'desc'];

/** Parse the URL search params into filters — defaults apply when absent/invalid. */
function parseFilters(searchParams: URLSearchParams): EmployeeFilters {
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

  return {
    search: searchParams.get('search') ?? DEFAULT_FILTERS.search,
    scope: searchParams.get('scope') === 'deleted' ? 'deleted' : 'current',
    positionId: searchParams.get('positionId') || null,
    sortBy,
    sortDirection,
    page,
    size: DEFAULT_FILTERS.size,
  };
}

interface UseEmployeeDataReturn {
  users: CoreUser[];
  positions: PositionTree[];
  isLoading: boolean;
  error: string | null;
  pagination: PaginatedResponse<CoreUser> | null;
  filters: EmployeeFilters;
  setSearch: (search: string) => void;
  setScope: (scope: ScopeFilter) => void;
  setPositionId: (id: string | null) => void;
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const [users, setUsers] = useState<CoreUser[]>([]);
  const [positions, setPositions] = useState<PositionTree[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginatedResponse<CoreUser> | null>(null);

  /**
   * Every dataset-affecting filter lives in the URL search params. Table state
   * changes on the same page use `replace` — refresh/deep-link/copy-URL all
   * reproduce the same table view, and Back never re-visits intermediate
   * filter states.
   */
  const updateUrl = useCallback(
    (patch: Partial<EmployeeFilters>) => {
      const next = { ...filters, ...patch };
      const params = new URLSearchParams();
      if (next.search) params.set('search', next.search);
      if (next.scope === 'deleted') params.set('scope', 'deleted');
      if (next.positionId) params.set('positionId', next.positionId);
      if (next.sortBy !== 'fullName' || next.sortDirection !== 'asc') {
        params.set('sortBy', next.sortBy);
        params.set('sortDirection', next.sortDirection);
      }
      if (next.page > 1) params.set('page', String(next.page));
      const qs = params.toString();
      router.replace(qs ? `/organization/employees?${qs}` : '/organization/employees', { scroll: false });
    },
    [filters, router],
  );

  const fetchUsers = useCallback(async (currentFilters: EmployeeFilters) => {
    try {
      setIsLoading(true);
      setError(null);

      const params: UserFilterParams = {
        search: currentFilters.search || undefined,
        scope: currentFilters.scope,
        page: currentFilters.page,
        size: currentFilters.size,
        sortBy: currentFilters.sortBy,
        sortDirection: currentFilters.sortDirection,
      };

      // Position filter
      if (currentFilters.positionId !== null) {
        params.positionId = currentFilters.positionId;
      }

      const data = await employeeApi.getUsers(params);
      setUsers(data.content);
      setPagination(data);
    } catch {
      setError('Gagal memuat data pegawai');
      toast.danger('Gagal memuat data pegawai');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch users whenever the URL-driven filters change
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
    updateUrl({ search, page: 1 });
  }, [updateUrl]);

  const setScope = useCallback((scope: ScopeFilter) => {
    updateUrl({ scope, page: 1 });
  }, [updateUrl]);

  const setPositionId = useCallback((positionId: string | null) => {
    updateUrl({ positionId, page: 1 });
  }, [updateUrl]);

  const setSort = useCallback((sortBy: SortField, sortDirection: SortDir) => {
    updateUrl({ sortBy, sortDirection, page: 1 });
  }, [updateUrl]);

  const setPage = useCallback((page: number) => {
    updateUrl({ page });
  }, [updateUrl]);

  /** Reset only filter+sort — the active/deleted scope toggle is its own control. */
  const resetFilters = useCallback(() => {
    updateUrl({ search: '', positionId: null, sortBy: 'fullName', sortDirection: 'asc', page: 1 });
  }, [updateUrl]);

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
      toast.success('Pegawai berhasil dihapus', {
        description: 'Pegawai tidak lagi aktif di sistem.',
      });
      await fetchUsers(filters);
      return true;
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Gagal menghapus pegawai'));
      return false;
    }
  };

  const restoreUser = async (id: string): Promise<boolean> => {
    try {
      await employeeApi.restoreUser(id);
      toast.success('Pegawai berhasil dipulihkan', {
        description: 'Data pegawai telah dikembalikan.',
      });
      await fetchUsers(filters);
      return true;
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Gagal memulihkan pegawai'));
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
    error,
    pagination,
    filters,
    setSearch,
    setScope,
    setPositionId,
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
