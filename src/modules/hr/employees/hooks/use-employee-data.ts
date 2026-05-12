import { useState, useEffect, useCallback } from 'react';
import { toast } from '@heroui/react';

import { employeeApi } from '../services/employee-api';
import { organizationApi } from '@/modules/hr/hierarchy/services/organization-api';
import { CoreUser, UserCreateRequest, UserUpdateRequest, AssignUserPositionRequest, PaginatedResponse } from '../types';
import { PositionTree } from '@/modules/hr/hierarchy/types';
import { extractErrorMessage } from '@/types/api';

interface UseEmployeeDataReturn {
  users: CoreUser[];
  positions: PositionTree[];
  isLoading: boolean;
  pagination: PaginatedResponse<CoreUser> | null;
  fetchUsers: (page?: number, size?: number, search?: string) => Promise<void>;
  createUser: (data: UserCreateRequest) => Promise<boolean>;
  updateUser: (id: string, data: UserUpdateRequest) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  assignPosition: (data: AssignUserPositionRequest) => Promise<boolean>;
}

export function useEmployeeData(): UseEmployeeDataReturn {
  const [users, setUsers] = useState<CoreUser[]>([]);
  const [positions, setPositions] = useState<PositionTree[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginatedResponse<CoreUser> | null>(null);

  const fetchUsers = useCallback(async (page = 0, size = 10, search?: string) => {
    try {
      setIsLoading(true);
      const data = await employeeApi.getUsers({
        page,
        size,
        search: search || undefined,
      });
      setUsers(data.content);
      setPagination(data);
    } catch (error) {
      toast.danger('Gagal memuat data karyawan');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPositions = useCallback(async () => {
    try {
      const data = await organizationApi.fetchPositionTree();
      setPositions(data);
    } catch {
      // Positions are supplementary data - fail silently
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchPositions();
  }, [fetchUsers, fetchPositions]);

  const createUser = async (data: UserCreateRequest): Promise<boolean> => {
    try {
      await employeeApi.createUser(data);
      toast.success('Karyawan berhasil ditambahkan', {
        description: 'Data karyawan baru berhasil disimpan.',
      });
      await fetchUsers();
      return true;
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Gagal menambahkan karyawan'));
      return false;
    }
  };

  const updateUser = async (id: string, data: UserUpdateRequest): Promise<boolean> => {
    try {
      await employeeApi.updateUser(id, data);
      toast.success('Data karyawan berhasil diperbarui', {
        description: 'Perubahan data karyawan telah disimpan.',
      });
      await fetchUsers();
      return true;
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Gagal memperbarui data karyawan'));
      return false;
    }
  };

  const deleteUser = async (id: string): Promise<boolean> => {
    try {
      await employeeApi.deleteUser(id);
      toast.success('Karyawan berhasil dinonaktifkan', {
        description: 'Karyawan tidak lagi aktif dalam sistem.',
      });
      await fetchUsers();
      return true;
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Gagal menonaktifkan karyawan'));
      return false;
    }
  };

  const assignPosition = async (data: AssignUserPositionRequest): Promise<boolean> => {
    try {
      await employeeApi.assignUserToPosition(data);
      toast.success('Jabatan berhasil ditetapkan', {
        description: 'Karyawan telah berhasil ditempatkan pada jabatan terkait.',
      });
      await fetchUsers();
      return true;
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Gagal menetapkan jabatan karyawan'));
      return false;
    }
  };

  return {
    users,
    positions,
    isLoading,
    pagination,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    assignPosition,
  };
}
