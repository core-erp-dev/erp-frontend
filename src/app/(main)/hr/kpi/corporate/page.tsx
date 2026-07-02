'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ArrowsClockwise, Info } from '@phosphor-icons/react';
import { Button, Skeleton, Select, ListBox } from '@heroui/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { CorporateKpiTree } from '@/modules/hr/kpi/components/corporate-kpi-tree';
import { CorporateKpiFormModal } from '@/modules/hr/kpi/components/corporate-kpi-form-modal';
import { CorporateKpiDeleteDialog } from '@/modules/hr/kpi/components/corporate-kpi-delete-dialog';
import { useCorporateKpiData } from '@/modules/hr/kpi/hooks/use-corporate-kpi-data';
import { useCorporateKpiForm } from '@/modules/hr/kpi/hooks/use-corporate-kpi-form';
import type {
  CorporateKpiResponse,
  CreateCorporateKpiRequest,
  UpdateCorporateKpiRequest,
} from '@/modules/hr/kpi/types';
import { toast } from '@heroui/react';

const YEAR_OPTIONS = [2024, 2025, 2026, 2027];

export default function CorporateKpiPage() {
  const router = useRouter();
  const { hasPerm } = usePermission();

  const canView = hasPerm(PERM.KPI_READ);
  const canEdit = hasPerm(PERM.KPI_UPDATE);

  useEffect(() => {
    if (!canView) {
      router.replace('/hr');
    }
  }, [canView, router]);

  if (!canView) {
    return null;
  }

  return <CorporateKpiContent canEdit={canEdit} />;
}

function CorporateKpiContent({ canEdit }: { canEdit: boolean }) {
  // Delete dialog state (managed locally, not in form hook)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingKpi, setDeletingKpi] = useState<CorporateKpiResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    tree,
    flatList,
    isLoading,
    selectedYear,
    setSelectedYear,
    fetchTree,
    createKpi,
    updateKpi,
    deleteKpi,
  } = useCorporateKpiData();

  const {
    isOpen: isFormOpen,
    mode: formMode,
    formData,
    errors,
    isSubmitting,
    editingId,
    openCreate,
    openEdit,
    close: closeForm,
    submit: submitForm,
  } = useCorporateKpiForm();

  // Find the full KPI object for the one being edited
  const editingKpi = editingId
    ? flatList.find((k) => k.id === editingId) ?? null
    : null;

  const handleRefresh = useCallback(() => {
    fetchTree();
  }, [fetchTree]);

  const handleDeleteOpen = useCallback((kpi: CorporateKpiResponse) => {
    setDeletingKpi(kpi);
    setIsDeleteOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingKpi) return;
    setIsDeleting(true);
    try {
      await deleteKpi(deletingKpi.id);
      setIsDeleteOpen(false);
      setDeletingKpi(null);
    } catch {
      toast.danger('Gagal menghapus KPI Indikator');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingKpi, deleteKpi]);

  const handleDeleteClose = useCallback(() => {
    setIsDeleteOpen(false);
    setDeletingKpi(null);
  }, []);

  const handleFormSubmit = useCallback(
    async (data: CreateCorporateKpiRequest | UpdateCorporateKpiRequest) => {
      if (formMode === 'create') {
        await createKpi(data as CreateCorporateKpiRequest);
      } else if (editingId) {
        await updateKpi(editingId, data as UpdateCorporateKpiRequest);
      }
    },
    [formMode, editingId, createKpi, updateKpi],
  );

  return (
    <div className="flex w-full flex-col gap-6">
      {/* RBAC banner for read-only users */}
      {!canEdit && (
        <div className="flex items-center gap-3 rounded-lg border border-info/30 bg-info/5 px-4 py-3">
          <Info className="h-5 w-5 text-info flex-shrink-0" />
          <div className="text-sm">
            <span className="font-medium text-info">Mode hanya baca</span>
            <span className="text-muted-foreground">
              {' '}
              — Anda tidak memiliki izin untuk mengubah data KPI Korporat.
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-foreground">KPI Korporat</h1>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Select
              className="w-32"
              selectedKey={String(selectedYear)}
              onSelectionChange={(key) => setSelectedYear(Number(key))}
              aria-label="Pilih tahun"
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {YEAR_OPTIONS.map((y) => (
                    <ListBox.Item key={y} id={String(y)} textValue={String(y)}>
                      {y}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              variant="tertiary"
              onPress={handleRefresh}
              isDisabled={isLoading}
              aria-label="Muat ulang data"
            >
              <ArrowsClockwise className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            {canEdit && (
              <Button variant="primary" onPress={() => openCreate()}>
                <Plus className="h-4 w-4" />
                Tambah KPI
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tree */}
      {isLoading ? (
        <div className="rounded-lg border border-border bg-background overflow-hidden">
          {/* Skeleton header */}
          <div className="flex items-center border-b border-border bg-muted/50 px-2">
            <div className="w-10 flex-shrink-0" />
            <span className="w-36 flex-shrink-0 px-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Kode</span>
            <span className="flex-1 min-w-0 px-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Indikator</span>
            <div className="flex items-center gap-0 flex-shrink-0">
              <span className="w-20 text-right px-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Bobot</span>
              <span className="w-20 text-right px-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Capaian</span>
              <span className="w-20 text-right px-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Skor</span>
              <span className="w-20 text-right px-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Hasil</span>
            </div>
          </div>
          {/* Skeleton rows */}
          {[100, 80, 60].map((width, i) => (
            <div key={i} className="flex items-center border-b border-border/50 px-2 py-2.5">
              <div className="w-10 flex-shrink-0 flex justify-center">
                <Skeleton className="h-4 w-4 rounded" />
              </div>
              <div className="w-36 flex-shrink-0 px-2">
                <Skeleton className={`h-4 rounded`} style={{ width: `${width}px` }} />
              </div>
              <div className="flex-1 min-w-0 px-2">
                <Skeleton className="h-4 rounded" style={{ width: `${width + 80}px` }} />
              </div>
              <div className="flex items-center gap-0 flex-shrink-0">
                <div className="w-20 px-2 flex justify-end"><Skeleton className="h-4 w-10 rounded" /></div>
                <div className="w-20 px-2 flex justify-end"><Skeleton className="h-4 w-12 rounded" /></div>
                <div className="w-20 px-2 flex justify-end"><Skeleton className="h-4 w-10 rounded" /></div>
                <div className="w-20 px-2 flex justify-end"><Skeleton className="h-4 w-12 rounded" /></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <CorporateKpiTree
          data={tree}
          onEdit={openEdit}
          onDelete={handleDeleteOpen}
          canEdit={canEdit}
        />
      )}

      {/* Form Modal */}
      <CorporateKpiFormModal
        isOpen={isFormOpen}
        onClose={closeForm}
        onSubmit={handleFormSubmit}
        mode={formMode}
        initialData={editingKpi ?? undefined}
        parentOptions={flatList}
        currentYear={selectedYear}
      />

      {/* Delete Dialog */}
      <CorporateKpiDeleteDialog
        isOpen={isDeleteOpen}
        onClose={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
        kpi={deletingKpi}
      />
    </div>
  );
}
