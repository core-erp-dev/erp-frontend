import { useState, useEffect, useCallback } from 'react';
import { toast } from '@heroui/react';

import { kpiTaskApi } from '../services/kpi-task-api';
import {
  KpiTask,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskApprovalRequest,
  TaskFilterParams,
  TaskApprovalResponse,
  PaginatedResponse,
} from '../types';
import { extractErrorMessage } from '@/types/api';

interface UseKpiTaskDataReturn {
  tasks: KpiTask[];
  isLoading: boolean;
  pagination: PaginatedResponse<KpiTask> | null;
  filters: TaskFilterParams;
  setFilters: (filters: TaskFilterParams) => void;
  fetchTasks: (page?: number, size?: number) => Promise<void>;
  createTask: (data: CreateTaskRequest) => Promise<boolean>;
  updateTask: (id: string, data: UpdateTaskRequest) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  approveTask: (id: string, data: TaskApprovalRequest) => Promise<TaskApprovalResponse | null>;
}

export function useKpiTaskData(): UseKpiTaskDataReturn {
  const [tasks, setTasks] = useState<KpiTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginatedResponse<KpiTask> | null>(null);
  const [filters, setFilters] = useState<TaskFilterParams>({});

  const fetchTasks = useCallback(async (page = 0, size = 10) => {
    try {
      setIsLoading(true);
      const data = await kpiTaskApi.getTasks({
        ...filters,
        page,
        size,
      });
      setTasks(data.content);
      setPagination(data);
    } catch {
      toast.danger('Gagal memuat data tugas KPI');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (data: CreateTaskRequest): Promise<boolean> => {
    try {
      await kpiTaskApi.createTask(data);
      toast.success('Tugas KPI berhasil ditambahkan', {
        description: 'Tugas baru telah disimpan ke sistem.',
      });
      await fetchTasks();
      return true;
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Gagal menambahkan tugas KPI'));
      return false;
    }
  };

  const updateTask = async (id: string, data: UpdateTaskRequest): Promise<boolean> => {
    try {
      await kpiTaskApi.updateTask(id, data);
      toast.success('Tugas KPI berhasil diperbarui', {
        description: 'Perubahan tugas telah disimpan.',
      });
      await fetchTasks();
      return true;
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Gagal memperbarui tugas KPI'));
      return false;
    }
  };

  const deleteTask = async (id: string): Promise<boolean> => {
    try {
      const result = await kpiTaskApi.deleteTask(id);
      toast.success('Tugas KPI berhasil dihapus', {
        description: result.deletedChildCount > 0
          ? `${result.deletedChildCount} tugas turunan juga ikut dihapus.`
          : 'Tugas telah dihapus dari sistem.',
      });
      await fetchTasks();
      return true;
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Gagal menghapus tugas KPI'));
      return false;
    }
  };

  const approveTask = async (id: string, data: TaskApprovalRequest): Promise<TaskApprovalResponse | null> => {
    try {
      const result = await kpiTaskApi.approveTask(id, data);
      toast.success(
        data.action === 'APPROVE'
          ? 'Tugas KPI berhasil disetujui'
          : 'Tugas KPI berhasil ditolak',
        {
          description: result.message,
        },
      );
      await fetchTasks();
      return result;
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Gagal memproses persetujuan'));
      return null;
    }
  };

  return {
    tasks,
    isLoading,
    pagination,
    filters,
    setFilters,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    approveTask,
  };
}
