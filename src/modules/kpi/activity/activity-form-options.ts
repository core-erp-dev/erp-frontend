import { activityV1Api } from './activity-v1-api';
import type { KpiActivityManageIndicatorOption } from './activity-v1.types';

export interface ActivityFormKpiOptions {
  periodYears: number[];
  indicators: KpiActivityManageIndicatorOption[];
}

/**
 * Loads the canonical KPI options used by every activity form.
 *
 * Activity forms use the responsibility-based submission-options endpoint.
 * It returns only active, bindable KPI references and period years, so users
 * do not need the Corporate KPI structure read permission just to submit work.
 */
export async function loadActivityFormKpiOptions(year?: number): Promise<ActivityFormKpiOptions> {
  const options = await activityV1Api.getSubmissionOptions(year);
  return {
    periodYears: options.periodYears,
    indicators: options.indicators,
  };
}
