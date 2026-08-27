'use client';

import { useParams } from 'next/navigation';
import { ForbiddenAccess } from '@/components/shared/forbidden-access';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { ActivityDetailPage } from '@/modules/kpi/activity/activity-detail-page';

export default function ActivityDetailRoute() {
  const params = useParams();
  const { hasAnyPerm } = usePermission();

  if (!hasAnyPerm(PERM.KPI_ACTIVITY_READ_ALL, PERM.KPI_ACTIVITY_MANAGE)) {
    return <ForbiddenAccess />;
  }

  return <ActivityDetailPage id={params.id as string} />;
}
