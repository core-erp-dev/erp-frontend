'use client';

import { useParams } from 'next/navigation';
import { ActivityRequestDetailPage } from '@/modules/kpi/activity/activity-request-detail-page';

export default function ActivityRequestDetailRoute() {
  const params = useParams<{ id: string }>();
  return <ActivityRequestDetailPage id={params.id} />;
}
