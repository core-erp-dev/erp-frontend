'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { House, ArrowLeft, DotsThreeVertical, PencilSimple, Trash, MedalMilitary, Briefcase } from '@phosphor-icons/react';
import { Button, Breadcrumbs, BreadcrumbsItem, Spinner, Dropdown, Alert, Surface, Badge } from '@heroui/react';

import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { getGenderLabel } from '@/constants/gender';
import { DetailField, formatDate } from '@/components/shared/detail-field';
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
    <div className="flex w-full flex-col gap-6">
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
      <Surface className="rounded-3xl p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">Personal Information</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <DetailField label="Full Name" value={employee.fullName} />
          <DetailField label="Gender" value={getGenderLabel(employee.gender)} />
          <DetailField label="Date of Birth" value={formatDate(employee.birthDate)} />
          <DetailField label="Phone Number" value={employee.phoneNumber || '-'} />
          <DetailField label="Email" value={employee.email} />
          <DetailField label="Address" value={employee.address || '-'} />
        </div>
      </Surface>

      {/* Employment Data */}
      <Surface className="rounded-3xl p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">Employment Data</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <DetailField label="NIP" value={employee.nip || '-'} />
          <DetailField label="Position" value={pos?.positionName || '-'} />
          <DetailField label="Join Date" value={formatDate(employee.joinDate || employee.createdAt)} />
          <DetailField label="Role" value={employee.roles.map((r) => r.roleCode).join(', ') || '-'} />
        </div>
      </Surface>

      {/* Position List */}
      <Surface className="rounded-3xl p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">Position List</h2>
        {(() => {
          const activePositions = (employee.positions ?? []).filter(p => p.isActive);
          if (activePositions.length === 0) {
            return <p className="text-sm text-gray-400">No positions assigned</p>;
          }
          return (
            <div className="space-y-2">
              {activePositions.map(up => (
                <div key={up.id} className="flex items-center justify-between rounded-xl bg-surface-secondary px-4 py-3">
                  <div className="flex items-center gap-3">
                    {up.isPrimary
                      ? <MedalMilitary className="h-5 w-5 text-amber-500" />
                      : <Briefcase className="h-5 w-5 text-muted-foreground" />
                    }
                    <div>
                      <span className="font-medium text-foreground">{up.positionName}</span>
                      <span className="ml-2 text-xs text-gray-400">{up.positionCode}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={up.isPrimary ? 'primary' : 'secondary'} size="sm">
                      {up.isPrimary ? 'Primary' : 'Secondary'}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {formatDate(up.startDate)}
                      {up.endDate ? ` · to ${formatDate(up.endDate)}` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </Surface>

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
