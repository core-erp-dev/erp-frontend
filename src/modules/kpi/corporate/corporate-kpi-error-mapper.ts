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
    'Indicator cannot be activated — formula is required':
      'The indicator cannot be activated — configure a formula first.',
    'Indicator cannot be activated — assessment rules are required':
      'The indicator cannot be activated — configure assessment rules first.',
    'Indicator cannot be activated — weight is required':
      'The indicator cannot be activated — set a weight first.',
    'Indicator cannot be activated — target score is required':
      'The indicator cannot be activated — set a target score first.',
    'Indicator cannot be activated — bind the formula variables to the indicator first':
      'The indicator cannot be activated — its formula variables are not bound. Save the indicator to bind them automatically.',
    'Formula references a variable that is not bound to the indicator':
      'The formula references a variable that is not bound to the indicator — save the indicator to bind it automatically.',
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

  // Unknown technical errors: use a safe generic fallback instead of passing raw content
  return fallback;
}
