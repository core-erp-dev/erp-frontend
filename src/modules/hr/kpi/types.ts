import { ApiResponse, PaginatedResponse } from '@/types/api';

// ============================================================================
// KPI v1 — Corporate KPI
// ============================================================================

export type CorporateKpiStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';

export const CORPORATE_KPI_STATUS_LABELS: Record<CorporateKpiStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Aktif',
  INACTIVE: 'Nonaktif',
};

export interface CorporateKpiResponse {
  id: string;
  indicatorCode: string;
  indicatorName: string;
  unit: string;
  parentId: string | null;
  parentName: string | null;
  children: CorporateKpiResponse[];
  annualTarget: number;
  annualRealization: number;
  achievementPercentage: number;
  targetScore: number;
  actualScore: number;
  periodYear: number;
  status: CorporateKpiStatus;
  deletedAt: string | null;
  linkedTaskCount: number;
  childCount: number;
  leaf: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCorporateKpiRequest {
  indicatorCode: string;
  indicatorName: string;
  parentId?: string | null;
  unit?: string;
  annualTarget?: number;
  targetScore?: number;
  periodYear: number;
}

export interface UpdateCorporateKpiRequest {
  indicatorCode?: string;
  indicatorName?: string;
  parentId?: string | null;
  unit?: string;
  annualTarget?: number;
  targetScore?: number;
  periodYear?: number;
}

// ============================================================================
// KPI v1 — Task
// ============================================================================

export type KpiTaskStatus = 'ACTIVE' | 'CANCELLED' | 'COMPLETED';

export const KPI_TASK_STATUS_LABELS: Record<KpiTaskStatus, string> = {
  ACTIVE: 'Aktif',
  CANCELLED: 'Dibatalkan',
  COMPLETED: 'Selesai',
};

export interface AssignedEmployeeInfo {
  userId: string;
  fullName: string;
  nip: string;
  email: string;
}

export interface KpiTaskResponse {
  id: string;
  assignedToUserPositionId: string;
  assignedUserId: string;
  assignedUserName: string;
  assignedPositionId: string;
  assignedPositionName: string;
  corporateKpiId: string;
  corporateKpiName: string;
  parentTaskId: string | null;
  parentTaskName: string | null;
  taskCode: string;
  taskName: string;
  unit: string;
  target: number;
  directRealization: number;
  childRealization: number;
  totalRealization: number;
  achievementPercentage: number;
  periodYear: number;
  periodMonth: number;
  status: KpiTaskStatus;
  assignedByUserPositionId: string;
  assignedByUserId: string;
  assignedByUserName: string;
  assignedByPositionId: string;
  assignedByPositionName: string;
  childTaskCount: number;
  assignedEmployees: AssignedEmployeeInfo[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskChangeRequest {
  assignedToUserPositionId: string;
  corporateKpiId: string;
  parentTaskId?: string | null;
  taskName: string;
  taskCode?: string;
  unit?: string;
  target?: number;
  periodYear: number;
  periodMonth: number;
}

export interface UpdateTaskChangeRequest {
  taskName?: string;
  taskCode?: string;
  unit?: string;
  target?: number;
  corporateKpiId?: string;
  periodYear?: number;
  periodMonth?: number;
}

export interface DeleteTaskChangeRequest {
  reason: string;
}

export interface TaskFilterParams {
  status?: string;
  positionId?: string;
  periodYear?: number;
  search?: string;
  sortBy?: string;
  sortDirection?: string;
  page?: number;
  size?: number;
}

// ============================================================================
// KPI v1 — Task Change Request (Admin)
// ============================================================================

export type TaskChangeRequestType = 'CREATE' | 'UPDATE' | 'DELETE';

export type TaskChangeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export const CHANGE_REQUEST_STATUS_LABELS: Record<TaskChangeRequestStatus, string> = {
  PENDING: 'Menunggu',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
};

export const CHANGE_REQUEST_TYPE_LABELS: Record<TaskChangeRequestType, string> = {
  CREATE: 'Pembuatan',
  UPDATE: 'Perubahan',
  DELETE: 'Pembatalan',
};

export interface KpiTaskChangeRequestResponse {
  id: string;
  taskId: string | null;
  requestType: TaskChangeRequestType;
  status: TaskChangeRequestStatus;
  previousData: string | null;
  proposedData: string;
  requestedById: string;
  requestedByName: string;
  requestedByUserPositionId: string;
  requestedByUserPositionName: string;
  requestedAt: string;
  reviewedById: string | null;
  reviewedByName: string | null;
  reviewedByUserPositionId: string | null;
  reviewedByUserPositionName: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskChangeApprovalRequest {
  action: 'APPROVE' | 'REJECT';
  reviewNote?: string;
  rejectReason?: string;
}

// ============================================================================
// KPI v1 — Report
// ============================================================================

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

export interface KpiReportResponse {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNip: string;
  reporterUserPositionId: string;
  reporterPositionName: string;
  taskId: string;
  taskName: string;
  taskCode: string;
  positionId: string;
  positionName: string;
  reportDate: string;
  clockTime: string;
  description: string;
  dailyTarget: number;
  dailyRealization: number;
  unit: string;
  evidencePath: string | null;
  evidenceUrl: string | null;
  approvalStatus: ReportApprovalStatus;
  locked: boolean;
  approverId: string | null;
  approverName: string | null;
  approvedByUserPositionId: string | null;
  approvedByUserPositionName: string | null;
  approvedAt: string | null;
  rejectReason: string | null;
  amendedFromId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateKpiReportRequest {
  taskId: string;
  reportDate: string;
  description?: string;
  dailyTarget?: number;
  dailyRealization?: number;
  unit?: string;
}

export interface UpdateKpiReportRequest {
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

export interface KpiReportApprovalResponse {
  reportId: string;
  previousStatus: string;
  currentStatus: string;
  approvedByUserPositionId: string;
  approvedByUserPositionName: string;
  message: string;
}

export interface KpiPendingCountResponse {
  pendingReportCount: number;
  pendingTaskChangeCount: number;
}

export interface ReportFilterParams {
  employeeId?: string;
  taskId?: string;
  approvalStatus?: string;
  month?: number;
  year?: number;
  sortBy?: string;
  sortDirection?: string;
  page?: number;
  size?: number;
}

// ============================================================================
// KPI v1 — Dashboard
// ============================================================================

export interface CorporateKpiSummary {
  id: string;
  indicatorCode: string;
  indicatorName: string;
  achievementPercentage: number;
  actualScore: number;
  targetScore: number;
}

export interface KpiDashboardResponse {
  employeeId: string;
  employeeName: string;
  positionName: string;
  totalAssignedTasks: number;
  activeTasks: number;
  completedTasks: number;
  cancelledTasks: number;
  totalTarget: number;
  totalRealization: number;
  achievementPercentage: number;
  totalReportsSubmitted: number;
  totalReportsApproved: number;
  totalReportsPending: number;
  totalReportsRejected: number;
  corporateKpiSummaries: CorporateKpiSummary[];
}

export interface DashboardFilterParams {
  employeeId?: string;
  year?: number;
}

// ============================================================================
// KPI v1 — Assignable User Positions (P0A)
// ============================================================================

export interface AssignableUserPosition {
  userPositionId: string;
  userId: string;
  userName: string;
  positionId: string;
  positionName: string;
}

// Re-export api types for convenience
export type { ApiResponse, PaginatedResponse };
