'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Table, Spinner, Chip, Button, Dropdown } from '@heroui/react';
import { CaretDown, CaretRight, Tray, PencilSimple, Plus, ArrowCounterClockwise, DotsThreeVertical, Trash, Eye } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import type { CorporateKpiNode } from './corporate-kpi.types';

/* ── Tree-row shape ── */

interface TreeRow {
  id: string;
  structureId: string;
  code: string;
  name: string;
  nodeType: string;
  weight: number | null;
  actualScore: number | null;
  actualResult: number | null;
  targetScore: number | null;
  targetResult: number | null;
  depth: number;
  hasChildren: boolean;
}

function buildTreeRows(
  nodes: CorporateKpiNode[],
  expandedIds: Set<string>,
  depth: number,
): TreeRow[] {
  const rows: TreeRow[] = [];
  for (const node of nodes ?? []) {
    const children = Array.isArray(node.children) ? node.children : [];
    rows.push({
      id: node.id,
      structureId: node.structureId,
      code: node.code,
      name: node.name,
      nodeType: node.nodeType,
      weight: node.weight,
      actualScore: node.actualScore,
      actualResult: node.actualResult,
      targetScore: node.targetScore,
      targetResult: node.targetResult,
      depth,
      hasChildren: children.length > 0,
    });
    if (children.length > 0 && expandedIds.has(node.id)) {
      rows.push(...buildTreeRows(children, expandedIds, depth + 1));
    }
  }
  return rows;
}

/* ── Chip color maps ── */

const typeChipColor: Record<string, 'default' | 'accent'> = {
  ASPECT: 'default',
  INDICATOR: 'accent',
};

/** Weight ratio → percentage label (5.5% stored as 0.055). */
function formatWeight(weight: number | null): string {
  if (weight == null) return '–';
  return `${Math.round(weight * 10000) / 100}%`;
}

/** Scoring-cell fallback: `–` for an INDICATOR without a computed value, empty for ASPECT rows. */
function scoreValue(isIndicator: boolean, value: number | null | undefined): number | string {
  if (!isIndicator) return '';
  return value != null ? value : '–';
}

