import { extractErrorMessage } from '@/types/api';

/**
 * Variables mutation error mapper — backend error details are English, so
 * known details map to friendlier messages and unknown details fall back.
 */
export function mapVariableError(error: unknown, fallback: string): string {
  const raw = extractErrorMessage(error, '');

  if (!raw) return fallback;

  const known: Record<string, string> = {
    'Corporate KPI variable code already exists':
      'A variable with this code already exists. Codes are reserved permanently, including deleted variables.',
    'Variable code must match ^[A-Z][A-Z0-9_]*$':
      'Code must start with an uppercase letter and contain only uppercase letters, digits, and underscores.',
    'Corporate KPI variable not found':
      'The variable could not be found.',
    'Cannot delete — variable is still referenced by an active indicator':
      'This variable is still bound to an active indicator and cannot be deleted. Unlink it first.',
    'ACCESS_DENIED':
      'You do not have permission to perform this action.',
  };

  for (const [key, message] of Object.entries(known)) {
    if (raw.includes(key)) return message;
  }

  return fallback;
}
