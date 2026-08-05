'use client';

import { ActivityWorkspace } from '@/modules/kpi/activity/activity-workspace';

/** Activities > My Request — `requests?scope=mine` (submitted-request history). */
export default function KpiMyActivityRequestsPage() {
  return <ActivityWorkspace view="my-requests" />;
}
