'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, Spinner } from '@heroui/react';
import { ArrowLeft } from '@phosphor-icons/react';
import { ForbiddenAccess } from '@/components/shared/forbidden-access';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { useActivityDetail } from '@/modules/kpi/activity/use-activity-detail';
import { AdminUpdateActivityPage, type AdminActivityAction } from '@/modules/kpi/admin/admin-update-activity-page';

export default function EditActivityRoute() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const { hasPerm } = usePermission();
  const canManage = hasPerm(PERM.KPI_ACTIVITY_MANAGE);
  const actionParam = searchParams.get('action');
  const initialAction: AdminActivityAction = actionParam === 'CANCEL' ? 'CANCEL' : 'UPDATE';
  const { activity, isLoading, error, refresh } = useActivityDetail(id, canManage);

  if (!canManage) return <ForbiddenAccess />;

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner size="md" /></div>;
  }

  if (error || !activity) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content><Alert.Title>{error || 'Aktivitas tidak ditemukan'}</Alert.Title></Alert.Content>
        </Alert>
        <Button variant="secondary" onPress={() => router.back()} className="self-start">
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
      </div>
    );
  }

  const handleSuccess = () => {
    const from = searchParams.get('from');
    // Replace the stale origin entry so the list/detail fetches the updated
    // authoritative activity instead of returning to cached client state.
    if (from === 'detail') router.replace(`/kpi/activities/${id}`);
    else router.replace('/kpi/activities/all');
  };

  return (
    <AdminUpdateActivityPage
      activity={activity}
      initialAction={initialAction}
      onBack={() => router.back()}
      onSuccess={handleSuccess}
      onConflict={() => { void refresh(); }}
    />
  );
}
