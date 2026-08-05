'use client';

import { ActivityWorkspace } from '@/modules/kpi/activity/activity-workspace';

/** Activities > Subordinate — `scope=subordinates&actingPositionId=` (explicit acting Position). */
export default function KpiSubordinateActivitiesPage() {
  return <ActivityWorkspace view="subordinates" />;
}
