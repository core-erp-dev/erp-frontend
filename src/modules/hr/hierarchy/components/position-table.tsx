'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DotsThreeVertical, Eye, PencilSimple, Trash, Plus, Tray, CaretRight, CaretDown, TreeStructure } from '@phosphor-icons/react';
import { Table, Spinner, Button, Pagination, Dropdown } from '@heroui/react';
import { useAuthStore } from '@/store/auth-store';
import type { PositionTree } from '../types';

interface PositionTableProps {
  positions: PositionTree[];
  isLoading?: boolean;
  totalItems: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onDelete: (pos: PositionTree) => void;
  viewMode: 'table' | 'tree';
  expandedIds?: Set<string>;
  onToggleExpand?: (id: string) => void;
}

export const PositionTable: React.FC<PositionTableProps> = ({
  positions,
  isLoading = false,
  totalItems,
  page,
  pageSize,
  onPageChange,
  onDelete,
  viewMode,
  expandedIds = new Set(),
  onToggleExpand,
}) => {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hasPerm = (perm: string) => (user?.permissions ?? []).includes(perm);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, totalItems);

  const renderActions = (pos: PositionTree) => (
    <Dropdown>
      <Button isIconOnly variant="ghost" size="sm" aria-label={`Aksi ${pos.positionName}`}>
        <DotsThreeVertical className="h-4 w-4" />
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu>
          {hasPerm('position:read') && (
            <Dropdown.Item key="detail" id="detail" textValue="Detail">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>Detail</span>
              </div>
            </Dropdown.Item>
          )}
          {hasPerm('position:update') && (
            <Dropdown.Item key="edit" id="edit" textValue="Edit">
              <div className="flex items-center gap-2">
                <PencilSimple className="h-4 w-4" />
                <span>Edit</span>
              </div>
            </Dropdown.Item>
          )}
          {hasPerm('position:create') && (
            <Dropdown.Item key="add-child" id="add-child" textValue="Tambah Bawahan">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span>Tambah Bawahan</span>
              </div>
            </Dropdown.Item>
          )}
          {hasPerm('position:delete') && (
            <Dropdown.Item key="delete" id="delete" textValue="Hapus" variant="danger">
              <div className="flex items-center gap-2">
                <Trash className="h-4 w-4" />
                <span>Hapus</span>
              </div>
            </Dropdown.Item>
          )}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );

  // Handle dropdown actions via onAction
  const handleAction = (pos: PositionTree, key: React.Key) => {
    switch (key) {
      case 'detail':
        router.push(`/hr/positions/${pos.id}`);
        break;
      case 'edit':
        router.push(`/hr/positions/${pos.id}/edit`);
        break;
      case 'add-child':
        router.push(`/hr/positions/create?parentId=${pos.id}`);
        break;
      case 'delete':
        onDelete(pos);
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <Tray className="h-8 w-8" />
        <span className="text-sm">Tidak ada data</span>
      </div>
    );
  }

  // Tree View: flatten with indentation
  if (viewMode === 'tree') {
    const treeRows = buildTreeRows(positions, expandedIds, 0);
    return (
      <Table key={viewMode}>
        <Table.ScrollContainer>
          <Table.Content aria-label="Struktur Jabatan" className="min-w-[700px]">
            <Table.Header>
              <Table.Column id="name" isRowHeader>Nama Jabatan</Table.Column>
              <Table.Column id="code">Kode</Table.Column>
              <Table.Column id="users">Karyawan</Table.Column>
              <Table.Column id="actions" className="text-center">{''}</Table.Column>
            </Table.Header>
            <Table.Body>
              {treeRows.map((row) => (
                <Table.Row key={row.id} id={row.id}>
                  <Table.Cell>
                    <div className="flex items-center" style={{ paddingLeft: row.depth * 24 }}>
                      {row.hasChildren ? (
                        <button
                          onClick={() => onToggleExpand?.(row.id)}
                          className="mr-1 flex h-5 w-5 items-center justify-center rounded hover:bg-gray-100"
                        >
                          {expandedIds.has(row.id) ? (
                            <CaretDown className="h-3.5 w-3.5 text-gray-500" />
                          ) : (
                            <CaretRight className="h-3.5 w-3.5 text-gray-500" />
                          )}
                        </button>
                      ) : (
                        <span className="mr-1 w-5" />
                      )}
                      <TreeStructure className="mr-2 h-4 w-4 text-[#006FEE]" />
                      <span className="font-medium text-foreground">{row.positionName}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="font-mono text-xs text-muted-foreground">
                    {row.positionCode}
                  </Table.Cell>
                  <Table.Cell>
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                      {row.userCount}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex justify-end">
                      <Dropdown>
                        <Button isIconOnly variant="ghost" size="sm" aria-label={`Aksi ${row.positionName}`}>
                          <DotsThreeVertical className="h-4 w-4" />
                        </Button>
                        <Dropdown.Popover>
                          <Dropdown.Menu onAction={(key) => handleAction(row.original, key)}>
                            {hasPerm('position:read') && (
                              <Dropdown.Item key="detail" textValue="Detail">
                                <div className="flex items-center gap-2"><Eye className="h-4 w-4" /><span>Detail</span></div>
                              </Dropdown.Item>
                            )}
                            {hasPerm('position:update') && (
                              <Dropdown.Item key="edit" textValue="Edit">
                                <div className="flex items-center gap-2"><PencilSimple className="h-4 w-4" /><span>Edit</span></div>
                              </Dropdown.Item>
                            )}
                            {hasPerm('position:create') && (
                              <Dropdown.Item key="add-child" textValue="Tambah Bawahan">
                                <div className="flex items-center gap-2"><Plus className="h-4 w-4" /><span>Tambah Bawahan</span></div>
                              </Dropdown.Item>
                            )}
                            {hasPerm('position:delete') && (
                              <Dropdown.Item key="delete" textValue="Hapus" variant="danger">
                                <div className="flex items-center gap-2"><Trash className="h-4 w-4" /><span>Hapus</span></div>
                              </Dropdown.Item>
                            )}
                          </Dropdown.Menu>
                        </Dropdown.Popover>
                      </Dropdown>
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

  // Table View: flat with pagination
  return (
    <Table key={viewMode}>
      <Table.ScrollContainer>
        <Table.Content aria-label="Daftar Jabatan" className="min-w-[700px]">
          <Table.Header>
            <Table.Column id="code" isRowHeader>Kode</Table.Column>
            <Table.Column id="name">Nama Jabatan</Table.Column>
            <Table.Column id="parent">Lapor Ke</Table.Column>
            <Table.Column id="users">Karyawan</Table.Column>
            <Table.Column id="actions" className="text-center">{''}</Table.Column>
          </Table.Header>
          <Table.Body>
            {positions.map((pos) => (
              <Table.Row key={pos.id} id={pos.id}>
                <Table.Cell className="font-mono text-xs text-muted-foreground">
                  {pos.positionCode}
                </Table.Cell>
                <Table.Cell className="font-medium text-foreground">
                  {pos.positionName}
                </Table.Cell>
                <Table.Cell className="text-muted-foreground">
                  {pos.parentName || '—'}
                </Table.Cell>
                <Table.Cell>
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                    {(pos.assignedUsers ?? []).length}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex justify-end">
                    <Dropdown>
                      <Button isIconOnly variant="ghost" size="sm" aria-label={`Aksi ${pos.positionName}`}>
                        <DotsThreeVertical className="h-4 w-4" />
                      </Button>
                      <Dropdown.Popover>
                        <Dropdown.Menu onAction={(key) => handleAction(pos, key)}>
                          {hasPerm('position:read') && (
                            <Dropdown.Item key="detail" textValue="Detail">
                              <div className="flex items-center gap-2"><Eye className="h-4 w-4" /><span>Detail</span></div>
                            </Dropdown.Item>
                          )}
                          {hasPerm('position:update') && (
                            <Dropdown.Item key="edit" textValue="Edit">
                              <div className="flex items-center gap-2"><PencilSimple className="h-4 w-4" /><span>Edit</span></div>
                            </Dropdown.Item>
                          )}
                          {hasPerm('position:create') && (
                            <Dropdown.Item key="add-child" textValue="Tambah Bawahan">
                              <div className="flex items-center gap-2"><Plus className="h-4 w-4" /><span>Tambah Bawahan</span></div>
                            </Dropdown.Item>
                          )}
                          {hasPerm('position:delete') && (
                            <Dropdown.Item key="delete" textValue="Hapus" variant="danger">
                              <div className="flex items-center gap-2"><Trash className="h-4 w-4" /><span>Hapus</span></div>
                            </Dropdown.Item>
                          )}
                        </Dropdown.Menu>
                      </Dropdown.Popover>
                    </Dropdown>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>

      {totalItems > pageSize && (
        <Table.Footer>
          <Pagination size="sm">
            <Pagination.Summary>
              {startItem} to {endItem} of {totalItems} hasil
            </Pagination.Summary>
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous isDisabled={page === 1} onPress={() => onPageChange(page - 1)}>
                  <Pagination.PreviousIcon /> Sebelumnya
                </Pagination.Previous>
              </Pagination.Item>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Pagination.Item key={p}>
                  <Pagination.Link isActive={p === page} onPress={() => onPageChange(p)}>
                    {p}
                  </Pagination.Link>
                </Pagination.Item>
              ))}
              <Pagination.Item>
                <Pagination.Next isDisabled={page === totalPages} onPress={() => onPageChange(page + 1)}>
                  Selanjutnya <Pagination.NextIcon />
                </Pagination.Next>
              </Pagination.Item>
            </Pagination.Content>
          </Pagination>
        </Table.Footer>
      )}
    </Table>
  );
};

// ─── Tree Row Builder ────────────────────────────────────────

interface TreeRow {
  id: string;
  positionName: string;
  positionCode: string;
  userCount: number;
  depth: number;
  hasChildren: boolean;
  original: PositionTree;
}

function buildTreeRows(
  nodes: PositionTree[],
  expandedIds: Set<string>,
  depth: number,
): TreeRow[] {
  const rows: TreeRow[] = [];
  for (const node of nodes) {
    rows.push({
      id: node.id,
      positionName: node.positionName,
      positionCode: node.positionCode,
      userCount: (node.assignedUsers ?? []).length,
      depth,
      hasChildren: node.children.length > 0,
      original: node,
    });
    if (node.children.length > 0 && expandedIds.has(node.id)) {
      rows.push(...buildTreeRows(node.children, expandedIds, depth + 1));
    }
  }
  return rows;
}
