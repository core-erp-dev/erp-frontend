'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Alert, Breadcrumbs, BreadcrumbsItem, Button, Spinner } from '@heroui/react';
import { ArrowLeft, PencilSimple, House } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { ForbiddenAccess } from '@/components/shared/forbidden-access';
import { KPI_LABELS, KPI_ROUTES } from '@/modules/kpi/constants';
import { corporateKpiApi, extractKpiError } from '@/modules/kpi/corporate/corporate-kpi-api';
import type { CorporateKpiNode } from '@/modules/kpi/corporate/corporate-kpi.types';

export default function CorporateKpiDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id);
  const { hasPerm } = usePermission();
  const canRead = hasPerm(PERM.CORPORATE_KPI_READ);
  const canManage = hasPerm(PERM.CORPORATE_KPI_MANAGE);
  const [node, setNode] = useState<CorporateKpiNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try { setNode(await corporateKpiApi.getById(id)); }
    catch (err: unknown) { setError(extractKpiError(err)); }
    finally { setIsLoading(false); }
  }, [id]);

  useEffect(() => { if (canRead) void load(); }, [canRead, load]);
  if (!canRead) return <ForbiddenAccess />;
  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="md" /></div>;
  if (!node) return <div className="flex w-full flex-col gap-4"><Alert status="danger">{error ?? 'KPI Perusahaan tidak ditemukan.'}</Alert><Button variant="secondary" onPress={load}>Coba Lagi</Button></div>;

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs><BreadcrumbsItem href="/" aria-label="Beranda"><House className="h-4 w-4" /></BreadcrumbsItem><BreadcrumbsItem>KPI</BreadcrumbsItem><BreadcrumbsItem href={KPI_ROUTES.corporate}>{KPI_LABELS.corporate}</BreadcrumbsItem><BreadcrumbsItem>Detail</BreadcrumbsItem></Breadcrumbs>
      <div className="flex items-center justify-between"><div className="flex items-center gap-3"><Button isIconOnly variant="tertiary" onPress={() => router.push(KPI_ROUTES.corporate)} aria-label="Kembali ke Struktur"><ArrowLeft className="h-5 w-5" /></Button><h1 className="text-xl font-semibold text-foreground">Detail KPI Perusahaan</h1></div>{canManage && <Button variant="primary" onPress={() => router.push(KPI_ROUTES.corporateEditRoute(node.id))}><PencilSimple className="h-4 w-4" />Ubah</Button>}</div>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div><dt className="text-sm text-muted-foreground">Kode</dt><dd className="font-medium">{node.code}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Nama KPI</dt><dd className="font-medium">{node.name}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Tipe</dt><dd>{node.nodeType}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Tahun</dt><dd>{node.year}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Bobot</dt><dd>{node.weight == null ? '–' : `${node.weight * 100}%`}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Target Nilai Renbis</dt><dd>{node.targetScore ?? '–'}</dd></div>
        <div className="sm:col-span-2"><dt className="text-sm text-muted-foreground">Deskripsi</dt><dd>{node.description || '–'}</dd></div>
      </dl>
    </div>
  );
}
