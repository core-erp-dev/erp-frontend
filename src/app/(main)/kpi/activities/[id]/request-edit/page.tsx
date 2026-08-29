'use client';

import { useParams, useRouter } from 'next/navigation';
import { ActivityRequestEditPage } from '@/modules/kpi/activity/activity-request-edit-page';

export default function RequestEditActivityRoute() {
  const router = useRouter();
  const params = useParams();
  return <ActivityRequestEditPage id={params.id as string} onBack={() => router.back()} onSuccess={() => router.replace('/kpi/activities/mine')} />;
}
