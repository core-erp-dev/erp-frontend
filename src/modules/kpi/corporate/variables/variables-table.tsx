'use client';

import React, { useMemo } from 'react';
import { Table, Spinner, Button, Chip } from '@heroui/react';
import { Tray, PencilSimple, Trash, ArrowCounterClockwise, Copy, Check } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { aggregationModeLabel } from './aggregation-mode';
import type { Variable } from './variables.types';

export interface VariablesTableProps {
  variables: Variable[];
  deletedList: Variable[];
  viewMode: 'current' | 'deleted';
  searchQuery: string;
  isLoading: boolean;
  isLoadingDeleted: boolean;
  error: string | null;
  deletedError: string | null;
  onRetry: () => void;
  onRetryDeleted: () => void;
  /* ── action callbacks (manage-gated by the page) ── */
  onCreate?: () => void;
  onEdit?: (variable: Variable) => void;
  onDelete?: (variable: Variable) => void;
  onRestore?: (variable: Variable) => void;
}

export const VariablesTable: React.FC<VariablesTableProps> = ({
  variables,
  deletedList,
  viewMode,
  searchQuery,
  isLoading,
  isLoadingDeleted,
  error,
  deletedError,
  onRetry,
  onRetryDeleted,
  onCreate,
  onEdit,
  onDelete,
  onRestore,
}) => {
  const { hasPerm } = usePermission();
  const canManage = hasPerm(PERM.CORPORATE_KPI_MANAGE);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const handleCopyCode = React.useCallback((id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 3000);
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return variables;
    const q = searchQuery.trim().toLowerCase();
    return variables.filter(
      (v) => v.code.toLowerCase().includes(q) || v.name.toLowerCase().includes(q),
    );
  }, [variables, searchQuery]);

  const emptyState = (loading: boolean, err: string | null, retry: () => void, label: string) => {
    if (loading) {
      return (
        <div className="flex h-24 items-center justify-center">
          <Spinner size="md" />
        </div>
      );
    }
    if (err) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
          <span className="text-sm text-danger">{err}</span>
          <Button variant="secondary" size="sm" onPress={retry}>Retry</Button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <Tray className="h-8 w-8" />
        <span className="text-sm">{label}</span>
      </div>
    );
  };

  if (viewMode === 'current') {
    return (
      <Table key="current-variables">
        <Table.ScrollContainer>
          <Table.Content aria-label="Corporate KPI Variables" className="min-w-[720px]">
            <Table.Header>
              <Table.Column id="code" isRowHeader>Code</Table.Column>
              <Table.Column id="name">Name</Table.Column>
              <Table.Column id="unit">Unit</Table.Column>
              <Table.Column id="aggregationMode">Aggregation Mode</Table.Column>
              <Table.Column id="description">Description</Table.Column>
              {canManage && (onCreate || onEdit || onDelete) && (
                <Table.Column id="actions" className="text-center">{''}</Table.Column>
              )}
            </Table.Header>
            <Table.Body
              renderEmptyState={() =>
                emptyState(
                  isLoading,
                  error,
                  onRetry,
                  searchQuery.trim()
                    ? `No variables match "${searchQuery}".`
                    : 'No variables found. Use Add Variable to create one.',
                )
              }
            >
              {filtered.map((variable) => (
                <Table.Row key={variable.id}>
                  <Table.Cell>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-foreground">{variable.code}</span>
                      <Button
                        isIconOnly
                        variant="ghost"
                        size="sm"
                        aria-label={`Copy code ${variable.code}`}
                        onPress={() => handleCopyCode(variable.id, variable.code)}
                      >
                        {copiedId === variable.id ? (
                          <Check className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="text-foreground">{variable.name}</Table.Cell>
                  <Table.Cell className="text-muted-foreground">{variable.unit || '–'}</Table.Cell>
                  <Table.Cell>
                    <Chip size="sm" className="pointer-events-none" variant="soft">
                      {aggregationModeLabel(variable.aggregationMode)}
                    </Chip>
                  </Table.Cell>
                  <Table.Cell className="max-w-[280px] truncate text-muted-foreground">
                    {variable.description || '–'}
                  </Table.Cell>
                  {canManage && (onCreate || onEdit || onDelete) && (
                    <Table.Cell>
                      <div className="flex items-center justify-end gap-1">
                        {onEdit && (
                          <Button
                            isIconOnly
                            variant="tertiary"
                            size="sm"
                            aria-label="Edit"
                            onPress={() => onEdit(variable)}
                          >
                            <PencilSimple className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            isIconOnly
                            variant="tertiary"
                            size="sm"
                            aria-label="Delete"
                            onPress={() => onDelete(variable)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </Table.Cell>
                  )}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    );
  }

  /* ── Deleted view ── */

  const searchFiltered = searchQuery.trim()
    ? deletedList.filter((v) => {
        const q = searchQuery.trim().toLowerCase();
        return v.code.toLowerCase().includes(q) || v.name.toLowerCase().includes(q);
      })
    : deletedList;

  return (
    <Table key="deleted-variables">
      <Table.ScrollContainer>
        <Table.Content aria-label="Deleted Variables" className="min-w-[720px]">
          <Table.Header>
            <Table.Column id="code" isRowHeader>Code</Table.Column>
            <Table.Column id="name">Name</Table.Column>
            <Table.Column id="unit">Unit</Table.Column>
            <Table.Column id="description">Description</Table.Column>
            {canManage && onRestore && <Table.Column id="actions">{''}</Table.Column>}
          </Table.Header>
          <Table.Body
            renderEmptyState={() =>
              emptyState(
                isLoadingDeleted,
                deletedError,
                onRetryDeleted,
                searchQuery.trim()
                  ? `No deleted variables match "${searchQuery}".`
                  : 'No deleted variables found.',
              )
            }
          >
            {searchFiltered.map((variable) => (
              <Table.Row key={variable.id}>
                <Table.Cell><span className="font-medium text-gray-400 line-through">{variable.code}</span></Table.Cell>
                <Table.Cell><span className="font-medium text-gray-400 line-through">{variable.name}</span></Table.Cell>
                <Table.Cell className="text-muted-foreground">{variable.unit || '–'}</Table.Cell>
                <Table.Cell className="max-w-[280px] truncate text-muted-foreground">
                  {variable.description || '–'}
                </Table.Cell>
                {canManage && onRestore && (
                  <Table.Cell>
                    <Button
                      isIconOnly
                      variant="ghost"
                      size="sm"
                      aria-label="Restore"
                      onPress={() => onRestore(variable)}
                    >
                      <ArrowCounterClockwise className="h-4 w-4" />
                    </Button>
                  </Table.Cell>
                )}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
};
