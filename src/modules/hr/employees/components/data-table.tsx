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
import { useAuthStore } from '@/store/auth-store';
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
  const user = useAuthStore((s) => s.user);
  const hasPerm = (perm: string) => (user?.permissions ?? []).includes(perm);

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
        <Table.Content aria-label="Data Karyawan" className="min-w-[700px]">
          <Table.Header>
            <Table.Column id="nip" isRowHeader>NIP</Table.Column>
            <Table.Column id="nama">Nama</Table.Column>
            <Table.Column id="email">Email</Table.Column>
            <Table.Column id="jabatan">Jabatan</Table.Column>
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
                  <span className="text-sm">Tidak ada data</span>
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
                  className={isDeleted ? 'opacity-50' : ''}
                >
                  <Table.Cell className={`font-medium ${isDeleted ? 'text-gray-400 line-through' : 'text-foreground'}`}>
                    <div className="flex items-center gap-1">
                      {emp.nip || '-'}
                      {emp.nip && !isDeleted && (
                        <Button
                          isIconOnly
                          variant="ghost"
                          size="sm"
                          aria-label={`Salin NIP ${emp.nip}`}
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
                      <span className="font-medium italic text-gray-400">{emp.fullName}</span>
                    ) : hasPerm('employee:read') ? (
                      <Link
                        href={`/hr/employees/${emp.id}`}
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
                    {emp.primaryPosition ? emp.primaryPosition.positionName : '—'}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center justify-end gap-1">
                      {isDeleted ? (
                        // Deleted row: only show restore button
                        hasPerm('employee:restore') && (
                          <Button
                            variant="primary"
                            size="sm"
                            aria-label={`Pulihkan ${emp.fullName}`}
                            onPress={() => onRestore(emp)}
                          >
                            <ArrowCounterClockwise className="h-4 w-4" />
                            Pulihkan
                          </Button>
                        )
                      ) : (
                        // Active row: normal actions
                        <>
                          {hasPerm('employee:read') && (
                            <Button
                              isIconOnly
                              variant="tertiary"
                              size="sm"
                              aria-label={`Detail ${emp.fullName}`}
                              onPress={() => {}}
                            >
                              <Link href={`/hr/employees/${emp.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                          {hasPerm('employee:update') && (
                            <Button
                              isIconOnly
                              variant="tertiary"
                              size="sm"
                              aria-label={`Edit ${emp.fullName}`}
                              onPress={() => {}}
                            >
                              <Link href={`/hr/employees/${emp.id}/edit`}>
                                <PencilSimple className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                          {hasPerm('employee:delete') && (
                            <Button
                              isIconOnly
                              variant="danger-soft"
                              size="sm"
                              aria-label={`Hapus ${emp.fullName}`}
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
              {startItem} to {endItem} of {totalItems} hasil
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
                  Selanjutnya
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
