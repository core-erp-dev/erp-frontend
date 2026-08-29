'use client';

import { useRouter } from 'next/navigation';
import { ActivityRequestPage } from '@/modules/kpi/activity/activity-request-page';

export default function CreateSubordinateActivityRoute() {
  const router = useRouter();
  return <ActivityRequestPage context="subordinate" onBack={() => router.back()} onSuccess={() => router.replace('/kpi/activities/subordinate')} />;
}
