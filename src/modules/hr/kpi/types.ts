import { ApiResponse, PaginatedResponse } from '@/types/api';

// ===== Task (KpiJabatanAktivitas) =====

export interface AssignedEmployeeInfo {
  userId: string;
  fullName: string;
  nip: string;
  email: string;
}

export interface KpiTask {
  id: string;
  positionId: string;
  positionName: string;
  positionCode: string;
  parentTaskId: string | null;
  parentTaskName: string | null;
  corporateKpiId: string;
  corporateKpiName: string;
  taskCode: string;
  taskName: string;
  unit: string;  // was 'satuan' — backend sends 'unit'
  annualTarget: number;
  annualRealization: number;
  achievementPercentage: number;
  periodYear: number;
  status: KpiTaskStatus;
  createdBy: string;
  createdByName: string;
  updatedBy: string | null;
  updatedByName: string | null;
  createdAt: string;
  updatedAt: string;
  assignedEmployees: AssignedEmployeeInfo[];
  childTaskCount: number;
}

export type KpiTaskStatus =
  | 'PENDING_TARGET'
  | 'PENDING_ADMIN_APPROVAL'
  | 'ACTIVE'
  | 'REJECTED_BY_ADMIN'
  | 'DELETED';

export const KPI_TASK_STATUS_LABELS: Record<KpiTaskStatus, string> = {
  PENDING_TARGET: 'Menunggu Target',
  PENDING_ADMIN_APPROVAL: 'Menunggu Persetujuan',
  ACTIVE: 'Aktif',
  REJECTED_BY_ADMIN: 'Ditolak',
  DELETED: 'Dihapus',
};

export const KPI_TASK_STATUS_COLORS: Record<KpiTaskStatus, string> = {
  PENDING_TARGET: 'bg-warning/10 text-warning border-warning/20',
  PENDING_ADMIN_APPROVAL: 'bg-info/10 text-info border-info/20',
  ACTIVE: 'bg-success/10 text-success border-success/20',
  REJECTED_BY_ADMIN: 'bg-danger/10 text-danger border-danger/20',
  DELETED: 'bg-muted/10 text-muted-foreground border-muted/20',
};

// ===== Request DTOs =====

export interface CreateTaskRequest {
  positionId: string;
  parentTaskId?: string | null;
  corporateKpiId: string;
  taskName: string;
  annualTarget?: number | null;
  periodYear: number;
}

export interface UpdateTaskRequest {
  taskName?: string;
  annualTarget?: number | null;
  periodYear?: number;
}

export interface TaskApprovalRequest {
  taskId?: string;
  action: 'APPROVE' | 'REJECT';
  rejectReason?: string;
}

export interface TaskFilterParams {
  search?: string;
  status?: KpiTaskStatus;
  positionId?: string;
  periodYear?: number;
  employeeId?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
}

// ===== Response DTOs =====

export interface TaskApprovalResponse {
  taskId: string;
  previousStatus: KpiTaskStatus;
  currentStatus: KpiTaskStatus;
  message: string;
}

export interface TaskDeleteResponse {
  taskId: string;
  deletedChildCount: number;
}

export interface SubordinateTaskResponse {
  taskId: string;
  taskCode: string;
  taskName: string;
  unit: string;  // was 'satuan' — backend sends 'unit'
  positionId: string;
  positionName: string;
  annualTarget: number;
  annualRealization: number;
  achievementPercentage: number;
  status: KpiTaskStatus;
  employeeId: string | null;
  employeeName: string | null;
}

export interface PerformanceSummaryResponse {
  employeeId: string;
  employeeName: string;
  positionName: string;
  tahun?: number;
  totalAssignedTasks: number;
  activeTasks: number;
  completedTasks: number;
  totalTarget: number;
  totalRealization: number;
  achievementPercentage: number;
  totalReportsSubmitted: number;
  totalReportsApproved: number;
  totalReportsPending: number;
  totalReportsRejected: number;
}

// Re-export api types for convenience
export type { ApiResponse, PaginatedResponse };

// ===== Report (KpiIndividuHarian) =====

export type ReportApprovalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PENDING_REVISION';

export const REPORT_STATUS_LABELS: Record<ReportApprovalStatus, string> = {
  PENDING: 'Menunggu',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  PENDING_REVISION: 'Revisi',
};

export const REPORT_STATUS_COLORS: Record<ReportApprovalStatus, string> = {
  PENDING: 'bg-warning/10 text-warning border-warning/20',
  APPROVED: 'bg-success/10 text-success border-success/20',
  REJECTED: 'bg-danger/10 text-danger border-danger/20',
  PENDING_REVISION: 'bg-info/10 text-info border-info/20',
};

export interface KpiReport {
  id: string;
  taskId: string;
  taskName: string;
  taskCode: string;
  positionId: string;
  positionName: string;
  reportDate: string;
  description: string;
  dailyTarget: number;
  dailyRealization: number;
  unit: string;
  evidencePath: string | null;     // was evidenceFilePath
  evidenceUrl: string | null;      // was evidenceFileUrl
  approvalStatus: ReportApprovalStatus;
  isLocked: boolean;
  approverId: string | null;       // was approvedBy
  approverName: string | null;     // was approvedByName
  approvedAt: string | null;
  rejectReason: string | null;
  employeeId: string;              // was reportedBy
  employeeName: string;            // was reportedByName
  employeeNip: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportRequest {
  taskId: string;
  reportDate: string;
  description: string;
  dailyTarget: number;
  dailyRealization: number;
  unit?: string;
}

export interface UpdateReportRequest {
  reportDate?: string;
  description?: string;
  dailyTarget?: number;
  dailyRealization?: number;
  unit?: string;
}

export interface ReportApprovalRequest {
  reportId: string;
  action: 'APPROVE' | 'REJECT';
  rejectReason?: string;
}

export interface ReportAmendRequest {
  reason: string;
}

export interface ReportFilterParams {
  taskId?: string;
  employeeId?: string;
  approvalStatus?: ReportApprovalStatus;
  month?: number;
  year?: number;
  page?: number;
  size?: number;
}

export interface ReportApprovalResponse {
  reportId: string;
  previousStatus: ReportApprovalStatus;
  currentStatus: ReportApprovalStatus;
  message: string;
}

export interface PendingCountResponse {
  pendingReportCount: number;
}

export interface PerformanceFilterParams {
  employeeId?: string;
  year?: number;
}

// ===== Corporate KPI (KpiCorporate) =====

export interface CorporateKpiResponse {
  id: string;
  indicatorCode: string;
  indicatorName: string;
  parentId: string | null;
  parentName: string | null;
  children: CorporateKpiResponse[];
  formulaComponent1: string | null;
  formulaComponent2: string | null;
  formulaComponent3: string | null;
  formulaExpression: string | null;
  achievementValue: number;
  weight: number;
  score: number;
  result: number;
  businessTarget: number;
  periodYear: number;
  linkedTaskCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCorporateKpiRequest {
  indicatorCode: string;
  indicatorName: string;
  parentId?: string | null;
  weight?: number;
  businessTarget?: number;
  periodYear: number;
}

export interface UpdateCorporateKpiRequest {
  indicatorCode?: string;
  indicatorName?: string;
  parentId?: string | null;
  weight?: number;
  businessTarget?: number;
}
