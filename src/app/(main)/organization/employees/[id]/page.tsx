'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { House, ArrowLeft, DotsThreeVertical, PencilSimple, Trash, Eye, Tray } from '@phosphor-icons/react';
import { Button, TextField, Input, Label, Chip, Breadcrumbs, BreadcrumbsItem, Spinner, Dropdown, Alert, Separator, Table } from '@heroui/react';

import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { getGenderLabel } from '@/constants/gender';
import { formatDate } from '@/components/shared/detail-field';
import { useEmployeeDetail } from '@/modules/organization/employees/hooks/use-employee-detail';
import { employeeApi } from '@/modules/organization/employees/services/employee-api';
import type { PositionOption } from '@/modules/organization/employees/types';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { hasPerm, hasAnyPerm } = usePermission();

  const { employee, isLoading, error, deleteEmployee, isDeleting } = useEmployeeDetail(id);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Department lookup by position ID — same source/logic as the Add/Update Employee form
  const [departmentMap, setDepartmentMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!hasAnyPerm(PERM.POSITION_READ, PERM.POSITION_MANAGE)) return;
    let cancelled = false;
    employeeApi.getPositions()
      .then((tree) => {
        if (cancelled) return;
        const map = new Map<string, string>();
        const walk = (nodes: PositionOption[]) => {
          for (const node of nodes) {
            if (node.organizationUnit?.unitName) map.set(node.id, node.organizationUnit.unitName);
            if (node.children?.length) walk(node.children);
          }
        };
        walk(tree);
        setDepartmentMap(map);
      })
      .catch(() => {
        // Supplementary data — fail silently
      });
    return () => { cancelled = true; };
  }, [hasAnyPerm]);

  const handleDeleteConfirm = async () => {
    const success = await deleteEmployee();
    if (success) {
      setIsDeleteOpen(false);
      router.push('/organization/employees');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{error || 'Employee not found'}</Alert.Title>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  const pos = employee.primaryPosition;
  const showDropdown = hasPerm(PERM.USER_MANAGE);
  const activePositions = (employee.positions ?? []).filter(p => p.isActive);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/">
          <House className="h-4 w-4" />
        </BreadcrumbsItem>
        <BreadcrumbsItem>Organization</BreadcrumbsItem>
        <BreadcrumbsItem>Employees</BreadcrumbsItem>
        <BreadcrumbsItem>{employee.fullName}</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button isIconOnly variant="tertiary" onPress={() => router.back()} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">{employee.fullName}</h1>
        </div>
        {showDropdown && (
          <Dropdown>
            <Button isIconOnly variant="tertiary" aria-label="Employee options">
              <DotsThreeVertical className="h-5 w-5" />
            </Button>
            <Dropdown.Popover>
              <Dropdown.Menu onAction={(key) => {
                if (key === 'edit') router.push(`/organization/employees/${id}/edit`);
                if (key === 'delete') setIsDeleteOpen(true);
              }}>
                {hasPerm(PERM.USER_MANAGE) && (
                  <Dropdown.Item id="edit" textValue="Edit">
                    <div className="flex items-center gap-2">
                      <PencilSimple className="h-4 w-4 text-muted-foreground" />
                      <span>Edit</span>
                    </div>
                  </Dropdown.Item>
                )}
                {hasPerm(PERM.USER_MANAGE) && (
                  <Dropdown.Item id="delete" textValue="Delete" variant="danger">
                    <div className="flex items-center gap-2 text-danger">
                      <Trash className="h-4 w-4" />
                      <span>Delete</span>
                    </div>
                  </Dropdown.Item>
                )}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        )}
      </div>

      {/* Personal Information */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Personal Information</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Full Name</Label>
            <Input value={employee.fullName} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Gender</Label>
            <Input value={getGenderLabel(employee.gender)} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Date of Birth</Label>
            <Input value={formatDate(employee.birthDate)} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Phone Number</Label>
            <Input value={employee.phoneNumber || '-'} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Email</Label>
            <Input value={employee.email} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Address</Label>
            <Input value={employee.address || '-'} readOnly />
          </TextField>
        </div>
      </div>

      <Separator />

      {/* Employment Data */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Employment Data</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>NIP</Label>
            <Input value={employee.nip || '-'} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Position</Label>
            <Input value={pos?.positionName || '-'} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Join Date</Label>
            <Input value={formatDate(employee.joinDate || employee.createdAt)} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Role</Label>
            <Input value={employee.roles.map((r) => r.roleCode).join(', ') || '-'} readOnly />
          </TextField>
        </div>
      </div>

      <Separator />

      {/* Positions — mirrors the Add/Update Employee position table */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Positions</h2>
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Employee Positions" className="min-w-[500px]">
              <Table.Header>
                <Table.Column id="name" isRowHeader>Position Name</Table.Column>
                <Table.Column id="code">Code</Table.Column>
                <Table.Column id="department">Department</Table.Column>
                <Table.Column id="primary">Primary</Table.Column>
                <Table.Column id="actions" aria-label="Actions" className="text-center">{''}</Table.Column>
              </Table.Header>
              <Table.Body
                renderEmptyState={() =>
                  activePositions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                      <Tray className="h-8 w-8" />
                      <span className="text-sm">No positions assigned</span>
                    </div>
                  ) : null
                }
              >
                {activePositions.map((up) => (
                  <Table.Row key={up.id} id={up.id}>
                    <Table.Cell className="font-medium text-foreground">
                      {up.positionName}
                    </Table.Cell>
                    <Table.Cell className="text-muted-foreground">
                      {up.positionCode}
                    </Table.Cell>
                    <Table.Cell className="text-muted-foreground">
                      {departmentMap.get(up.positionId) || '-'}
                    </Table.Cell>
                    <Table.Cell>
                      {up.isPrimary ? (
                        <Chip size="sm" variant="soft" color="accent">Primary</Chip>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center justify-end gap-1">
                        {hasAnyPerm(PERM.POSITION_READ, PERM.POSITION_MANAGE) && (
                          <Button
                            isIconOnly
                            variant="tertiary"
                            size="sm"
                            aria-label={`View ${up.positionName}`}
                            onPress={() => router.push(`/organization/positions/${up.positionId}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </div>

      <DeleteConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        name={employee.fullName}
        entityLabel="employee"
        warning="Employee will no longer be able to access the system after deletion."
        isDeleting={isDeleting}
      />
    </div>
  );
}
