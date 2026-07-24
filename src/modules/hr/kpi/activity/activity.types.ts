/**
 * KPI Activity — DTOs matching backend contracts (P2.1 read-only).
 * Backend source: KpiActivityResponse.java, KpiActivityChangeRequestResponse.java
 */

/* ── Activity Response ── */

export interface KpiActivityResponse {
  id: string;
  parentId: string | null;
  parentActivityName: string | null;
  corporateKpiId: string;
  corporateKpiName: string;
  corporateKpiCode: string;
  assignedToUserPositionId: string;
  assignedToUserName: string;
  assignedToPositionName: string;
  activityName: string;
  description: string | null;
  unit: string;
  targetValue: number;
  periodYear: number;
  periodMonth: number;
  status: KpiActivityStatus;
  realizedValue: number;
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
}

export type KpiActivityStatus = 'ACTIVE' | 'CANCELLED';

/* ── Activity Change Request Response ── */

export interface KpiActivityChangeRequestResponse {
  id: string;
  requestType: KpiActivityRequestType;
  status: KpiActivityRequestStatus;
  activityId: string | null;
  parentId: string | null;
  parentActivityName: string | null;
  corporateKpiId: string | null;
  corporateKpiName: string | null;
  assignedToUserPositionId: string | null;
  assignedToUserName: string | null;
  activityName: string | null;
  description: string | null;
  unit: string | null;
  targetValue: number | null;
  periodYear: number | null;
  periodMonth: number | null;
  requestedByUser: string;
  requestedByUserName: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type KpiActivityRequestType = 'CREATE' | 'UPDATE' | 'CANCEL';
export type KpiActivityRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/* ── Friendly display labels (English only) ── */

export const ACTIVITY_STATUS_LABEL: Record<KpiActivityStatus, string> = {
  ACTIVE: 'Active',
  CANCELLED: 'Cancelled',
};

export const REQUEST_TYPE_LABEL: Record<KpiActivityRequestType, string> = {
  CREATE: 'Create',
  UPDATE: 'Update',
  CANCEL: 'Cancel',
};

export const REQUEST_STATUS_LABEL: Record<KpiActivityRequestStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

/* ── Badge variant mapping ── */

export const ACTIVITY_STATUS_VARIANT: Record<KpiActivityStatus, 'primary' | 'secondary'> = {
  ACTIVE: 'primary',
  CANCELLED: 'secondary',
};

export const REQUEST_TYPE_VARIANT: Record<KpiActivityRequestType, 'primary' | 'secondary' | 'soft'> = {
  CREATE: 'primary',
  UPDATE: 'secondary',
  CANCEL: 'soft',
};

export const REQUEST_STATUS_VARIANT: Record<KpiActivityRequestStatus, 'primary' | 'secondary' | 'soft'> = {
  PENDING: 'soft',
  APPROVED: 'primary',
  REJECTED: 'secondary',
};
