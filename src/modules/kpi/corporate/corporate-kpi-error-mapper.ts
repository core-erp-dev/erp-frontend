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
    /* ── Yearly structure lifecycle ── */
    'Corporate KPI structure already exists for this year':
      'A Corporate KPI structure already exists for this year.',
    'Corporate KPI structure still has KPI nodes':
      'This structure cannot be deleted — it still contains KPI nodes.',
    'Corporate KPI structure has no indicators':
      'This structure cannot be activated — it has no indicators yet.',
    'Total weight must be exactly 100% before activating the structure':
      'Total indicator weight must be exactly 100% before activating the structure.',
    'Cannot activate the Corporate KPI structure — indicator':
      'The structure cannot be activated — one or more indicators are incomplete.',
    'Corporate KPI structure must be ACTIVE':
      'The Corporate KPI structure must be ACTIVE before Activities can reference its indicators.',
    'Corporate KPI structure is ACTIVE — deactivate it before changing its configuration':
      'The structure is ACTIVE — deactivate it before changing the KPI configuration.',
    'Corporate KPI structure not found':
      'The Corporate KPI structure could not be found.',
    'Corporate KPI structure is not deleted':
      'This Corporate KPI structure is not deleted.',
    'Cannot restore — the year structure is deleted':
      'Restore the year structure before restoring its KPIs.',
    'No Corporate KPI structure found for the source year':
      'The source year has no Corporate KPI structure to copy from.',
    'Source year must differ from the target year':
      'The source year must be different from the target year.',
    'Corporate KPI code already exists in this year':
      'A Corporate KPI with this code already exists in the selected structure.',
    'Corporate KPI not found':
      'The Corporate KPI could not be found.',
    'An INDICATOR must have an ASPECT parent':
      'The selected parent is not a valid Aspect.',
    'An ASPECT must not have a unit or target value':
      'An Aspect cannot have a unit or target value.',
    'ASPECT must not have a parent':
      'An Aspect must be a root node and cannot have a parent.',
    'Parent and child must belong to the same Corporate KPI structure':
      'The Indicator and its parent Aspect must belong to the same year structure.',
    'An ASPECT must not have formula, assessment rules, weight, or target score':
      'An Aspect cannot carry scoring configuration.',
    'Total weight would exceed 100%':
      'Total indicator weight would exceed 100%.',
    'Formula references a variable that is not bound to the indicator':
      'The formula references a variable that is not bound to the indicator — save the indicator to bind it automatically.',
    'Cannot delete — KPI node still has active children':
      'Delete all child Indicators before deleting this Aspect.',
    'Cannot restore — parent KPI is deleted':
      'Restore the parent Aspect before restoring this Indicator.',
    'ACCESS_DENIED':
      'You do not have permission to perform this action.',
  };

  for (const [key, message] of Object.entries(known)) {
    if (raw.includes(key)) return message;
  }

  // Unknown technical errors: use a safe generic fallback instead of passing raw content
  return fallback;
}
