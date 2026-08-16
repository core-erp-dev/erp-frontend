'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DotsThreeVertical, Eye, PencilSimple, Trash, Plus, Tray, CaretRight, CaretDown, ArrowCounterClockwise, Copy, Check } from '@phosphor-icons/react';
import { Table, Spinner, Button, Chip, Pagination, Dropdown } from '@heroui/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import type { OrganizationUnitResponse } from '../types';
import { UNIT_TYPE_LABEL_ID, UNIT_TYPE_CHIP_COLOR } from '../types';
import type { PaginatedResponse } from '@/types/api';

interface OrgUnitTableProps {
  units: OrganizationUnitResponse[];
  isLoading?: boolean;
  error?: string | null;
  pagination: PaginatedResponse<OrganizationUnitResponse> | null;
  onPageChange: (page: number) => void;
  onDelete: (unit: OrganizationUnitResponse) => void;
  onRestore: (unit: OrganizationUnitResponse) => void;
  treeUnits?: OrganizationUnitResponse[];
  expandedIds?: Set<string>;
  onToggleExpand?: (id: string) => void;
  viewMode: 'table' | 'tree';
}

export const OrgUnitTable: React.FC<OrgUnitTableProps> = ({
  units,
  isLoading = false,
  error = null,
  pagination,
  onPageChange,
  onDelete,
  onRestore,
  treeUnits = [],
  expandedIds = new Set(),
  onToggleExpand,
  viewMode,
}) => {
  const router = useRouter();
  const { hasPerm, hasAnyPerm } = usePermission();

  const currentPage = pagination ? pagination.page : 1;
  const totalPages = pagination ? pagination.totalPages : 1;
  const totalItems = pagination ? pagination.totalElements : 0;
  const pageSize = pagination?.size ?? 10;
  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopyCode = useCallback((unitId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(unitId);
    setTimeout(() => setCopiedId(null), 3000);
  }, []);

  // ── Inline action buttons (Detail + Edit) — shared by Table and Tree views ──
  const renderInlineActions = (id: string, name: string) => (
    <>
      {hasAnyPerm(PERM.ORGANIZATION_UNIT_READ, PERM.ORGANIZATION_UNIT_MANAGE) && (
        <Button
          isIconOnly
          variant="tertiary"
          size="sm"
          aria-label={`Lihat ${name}`}
          onPress={() => router.push(`/organization/organization-units/${id}`)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      )}
      {hasPerm(PERM.ORGANIZATION_UNIT_MANAGE) && (
        <Button
          isIconOnly
          variant="tertiary"
          size="sm"
          aria-label={`Ubah ${name}`}
          onPress={() => router.push(`/organization/organization-units/${id}/edit`)}
        >
          <PencilSimple className="h-4 w-4" />
        </Button>
      )}
    </>
  );

  // ── More menu (Add Subordinate + Delete) — shared by Table and Tree views ──
  // Every action inside requires organization_unit:manage; hide the trigger
  // entirely for read-only users instead of rendering an empty menu.
  const renderMoreMenu = (id: string, name: string) => {
    if (!hasPerm(PERM.ORGANIZATION_UNIT_MANAGE)) return null;
    return (
    <Dropdown>
      <Button isIconOnly variant="tertiary" size="sm" aria-label={`Aksi lainnya untuk ${name}`}>
        <DotsThreeVertical className="h-4 w-4" />
      </Button>
      <Dropdown.Popover placement="top">
        <Dropdown.Menu onAction={(key) => {
          if (key === 'add-child') router.push(`/organization/organization-units/create?parentId=${id}&from=list`);
          if (key === 'delete') {
            onDelete({ id, unitName: name } as unknown as OrganizationUnitResponse);
          }
        }}>
          {hasPerm(PERM.ORGANIZATION_UNIT_MANAGE) && (
            <Dropdown.Item id="add-child" textValue="Tambah Unit Bawahan">
              <Plus className="h-4 w-4 text-muted-foreground" />
              <span>Tambah Unit Bawahan</span>
            </Dropdown.Item>
          )}
          {hasPerm(PERM.ORGANIZATION_UNIT_MANAGE) && (
            <Dropdown.Item id="delete" textValue="Hapus" variant="danger">
              <Trash className="h-4 w-4 text-danger" />
              <span className="text-danger">Hapus</span>
            </Dropdown.Item>
          )}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
    );
  };

  // ── TREE VIEW ──
  if (viewMode === 'tree') {
    const treeRows = buildTreeRows(treeUnits, expandedIds, 0);
    return (
      <Table key="tree">
        <Table.ScrollContainer>
          <Table.Content aria-label="Hierarki Unit Organisasi" className="min-w-[700px]">
            <Table.Header>
              <Table.Column id="tree-name" isRowHeader>Nama Unit</Table.Column>
              <Table.Column id="tree-code">Kode</Table.Column>
              <Table.Column id="tree-type">Jenis Unit</Table.Column>
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
                    <span className="text-sm">{error || 'Tidak ada data'}</span>
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
                      <Link href={`/organization/organization-units/${row.id}`} className="font-medium text-foreground hover:underline">
                        {row.unitName}
                      </Link>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-foreground">{row.unitCode}</span>
                      <Button
                        isIconOnly
                        variant="ghost"
                        size="sm"
                        aria-label={`Salin kode ${row.unitCode}`}
                        onPress={() => handleCopyCode(row.id, row.unitCode)}
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
                    <Chip size="sm" color={UNIT_TYPE_CHIP_COLOR[row.unitType] ?? 'default'} variant="soft">
                      {UNIT_TYPE_LABEL_ID[row.unitType] ?? row.unitType}
                    </Chip>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center justify-end gap-1">
                      {renderInlineActions(row.id, row.unitName)}
                      {renderMoreMenu(row.id, row.unitName)}
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
        <Table.Content aria-label="Data Unit Organisasi" className="min-w-[700px]">
          <Table.Header>
            <Table.Column id="unitCode" isRowHeader>Kode Unit</Table.Column>
            <Table.Column id="unitName">Nama Unit</Table.Column>
            <Table.Column id="unitType">Jenis Unit</Table.Column>
            <Table.Column id="parentName">Unit Induk</Table.Column>
            <Table.Column id="actions" aria-label="Aksi" className="text-center">{''}</Table.Column>
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
                  <span className="text-sm">{error || 'Tidak ada data'}</span>
                </div>
              )
            }
          >
            {units.map((unit) => {
              const isDeleted = !!unit.deletedAt;
              return (
                <Table.Row
                  key={unit.id}
                  id={unit.id}
                  className=""
                >
                  <Table.Cell className={`font-medium ${isDeleted ? 'text-gray-400 line-through' : 'text-foreground'}`}>
                    <div className="flex items-center gap-1">
                      {unit.unitCode}
                      {!isDeleted && (
                        <Button
                          isIconOnly
                          variant="ghost"
                          size="sm"
                          aria-label={`Salin kode unit ${unit.unitCode}`}
                          onPress={() => handleCopyCode(unit.id, unit.unitCode)}
                        >
                          {copiedId === unit.id ? (
                            <Check className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </Button>
                      )}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    {isDeleted ? (
                      <span className="font-medium text-gray-400">{unit.unitName}</span>
                    ) : hasAnyPerm(PERM.ORGANIZATION_UNIT_READ, PERM.ORGANIZATION_UNIT_MANAGE) ? (
                      <Link
                        href={`/organization/organization-units/${unit.id}`}
                        className="text-foreground hover:underline font-medium"
                      >
                        {unit.unitName}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground">{unit.unitName}</span>
                    )}
                  </Table.Cell>
                  <Table.Cell className={isDeleted ? 'text-gray-400' : ''}>
                    <Chip
                      size="sm"
                      color={UNIT_TYPE_CHIP_COLOR[unit.unitType] ?? 'default'}
                      variant="soft"
                    >
                      {UNIT_TYPE_LABEL_ID[unit.unitType] ?? unit.unitType}
                    </Chip>
                  </Table.Cell>
                  <Table.Cell className={isDeleted ? 'text-gray-400' : 'text-muted-foreground'}>
                    {unit.parentName || '-'}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center justify-end gap-1">
                      {isDeleted ? (
                        hasPerm(PERM.ORGANIZATION_UNIT_MANAGE) && (
                          <Button
                            isIconOnly
                            variant="tertiary"
                            size="sm"
                            aria-label={`Pulihkan ${unit.unitName}`}
                            onPress={() => onRestore(unit)}
                          >
                            <ArrowCounterClockwise className="h-4 w-4" />
                          </Button>
                        )
                      ) : (
                        <>
                          {renderInlineActions(unit.id, unit.unitName)}
                          {renderMoreMenu(unit.id, unit.unitName)}
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
            <Pagination.Summary>
              {startItem} sampai {endItem} dari {totalItems} hasil
            </Pagination.Summary>
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous
                  isDisabled={currentPage === 1}
                  onPress={() => onPageChange(currentPage - 1)}
                >
                  <Pagination.PreviousIcon />
                  Sebelumnya
                </Pagination.Previous>
              </Pagination.Item>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Pagination.Item key={p}>
                  <Pagination.Link
                    isActive={p === currentPage}
                    onPress={() => onPageChange(p)}
                  >
                    {p}
                  </Pagination.Link>
                </Pagination.Item>
              ))}
              <Pagination.Item>
                <Pagination.Next
                  isDisabled={currentPage === totalPages}
                  onPress={() => onPageChange(currentPage + 1)}
                >
                  Berikutnya
                  <Pagination.NextIcon />
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
  unitName: string;
  unitCode: string;
  unitType: string;
  depth: number;
  hasChildren: boolean;
}

function buildTreeRows(nodes: OrganizationUnitResponse[], expandedIds: Set<string>, depth: number): TreeRow[] {
  const rows: TreeRow[] = [];
  for (const node of nodes) {
    const children = node.children ?? [];
    rows.push({
      id: node.id,
      unitName: node.unitName,
      unitCode: node.unitCode,
      unitType: node.unitType,
      depth,
      hasChildren: children.length > 0,
    });
    if (children.length > 0 && expandedIds.has(node.id)) {
      rows.push(...buildTreeRows(children, expandedIds, depth + 1));
    }
  }
  return rows;
}
