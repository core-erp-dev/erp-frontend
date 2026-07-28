'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { House, ArrowLeft, DotsThreeVertical, PencilSimple, Trash } from '@phosphor-icons/react';
import { Button, TextField, Input, Label, Breadcrumbs, BreadcrumbsItem, Spinner, Dropdown, Alert, Separator } from '@heroui/react';

import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { getGenderLabel } from '@/constants/gender';
import { formatDate } from '@/components/shared/detail-field';
import { useEmployeeDetail } from '@/modules/organization/employees/hooks/use-employee-detail';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { hasPerm } = usePermission();

  const { employee, isLoading, error, deleteEmployee, isDeleting } = useEmployeeDetail(id);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

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
  const showDropdown = hasPerm(PERM.USER_UPDATE) || hasPerm(PERM.USER_DELETE);

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
                {hasPerm(PERM.USER_UPDATE) && (
                  <Dropdown.Item id="edit" textValue="Edit">
                    <div className="flex items-center gap-2">
                      <PencilSimple className="h-4 w-4 text-muted-foreground" />
                      <span>Edit</span>
                    </div>
                  </Dropdown.Item>
                )}
                {hasPerm(PERM.USER_DELETE) && (
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
          <TextField isReadOnly className="w-full">
            <Label>Full Name</Label>
            <Input value={employee.fullName} readOnly />
          </TextField>
          <TextField isReadOnly className="w-full">
            <Label>Gender</Label>
            <Input value={getGenderLabel(employee.gender)} readOnly />
          </TextField>
          <TextField isReadOnly className="w-full">
            <Label>Date of Birth</Label>
            <Input value={formatDate(employee.birthDate)} readOnly />
          </TextField>
          <TextField isReadOnly className="w-full">
            <Label>Phone Number</Label>
            <Input value={employee.phoneNumber || '-'} readOnly />
          </TextField>
          <TextField isReadOnly className="w-full">
            <Label>Email</Label>
            <Input value={employee.email} readOnly />
          </TextField>
          <TextField isReadOnly className="w-full">
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
          <TextField isReadOnly className="w-full">
            <Label>NIP</Label>
            <Input value={employee.nip || '-'} readOnly />
          </TextField>
          <TextField isReadOnly className="w-full">
            <Label>Position</Label>
            <Input value={pos?.positionName || '-'} readOnly />
          </TextField>
          <TextField isReadOnly className="w-full">
            <Label>Join Date</Label>
            <Input value={formatDate(employee.joinDate || employee.createdAt)} readOnly />
          </TextField>
          <TextField isReadOnly className="w-full">
            <Label>Role</Label>
            <Input value={employee.roles.map((r) => r.roleCode).join(', ') || '-'} readOnly />
          </TextField>
        </div>
      </div>

      <Separator />

      {/* Position List */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Position List</h2>
        {(() => {
          const activePositions = (employee.positions ?? []).filter(p => p.isActive);
          if (activePositions.length === 0) {
            return <p className="text-sm text-gray-400">No positions assigned</p>;
          }
          return (
            <div className="space-y-2">
              {activePositions.map(up => (
                <TextField key={up.id} isReadOnly className="w-full">
                  <Input
                    value={`${up.positionName} (${up.positionCode}) — ${up.isPrimary ? 'Primary' : 'Secondary'} — ${formatDate(up.startDate)}${up.endDate ? ` to ${formatDate(up.endDate)}` : ''}`}
                    readOnly
                  />
                </TextField>
              ))}
            </div>
          );
        })()}
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
