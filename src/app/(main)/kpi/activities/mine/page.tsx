'use client';

import { ActivityWorkspace } from '@/modules/kpi/activity/activity-workspace';

/** Activities > My Activities — `scope=mine` (default redirect target). */
export default function KpiMyActivitiesPage() {
  return <ActivityWorkspace view="my-activities" />;
}
