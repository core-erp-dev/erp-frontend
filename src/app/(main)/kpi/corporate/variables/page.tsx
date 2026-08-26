'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, Chip, Breadcrumbs, BreadcrumbsItem, SearchField, Dropdown, Label } from '@heroui/react';
import type { Selection } from '@heroui/react';
import { Plus, House, ArrowsClockwise, Trash, CheckCircle, FunnelSimple, Check, X } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS, KPI_ROUTES } from '@/modules/kpi/constants';
import { useVariablesData } from '@/modules/kpi/corporate/variables/use-variables-data';
import { VariablesTable } from '@/modules/kpi/corporate/variables/variables-table';
import { VariableFormModal, type VariableFormMode } from '@/modules/kpi/corporate/variables/variable-form-modal';
import { VariableDeleteDialog } from '@/modules/kpi/corporate/variables/variable-delete-dialog';
import type { Variable, CreateVariableRequest, UpdateVariableRequest, VariableSortDirection, VariableSortField } from '@/modules/kpi/corporate/variables/variables.types';

const SORT_OPTIONS: { field: VariableSortField; direction: VariableSortDirection; label: string }[] = [
  { field: 'name', direction: 'asc', label: 'Nama (A-Z)' },
  { field: 'name', direction: 'desc', label: 'Nama (Z-A)' },
  { field: 'code', direction: 'asc', label: 'Kode (A-Z)' },
  { field: 'code', direction: 'desc', label: 'Kode (Z-A)' },
];

