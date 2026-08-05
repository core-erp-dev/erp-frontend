/**
 * Acting-Position model for KPI Activity & Reporting V1.
 *
 * The backend contract (ActingPositionValidator, erp-backend @ d06ff13):
 *   - `actingPositionId` is a `core_positions.id` — NEVER a core_user_positions.id;
 *   - the actor must hold an ACTIVE core_user_positions assignment for it;
 *   - the frontend must NEVER guess the primary or first active position.
 *
 * NOTE: the frontend currently has NO self-accessible source for these values
 * (no /users/me endpoint; GET /users/{id}/positions requires user:read). The
 * model, selector contract, and payload helper exist so hierarchy-dependent
 * flows compile against the exact identity contract; the data source remains a
 * documented backend-contract blocker (plan §15.1). Do not wire any UI that
 * would require guessing a position.
 */

/** A validated acting Position for the current user. */
export interface ActingPosition {
  /** `core_positions.id` — THE identity sent as `actingPositionId`. */
  positionId: string;
  positionName: string;
  /** `core_user_positions.id` — the actor's exact active assignment. */
  userPositionId: string;
  userId: string;
  isPrimary: boolean;
}

/**
 * Returns the `core_positions.id` for a selected acting Position, or undefined
 * when none is selected. Hierarchy-dependent payloads must receive this value
 * explicitly — never derive it from the primary/first position.
 */
export function buildActingPositionPayload(pos: ActingPosition | null): string | undefined {
  return pos ? pos.positionId : undefined;
}

/**
 * Selector component contract — implementation is deferred until a
 * responsibility-based position source exists (P1 precondition).
 */
export interface ActingPositionSelectorProps {
  positions: ActingPosition[];
  /** Selected `core_positions.id`. */
  value: string | null;
  onChange: (positionId: string) => void;
  disabled?: boolean;
}
