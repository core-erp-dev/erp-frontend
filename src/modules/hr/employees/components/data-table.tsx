'use client';

import React from 'react';
import { Edit, Trash2, UserPlus, MoreVertical } from 'lucide-react';
import {
  Table,
  Dropdown,
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
  const currentPage = pagination ? pagination.page + 1 : 1;
  const totalPages = pagination ? pagination.totalPages : 1;
  const totalItems = pagination ? pagination.totalElements : 0;
  const startItem = totalItems > 0 ? (currentPage - 1) * (pagination?.size ?? 10) + 1 : 0;
  const endItem = Math.min(currentPage * (pagination?.size ?? 10), totalItems);

  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-4">
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Data Karyawan" className="min-w-200">
            <Table.Header>
              <Table.Column id="nip" isRowHeader>NIP</Table.Column>
              <Table.Column id="nama">Nama</Table.Column>
              <Table.Column id="email">Email</Table.Column>
              <Table.Column id="jabatan">Jabatan</Table.Column>
              <Table.Column id="role">Role</Table.Column>
              <Table.Column id="actions" aria-label="Aksi" className="w-16 text-center">{''}</Table.Column>
            </Table.Header>
            <Table.Body
              renderEmptyState={() =>
                isLoading ? (
                  <div className="flex h-24 items-center justify-center">
                    <Spinner size="md" />
                  </div>
                ) : (
                  <div className="flex h-24 flex-col items-center justify-center gap-2 text-muted-foreground">
                    <span className="text-sm">
                      {searchQuery
                        ? 'Tidak ada karyawan yang cocok dengan pencarian.'
                        : 'Tidak ada data karyawan.'}
                    </span>
                  </div>
                )
              }
            >
              {users.map((user) => (
                <Table.Row key={user.id} id={user.id}>
                  <Table.Cell className="font-medium text-foreground">
                    {user.nip || '-'}
                  </Table.Cell>
                  <Table.Cell>{user.fullName}</Table.Cell>
                  <Table.Cell className="text-muted-foreground">{user.email}</Table.Cell>
                  <Table.Cell>
                    {user.primaryPosition ? user.primaryPosition.positionName : '—'}
                  </Table.Cell>
                  <Table.Cell>
                    {user.roles?.length > 0 ? (
                      user.roles[0].description || user.roles[0].roleCode
                    ) : (
                      <span className="text-sm italic text-muted-foreground">
                        Tanpa Role
                      </span>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex justify-end">
                      <Dropdown>
                          <Button
                            isIconOnly
                            variant="tertiary"
                            size="sm"
                            aria-label={`Aksi untuk ${user.fullName}`}
                          >
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        <Dropdown.Popover placement="bottom right" className="min-w-48">
                          <Dropdown.Menu
                            aria-label={`Menu aksi untuk ${user.fullName}`}
                            onAction={(key) => {
                              if (key === 'assign') onAssignPosition(user);
                              if (key === 'edit') onEdit(user);
                              if (key === 'delete') onDelete(user);
                            }}
                          >
                            <Dropdown.Item id="assign" textValue="Atur Jabatan">
                              <div className="flex items-center gap-2">
                                <UserPlus className="h-4 w-4 text-muted-foreground" />
                                <span>Atur Jabatan</span>
                              </div>
                            </Dropdown.Item>
                            <Dropdown.Item id="edit" textValue="Edit Profil">
                              <div className="flex items-center gap-2">
                                <Edit className="h-4 w-4 text-muted-foreground" />
                                <span>Edit Profil</span>
                              </div>
                            </Dropdown.Item>
                            <Dropdown.Item id="delete" textValue="Hapus" variant="danger">
                              <div className="flex items-center gap-2 text-danger">
                                <Trash2 className="h-4 w-4" />
                                <span>Hapus</span>
                              </div>
                            </Dropdown.Item>
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

      {!isLoading && totalItems > 0 && (
        <Pagination className="w-full">
          <Pagination.Summary>
            Menampilkan {startItem}-{endItem} dari {totalItems} hasil
          </Pagination.Summary>
          <Pagination.Content>
            <Pagination.Item>
              <Pagination.Previous isDisabled={currentPage === 1} onPress={() => onPageChange(currentPage - 1)}>
                <Pagination.PreviousIcon />
                <span>Sebelumnya</span>
              </Pagination.Previous>
            </Pagination.Item>
            {getPageNumbers().map((p, i) =>
              p === 'ellipsis' ? (
                <Pagination.Item key={`ellipsis-${i}`}>
                  <Pagination.Ellipsis />
                </Pagination.Item>
              ) : (
                <Pagination.Item key={p}>
                  <Pagination.Link isActive={p === currentPage} onPress={() => onPageChange(p)}>
                    {p}
                  </Pagination.Link>
                </Pagination.Item>
              ),
            )}
            <Pagination.Item>
              <Pagination.Next isDisabled={currentPage === totalPages} onPress={() => onPageChange(currentPage + 1)}>
                <span>Selanjutnya</span>
                <Pagination.NextIcon />
              </Pagination.Next>
            </Pagination.Item>
          </Pagination.Content>
        </Pagination>
      )}
    </div>
  );
};
