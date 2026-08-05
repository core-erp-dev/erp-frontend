'use client';

import { ActivityWorkspace } from '@/modules/kpi/activity/activity-workspace';

/** Activities > All Activities — `scope=all` (kpi_activity:read_all | manage). */
export default function KpiAllActivitiesPage() {
  return <ActivityWorkspace view="all-activities" />;
}
