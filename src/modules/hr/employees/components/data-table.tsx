'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { Eye, PencilSimple, Trash, Copy, Check, Tray } from '@phosphor-icons/react';
import {
  Table,
  Spinner,
  Button,
  Pagination,
} from '@heroui/react';
import { CoreUser, PaginatedResponse } from '../types';

interface DataTableProps {
  users: CoreUser[];
  isLoading?: boolean;
  searchQuery?: string;
  pagination: PaginatedResponse<CoreUser> | null;
  onPageChange: (page: number) => void;
  onEdit: (user: CoreUser) => void;
  onDelete: (user: CoreUser) => void;
  onAssignPosition: (user: CoreUser) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  users,
  isLoading = false,
  searchQuery = '',
  pagination,
  onPageChange,
  onEdit,
  onDelete,
  onAssignPosition,
}) => {
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
            {users.map((user) => (
              <Table.Row key={user.id} id={user.id}>
                <Table.Cell className="font-medium text-foreground">
                  <div className="flex items-center gap-1">
                    {user.nip || '-'}
                    {user.nip && (
                      <Button
                        isIconOnly
                        variant="ghost"
                        size="sm"
                        aria-label={`Salin NIP ${user.nip}`}
                        onPress={() => handleCopyNip(user.id, user.nip!)}
                      >
                        {copiedId === user.id ? (
                          <Check className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                    )}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <Link
                    href={`/hr/employees/${user.id}`}
                    className="text-foreground hover:underline font-medium"
                  >
                    {user.fullName}
                  </Link>
                </Table.Cell>
                <Table.Cell className="text-muted-foreground">{user.email}</Table.Cell>
                <Table.Cell>
                  {user.primaryPosition ? user.primaryPosition.positionName : '—'}
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      isIconOnly
                      variant="tertiary"
                      size="sm"
                      aria-label={`Detail ${user.fullName}`}
                      onPress={() => onAssignPosition(user)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      isIconOnly
                      variant="tertiary"
                      size="sm"
                      aria-label={`Edit ${user.fullName}`}
                      onPress={() => onEdit(user)}
                    >
                      <PencilSimple className="h-4 w-4" />
                    </Button>
                    <Button
                      isIconOnly
                      variant="danger-soft"
                      size="sm"
                      aria-label={`Hapus ${user.fullName}`}
                      onPress={() => onDelete(user)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
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
