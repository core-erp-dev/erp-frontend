import { extractErrorMessage } from '@/types/api';

/**
 * Activity mutation error mapper.
 * Maps known backend error details to user-facing English messages.
 */
export function mapActivityError(error: unknown, fallback: string): string {
  const raw = extractErrorMessage(error, '');

  if (!raw) return fallback;

  const known: Record<string, string> = {
    'Activity not found':
      'The activity could not be found or is no longer available.',
    'Activity request not found':
      'The request could not be found.',
    'Activity is not active':
      'This activity is no longer active.',
    'Activity period year must match Corporate KPI year':
      'The activity period year must match the Corporate KPI year.',
    'Corporate KPI must be an ACTIVE INDICATOR':
      'The selected Corporate KPI is not valid. It must be an active indicator.',
    'Parent activity is not active':
      'The parent activity is no longer active.',
    'Parent activity owner is no longer valid':
      'The parent activity owner is no longer valid.',
    'User position is inactive or user/position is deleted':
      'The assigned user position is no longer active.',
    'No active position found':
      'You do not have an active position assigned.',
    'Multiple active positions found without a primary':
      'Multiple active positions found. Please set a primary position.',
    'User is not your subordinate':
      'The selected user is not in your reporting line.',
    'Root activity target must occupy an absolute top-level position':
      'Root activities can only be assigned to top-level positions.',
    'Activity target is not a direct subordinate':
      'The selected assignee must be a direct subordinate.',
    'Cannot assign activity to yourself':
      'You cannot assign an activity to yourself.',
    'Activity has no approved CREATE owner record':
      'The activity owner could not be determined.',
    'A pending update or cancel request already exists for this activity':
      'A pending update or cancel request already exists for this activity.',
    'Cannot cancel activity with active child activities':
      'Cannot cancel this activity because it has active child activities. Cancel the children first.',
    'ACCESS_DENIED':
      'You do not have permission to perform this action.',
    'Request has already been processed':
      'This request has already been processed by another approver.',
    'Cannot approve your own request':
      'You cannot approve or reject your own request.',
  };

  for (const [key, message] of Object.entries(known)) {
    if (raw.includes(key)) return message;
  }

  return fallback;
}
