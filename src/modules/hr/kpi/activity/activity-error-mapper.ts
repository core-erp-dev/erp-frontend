import { extractErrorMessage } from '@/types/api';

/**
 * Activity mutation error mapper (P2.1: read errors only).
 * Maps known backend error details to user-facing English messages.
 * Backend errors are in English, so safe details pass through.
 */
export function mapActivityError(error: unknown, fallback: string): string {
  const raw = extractErrorMessage(error, '');

  if (!raw) return fallback;

  const known: Record<string, string> = {
    'Activity not found':
      'The activity could not be found or is no longer available.',
    'Activity request not found':
      'The request could not be found.',
    'ACCESS_DENIED':
      'You do not have permission to perform this action.',
  };

  for (const [key, message] of Object.entries(known)) {
    if (raw.includes(key)) return message;
  }

  // Unknown technical errors: safe generic fallback
  return fallback;
}
