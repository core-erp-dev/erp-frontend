/**
 * KPI Report — V1 contract types (erp-backend @ d06ff13).
 *
 * KpiReportResponse: reviewerUserId/reviewerUserName are the CANONICAL
 * reviewer identity (always present); reviewerUserPositionId/reviewerPositionName
 * are optional organisational context (null for positionless reviewers).
 * No evidence path/URL is exposed — only safe metadata.
 */

export type KpiReportStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export const REPORT_STATUS_LABEL: Record<KpiReportStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export const REPORT_STATUS_CHIP_COLOR: Record<KpiReportStatus, 'warning' | 'success' | 'danger'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
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
  /**
   * Reviewer identity — present for hierarchy-assigned reports (child →
   * parent assignee; non-top-level root → unique superior). NULL for
   * top-level root reports, which are reviewed through the centralized
   * company queue (kpi_report:root_review).
   */
  reviewerUserId: string | null;
  reviewerUserName: string | null;
  /** Optional organisational context — null for positionless reviewers. */
  reviewerUserPositionId: string | null;
  reviewerPositionName: string | null;
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
