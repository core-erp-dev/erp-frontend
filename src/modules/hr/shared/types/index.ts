export type { ApiResponse, ApiErrorResponse, PaginatedResponse } from '@/types/api';
export { extractErrorMessage } from '@/types/api';

export interface AssignPositionData {
  userId: string;
  positionId: number;
  startDate: string;
  isPrimary: boolean;
}
