/**
 * Standard API response wrapper for successful requests.
 * Shared across all modules to avoid duplication.
 */
export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

/**
 * Flexible API error response shape.
 * Supports both message-based and detail-based backend error formats,
 * as different endpoints may return different error structures.
 */
export interface ApiErrorResponse {
  status: number;
  message?: string;
  detail?: string;
  title?: string;
  timestamp?: string;
  data?: null;
}

/**
 * Paginated response wrapper from backend.
 * Used by endpoints that return paginated data (e.g., GET /api/v1/users).
 */
export interface PaginatedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

/**
 * Extracts a human-readable error message from an unknown error.
 * Handles Axios errors (both message and detail formats), API error responses,
 * and generic Error objects.
 */
export function extractErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as {
      response?: {
        data?: {
          message?: string;
          detail?: string;
          title?: string;
        };
      };
    };
    const data = axiosError.response?.data;
    if (data) {
      return (
        data.detail ??
        data.message ??
        data.title ??
        fallbackMessage
      );
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}