export default function KpiCorporateVariablesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPerm } = usePermission();
  const canRead = hasPerm(PERM.CORPORATE_KPI_READ);
  const canManage = hasPerm(PERM.CORPORATE_KPI_MANAGE);

  const viewMode = searchParams.get('scope') === 'deleted' ? 'deleted' : 'current';
  const searchQuery = searchParams.get('search') ?? '';
  const sortBy = searchParams.get('sortBy') === 'code' ? 'code' : 'name';
  const sortDirection = searchParams.get('sortDirection') === 'desc' ? 'desc' : 'asc';
  const sortSelectionKeys = useMemo(() => {
    const index = SORT_OPTIONS.findIndex((option) => option.field === sortBy && option.direction === sortDirection);
    return new Set([String(index >= 0 ? index : 0)]);
  }, [sortBy, sortDirection]);
  const isDefaultSort = sortBy === 'name' && sortDirection === 'asc';
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [modalMode, setModalMode] = useState<VariableFormMode | null>(null);
  const [editVariable, setEditVariable] = useState<Variable | undefined>(undefined);
  const [deleteVariable, setDeleteVariable] = useState<Variable | null>(null);

  const {
    variables, deletedList, isLoading, isLoadingDeleted, error, deletedError,
    fetchList, fetchDeleted, isMutating, createVariable, updateVariable, deleteVariable: removeVariable, restoreVariable,
  } = useVariablesData();

  const updateUrl = useCallback((patch: Partial<{ search: string; scope: 'current' | 'deleted'; sortBy: VariableSortField; sortDirection: VariableSortDirection }>) => {
    const next = { search: searchQuery, scope: viewMode, sortBy, sortDirection, ...patch };
    const params = new URLSearchParams();
    if (next.search) params.set('search', next.search);
    if (next.scope === 'deleted') params.set('scope', 'deleted');
    if (next.sortBy !== 'name' || next.sortDirection !== 'asc') {
      params.set('sortBy', next.sortBy);
      params.set('sortDirection', next.sortDirection);
    }
    const query = params.toString();
    router.replace(query ? `${KPI_ROUTES.corporateVariables}?${query}` : KPI_ROUTES.corporateVariables, { scroll: false });
  }, [router, searchQuery, sortBy, sortDirection, viewMode]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchInput(searchQuery), 0);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput !== searchQuery) updateUrl({ search: searchInput });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput, searchQuery, updateUrl]);

  useEffect(() => {
    if (canRead && viewMode === 'current') void fetchList({ search: searchQuery || undefined, sortBy, sortDirection });
  }, [canRead, fetchList, searchQuery, sortBy, sortDirection, viewMode]);

  useEffect(() => {
    if (canRead && canManage && viewMode === 'deleted') void fetchDeleted(sortBy, sortDirection);
  }, [canRead, canManage, fetchDeleted, sortBy, sortDirection, viewMode]);

  const handleSortSelectionChange = useCallback((selection: Selection) => {
    const selected = selection instanceof Set ? selection : new Set<string>();
    const first = Array.from(selected)[0];
    const option = SORT_OPTIONS[Number(first)];
    if (option) updateUrl({ sortBy: option.field, sortDirection: option.direction });
  }, [updateUrl]);

  const openCreate = useCallback(() => {
    setModalMode('CREATE');
    setEditVariable(undefined);
  }, []);

  const openEdit = useCallback((variable: Variable) => {
    setModalMode('EDIT');
    setEditVariable(variable);
  }, []);

  const closeModal = useCallback(() => {
    setModalMode(null);
    setEditVariable(undefined);
  }, []);

  const handleSubmit = useCallback(
    async (data: CreateVariableRequest | UpdateVariableRequest, id?: string): Promise<boolean> => {
      if (id) {
        const result = await updateVariable(id, data as UpdateVariableRequest);
        if (result) { closeModal(); return true; }
      } else {
        const result = await createVariable(data as CreateVariableRequest);
        if (result) { closeModal(); return true; }
      }
      return false;
    },
    [createVariable, updateVariable, closeModal],
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteVariable) return;
    const ok = await removeVariable(deleteVariable.id);
    if (ok) setDeleteVariable(null);
  }, [deleteVariable, removeVariable]);

  if (!canRead) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Breadcrumbs>
          <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
            <BreadcrumbsItem>KPI</BreadcrumbsItem>
          <BreadcrumbsItem>{KPI_LABELS.corporate}</BreadcrumbsItem>
          <BreadcrumbsItem>{KPI_LABELS.corporateVariables}</BreadcrumbsItem>
        </Breadcrumbs>
        <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.corporateVariables}</h1>
        <Alert status="danger">Akses Ditolak</Alert>
      </div>
    );
  }

  const totalCount = viewMode === 'current' ? variables.length : deletedList.length;

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem>KPI</BreadcrumbsItem>
        <BreadcrumbsItem href={KPI_ROUTES.corporate}>{KPI_LABELS.corporate}</BreadcrumbsItem>
        <BreadcrumbsItem>{KPI_LABELS.corporateVariables}</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.corporateVariables}</h1>
          <Chip size="md" className="pointer-events-none" aria-label={`Total ${totalCount} variabel`}>
            {totalCount}
          </Chip>
        </div>
        <div className="flex items-center gap-2">
          <Button
            isIconOnly
            variant="tertiary"
            onPress={() => viewMode === 'deleted' ? fetchDeleted(sortBy, sortDirection) : fetchList({ search: searchQuery || undefined, sortBy, sortDirection })}
            isDisabled={isLoading || isLoadingDeleted || isMutating}
            aria-label="Muat ulang variabel"
          >
            <ArrowsClockwise className={`h-4 w-4 ${isLoading || isLoadingDeleted ? 'animate-spin' : ''}`} />
          </Button>
          {canManage && viewMode === 'current' && (
            <Button variant="primary" onPress={openCreate}>
              <Plus className="h-4 w-4" />
              Tambah Variabel
            </Button>
          )}
        </div>
      </div>

      {/* Filters row — same pattern as the Corporate KPI page (deleted toggle + search) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dropdown>
            <Button variant="tertiary" aria-label="Urutkan">
              <FunnelSimple className="h-4 w-4" />
              Urutkan
              {!isDefaultSort && (
                <>
                  <span className="mx-0.5 h-4 w-px bg-border" />
                  <Check className="h-4 w-4" />
                </>
              )}
            </Button>
            <Dropdown.Popover>
              <Dropdown.Menu
                selectedKeys={sortSelectionKeys}
                selectionMode="single"
                onSelectionChange={handleSortSelectionChange}
              >
                {SORT_OPTIONS.map((option, index) => (
                  <Dropdown.Item key={index} id={String(index)} textValue={option.label}>
                    <Dropdown.ItemIndicator />
                    <Label>{option.label}</Label>
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
          {!isDefaultSort && (
            <Button isIconOnly variant="tertiary" aria-label="Reset pengurutan" onPress={() => updateUrl({ sortBy: 'name', sortDirection: 'asc' })}>
              <X className="h-4 w-4" />
            </Button>
          )}
          {canManage && (
            <Button
              variant="tertiary"
              aria-label={viewMode === 'deleted' ? 'Tampilkan data aktif' : 'Tampilkan data terhapus'}
              onPress={() => updateUrl({ scope: viewMode === 'deleted' ? 'current' : 'deleted' })}
            >
              {viewMode === 'deleted' ? <CheckCircle className="h-4 w-4" /> : <Trash className="h-4 w-4" />}
              {viewMode === 'deleted' ? 'Aktif' : 'Data Terhapus'}
            </Button>
          )}
        </div>
        <SearchField
          aria-label="Cari variabel"
          value={searchInput}
          onChange={setSearchInput}
          className="w-72"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Cari" />
            <SearchField.ClearButton aria-label="Hapus pencarian" />
          </SearchField.Group>
        </SearchField>
      </div>

      <VariablesTable
        variables={variables}
        deletedList={deletedList}
        viewMode={viewMode}
        searchQuery={searchQuery}
        isLoading={isLoading}
        isLoadingDeleted={isLoadingDeleted}
        error={error}
        deletedError={deletedError}
        onRetry={() => fetchList({ search: searchQuery || undefined, sortBy, sortDirection })}
        onRetryDeleted={() => fetchDeleted(sortBy, sortDirection)}
        onCreate={canManage ? openCreate : undefined}
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? (variable) => setDeleteVariable(variable) : undefined}
        onRestore={canManage ? (variable) => restoreVariable(variable.id) : undefined}
        isMutating={isMutating}
      />

      {/* Create/Edit Modal */}
      {modalMode && (
        <VariableFormModal
          key={`${modalMode}-${editVariable?.id ?? 'new'}`}
          mode={modalMode}
          isOpen={true}
          onClose={closeModal}
          onSubmit={handleSubmit}
          variable={editVariable}
          isSubmitting={isMutating}
        />
      )}

      {/* Delete Confirmation */}
      {deleteVariable && (
        <VariableDeleteDialog
          variable={deleteVariable}
          isOpen={true}
          isPending={isMutating}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteVariable(null)}
        />
      )}
    </div>
  );
}
