import { api } from '@/lib/axios';
import { extractErrorMessage } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import type { ActingPosition } from './acting-position';

/**
 * Self-accessible Positions client — `GET /api/v1/users/me/positions`
 * (backend 2a71107). Authentication-only: the endpoint requires NO
 * `user:read` / `position:read` / `position:assign_user` and always resolves
 * the caller from the authenticated principal — never a client-supplied id.
 *
 * Identity contract (critical):
 *   - `positionId` = `core_positions.id`  → the ONLY valid `actingPositionId`;
 *   - `id`         = `core_user_positions.id` (the assignment id) — NEVER sent
 *     as `actingPositionId`.
 *
 * The backend returns only ACTIVE assignments of non-deleted Positions,
 * ordered primary first, then Position name, then assignment id. It never
 * selects a Position on the caller's behalf — neither does this client.
 */

/** Mirrors backend `UserPositionResponse` (authoritative field names). */
export interface MyPositionResponse {
  /** `core_user_positions.id` — the assignment id (NOT a `core_positions.id`). */
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  /** `core_positions.id` — the authoritative acting-Position identity. */
  positionId: string;
  positionName: string;
  positionCode: string;
  startDate: string | null;
  endDate: string | null;
  isPrimary: boolean;
  isActive: boolean;
  assignedBy: string | null;
  createdAt: string;
}

/** T-me — the authenticated user's active Position assignments. */
export async function getMyPositions(): Promise<MyPositionResponse[]> {
  const response = await api.get<ApiResponse<MyPositionResponse[]>>('/api/v1/users/me/positions');
  return response.data.data;
}

/** Maps a backend Position assignment to the acting-Position model. */
export function toActingPosition(item: MyPositionResponse): ActingPosition {
  return {
    /** `core_positions.id` — THE identity sent as `actingPositionId`. */
    positionId: item.positionId,
    positionName: item.positionName,
    /** `core_user_positions.id` — the actor's exact active assignment. */
    userPositionId: item.id,
    userId: item.userId,
    isPrimary: item.isPrimary,
  };
}

/** Maps the full response; never selects a Position implicitly. */
export function toActingPositions(items: MyPositionResponse[]): ActingPosition[] {
  return items.map(toActingPosition);
}

/** Error extractor for the self-Positions call. */
export function extractPositionsError(error: unknown): string {
  return extractErrorMessage(error, 'Failed to load your active positions.');
}
