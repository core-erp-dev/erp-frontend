import { api } from '@/lib/axios';
import {
  KpiTask,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskApprovalRequest,
  TaskFilterParams,
  TaskApprovalResponse,
  TaskDeleteResponse,
  ApiResponse,
  PaginatedResponse,
} from '../types';

export const kpiTaskApi = {
  getTasks: async (params?: TaskFilterParams): Promise<PaginatedResponse<KpiTask>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<KpiTask>>>(
      '/api/v1/kpi/tasks',
      { params },
    );
    return response.data.data;
  },

  getTaskById: async (id: string): Promise<KpiTask> => {
    const response = await api.get<ApiResponse<KpiTask>>(
      `/api/v1/kpi/tasks/${id}`,
    );
    return response.data.data;
  },

  createTask: async (data: CreateTaskRequest): Promise<KpiTask> => {
    const response = await api.post<ApiResponse<KpiTask>>(
      '/api/v1/kpi/tasks',
      data,
    );
    return response.data.data;
  },

  updateTask: async (id: string, data: UpdateTaskRequest): Promise<KpiTask> => {
    const response = await api.put<ApiResponse<KpiTask>>(
      `/api/v1/kpi/tasks/${id}`,
      data,
    );
    return response.data.data;
  },

  deleteTask: async (id: string): Promise<TaskDeleteResponse> => {
    const response = await api.delete<ApiResponse<TaskDeleteResponse>>(
      `/api/v1/kpi/tasks/${id}`,
    );
    return response.data.data;
  },

  approveTask: async (id: string, data: TaskApprovalRequest): Promise<TaskApprovalResponse> => {
    const response = await api.put<ApiResponse<TaskApprovalResponse>>(
      `/api/v1/kpi/tasks/${id}/approval`,
      data,
    );
    return response.data.data;
  },

  getSubordinateTasks: async (id: string): Promise<any[]> => {
    const response = await api.get<ApiResponse<any[]>>(
      `/api/v1/kpi/tasks/${id}/subordinates`,
    );
    return response.data.data;
  },
};
