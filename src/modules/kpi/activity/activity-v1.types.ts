/**
 * KPI Activity — V1 contract types (erp-backend @ d06ff13).
 *
 * Response types mirror KpiActivityResponse / KpiActivityChangeRequestResponse
 * exactly (no `version` field is exposed by the backend).
 * Request types are PRECISE DISCRIMINATED UNIONS:
 *   - root vs child create (different required/forbidden fields);
 *   - UPDATE vs CANCEL change requests;
 *   - APPROVE vs REJECT decisions.
 * Forbidden fields are typed `never` so they cannot be serialized by callers —
 * the backend `@Null` omission discipline becomes a compile-time guarantee.
 */

/* ── Response types ── */

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

export interface KpiActivityChangeRequestResponse {
  id: string;
  requestType: KpiActivityRequestType;
  status: KpiActivityRequestStatus;
  /** Null while PENDING; set on CREATE approval. */
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
  /** V1 stored assigned approver (identity that may decide the request). */
  approverUserId: string | null;
  approverUserName: string | null;
  /** UUID only — the backend exposes no reviewedByUserName. */
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  /** Non-null only for CANCEL requests. */
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type KpiActivityRequestType = 'CREATE' | 'UPDATE' | 'CANCEL';
export type KpiActivityRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/* ── Assignable assignee (T3) ── */

export interface AssignableUserPositionResponse {
  userPositionId: string;
  userId: string;
  userFullName: string;
  positionId: string;
  positionName: string;
  isPrimary: boolean;
  /** True only for the requester's own acting UserPosition (root selector). */
  isSelf: boolean;
}

/* ── Create (T4) — root vs child discriminated ── */

interface CreateActivityBase {
  /** `core_user_positions.id` of the assignee. */
  assignedToUserPositionId: string;
  /** `core_positions.id` — the actor's explicit acting Position (required). */
  actingPositionId: string;
  activityName: string;
  description?: string;
  unit: string;
  targetValue: number;
}

/** Root create: indicator + period required; `parentId` forbidden. */
export interface CreateRootActivityV1Request extends CreateActivityBase {
  parentId?: never;
  corporateKpiId: string;
  periodYear: number;
  periodMonth: number;
}

/** Child create: `parentId` required; indicator/period inherited (forbidden on the wire). */
export interface CreateChildActivityV1Request extends CreateActivityBase {
  parentId: string;
  corporateKpiId?: never;
  periodYear?: never;
  periodMonth?: never;
}

export type CreateActivityRequest = CreateRootActivityV1Request | CreateChildActivityV1Request;

/* ── Change request (T5) — UPDATE vs CANCEL discriminated ── */

interface ChangeRequestBase {
  /** `core_positions.id` — the actor's explicit acting Position (required). */
  actingPositionId: string;
}

/** UPDATE: mutable fields only; `cancellationReason` forbidden. */
export interface UpdateChangeRequest extends ChangeRequestBase {
  requestType: 'UPDATE';
  activityName: string;
  /** Always sent: current text, null (clear), or new text. */
  description: string | null;
  unit: string;
  targetValue: number;
  cancellationReason?: never;
}

/** CANCEL: reason only; proposal fields forbidden. */
export interface CancelChangeRequest extends ChangeRequestBase {
  requestType: 'CANCEL';
  cancellationReason: string;
  activityName?: never;
  description?: never;
  unit?: never;
  targetValue?: never;
}

export type ChangeRequestRequest = UpdateChangeRequest | CancelChangeRequest;

/* ── Decision (T8) — APPROVE vs REJECT discriminated ── */

/** APPROVE never sends `rejectionReason` (backend `@AssertTrue` rule). */
export interface ApproveDecision {
  decision: 'APPROVE';
  rejectionReason?: never;
}

/** REJECT requires a non-blank `rejectionReason` (max 1000). */
export interface RejectDecision {
  decision: 'REJECT';
  rejectionReason: string;
}

export type RequestDecisionRequest = ApproveDecision | RejectDecision;

/* ── Admin (P5) — T9/T10/T11/T18 ── */

/** Administrative Activity create (T10, `kpi_activity:manage`). Root vs child decided by `parentId`. */
export interface AdminCreateActivityRequest {
  assignedToUserPositionId: string;
  parentId?: string;
  corporateKpiId?: string;
  periodYear?: number;
  periodMonth?: number;
  activityName: string;
  description?: string;
  unit: string;
  targetValue: number;
  /** Mandatory administrative audit reason (≤1000). */
  reason: string;
}

/** Administrative Activity mutation (T11, `kpi_activity:manage`). `expectedVersion` is required by the backend. */
export interface AdminUpdateActivityRequest {
  action: 'UPDATE' | 'REASSIGN' | 'CANCEL';
  /** Mandatory administrative audit reason (≤1000). */
  reason: string;
  /** Required by the backend — no response DTO exposes a version (contract blocker §15.2). */
  expectedVersion: number;
  activityName?: string;
  description?: string;
  unit?: string;
  targetValue?: number;
  assignedToUserPositionId?: string;
}

/** Administrative approver reassignment (T9, `kpi_activity:manage`). */
export interface AdminReassignApproverRequest {
  newApproverUserId: string;
  /** Optional validated position context belonging to the new approver. */
  newApproverUserPositionId?: string;
  /** Mandatory administrative audit reason (≤1000). */
  reason: string;
}

/** Administrative report reviewer reassignment (T18, `kpi_report:manage`). */
export interface AdminReassignReviewerRequest {
  newReviewerUserId: string;
  /** Optional validated position context belonging to the new reviewer. */
  newReviewerUserPositionId?: string;
  /** Mandatory administrative audit reason (≤1000). */
  reason: string;
}

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
