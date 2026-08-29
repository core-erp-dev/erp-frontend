'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { ActivityDetailPage } from '@/modules/kpi/activity/activity-detail-page';

export default function ActivityDetailRoute() {
  const params = useParams();
  const searchParams = useSearchParams();
  return (
    <ActivityDetailPage
      id={params.id as string}
      actingPositionId={searchParams.get('actingPositionId') ?? undefined}
    />
  );
}
