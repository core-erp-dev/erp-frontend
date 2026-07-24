'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { Eye, PencilSimple, Trash, Copy, Check, Tray, ArrowCounterClockwise } from '@phosphor-icons/react';
import {
  Table,
  Spinner,
  Button,
  Pagination,
} from '@heroui/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { CoreUser, PaginatedResponse } from '../types';

interface DataTableProps {
  users: CoreUser[];
  isLoading?: boolean;
  pagination: PaginatedResponse<CoreUser> | null;
  onPageChange: (page: number) => void;
  onDelete: (user: CoreUser) => void;
  onRestore: (user: CoreUser) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  users,
  isLoading = false,
  pagination,
  onPageChange,
  onDelete,
  onRestore,
}) => {
  const { hasPerm } = usePermission();

  const currentPage = pagination ? pagination.page : 1;
  const totalPages = pagination ? pagination.totalPages : 1;
  const totalItems = pagination ? pagination.totalElements : 0;
  const pageSize = pagination?.size ?? 10;
  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyNip = useCallback((userId: string, nip: string) => {
    navigator.clipboard.writeText(nip);
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 3000);
  }, []);

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Employee Data" className="min-w-[700px]">
          <Table.Header>
            <Table.Column id="nip" isRowHeader>NIP</Table.Column>
            <Table.Column id="nama">Name</Table.Column>
            <Table.Column id="email">Email</Table.Column>
            <Table.Column id="jabatan">Position</Table.Column>
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
            {users.map((emp) => {
              const isDeleted = !!emp.deletedAt;
              return (
                <Table.Row
                  key={emp.id}
                  id={emp.id}
                  className=""
                >
                  <Table.Cell className={`font-medium ${isDeleted ? 'text-gray-400 line-through' : 'text-foreground'}`}>
                    <div className="flex items-center gap-1">
                      {emp.nip || '-'}
                      {emp.nip && !isDeleted && (
                        <Button
                          isIconOnly
                          variant="ghost"
                          size="sm"
                          aria-label={`Copy NIP ${emp.nip}`}
                          onPress={() => handleCopyNip(emp.id, emp.nip!)}
                        >
                          {copiedId === emp.id ? (
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
                      <span className="font-medium text-gray-400">{emp.fullName}</span>
                    ) : hasPerm(PERM.USER_READ) ? (
                      <Link
                        href={`/hr/organization/employees/${emp.id}`}
                        className="text-foreground hover:underline font-medium"
                      >
                        {emp.fullName}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground">{emp.fullName}</span>
                    )}
                  </Table.Cell>
                  <Table.Cell className={isDeleted ? 'text-gray-400' : 'text-muted-foreground'}>
                    {emp.email}
                  </Table.Cell>
                  <Table.Cell className={isDeleted ? 'text-gray-400' : ''}>
                    {(() => {
                      const activePositions = (emp.positions ?? []).filter(p => p.isActive);
                      if (activePositions.length === 0) return '-';
                      const primary = activePositions.find(p => p.isPrimary);
                      const others = activePositions.filter(p => !p.isPrimary);
                      return (
                        <div className="flex items-center gap-1.5">
                          {primary && (
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              {primary.positionName}
                            </span>
                          )}
                          {!primary && activePositions.length > 0 && (
                            <span className="text-sm text-foreground">{activePositions[0].positionName}</span>
                          )}
                          {others.length > 0 && (
                            <span
                              className="inline-flex cursor-help items-center rounded-full bg-surface-secondary px-1.5 py-0.5 text-xs text-muted-foreground"
                              title={others.map(p => `${p.positionName} (Secondary)`).join('\n')}
                            >
                              +{others.length}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center justify-end gap-1">
                      {isDeleted ? (
                        // Deleted row: only show restore button
                        hasPerm(PERM.USER_RESTORE) && (
                          <Button
                            isIconOnly
                            variant="tertiary"
                            size="sm"
                            aria-label={`Restore ${emp.fullName}`}
                            onPress={() => onRestore(emp)}
                          >
                            <ArrowCounterClockwise className="h-4 w-4" />
                          </Button>
                        )
                      ) : (
                        // Active row: normal actions
                        <>
                          {hasPerm(PERM.USER_READ) && (
                            <Button
                              isIconOnly
                              variant="tertiary"
                              size="sm"
                              aria-label={`View ${emp.fullName}`}
                              onPress={() => {}}
                            >
                              <Link href={`/hr/organization/employees/${emp.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                          {hasPerm(PERM.USER_UPDATE) && (
                            <Button
                              isIconOnly
                              variant="tertiary"
                              size="sm"
                              aria-label={`Edit ${emp.fullName}`}
                              onPress={() => {}}
                            >
                              <Link href={`/hr/organization/employees/${emp.id}/edit`}>
                                <PencilSimple className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                          {hasPerm(PERM.USER_DELETE) && (
                            <Button
                              isIconOnly
                              variant="danger-soft"
                              size="sm"
                              aria-label={`Delete ${emp.fullName}`}
                              onPress={() => onDelete(emp)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          )}
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
              {startItem} to {endItem} of {totalItems} results
            </Pagination.Summary>
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous
                  isDisabled={currentPage === 1}
                  onPress={() => onPageChange(currentPage - 1)}
                >
                  <Pagination.PreviousIcon />
                  Previous
                </Pagination.Previous>
              </Pagination.Item>
              {pages.map((p) => (
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
                  Next
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
