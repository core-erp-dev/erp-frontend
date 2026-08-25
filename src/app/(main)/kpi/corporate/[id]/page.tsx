'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Alert, Breadcrumbs, BreadcrumbsItem, Button, Dropdown, Input, Label, Separator, Spinner, TextField } from '@heroui/react';
import { ArrowLeft, DotsThreeVertical, House, PencilSimple, Trash } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { ForbiddenAccess } from '@/components/shared/forbidden-access';
import { KPI_LABELS, KPI_ROUTES } from '@/modules/kpi/constants';
import { corporateKpiApi, extractKpiError } from '@/modules/kpi/corporate/corporate-kpi-api';
import { useCorporateKpiData } from '@/modules/kpi/corporate/use-corporate-kpi-data';
import { LifecycleDialog } from '@/modules/kpi/corporate/corporate-kpi-lifecycle-dialog';
import type { CorporateKpiNode } from '@/modules/kpi/corporate/corporate-kpi.types';

export default function CorporateKpiDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const id = String(params.id);
  const { hasPerm } = usePermission();
  const canRead = hasPerm(PERM.CORPORATE_KPI_READ);
  const canManage = hasPerm(PERM.CORPORATE_KPI_MANAGE);
  const [node, setNode] = useState<CorporateKpiNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { deleteKpi, pendingLifecycle } = useCorporateKpiData();

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try { setNode(await corporateKpiApi.getById(id)); }
    catch (err: unknown) { setError(extractKpiError(err)); }
    finally { setIsLoading(false); }
  }, [id]);

  useEffect(() => { if (canRead) void load(); }, [canRead, load]);
  const handleBack = useCallback(() => {
    if (searchParams.get('from') === 'structure') {
      router.back();
    } else {
      router.replace(KPI_ROUTES.corporate);
    }
  }, [router, searchParams]);
  const handleEdit = useCallback(() => {
    const query = new URLSearchParams({ from: 'detail' });
    if (searchParams.get('from') === 'structure') query.set('return', 'structure');
    router.push(KPI_ROUTES.corporateEditRoute(id, query.toString()));
  }, [id, router, searchParams]);
  const handleDeleteConfirm = useCallback(async () => {
    if (!node) return;
    const success = await deleteKpi(node.id, node.year);
    if (success) {
      setIsDeleteOpen(false);
      router.replace(`${KPI_ROUTES.corporate}?year=${node.year}`);
    }
  }, [deleteKpi, node, router]);
  if (!canRead) return <ForbiddenAccess />;
  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="md" /></div>;
  if (!node) return <div className="flex w-full flex-col gap-4"><Alert status="danger">{error ?? 'KPI Perusahaan tidak ditemukan.'}</Alert><Button variant="secondary" onPress={load}>Coba Lagi</Button></div>;

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs><BreadcrumbsItem href="/" aria-label="Beranda"><House className="h-4 w-4" /></BreadcrumbsItem><BreadcrumbsItem>KPI</BreadcrumbsItem><BreadcrumbsItem href={KPI_ROUTES.corporate}>{KPI_LABELS.corporate}</BreadcrumbsItem><BreadcrumbsItem>Detail</BreadcrumbsItem></Breadcrumbs>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button isIconOnly variant="tertiary" onPress={handleBack} aria-label="Kembali ke Struktur">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Detail KPI Perusahaan</h1>
        </div>
        {canManage && (
          <Dropdown>
            <Button isIconOnly variant="tertiary" aria-label="Opsi KPI Perusahaan">
              <DotsThreeVertical className="h-5 w-5" />
            </Button>
            <Dropdown.Popover>
              <Dropdown.Menu onAction={(key) => {
                if (key === 'edit') handleEdit();
                if (key === 'delete') setIsDeleteOpen(true);
              }}>
                <Dropdown.Item id="edit" textValue="Edit">
                  <div className="flex items-center gap-2">
                    <PencilSimple className="h-4 w-4 text-muted-foreground" />
                    <span>Edit</span>
                  </div>
                </Dropdown.Item>
                <Dropdown.Item id="delete" textValue="Hapus" variant="danger">
                  <div className="flex items-center gap-2 text-danger">
                    <Trash className="h-4 w-4" />
                    <span>Hapus</span>
                  </div>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Informasi KPI</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Kode</Label>
            <Input value={node.code} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Nama KPI</Label>
            <Input value={node.name} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Tipe</Label>
            <Input value={node.nodeType} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Tahun</Label>
            <Input value={String(node.year)} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full sm:col-span-2">
            <Label>Aspect Induk</Label>
            <Input value={node.parentName || '-'} readOnly />
          </TextField>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Konfigurasi Nilai</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Rumus</Label>
            <Input value={node.formula || '-'} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Hasil</Label>
            <Input value={node.formulaResult == null ? '-' : String(node.formulaResult)} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Bobot</Label>
            <Input value={node.weight == null ? '-' : `${node.weight * 100}%`} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Target Nilai</Label>
            <Input value={node.targetScore == null ? '-' : String(node.targetScore)} readOnly />
          </TextField>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Deskripsi</h2>
        <TextField isReadOnly className="pointer-events-none w-full">
          <Label>Deskripsi</Label>
          <Input value={node.description || '-'} readOnly />
        </TextField>
      </div>

      <LifecycleDialog
        isOpen={isDeleteOpen}
        title="Hapus KPI Perusahaan"
        message={<>Hapus <strong>{node.code} — {node.name}</strong>?</>}
        confirmLabel="Hapus"
        variant="danger"
        isPending={pendingLifecycle?.kind === 'node' && pendingLifecycle.type === 'delete' && pendingLifecycle.targetId === node.id}
        onConfirm={() => { void handleDeleteConfirm(); }}
        onCancel={() => setIsDeleteOpen(false)}
      />
    </div>
  );
}
