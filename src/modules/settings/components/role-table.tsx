'use client';

import Link from 'next/link';
import { Eye, PencilSimple, Trash, ArrowCounterClockwise, Tray } from '@phosphor-icons/react';
import { Table, Button, Spinner, Pagination } from '@heroui/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import type { Role } from '../types';
import type { PaginatedResponse } from '@/types/api';

interface RoleTableProps {
  roles: Role[];
  isLoading?: boolean;
  pagination: PaginatedResponse<Role> | null;
  onPageChange: (page: number) => void;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (role: Role) => void;
  onRestore: (id: number) => void;
}

export function RoleTable({ roles, isLoading = false, pagination, onPageChange, onView, onEdit, onDelete, onRestore }: RoleTableProps) {
  const { hasPerm, hasAnyPerm } = usePermission();

  const currentPage = pagination ? pagination.page : 1;
  const totalPages = pagination ? pagination.totalPages : 1;
  const totalItems = pagination ? pagination.totalElements : 0;
  const pageSize = pagination?.size ?? 10;
  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Role List" className="min-w-[700px]">
          <Table.Header>
            <Table.Column id="code" isRowHeader>Code</Table.Column>
            <Table.Column id="name">Name</Table.Column>
            <Table.Column id="description">Description</Table.Column>
            <Table.Column id="permissions">Permissions</Table.Column>
            <Table.Column id="actions" className="text-center">{''}</Table.Column>
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
            {roles.map((role) => (
              <Table.Row key={role.id} id={String(role.id)}>
                <Table.Cell className={`font-medium ${role.deletedAt ? 'text-gray-400 line-through' : 'text-foreground'}`}>
                  {role.roleCode}
                </Table.Cell>
                <Table.Cell className={`font-medium ${role.deletedAt ? 'text-gray-400' : 'text-foreground'}`}>
                  {role.deletedAt ? (
                    <span>{role.roleName}</span>
                  ) : (
                    <Link href={`/settings/roles/${role.id}`} className="text-foreground hover:underline font-medium">
                      {role.roleName}
                    </Link>
                  )}
                </Table.Cell>
                <Table.Cell className={role.deletedAt ? 'text-gray-400' : 'text-muted-foreground'}>
                  {role.description || '-'}
                </Table.Cell>
                <Table.Cell>
                  <span className={`rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium ${role.deletedAt ? 'text-gray-600' : 'text-gray-600'}`}>
                    {role.permissions.length}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center justify-end gap-1">
                    {role.deletedAt ? (
                      hasPerm(PERM.ROLE_MANAGE) && (
                        <Button
                          isIconOnly
                          variant="tertiary"
                          size="sm"
                          aria-label={`Restore ${role.roleName}`}
                          onPress={() => onRestore(role.id)}
                        >
                          <ArrowCounterClockwise className="h-4 w-4" />
                        </Button>
                      )
                    ) : (
                      <>
                        {hasAnyPerm(PERM.ROLE_READ, PERM.ROLE_MANAGE) && (
                          <Button
                            isIconOnly
                            variant="tertiary"
                            size="sm"
                            aria-label={`View ${role.roleName}`}
                            onPress={() => onView(role.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {hasPerm(PERM.ROLE_MANAGE) && (
                          <Link href={`/settings/roles/${role.id}/edit`}>
                            <Button
                              isIconOnly
                              variant="tertiary"
                              size="sm"
                              aria-label={`Edit ${role.roleName}`}
                              onPress={() => {}}
                            >
                              <PencilSimple className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                        {hasPerm(PERM.ROLE_MANAGE) && (
                          <Button
                            isIconOnly
                            variant="danger-soft"
                            size="sm"
                            aria-label={`Delete ${role.roleName}`}
                            onPress={() => onDelete(role)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
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
}