export interface CorporateKpiTableProps {
  tree: CorporateKpiNode[];
  deletedList: CorporateKpiNode[];
  viewMode: 'current' | 'deleted';
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  searchQuery: string;
  selectedYear: number;
  /** Overrides the default current-view empty-state text (e.g. "No structure yet for {year}"). */
  emptyStateLabel?: string;
  isLoadingTree: boolean;
  isLoadingStructures?: boolean;
  isTableTransitioning?: boolean;
  isLoadingDeleted: boolean;
  treeError: string | null;
  structuresError?: string | null;
  deletedError: string | null;
  onRetryTree: () => void;
  onRetryDeleted: () => void;
  /** Structure ids whose configuration is frozen (ACTIVE) — their rows hide/disable mutations. */
  lockedStructureIds: Set<string>;
  /* ── action callbacks (manage-gated) ── */
  onCreateIndicator?: (aspectId: string) => void;
  onEdit?: (node: CorporateKpiNode) => void;
  onDelete?: (node: CorporateKpiNode) => void;
  onRestore?: (node: CorporateKpiNode) => void;
  onView?: (node: CorporateKpiNode) => void;
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
  emptyStateLabel,
  isLoadingTree,
  isLoadingStructures = false,
  isTableTransitioning = false,
  isLoadingDeleted,
  treeError,
  structuresError = null,
  deletedError,
  onRetryTree,
  onRetryDeleted,
  lockedStructureIds,
  onCreateIndicator,
  onEdit,
  onDelete,
  onRestore,
  onView,
}) => {
  const { hasPerm } = usePermission();
  const canManage = hasPerm(PERM.CORPORATE_KPI_MANAGE);

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
        const childMatch = (node.children ?? []).some(matches);
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
        (aspect.children ?? []).some(
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
    const treeRows = !isLoadingTree && !isLoadingStructures && !isTableTransitioning && !treeError && !structuresError && filtered.length > 0
      ? buildTreeRows(filtered, effectiveExpanded, 0)
      : [];

    return (
      <Table key="current-kpi">
        <Table.ScrollContainer>
          <Table.Content aria-label="Hierarki KPI Perusahaan" className="min-w-[1000px]">
            <Table.Header>
              <Table.Column id="code" isRowHeader>Kode</Table.Column>
              <Table.Column id="name">Nama KPI</Table.Column>
              <Table.Column id="weight">Bobot</Table.Column>
              <Table.Column id="score">Nilai</Table.Column>
              <Table.Column id="actual">Hasil</Table.Column>
              <Table.Column id="target-score">Target Nilai</Table.Column>
              <Table.Column id="target-result">Target Hasil</Table.Column>
              {(onView || canManage) && <Table.Column id="actions" aria-label="Aksi" className="text-center">{''}</Table.Column>}
            </Table.Header>
            <Table.Body
              renderEmptyState={() => {
                if (isLoadingTree || isLoadingStructures || isTableTransitioning) {
                  return (
                    <div className="flex h-24 items-center justify-center">
                      <Spinner size="md" />
                    </div>
                  );
                }
                if (structuresError || treeError) {
                  return (
                    <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
                      <span className="text-sm text-danger">{structuresError ?? treeError}</span>
                      <Button variant="secondary" size="sm" onPress={onRetryTree}>
                        Coba Lagi
                      </Button>
                    </div>
                  );
                }
                return (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                    <Tray className="h-8 w-8" />
                    <span className="text-sm">
                      {searchQuery.trim()
                        ? `Tidak ada KPI yang cocok dengan "${searchQuery}".`
                        : emptyStateLabel ?? 'Belum ada KPI Perusahaan untuk tahun yang dipilih.'}
                    </span>
                  </div>
                );
              }}
            >
              {treeRows.map((row, index) => {
                const locked = lockedStructureIds.has(row.structureId);
                const indent = Math.max(row.depth, row.nodeType === 'INDICATOR' ? 1 : 0) * 24;
                return (
                  <Table.Row key={`${row.id}-${index}`}>
                    <Table.Cell>
                      <div className="flex items-center gap-1" style={{ paddingLeft: indent }}>
                        {row.hasChildren && (
                          <Button
                            isIconOnly
                            variant="ghost"
                            size="sm"
                            aria-label={effectiveExpanded.has(row.id) ? `Tutup ${row.name}` : `Buka ${row.name}`}
                            onPress={() => onToggleExpand(row.id)}
                            className="mr-1 h-5 w-5 min-w-0"
                          >
                            {effectiveExpanded.has(row.id) ? (
                              <CaretDown className="h-3.5 w-3.5 text-gray-500" />
                            ) : (
                              <CaretRight className="h-3.5 w-3.5 text-gray-500" />
                            )}
                          </Button>
                        )}
                        <span className="font-medium text-foreground">{row.code}</span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div style={{ paddingLeft: indent }}>
                        <Link href={`/kpi/corporate/${row.id}`} className="font-medium text-foreground hover:underline">
                          {row.name}
                        </Link>
                      </div>
                    </Table.Cell>
                    <Table.Cell className="text-muted-foreground">
                      {row.nodeType === 'INDICATOR' ? formatWeight(row.weight) : ''}
                    </Table.Cell>
                    <Table.Cell className="text-muted-foreground">
                      {scoreValue(row.nodeType === 'INDICATOR', row.actualScore)}
                    </Table.Cell>
                    <Table.Cell className="text-muted-foreground">
                      {scoreValue(row.nodeType === 'INDICATOR', row.actualResult)}
                    </Table.Cell>
                    <Table.Cell className="text-muted-foreground">
                      {row.nodeType === 'INDICATOR' ? row.targetScore ?? '–' : ''}
                    </Table.Cell>
                    <Table.Cell className="text-muted-foreground">
                      {scoreValue(row.nodeType === 'INDICATOR', row.targetResult)}
                    </Table.Cell>
                    {(onView || canManage) && (
                      <Table.Cell>
                        <div className="flex items-center justify-end">
                          {/* ACTIVE structures freeze configuration — no mutation actions */}
                          <Dropdown>
                            <Button isIconOnly variant="tertiary" size="sm" aria-label={`Aksi ${row.code}`}>
                              <DotsThreeVertical className="h-4 w-4" />
                            </Button>
                            <Dropdown.Popover placement="top">
                              <Dropdown.Menu onAction={(key) => {
                                const full = findNodeById(tree, row.id);
                                if (!full) return;
                                if (key === 'view') onView?.(full);
                                if (locked) return;
                                if (key === 'edit') onEdit?.(full);
                                if (key === 'add-indicator') onCreateIndicator?.(full.id);
                                if (key === 'delete') onDelete?.(full);
                              }}>
                                {onView && (
                                  <Dropdown.Item id="view" textValue="Lihat detail">
                                    <div className="flex items-center gap-2">
                                      <Eye className="h-4 w-4 text-muted-foreground" />
                                      <span>Lihat detail</span>
                                    </div>
                                  </Dropdown.Item>
                                )}
                                {onEdit && (
                                  <Dropdown.Item id="edit" textValue="Ubah" isDisabled={locked}>
                                    <div className="flex items-center gap-2"><PencilSimple className="h-4 w-4 text-muted-foreground" /><span>Ubah</span></div>
                                  </Dropdown.Item>
                                )}
                                {row.nodeType === 'ASPECT' && onCreateIndicator && (
                                  <Dropdown.Item id="add-indicator" textValue="Tambah indikator" isDisabled={locked}>
                                    <div className="flex items-center gap-2"><Plus className="h-4 w-4 text-muted-foreground" /><span>Tambah indikator</span></div>
                                  </Dropdown.Item>
                                )}
                                {onDelete && (
                                  <Dropdown.Item id="delete" textValue="Hapus" variant="danger" isDisabled={locked}>
                                    <div className="flex items-center gap-2 text-danger"><Trash className="h-4 w-4" /><span>Hapus</span></div>
                                  </Dropdown.Item>
                                )}
                              </Dropdown.Menu>
                            </Dropdown.Popover>
                          </Dropdown>
                        </div>
                      </Table.Cell>
                    )}
                  </Table.Row>
                );
              })}
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
    <Table key="deleted-kpi">
      <Table.ScrollContainer>
        <Table.Content aria-label="KPI Perusahaan terhapus" className="min-w-[800px]">
          <Table.Header>
            <Table.Column id="code" isRowHeader>Kode</Table.Column>
            <Table.Column id="name">Nama KPI</Table.Column>
            <Table.Column id="type">Tipe</Table.Column>
            <Table.Column id="year">Tahun</Table.Column>
            <Table.Column id="parent">Aspect Induk</Table.Column>
            {canManage && onRestore && <Table.Column id="actions" aria-label="Aksi">{''}</Table.Column>}
          </Table.Header>
          <Table.Body
            renderEmptyState={() => {
              if (isLoadingDeleted || isTableTransitioning) {
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
                      <Button variant="secondary" size="sm" onPress={onRetryDeleted}>Coba Lagi</Button>
                  </div>
                );
              }
              return (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                  <Tray className="h-8 w-8" />
                  <span className="text-sm">
                    {searchQuery.trim()
                       ? `Tidak ada KPI terhapus yang cocok dengan "${searchQuery}".`
                       : 'Tidak ada KPI terhapus untuk tahun yang dipilih.'}
                  </span>
                </div>
              );
            }}
          >
            {(!isLoadingDeleted && !isTableTransitioning && !deletedError ? searchFiltered : []).map((node, index) => {
              const locked = lockedStructureIds.has(node.structureId);
              return (
                <Table.Row key={`${node.id}-${index}`}>
                  <Table.Cell><span className="font-medium text-gray-400 line-through">{node.code}</span></Table.Cell>
                  <Table.Cell><span className="font-medium text-gray-400 line-through">{node.name}</span></Table.Cell>
                  <Table.Cell className="text-muted-foreground">
                    <Chip size="sm" color={typeChipColor[node.nodeType] || 'default'} variant="soft">
                      {node.nodeType}
                    </Chip>
                  </Table.Cell>
                  <Table.Cell className="text-muted-foreground">{node.year}</Table.Cell>
                  <Table.Cell className="text-muted-foreground">{node.parentName || '–'}</Table.Cell>
                  {canManage && onRestore && (
                    <Table.Cell>
                      <Button
                        isIconOnly
                        variant="ghost"
                        size="sm"
                        aria-label={`Pulihkan ${node.code}`}
                        isDisabled={locked}
                        onPress={() => onRestore(node)}
                      >
                        <ArrowCounterClockwise className="h-4 w-4" />
                      </Button>
                    </Table.Cell>
                  )}
                </Table.Row>
              );
            })}
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
    if ((node.children ?? []).length > 0) {
      const found = findNodeById(node.children ?? [], id);
      if (found) return found;
    }
  }
  return undefined;
}
