'use client';

import React, { useMemo } from 'react';
import { Table, Spinner, Badge, Button } from '@heroui/react';
import { CaretDown, CaretRight, Tray } from '@phosphor-icons/react';
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

/* ── Status badge variant ── */

const statusVariant: Record<KpiStatus, 'primary' | 'secondary' | 'soft'> = {
  DRAFT: 'secondary',
  ACTIVE: 'primary',
  INACTIVE: 'soft',
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
}) => {
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

  // Determine which parent rows should be expanded for search
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
    if (isLoadingTree) {
      return (
        <div className="flex h-40 items-center justify-center">
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

    const effectiveExpanded = searchQuery.trim() ? searchExpanded : expandedIds;

    if (filtered.length === 0) {
      return (
        <EmptyState
          message={
            searchQuery.trim()
              ? `No Corporate KPIs match "${searchQuery}".`
              : 'No Corporate KPIs found for the selected year.'
          }
        />
      );
    }

    const treeRows = buildTreeRows(filtered, effectiveExpanded, 0);

    return (
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Corporate KPI Hierarchy" className="min-w-[800px]">
            <Table.Header>
              <Table.Column id="code" isRowHeader>
                Code
              </Table.Column>
              <Table.Column id="name">Name</Table.Column>
              <Table.Column id="type">Type</Table.Column>
              <Table.Column id="year">Year</Table.Column>
              <Table.Column id="unit">Unit</Table.Column>
              <Table.Column id="target">Target Value</Table.Column>
              <Table.Column id="status">Status</Table.Column>
            </Table.Header>
            <Table.Body>
              {treeRows.map((row) => (
                <Table.Row key={row.id}>
                  <Table.Cell>
                    <div className="flex items-center gap-1">
                      {row.depth === 0 ? (
                        row.hasChildren ? (
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
                        )
                      ) : (
                        <span
                          className="mr-1 w-5"
                          style={{ marginLeft: row.depth * 24 }}
                        />
                      )}
                      <span className="font-medium text-foreground">
                        {row.code}
                      </span>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="font-medium text-foreground">
                    <span style={{ paddingLeft: row.depth > 0 ? row.depth * 24 : 0 }}>
                      {row.name}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-muted-foreground">{row.nodeType}</span>
                  </Table.Cell>
                  <Table.Cell className="text-muted-foreground">
                    {row.year}
                  </Table.Cell>
                  <Table.Cell className="text-muted-foreground">
                    {row.depth === 0 ? '–' : row.unit || '–'}
                  </Table.Cell>
                  <Table.Cell className="text-muted-foreground">
                    {row.depth === 0 ? '–' : row.targetValue != null ? row.targetValue : '–'}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge variant={statusVariant[row.status]}>
                      {row.status}
                    </Badge>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    );
  }

  /* ── Deleted view ── */

  if (isLoadingDeleted) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (deletedError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
        <span className="text-sm text-danger">{deletedError}</span>
        <Button variant="secondary" size="sm" onPress={onRetryDeleted}>
          Retry
        </Button>
      </div>
    );
  }

  // Filter deleted list by selected year
  const yearFiltered = deletedList.filter((n) => n.year === selectedYear);

  // Apply search (flat)
  const searchFiltered = searchQuery.trim()
    ? yearFiltered.filter((n) => {
        const q = searchQuery.trim().toLowerCase();
        return (
          n.code.toLowerCase().includes(q) ||
          n.name.toLowerCase().includes(q)
        );
      })
    : yearFiltered;

  if (searchFiltered.length === 0) {
    return (
      <EmptyState
        message={
          searchQuery.trim()
            ? `No deleted Corporate KPIs match "${searchQuery}".`
            : 'No deleted Corporate KPIs found for the selected year.'
        }
      />
    );
  }

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Deleted Corporate KPIs" className="min-w-[800px]">
          <Table.Header>
            <Table.Column id="code" isRowHeader>
              Code
            </Table.Column>
            <Table.Column id="name">Name</Table.Column>
            <Table.Column id="type">Type</Table.Column>
            <Table.Column id="year">Year</Table.Column>
            <Table.Column id="parent">Parent Aspect</Table.Column>
            <Table.Column id="status">Status</Table.Column>
          </Table.Header>
          <Table.Body>
            {searchFiltered.map((node) => (
              <Table.Row key={node.id}>
                <Table.Cell>
                  <span className="font-medium text-gray-400 line-through">
                    {node.code}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span className="font-medium text-gray-400 line-through">
                    {node.name}
                  </span>
                </Table.Cell>
                <Table.Cell className="text-muted-foreground">
                  {node.nodeType}
                </Table.Cell>
                <Table.Cell className="text-muted-foreground">
                  {node.year}
                </Table.Cell>
                <Table.Cell className="text-muted-foreground">
                  {node.parentName || '–'}
                </Table.Cell>
                <Table.Cell>
                  <Badge variant={statusVariant[node.status]}>
                    {node.status}
                  </Badge>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
};
