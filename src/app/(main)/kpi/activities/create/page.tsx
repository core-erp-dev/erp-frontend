'use client';

import { useRouter } from 'next/navigation';
import { ForbiddenAccess } from '@/components/shared/forbidden-access';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { AdminCreateActivityPage } from '@/modules/kpi/admin/admin-create-activity-page';

export default function CreateActivityRoute() {
  const router = useRouter();
  const { hasPerm } = usePermission();

  if (!hasPerm(PERM.KPI_ACTIVITY_MANAGE)) {
    return <ForbiddenAccess />;
  }

  return (
    <AdminCreateActivityPage
      onBack={() => router.back()}
      onSuccess={() => router.replace('/kpi/activities/all')}
    />
  );
}
