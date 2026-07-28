'use client';

import React, { useMemo } from 'react';
import { Table, Spinner, Chip, Button, Dropdown } from '@heroui/react';
import { CaretDown, CaretRight, Tray, PencilSimple, Plus, ArrowCounterClockwise, Check, Trash, Copy, DotsThreeVertical, Play, Pause } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import type { CorporateKpiNode, KpiStatus } from './corporate-kpi.types';

/* ── Tree-row shape ── */

interface TreeRow {
  id: string;
  code: string;
  name: string;
  nodeType: string;
  year: number;
  unit: string | null;
  targetValue: number | null;
  status: KpiStatus;
  depth: number;
  hasChildren: boolean;
}

function buildTreeRows(
  nodes: CorporateKpiNode[],
  expandedIds: Set<string>,
  depth: number,
): TreeRow[] {
  const rows: TreeRow[] = [];
  for (const node of nodes) {
    rows.push({
      id: node.id,
      code: node.code,
      name: node.name,
      nodeType: node.nodeType,
      year: node.year,
      unit: node.unit,
      targetValue: node.targetValue,
      status: node.status,
      depth,
      hasChildren: node.children.length > 0,
    });
    if (node.children.length > 0 && expandedIds.has(node.id)) {
      rows.push(...buildTreeRows(node.children, expandedIds, depth + 1));
    }
  }
  return rows;
}

/* ── Chip color maps ── */

const statusChipColor: Record<KpiStatus, 'default' | 'success' | 'warning'> = {
  DRAFT: 'default',
  ACTIVE: 'success',
  INACTIVE: 'warning',
};

const typeChipColor: Record<string, 'default' | 'accent'> = {
  ASPECT: 'default',
  INDICATOR: 'accent',
};

/* ── Empty state ── */

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
      <Tray className="h-8 w-8" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

/* ── Props ── */

export interface CorporateKpiTableProps {
  tree: CorporateKpiNode[];
  deletedList: CorporateKpiNode[];
  viewMode: 'current' | 'deleted';
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  searchQuery: string;
  selectedYear: number;
  isLoadingTree: boolean;
  isLoadingDeleted: boolean;
  treeError: string | null;
  deletedError: string | null;
  onRetryTree: () => void;
  onRetryDeleted: () => void;
  /* ── P1.2 action callbacks ── */
  onCreateIndicator?: (aspectId: string) => void;
  onEdit?: (node: CorporateKpiNode) => void;
  /* ── P1.3 lifecycle callbacks ── */
  onActivate?: (node: CorporateKpiNode) => void;
  onDeactivate?: (node: CorporateKpiNode) => void;
  onDelete?: (node: CorporateKpiNode) => void;
  onRestore?: (node: CorporateKpiNode) => void;
}

/* ── Component ── */

