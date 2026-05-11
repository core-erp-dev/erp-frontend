import { useState, useEffect, useCallback } from 'react';
import { toast } from '@heroui/react';

import { employeeApi } from '../services/employee-api';
import { organizationApi } from '@/modules/hr/hierarchy/services/organization-api';
import { CoreUser, UserCreateRequest, UserUpdateRequest, AssignUserPositionRequest } from '../types';
import { PositionTree } from '@/modules/hr/hierarchy/types';
import { extractErrorMessage } from '@/types/api';

interface UseEmployeeDataReturn {
  // Data
  users: CoreUser[];
  positions: PositionTree[];
  isLoading: boolean;

  // User CRUD
  fetchUsers: () => Promise<void>;
  createUser: (data: UserCreateRequest) => Promise<boolean>;
  updateUser: (id: string, data: UserUpdateRequest) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;

  // Position assignment
  assignPosition: (data: AssignUserPositionRequest) => Promise<boolean>;
}

export function useEmployeeData(): UseEmployeeDataReturn {
  const [users, setUsers] = useState<CoreUser[]>([]);
  const [positions, setPositions] = useState<PositionTree[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await employeeApi.getUsers();
      setUsers(data);
    } catch (error) {
      toast.danger('Gagal memuat data karyawan');
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPositions = useCallback(async () => {
    try {
      const data = await organizationApi.fetchPositionTree();
      setPositions(data);
    } catch {
      // Positions are supplementary data for the assign modal - fail silently
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
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    assignPosition,
  };
}
