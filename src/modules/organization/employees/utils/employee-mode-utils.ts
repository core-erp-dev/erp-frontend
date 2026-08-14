/**
 * Pure helpers for the positioned / positionless employee mode.
 * The form payload must be mutually exclusive:
 * - positioned mode → position assignments only (direct roles are dropped);
 * - positionless mode → empty positions + direct roles (at least one role).
 */

import type { CoreUser, UserPositionInput } from '../types';

/** True when the employee has no active position (positionless mode). */
export function isPositionless(data: Pick<CoreUser, 'positions'> | null | undefined): boolean {
  if (!data) return false;
  return (data.positions ?? []).filter((p) => p.isActive).length === 0;
}

/**
 * Position assignments for the create/update payload:
 * positioned mode → the pending list; positionless mode → empty (deterministic,
 * never leaks hidden state).
 */
export function buildPositionPayload(
  positionless: boolean,
  pendingPositions: UserPositionInput[],
): UserPositionInput[] {
  return positionless ? [] : pendingPositions;
}

/**
 * Direct-role update decision:
 * - positioned mode → always send an empty set (drop stale direct roles);
 * - positionless mode → send the selected roles (never empty — validated by the form).
 * Returns null when no roles update is needed (create in positioned mode: a brand
 * new user has no direct roles to drop).
 */
export function buildRolesUpdate(
  positionless: boolean,
  isEdit: boolean,
  selectedRoleIds: number[],
): { roleIds: number[] } | null {
  if (positionless) return { roleIds: selectedRoleIds };
  return isEdit ? { roleIds: [] } : null;
}
