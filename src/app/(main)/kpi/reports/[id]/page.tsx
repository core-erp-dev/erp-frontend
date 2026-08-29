'use client';

import { useParams } from 'next/navigation';
import { ReportDetailPage } from '@/modules/kpi/report/report-detail-page';

export default function ReportDetailRoute() { const params = useParams<{ id: string }>(); return <ReportDetailPage id={params.id} />; }
