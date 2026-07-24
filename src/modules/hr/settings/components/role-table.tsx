'use client';

import Link from 'next/link';
import { Eye, PencilSimple, Trash, ArrowCounterClockwise, Tray } from '@phosphor-icons/react';
import { Table, Button } from '@heroui/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import type { Role } from '../types';

interface RoleTableProps {
  roles: Role[];
  includeDeleted?: boolean;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (role: Role) => void;
  onRestore: (id: number) => void;
}

export function RoleTable({ roles, includeDeleted, onView, onEdit, onDelete, onRestore }: RoleTableProps) {
  const { hasPerm } = usePermission();

  if (roles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <Tray className="h-8 w-8" />
        <span className="text-sm">No data available</span>
      </div>
    );
  }

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Role List" className="min-w-[700px]">
          <Table.Header>
            <Table.Column id="code" isRowHeader>Code</Table.Column>
            <Table.Column id="name">Name</Table.Column>
            <Table.Column id="description">Description</Table.Column>
            <Table.Column id="permissions">Permissions</Table.Column>
            <Table.Column id="actions" className="text-right">Actions</Table.Column>
          </Table.Header>
          <Table.Body>
            {roles.map((role) => (
              <Table.Row key={role.id} id={String(role.id)}>
                <Table.Cell className={`font-medium ${role.deletedAt ? 'text-gray-400 line-through' : 'text-foreground'}`}>
                  {role.roleCode}
                </Table.Cell>
                <Table.Cell className={`font-medium ${role.deletedAt ? 'text-gray-400' : 'text-foreground'}`}>
                  {role.deletedAt ? (
                    <span>{role.roleName}</span>
                  ) : (
                    <Link href={`/hr/settings/roles/${role.id}`} className="text-foreground hover:underline font-medium">
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
                      hasPerm(PERM.ROLE_RESTORE) && (
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
                        {hasPerm(PERM.ROLE_READ) && (
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
                        {hasPerm(PERM.ROLE_UPDATE) && (
                          <Link href={`/hr/settings/roles/${role.id}/edit`}>
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
                        {hasPerm(PERM.ROLE_DELETE) && (
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
    </Table>
  );
}