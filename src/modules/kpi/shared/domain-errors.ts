/**
 * Shared domain-error classification for KPI Activity & Reporting V1.
 *
 * Backend failures that represent a *recoverable* state (already processed,
 * version conflict, duplicate pending, wrong stored actor) must surface as a
 * clear banner + data refresh — never a generic unknown-error toast.
 * Messages match `MessageConstants` in erp-backend (verified at d06ff13).
 */

export type RecoverableErrorKind =
  | 'already-processed'
  | 'version-conflict'
  | 'duplicate-pending'
  | 'own-request'
  | 'not-reviewer'
  | 'own-report'
  | 'other';

export interface RecoverableConflict {
  kind: RecoverableErrorKind;
  /** User-facing, safe message. */
  message: string;
  /** True when the UI should refetch the current list/detail after showing it. */
  refetch: boolean;
}

const ACTIVITY_KIND_MAP: ReadonlyArray<readonly [string, RecoverableErrorKind]> = [
  ['Request has already been processed', 'already-processed'],
  ['Activity was modified by another user', 'version-conflict'],
  ['A pending update or cancel request already exists', 'duplicate-pending'],
  ['Cannot approve your own request', 'own-request'],
] as const;

const REPORT_KIND_MAP: ReadonlyArray<readonly [string, RecoverableErrorKind]> = [
  ['Report has already been processed', 'already-processed'],
  ['You are not the designated reviewer', 'not-reviewer'],
  ['Cannot review your own report', 'own-report'],
  ['A pending report already exists', 'duplicate-pending'],
] as const;

const KIND_MESSAGE: Record<RecoverableErrorKind, string> = {
  'already-processed': 'This request has already been processed — showing the latest data.',
  'version-conflict': 'This item was modified by another user — reload and retry.',
  'duplicate-pending': 'A pending request already exists for this item — it must be processed first.',
  'own-request': 'You cannot approve or reject your own request.',
  'not-reviewer': 'You are not the designated reviewer for this report.',
  'own-report': 'You cannot review your own report.',
  'other': 'Something went wrong. Please try again.',
};

function classify(raw: string, map: ReadonlyArray<readonly [string, RecoverableErrorKind]>): RecoverableErrorKind {
  for (const [needle, kind] of map) {
    if (raw.includes(needle)) return kind;
  }
  return 'other';
}

/** Classifies an Activity-request mutation error. */
export function classifyActivityError(raw: string): RecoverableErrorKind {
  return classify(raw, ACTIVITY_KIND_MAP);
}

/** Classifies a Report mutation error. */
export function classifyReportError(raw: string): RecoverableErrorKind {
  return classify(raw, REPORT_KIND_MAP);
}

/** Builds the recoverable-conflict descriptor for a classified kind. */
export function recoverableConflict(kind: RecoverableErrorKind, refetch = true): RecoverableConflict {
  return { kind, message: KIND_MESSAGE[kind], refetch };
}
