'use client';

import { useRouter } from 'next/navigation';
import { ActivityRequestPage } from '@/modules/kpi/activity/activity-request-page';

export default function CreateMyActivityRoute() {
  const router = useRouter();
  return <ActivityRequestPage context="mine" onBack={() => router.back()} onSuccess={() => router.replace('/kpi/activities/mine')} />;
}
