import { extractErrorMessage } from '@/types/api';

/**
 * Corporate KPI mutation error mapper.
 * Maps known backend error details to user-facing English messages.
 * Backend errors are in English, so safe details pass through.
 */
export function mapKpiError(error: unknown, fallback: string): string {
  const raw = extractErrorMessage(error, '');

  if (!raw) return fallback;

  const known: Record<string, string> = {
    'Corporate KPI code already exists in this year':
      'A Corporate KPI with this code already exists for the selected year.',
    'An INDICATOR must have an ASPECT parent':
      'The selected parent is not a valid Aspect.',
    'An ASPECT must not have a unit or target value':
      'An Aspect cannot have a unit or target value.',
    'ASPECT must not have a parent':
      'An Aspect must be a root node and cannot have a parent.',
    'Parent and child must be in the same year':
      'The Indicator and its parent Aspect must belong to the same year.',
    'An INDICATOR can only become ACTIVE when its parent ASPECT is ACTIVE':
      'An Indicator cannot be activated while its parent Aspect is inactive.',
    'Cannot deactivate ASPECT — it has ACTIVE INDICATOR children':
      'This Aspect cannot be deactivated while it has active Indicators.',
    'Cannot delete — KPI node still has active children':
      'Delete all child Indicators before deleting this Aspect.',
    'Cannot restore — parent KPI is deleted':
      'Restore the parent Aspect before restoring this Indicator.',
    'Corporate KPI not found':
      'The Corporate KPI could not be found.',
    'ACCESS_DENIED':
      'You do not have permission to perform this action.',
  };

  for (const [key, message] of Object.entries(known)) {
    if (raw.includes(key)) return message;
  }

  return raw || fallback;
}
