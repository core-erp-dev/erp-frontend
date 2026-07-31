'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DotsThreeVertical, Eye, PencilSimple, Trash, Plus, Tray, CaretRight, CaretDown, ArrowCounterClockwise, Copy, Check } from '@phosphor-icons/react';
import { Table, Spinner, Button, Pagination, Dropdown } from '@heroui/react';
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
  viewMode,
  onDelete,
  onRestore,
}) => {
  const router = useRouter();
  const { hasPerm } = usePermission();

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

  // ── Inline action buttons (Detail + Edit) — shared by Table and Tree views ──
  const renderInlineActions = (id: string, name: string) => (
    <>
      {hasPerm(PERM.POSITION_READ) && (
        <Button
          isIconOnly
          variant="tertiary"
          size="sm"
          aria-label={`View ${name}`}
          onPress={() => router.push(`/organization/positions/${id}`)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      )}
      {hasPerm(PERM.POSITION_UPDATE) && (
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
  const renderMoreMenu = (id: string, name: string) => (
    <Dropdown>
      <Button isIconOnly variant="tertiary" size="sm" aria-label={`More actions for ${name}`}>
        <DotsThreeVertical className="h-4 w-4" />
      </Button>
      <Dropdown.Popover placement="top">
        <Dropdown.Menu onAction={(key) => {
          if (key === 'add-child') router.push(`/organization/positions/create?parentId=${id}`);
          if (key === 'delete') onDelete(id, name);
        }}>
          {hasPerm(PERM.POSITION_CREATE) && (
            <Dropdown.Item id="add-child" textValue="Add Subordinate">
              <Plus className="h-4 w-4 text-muted-foreground" />
              <span>Add Subordinate</span>
            </Dropdown.Item>
          )}
          {hasPerm(PERM.POSITION_DELETE) && (
            <Dropdown.Item id="delete" textValue="Delete" variant="danger">
              <Trash className="h-4 w-4 text-danger" />
              <span className="text-danger">Delete</span>
            </Dropdown.Item>
          )}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );

  // ── TREE VIEW ──
  if (viewMode === 'tree') {
    const treeRows = buildTreeRows(treePositions, expandedIds, 0);
    return (
      <Table key="tree">
        <Table.ScrollContainer>
          <Table.Content aria-label="Position Structure" className="min-w-[700px]">
            <Table.Header>
              <Table.Column id="tree-name" isRowHeader>Position Name</Table.Column>
              <Table.Column id="tree-code">Code</Table.Column>
              <Table.Column id="tree-users">Employees</Table.Column>
              <Table.Column id="tree-actions" className="text-center">{''}</Table.Column>
            </Table.Header>
            <Table.Body
              renderEmptyState={() =>
                isLoading ? (
                  <div className="flex h-24 items-center justify-center">
                    <Spinner size="md" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                    <Tray className="h-8 w-8" />
                    <span className="text-sm">No data available</span>
                  </div>
                )
              }
            >
              {treeRows.map((row) => (
                <Table.Row key={row.id} id={row.id}>
                  <Table.Cell>
                    <div className="flex items-center" style={{ paddingLeft: row.depth * 24 }}>
                      {row.hasChildren ? (
                        <Button
                          isIconOnly
                          variant="ghost"
                          size="sm"
                          aria-label={expandedIds.has(row.id) ? 'Collapse' : 'Expand'}
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
                          aria-label={`Copy code ${row.positionCode}`}
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
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">{row.userCount}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center justify-end gap-1">
                      {row.isDeleted ? (
                        hasPerm(PERM.POSITION_RESTORE) && (
                          <Button isIconOnly variant="tertiary" size="sm" aria-label={`Restore ${row.positionName}`} onPress={() => onRestore?.(row.id, row.positionName)}>
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
        <Table.Content aria-label="Position List" className="min-w-[700px]">
          <Table.Header>
            <Table.Column id="code" isRowHeader>Code</Table.Column>
            <Table.Column id="name">Position Name</Table.Column>
            <Table.Column id="parent">Reports To</Table.Column>
            <Table.Column id="users">Employees</Table.Column>
            <Table.Column id="actions" aria-label="Actions" className="text-center">{''}</Table.Column>
          </Table.Header>
          <Table.Body
            renderEmptyState={() =>
              isLoading ? (
                <div className="flex h-24 items-center justify-center">
                  <Spinner size="md" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                  <Tray className="h-8 w-8" />
                  <span className="text-sm">No data available</span>
                </div>
              )
            }
          >
            {positions.map((pos) => {
              const isDeleted = !!pos.deletedAt;
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
                          aria-label={`Copy code ${pos.positionCode}`}
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
                        <Link href={`/organization/positions/${pos.id}`} className="text-foreground hover:underline font-medium">
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
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                      {(pos.assignedUsers ?? []).length}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center justify-end gap-1">
                      {isDeleted ? (
                        hasPerm(PERM.POSITION_RESTORE) && (
                          <Button isIconOnly variant="tertiary" size="sm" aria-label={`Restore ${pos.positionName}`} onPress={() => onRestore?.(pos.id, pos.positionName)}>
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
            <Pagination.Summary>{startItem} to {endItem} of {totalItems} results</Pagination.Summary>
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous isDisabled={currentPage === 1} onPress={() => onPageChange?.(currentPage - 1)}>
                  <Pagination.PreviousIcon /> Previous
                </Pagination.Previous>
              </Pagination.Item>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Pagination.Item key={p}>
                  <Pagination.Link isActive={p === currentPage} onPress={() => onPageChange?.(p)}>{p}</Pagination.Link>
                </Pagination.Item>
              ))}
              <Pagination.Item>
                <Pagination.Next isDisabled={currentPage === totalPages} onPress={() => onPageChange?.(currentPage + 1)}>
                  Next <Pagination.NextIcon />
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
  userCount: number;
  depth: number;
  hasChildren: boolean;
  isDeleted: boolean;
}

function buildTreeRows(nodes: PositionTree[], expandedIds: Set<string>, depth: number): TreeRow[] {
  const rows: TreeRow[] = [];
  for (const node of nodes) {
    rows.push({
      id: node.id,
      positionName: node.positionName,
      positionCode: node.positionCode,
      unitName: node.unitName ?? null,
      userCount: (node.assignedUsers ?? []).length,
      depth,
      hasChildren: node.children.length > 0,
      isDeleted: !!node.deletedAt,
    });
    if (node.children.length > 0 && expandedIds.has(node.id)) {
      rows.push(...buildTreeRows(node.children, expandedIds, depth + 1));
    }
  }
  return rows;
}
