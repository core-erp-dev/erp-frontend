'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DotsThreeVertical, Eye, PencilSimple, Trash, Plus, Tray, CaretRight, CaretDown, ArrowCounterClockwise, Copy, Check } from '@phosphor-icons/react';
import { Table, Spinner, Button, Chip, Tooltip, Pagination, Dropdown } from '@heroui/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import type { Position, PositionTree } from '../types';
import type { PaginatedResponse } from '@/types/api';

interface PositionTableProps {
  positions?: Position[];
  pagination?: PaginatedResponse<Position> | null;
  onPageChange?: (page: number) => void;
  treePositions?: PositionTree[];
  expandedIds?: Set<string>;
  onToggleExpand?: (id: string) => void;
  isLoading?: boolean;
  error?: string | null;
  viewMode: 'table' | 'tree';
  onDelete: (id: string, name: string) => void;
  onRestore?: (id: string, name: string) => void;
}

export const PositionTable: React.FC<PositionTableProps> = ({
  positions = [],
  pagination = null,
  onPageChange,
  treePositions = [],
  expandedIds = new Set(),
  onToggleExpand,
  isLoading = false,
  error = null,
  viewMode,
  onDelete,
  onRestore,
}) => {
  const router = useRouter();
  const { hasPerm, hasAnyPerm } = usePermission();

  const currentPage = pagination ? pagination.page : 1;
  const totalPages = pagination ? pagination.totalPages : 1;
  const totalItems = pagination ? pagination.totalElements : 0;
  const pageSize = pagination?.size ?? 10;
  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // ── Copy state ──
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopyCode = useCallback((id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 3000);
  }, []);

  // ── Employees cell: single Chip `+N` + Tooltip (right) listing every name.
  // Pattern reused from the employees page positions column; defensive on the
  // assignedUsers collection (missing → []).
  const renderEmployeesCell = (names: string[]) => {
    const count = names.length;
    if (count === 0) return <span className="text-muted-foreground">-</span>;
    return (
      <Tooltip delay={0}>
        <Tooltip.Trigger aria-label={`${count} pegawai`}>
          <Chip size="sm" variant="soft">{`+${count}`}</Chip>
        </Tooltip.Trigger>
        <Tooltip.Content placement="right">
          <div className="flex flex-col gap-0.5 text-xs">
            {names.map((name, i) => (
              <span key={`${name}-${i}`}>{name}</span>
            ))}
          </div>
        </Tooltip.Content>
      </Tooltip>
    );
  };

  // ── Inline action buttons (Detail + Edit) — shared by Table and Tree views ──
  const renderInlineActions = (id: string, name: string) => (
    <>
      {hasAnyPerm(PERM.POSITION_READ, PERM.POSITION_MANAGE) && (
        <Button
          isIconOnly
          variant="tertiary"
          size="sm"
          aria-label={`Lihat ${name}`}
          onPress={() => router.push(`/organization/positions/${id}`)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      )}
      {hasPerm(PERM.POSITION_MANAGE) && (
        <Button
          isIconOnly
          variant="tertiary"
          size="sm"
          aria-label={`Edit ${name}`}
          onPress={() => router.push(`/organization/positions/${id}/edit`)}
        >
          <PencilSimple className="h-4 w-4" />
        </Button>
      )}
    </>
  );

  // ── More menu (Add Subordinate + Delete) — shared by Table and Tree views ──
  // Every action inside requires position:manage; hide the trigger entirely
  // for read-only users instead of rendering an empty menu.
  const renderMoreMenu = (id: string, name: string) => {
    if (!hasPerm(PERM.POSITION_MANAGE)) return null;
    return (
    <Dropdown>
      <Button isIconOnly variant="tertiary" size="sm" aria-label={`Aksi lainnya untuk ${name}`}>
        <DotsThreeVertical className="h-4 w-4" />
      </Button>
      <Dropdown.Popover placement="top">
        <Dropdown.Menu onAction={(key) => {
          if (key === 'add-child') router.push(`/organization/positions/create?parentId=${id}&from=list`);
          if (key === 'delete') onDelete(id, name);
        }}>
          <Dropdown.Item id="add-child" textValue="Tambah Jabatan Bawahan">
            <Plus className="h-4 w-4 text-muted-foreground" />
            <span>Tambah Jabatan Bawahan</span>
          </Dropdown.Item>
          <Dropdown.Item id="delete" textValue="Hapus" variant="danger">
            <Trash className="h-4 w-4 text-danger" />
            <span className="text-danger">Hapus</span>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
    );
  };

  const renderEmptyState = () =>
    isLoading ? (
      <div className="flex h-24 items-center justify-center">
        <Spinner size="md" />
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <Tray className="h-8 w-8" />
        <span className="text-sm">{error || 'Tidak ada data'}</span>
      </div>
    );

  // ── TREE VIEW ──
  if (viewMode === 'tree') {
    const treeRows = buildTreeRows(treePositions, expandedIds, 0);
    return (
      <Table key="tree">
        <Table.ScrollContainer>
          <Table.Content aria-label="Hierarki Jabatan" className="min-w-[700px]">
            <Table.Header>
              <Table.Column id="tree-name" isRowHeader>Nama Jabatan</Table.Column>
              <Table.Column id="tree-code">Kode</Table.Column>
              <Table.Column id="tree-users">Pegawai</Table.Column>
              <Table.Column id="tree-actions" className="text-center">{''}</Table.Column>
            </Table.Header>
            <Table.Body renderEmptyState={renderEmptyState}>
              {/* While a request is in flight, do NOT keep showing stale rows —
                  the empty-state spinner (initial-load pattern) takes over. */}
              {!isLoading &&
                treeRows.map((row) => (
                <Table.Row key={row.id} id={row.id}>
                  <Table.Cell>
                    <div className="flex items-center" style={{ paddingLeft: row.depth * 24 }}>
                      {row.hasChildren ? (
                        <Button
                          isIconOnly
                          variant="ghost"
                          size="sm"
                          aria-label={expandedIds.has(row.id) ? 'Ciutkan' : 'Perluas'}
                          onPress={() => onToggleExpand?.(row.id)}
                          className="mr-1 h-5 w-5 min-w-0"
                        >
                          {expandedIds.has(row.id) ? (
                            <CaretDown className="h-3.5 w-3.5 text-gray-500" />
                          ) : (
                            <CaretRight className="h-3.5 w-3.5 text-gray-500" />
                          )}
                        </Button>
                      ) : (
                        <span className="mr-1 w-5" />
                      )}
                      <Link href={`/organization/positions/${row.id}`} className="font-medium text-foreground hover:underline">
                        {row.positionName}
                      </Link>
                      {row.unitName && (
                        <span className="ml-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">{row.unitName}</span>
                      )}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-foreground">{row.positionCode}</span>
                      {!row.isDeleted && (
                        <Button
                          isIconOnly
                          variant="ghost"
                          size="sm"
                          aria-label={`Salin kode ${row.positionCode}`}
                          onPress={() => handleCopyCode(row.id, row.positionCode)}
                        >
                          {copiedId === row.id ? (
                            <Check className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </Button>
                      )}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    {renderEmployeesCell(row.userNames)}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center justify-end gap-1">
                      {row.isDeleted ? (
                        hasPerm(PERM.POSITION_MANAGE) && (
                          <Button isIconOnly variant="tertiary" size="sm" aria-label={`Pulihkan ${row.positionName}`} onPress={() => onRestore?.(row.id, row.positionName)}>
                            <ArrowCounterClockwise className="h-4 w-4" />
                          </Button>
                        )
                      ) : (
                        <>
                          {renderInlineActions(row.id, row.positionName)}
                          {renderMoreMenu(row.id, row.positionName)}
                        </>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    );
  }

  // ── TABLE VIEW ──
  return (
    <Table key="table">
      <Table.ScrollContainer>
        <Table.Content aria-label="Data Jabatan" className="min-w-[700px]">
          <Table.Header>
            <Table.Column id="code" isRowHeader>Kode</Table.Column>
            <Table.Column id="name">Nama Jabatan</Table.Column>
            <Table.Column id="parent">Atasan</Table.Column>
            <Table.Column id="users">Pegawai</Table.Column>
            <Table.Column id="actions" aria-label="Aksi" className="text-center">{''}</Table.Column>
          </Table.Header>
          <Table.Body renderEmptyState={renderEmptyState}>
            {/* While a request is in flight, do NOT keep showing stale rows —
                the empty-state spinner (initial-load pattern) takes over. */}
            {!isLoading &&
              positions.map((pos) => {
              const isDeleted = !!pos.deletedAt;
              const userNames = (pos.assignedUsers ?? []).map((u) => u.fullName);
              return (
                <Table.Row key={pos.id} id={pos.id}>
                  <Table.Cell className={`font-medium ${isDeleted ? 'text-gray-400 line-through' : 'text-foreground'}`}>
                    <div className="flex items-center gap-1.5">
                      {pos.positionCode}
                      {!isDeleted && (
                        <Button
                          isIconOnly
                          variant="ghost"
                          size="sm"
                          aria-label={`Salin kode ${pos.positionCode}`}
                          onPress={() => handleCopyCode(pos.id, pos.positionCode)}
                        >
                          {copiedId === pos.id ? (
                            <Check className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </Button>
                      )}
                    </div>
                  </Table.Cell>
                  <Table.Cell className={`font-medium ${isDeleted ? 'text-gray-400 line-through' : 'text-foreground'}`}>
                    <div className="flex items-center gap-2">
                      {isDeleted ? (
                        <span>{pos.positionName}</span>
                      ) : (
                        <Link href={`/organization/positions/${pos.id}`} className="font-medium text-foreground hover:underline">
                          {pos.positionName}
                        </Link>
                      )}
                      {pos.unitName && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">{pos.unitName}</span>
                      )}
                    </div>
                  </Table.Cell>
                  <Table.Cell className={isDeleted ? 'text-gray-400' : 'text-muted-foreground'}>
                    {pos.parentName || '-'}
                  </Table.Cell>
                  <Table.Cell>
                    {renderEmployeesCell(userNames)}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center justify-end gap-1">
                      {isDeleted ? (
                        hasPerm(PERM.POSITION_MANAGE) && (
                          <Button isIconOnly variant="tertiary" size="sm" aria-label={`Pulihkan ${pos.positionName}`} onPress={() => onRestore?.(pos.id, pos.positionName)}>
                            <ArrowCounterClockwise className="h-4 w-4" />
                          </Button>
                        )
                      ) : (
                        <>
                          {renderInlineActions(pos.id, pos.positionName)}
                          {renderMoreMenu(pos.id, pos.positionName)}
                        </>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>

      {!isLoading && totalItems > 0 && (
        <Table.Footer>
          <Pagination size="sm">
            <Pagination.Summary>{startItem} sampai {endItem} dari {totalItems} hasil</Pagination.Summary>
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous isDisabled={currentPage === 1} onPress={() => onPageChange?.(currentPage - 1)}>
                  <Pagination.PreviousIcon /> Sebelumnya
                </Pagination.Previous>
              </Pagination.Item>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Pagination.Item key={p}>
                  <Pagination.Link isActive={p === currentPage} onPress={() => onPageChange?.(p)}>{p}</Pagination.Link>
                </Pagination.Item>
              ))}
              <Pagination.Item>
                <Pagination.Next isDisabled={currentPage === totalPages} onPress={() => onPageChange?.(currentPage + 1)}>
                  Berikutnya <Pagination.NextIcon />
                </Pagination.Next>
              </Pagination.Item>
            </Pagination.Content>
          </Pagination>
        </Table.Footer>
      )}
    </Table>
  );
};

interface TreeRow {
  id: string;
  positionName: string;
  positionCode: string;
  unitName: string | null;
  userNames: string[];
  depth: number;
  hasChildren: boolean;
  isDeleted: boolean;
}

function buildTreeRows(nodes: PositionTree[], expandedIds: Set<string>, depth: number): TreeRow[] {
  const rows: TreeRow[] = [];
  for (const node of nodes) {
    const children = node.children ?? [];
    rows.push({
      id: node.id,
      positionName: node.positionName,
      positionCode: node.positionCode,
      unitName: node.unitName ?? null,
      userNames: (node.assignedUsers ?? []).map((u) => u.fullName),
      depth,
      hasChildren: children.length > 0,
      isDeleted: !!node.deletedAt,
    });
    if (children.length > 0 && expandedIds.has(node.id)) {
      rows.push(...buildTreeRows(children, expandedIds, depth + 1));
    }
  }
  return rows;
}