export const CorporateKpiTable: React.FC<CorporateKpiTableProps> = ({
  tree,
  deletedList,
  viewMode,
  expandedIds,
  onToggleExpand,
  searchQuery,
  selectedYear,
  isLoadingTree,
  isLoadingDeleted,
  treeError,
  deletedError,
  onRetryTree,
  onRetryDeleted,
  onCreateIndicator,
  onEdit,
  onActivate,
  onDeactivate,
  onDelete,
  onRestore,
}) => {
  const { hasPerm } = usePermission();
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const handleCopyCode = React.useCallback((id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 3000);
  }, []);
  const canCreate = hasPerm(PERM.CORPORATE_KPI_CREATE);
  const canUpdate = hasPerm(PERM.CORPORATE_KPI_UPDATE);
  const canDelete = hasPerm(PERM.CORPORATE_KPI_DELETE);
  const canRestore = hasPerm(PERM.CORPORATE_KPI_RESTORE);
  const hasLifecyclePerms = hasPerm(PERM.CORPORATE_KPI_UPDATE) || canDelete || canRestore;
  const hasMutationPerms = canCreate || canUpdate || hasLifecyclePerms;

  /* ── Current view ── */

  // Apply search filter — matching child keeps parent visible
  // NOTE: useMemo must be called before any early return (React Rules of Hooks)
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return tree;
    const q = searchQuery.trim().toLowerCase();
    function matches(node: CorporateKpiNode): boolean {
      const selfMatch =
        node.code.toLowerCase().includes(q) ||
        node.name.toLowerCase().includes(q);
      const childMatch = node.children.some(matches);
      return selfMatch || childMatch;
    }
    return tree.filter(matches);
  }, [tree, searchQuery]);

  const searchExpanded = useMemo(() => {
    if (!searchQuery.trim()) return expandedIds;
    const forced = new Set(expandedIds);
    const q = searchQuery.trim().toLowerCase();
    for (const aspect of tree) {
      if (
        aspect.children.some(
          (c) =>
            c.code.toLowerCase().includes(q) ||
            c.name.toLowerCase().includes(q),
        )
      ) {
        forced.add(aspect.id);
      }
    }
    return forced;
  }, [tree, searchQuery, expandedIds]);

  if (viewMode === 'current') {
    const effectiveExpanded = searchQuery.trim() ? searchExpanded : expandedIds;
    const treeRows = filtered.length > 0 ? buildTreeRows(filtered, effectiveExpanded, 0) : [];

    return (
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Corporate KPI Hierarchy" className="min-w-[900px]">
            <Table.Header>
              <Table.Column id="name" isRowHeader>Name</Table.Column>
              <Table.Column id="code">Code</Table.Column>
              <Table.Column id="type">Type</Table.Column>
              <Table.Column id="year">Year</Table.Column>
              <Table.Column id="unit">Unit</Table.Column>
              <Table.Column id="target">Target Value</Table.Column>
              <Table.Column id="status">Status</Table.Column>
              {hasMutationPerms && <Table.Column id="actions" className="text-center">{''}</Table.Column>}
            </Table.Header>
            <Table.Body
              renderEmptyState={() => {
                if (isLoadingTree) {
                  return (
                    <div className="flex h-24 items-center justify-center">
                      <Spinner size="md" />
                    </div>
                  );
                }
                if (treeError) {
                  return (
                    <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
                      <span className="text-sm text-danger">{treeError}</span>
                      <Button variant="secondary" size="sm" onPress={onRetryTree}>
                        Retry
                      </Button>
                    </div>
                  );
                }
                return (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                    <Tray className="h-8 w-8" />
                    <span className="text-sm">
                      {searchQuery.trim()
                        ? `No Corporate KPIs match "${searchQuery}".`
                        : 'No Corporate KPIs found for the selected year.'}
                    </span>
                  </div>
                );
              }}
            >
              {treeRows.map((row) => (
                  <Table.Row key={row.id}>
                    <Table.Cell>
                      <div className="flex items-center gap-1" style={{ paddingLeft: row.depth * 24 }}>
                        {row.hasChildren ? (
                          <Button
                            isIconOnly
                            variant="ghost"
                            size="sm"
                            aria-label={effectiveExpanded.has(row.id) ? 'Collapse' : 'Expand'}
                            onPress={() => onToggleExpand(row.id)}
                            className="mr-1 h-5 w-5 min-w-0"
                          >
                            {effectiveExpanded.has(row.id) ? (
                              <CaretDown className="h-3.5 w-3.5 text-gray-500" />
                            ) : (
                              <CaretRight className="h-3.5 w-3.5 text-gray-500" />
                            )}
                          </Button>
                        ) : (
                          <span className="mr-1 w-5" />
                        )}
                        <span className="font-medium text-foreground">{row.name}</span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-foreground">{row.code}</span>
                        <Button
                          isIconOnly
                          variant="ghost"
                          size="sm"
                          aria-label={`Copy code ${row.code}`}
                          onPress={() => handleCopyCode(row.id, row.code)}
                        >
                          {copiedId === row.id ? (
                            <Check className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <Chip size="sm" color={typeChipColor[row.nodeType] || 'default'} variant="soft">
                        {row.nodeType}
                      </Chip>
                    </Table.Cell>
                    <Table.Cell className="text-muted-foreground">{row.year}</Table.Cell>
                    <Table.Cell className="text-muted-foreground">
                      {row.depth === 0 ? '–' : row.unit || '–'}
                    </Table.Cell>
                    <Table.Cell className="text-muted-foreground">
                      {row.depth === 0 ? '–' : row.targetValue != null ? row.targetValue : '–'}
                    </Table.Cell>
                    <Table.Cell>
                      <Chip size="sm" color={statusChipColor[row.status]} variant="soft">
                        {row.status}
                      </Chip>
                    </Table.Cell>
                    {hasMutationPerms && (
                      <Table.Cell>
                        <div className="flex items-center justify-end gap-1">
                          {canUpdate && onEdit && (
                            <Button
                              isIconOnly
                              variant="tertiary"
                              size="sm"
                              aria-label="Edit"
                              onPress={() => {
                                const full = findNodeById(tree, row.id);
                                if (full) onEdit(full);
                              }}
                            >
                              <PencilSimple className="h-4 w-4" />
                            </Button>
                          )}
                          {row.nodeType === 'ASPECT' && canCreate && onCreateIndicator && (
                            <Button
                              isIconOnly
                              variant="tertiary"
                              size="sm"
                              aria-label="Add Indicator"
                              onPress={() => onCreateIndicator(row.id)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          )}

                          {/* More menu: Activate/Deactivate + Delete */}
                          <Dropdown>
                            <Button isIconOnly variant="tertiary" size="sm" aria-label="More actions">
                              <DotsThreeVertical className="h-4 w-4" />
                            </Button>
                            <Dropdown.Popover placement="top">
                              <Dropdown.Menu onAction={(key) => {
                                const full = findNodeById(tree, row.id);
                                if (!full) return;
                                if (key === 'activate') onActivate?.(full);
                                if (key === 'deactivate') onDeactivate?.(full);
                                if (key === 'delete') onDelete?.(full);
                              }}>
                                {onActivate && (row.status === 'DRAFT' || row.status === 'INACTIVE') && (
                                  <Dropdown.Item id="activate" textValue="Activate">
                                    <div className="flex items-center gap-2"><Play className="h-4 w-4 text-muted-foreground" /><span>Activate</span></div>
                                  </Dropdown.Item>
                                )}
                                {onDeactivate && row.status === 'ACTIVE' && (
                                  <Dropdown.Item id="deactivate" textValue="Deactivate">
                                    <div className="flex items-center gap-2"><Pause className="h-4 w-4 text-muted-foreground" /><span>Deactivate</span></div>
                                  </Dropdown.Item>
                                )}
                                {canDelete && onDelete && (
                                  <Dropdown.Item id="delete" textValue="Delete" variant="danger">
                                    <div className="flex items-center gap-2 text-danger"><Trash className="h-4 w-4" /><span>Delete</span></div>
                                  </Dropdown.Item>
                                )}
                              </Dropdown.Menu>
                            </Dropdown.Popover>
                          </Dropdown>
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

  const yearFiltered = deletedList.filter((n) => n.year === selectedYear);

  const searchFiltered = searchQuery.trim()
    ? yearFiltered.filter((n) => {
        const q = searchQuery.trim().toLowerCase();
        return n.code.toLowerCase().includes(q) || n.name.toLowerCase().includes(q);
      })
    : yearFiltered;

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Deleted Corporate KPIs" className="min-w-[800px]">
          <Table.Header>
            <Table.Column id="name" isRowHeader>Name</Table.Column>
            <Table.Column id="code">Code</Table.Column>
            <Table.Column id="type">Type</Table.Column>
            <Table.Column id="year">Year</Table.Column>
            <Table.Column id="parent">Parent Aspect</Table.Column>
            <Table.Column id="status">Status</Table.Column>
            {canRestore && onRestore && <Table.Column id="actions">{''}</Table.Column>}
          </Table.Header>
          <Table.Body
            renderEmptyState={() => {
              if (isLoadingDeleted) {
                return (
                  <div className="flex h-24 items-center justify-center">
                    <Spinner size="md" />
                  </div>
                );
              }
              if (deletedError) {
                return (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
                    <span className="text-sm text-danger">{deletedError}</span>
                    <Button variant="secondary" size="sm" onPress={onRetryDeleted}>Retry</Button>
                  </div>
                );
              }
              return (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                  <Tray className="h-8 w-8" />
                  <span className="text-sm">
                    {searchQuery.trim()
                      ? `No deleted Corporate KPIs match "${searchQuery}".`
                      : 'No deleted Corporate KPIs found for the selected year.'}
                  </span>
                </div>
              );
            }}
          >
            {searchFiltered.map((node) => (
            <Table.Row key={node.id}>
              <Table.Cell><span className="font-medium text-gray-400 line-through">{node.name}</span></Table.Cell>
              <Table.Cell><span className="font-medium text-gray-400 line-through">{node.code}</span></Table.Cell>
              <Table.Cell className="text-muted-foreground">
                <Chip size="sm" color={typeChipColor[node.nodeType] || 'default'} variant="soft">
                  {node.nodeType}
                </Chip>
              </Table.Cell>
              <Table.Cell className="text-muted-foreground">{node.year}</Table.Cell>
              <Table.Cell className="text-muted-foreground">{node.parentName || '–'}</Table.Cell>
              <Table.Cell>
                <Chip size="sm" color={statusChipColor[node.status]} variant="soft">
                  {node.status}
                </Chip>
              </Table.Cell>
              {canRestore && onRestore && (
                <Table.Cell>
                    <Button
                      isIconOnly
                      variant="ghost"
                      size="sm"
                      aria-label="Restore"
                      onPress={() => onRestore(node)}
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

/* ── Utility: find node by ID in tree (recursive) ── */

function findNodeById(nodes: CorporateKpiNode[], id: string): CorporateKpiNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children.length > 0) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}
