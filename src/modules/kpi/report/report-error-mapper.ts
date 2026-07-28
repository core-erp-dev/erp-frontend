import { extractErrorMessage } from '@/types/api';

/**
 * Report mutation error mapper.
 * Maps known backend error details to user-facing English messages.
 * Never exposes SQL, Java class names, stack traces, or constraint names.
 */
export function mapReportError(error: unknown, fallback: string): string {
  const raw = extractErrorMessage(error, '');

  if (!raw) return fallback;

  const known: Record<string, string> = {
    'Activity not found':
      'The selected activity could not be found or is no longer available.',
    'Activity is not active':
      'The selected activity is no longer active.',
    'Report date must be within the activity period':
      'The report date must be within the activity\'s assigned period.',
    'A pending report already exists for this activity':
      'A pending report already exists for this activity. Submit after it is reviewed.',
    'Photo evidence is required':
      'Photo evidence is required.',
    'Evidence must be an image (JPEG, PNG, or WebP)':
      'Evidence must be a JPEG, PNG, or WebP image.',
    'Report not found':
      'The report could not be found.',
    'Report has already been processed':
      'This report has already been processed.',
    'Cannot review your own report':
      'You cannot review your own report.',
    'Not the designated reviewer':
      'You are not the designated reviewer for this report.',
    'Evidence file not found':
      'The evidence file could not be found on the server.',
    'Parent activity owner is no longer valid':
      'The reviewer could not be determined. Please contact an administrator.',
    'ACCESS_DENIED':
      'You do not have permission to perform this action.',
    'Required multipart part':
      'A required field is missing. Please check your submission.',
    'Malformed JSON':
      'The submitted data is invalid. Please check your entries.',
  };

  for (const [key, message] of Object.entries(known)) {
    if (raw.includes(key)) return message;
  }

  return fallback;
}
