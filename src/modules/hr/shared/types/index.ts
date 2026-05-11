/**
 * Shared types used across HR modules (employees & hierarchy).
 * Prevents circular dependencies between submodules.
 */

export type { ApiResponse, ApiErrorResponse } from '@/types/api';
export { extractErrorMessage } from '@/types/api';

/** Common assignment data shape used by both employees and hierarchy modules. */
export interface AssignPositionData {
  userId: string;
  positionId: number;
  startDate: string;
  isPrimary: boolean;
}
