/**
 * KPI Report — DTOs matching backend contracts.
 * Backend source: KpiReportResponse.java, KpiReportStatus.java,
 * SubmitReportRequest.java, RejectReportRequest.java
 */

/* ── Report Status ── */

export type KpiReportStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export const REPORT_STATUS_LABEL: Record<KpiReportStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export const REPORT_STATUS_VARIANT: Record<KpiReportStatus, 'primary' | 'secondary' | 'soft'> = {
  PENDING: 'soft',
  APPROVED: 'primary',
  REJECTED: 'secondary',
};

/* ── Response DTO ── */

export interface KpiReportResponse {
  id: string;
  activityId: string;
  activityName: string;
  unit: string;
  activityTargetValue: number;
  submittedByUserPositionId: string;
  submittedByUserName: string;
  submittedByPositionName: string;
  reviewerUserPositionId: string;
  reviewerUserName: string;
  reviewerPositionName: string;
  reportDate: string;
  executionDescription: string;
  realizedValue: number;
  note: string | null;
  status: KpiReportStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  evidenceOriginalFilename: string;
  evidenceContentType: string;
  evidenceFileSize: number;
  createdAt: string;
  updatedAt: string;
}

/* ── Request DTOs ── */

export interface SubmitReportPayload {
  activityId: string;
  reportDate: string;
  executionDescription: string;
  realizedValue: number;
  note?: string;
}

export interface RejectReportPayload {
  rejectionReason: string;
}
