import { redirect } from 'next/navigation';
import { KPI_ROUTES } from '@/modules/kpi/constants';

/**
 * Legacy `/kpi/activities` URL — the workspace is now split into per-view
 * routes. Default redirect to My Activities (the previous default tab).
 */
export default function KpiActivitiesRedirectPage() {
  redirect(KPI_ROUTES.activitiesMine);
}
