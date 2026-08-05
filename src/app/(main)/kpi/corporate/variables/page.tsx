'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Alert, Button, Chip, Breadcrumbs, BreadcrumbsItem, SearchField } from '@heroui/react';
import { Plus, House, ArrowsClockwise, Trash, CheckCircle } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS, KPI_ROUTES } from '@/modules/kpi/constants';
import { useVariablesData } from '@/modules/kpi/corporate/variables/use-variables-data';
import { VariablesTable } from '@/modules/kpi/corporate/variables/variables-table';
import { VariableFormModal, type VariableFormMode } from '@/modules/kpi/corporate/variables/variable-form-modal';
import { VariableDeleteDialog } from '@/modules/kpi/corporate/variables/variable-delete-dialog';
import type { Variable, CreateVariableRequest, UpdateVariableRequest } from '@/modules/kpi/corporate/variables/variables.types';

export default function KpiCorporateVariablesPage() {
  const { hasPerm } = usePermission();
  const canRead = hasPerm(PERM.CORPORATE_KPI_READ);
  const canManage = hasPerm(PERM.CORPORATE_KPI_MANAGE);

  const [viewMode, setViewMode] = useState<'current' | 'deleted'>('current');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalMode, setModalMode] = useState<VariableFormMode | null>(null);
  const [editVariable, setEditVariable] = useState<Variable | undefined>(undefined);
  const [deleteVariable, setDeleteVariable] = useState<Variable | null>(null);

  const {
    variables, deletedList, isLoading, isLoadingDeleted, error, deletedError, hasLoadedDeleted,
    fetchList, fetchDeleted, isMutating, createVariable, updateVariable, deleteVariable: removeVariable, restoreVariable,
  } = useVariablesData();

  // Fetch list on mount and when search changes (debounced by caller)
  useEffect(() => {
    if (canRead) fetchList(searchQuery || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead]);

  useEffect(() => {
    if (viewMode === 'deleted' && !hasLoadedDeleted && canManage) {
      fetchDeleted();
    }
  }, [viewMode, hasLoadedDeleted, canManage, fetchDeleted]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    fetchList(query || undefined);
  }, [fetchList]);

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
        <Alert status="danger">Access Denied</Alert>
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
          <Chip size="md" className="pointer-events-none" aria-label={`Total ${totalCount} variables`}>
            {totalCount}
          </Chip>
        </div>
        <div className="flex items-center gap-2">
          <Button
            isIconOnly
            variant="tertiary"
            onPress={() => fetchList(searchQuery || undefined)}
            isDisabled={isLoading}
            aria-label="Refresh"
          >
            <ArrowsClockwise className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {canManage && viewMode === 'current' && (
            <Button variant="primary" onPress={openCreate}>
              <Plus className="h-4 w-4" />
              Add Variable
            </Button>
          )}
        </div>
      </div>

      {/* Filters row — same pattern as the Corporate KPI page (deleted toggle + search) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Deleted scope toggle — Positions-style button */}
          {canManage && (
            <Button
              variant="tertiary"
              aria-label={viewMode === 'deleted' ? 'Show current' : 'Show deleted'}
              onPress={() => setViewMode(viewMode === 'deleted' ? 'current' : 'deleted')}
            >
              {viewMode === 'deleted' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Trash className="h-4 w-4" />
              )}
              {viewMode === 'deleted' ? 'Current' : 'Deleted'}
            </Button>
          )}
        </div>
        <SearchField
          aria-label="Search variables"
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-72"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search" />
            <SearchField.ClearButton aria-label="Clear search" />
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
        onRetry={() => fetchList(searchQuery || undefined)}
        onRetryDeleted={fetchDeleted}
        onCreate={canManage ? openCreate : undefined}
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? (variable) => setDeleteVariable(variable) : undefined}
        onRestore={canManage ? (variable) => restoreVariable(variable.id) : undefined}
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
