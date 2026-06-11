import { useState, useEffect, useCallback } from 'react';
import { toast } from '@heroui/react';

import { kpiReportApi } from '../services/report-api';
import { kpiTaskApi } from '../services/task-api';
import {
  KpiReport,
  CreateReportRequest,
  UpdateReportRequest,
  ReportApprovalRequest,
  ReportAmendRequest,
  ReportFilterParams,
  ReportApprovalResponse,
  PendingCountResponse,
  PerformanceSummaryResponse,
  PerformanceFilterParams,
  KpiTask,
  SubordinateTaskResponse,
  PaginatedResponse,
} from '../types';
import { extractErrorMessage } from '@/types/api';

interface UseKpiReportDataReturn {
  reports: KpiReport[];
  isLoading: boolean;
  pagination: PaginatedResponse<KpiReport> | null;
  filters: ReportFilterParams;
  setFilters: (filters: ReportFilterParams) => void;
  fetchReports: (page?: number, size?: number) => Promise<void>;
  createReport: (data: CreateReportRequest, file?: File) => Promise<boolean>;
  updateReport: (id: string, data: UpdateReportRequest, file?: File) => Promise<boolean>;
  approveReport: (id: string, data: ReportApprovalRequest) => Promise<ReportApprovalResponse | null>;
  amendReport: (id: string, data: ReportAmendRequest) => Promise<ReportApprovalResponse | null>;
  getPendingCount: () => Promise<number>;
  getPerformance: (params?: PerformanceFilterParams) => Promise<PerformanceSummaryResponse | null>;
  getTaskDetail: (id: string) => Promise<KpiTask | null>;
  getSubordinateTasks: (taskId: string) => Promise<SubordinateTaskResponse[]>;
}

export function useKpiReportData(): UseKpiReportDataReturn {
  const [reports, setReports] = useState<KpiReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginatedResponse<KpiReport> | null>(null);
  const [filters, setFilters] = useState<ReportFilterParams>({});

  const fetchReports = useCallback(async (page = 0, size = 10) => {
    try {
      setIsLoading(true);
      const data = await kpiReportApi.getReports({ ...filters, page, size });
      setReports(data.content);
      setPagination(data);
    } catch {
      toast.danger('Gagal memuat data laporan');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const createReport = async (data: CreateReportRequest, file?: File): Promise<boolean> => {
    try {
      await kpiReportApi.createReport(data, file);
      toast.success('Laporan berhasil dikirim', {
        description: 'Laporan harian telah disimpan dan menunggu persetujuan.',
      });
      return true;
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Gagal mengirim laporan'));
      return false;
    }
  };

  const updateReport = async (id: string, data: UpdateReportRequest, file?: File): Promise<boolean> => {
    try {
      await kpiReportApi.updateReport(id, data, file);
      toast.success('Laporan berhasil diperbarui');
      return true;
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Gagal memperbarui laporan'));
      return false;
    }
  };

  const approveReport = async (id: string, data: ReportApprovalRequest): Promise<ReportApprovalResponse | null> => {
    try {
      const result = await kpiReportApi.approveReport(id, data);
      toast.success(
        data.action === 'APPROVE' ? 'Laporan berhasil disetujui' : 'Laporan berhasil ditolak',
      );
      return result;
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Gagal memproses persetujuan'));
      return null;
    }
  };

  const amendReport = async (id: string, data: ReportAmendRequest): Promise<ReportApprovalResponse | null> => {
    try {
      const result = await kpiReportApi.amendReport(id, data);
      toast.success('Persetujuan berhasil ditarik kembali');
      return result;
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Gagal menarik persetujuan'));
      return null;
    }
  };

  const getPendingCount = async (): Promise<number> => {
    try {
      const result = await kpiReportApi.getPendingCount();
      return result.pendingReportCount;
    } catch {
      return 0;
    }
  };

  const getPerformance = async (params?: PerformanceFilterParams): Promise<PerformanceSummaryResponse | null> => {
    try {
      return await kpiReportApi.getPerformance(params);
    } catch {
      toast.danger('Gagal memuat ringkasan capaian');
      return null;
    }
  };

  const getTaskDetail = async (id: string): Promise<KpiTask | null> => {
    try {
      return await kpiTaskApi.getTaskById(id);
    } catch {
      toast.danger('Gagal memuat detail tugas');
      return null;
    }
  };

  const getSubordinateTasks = async (taskId: string): Promise<SubordinateTaskResponse[]> => {
    try {
      return await kpiTaskApi.getSubordinateTasks(taskId);
    } catch {
      return [];
    }
  };

  return {
    reports,
    isLoading,
    pagination,
    filters,
    setFilters,
    fetchReports,
    createReport,
    updateReport,
    approveReport,
    amendReport,
    getPendingCount,
    getPerformance,
    getTaskDetail,
    getSubordinateTasks,
  };
}
