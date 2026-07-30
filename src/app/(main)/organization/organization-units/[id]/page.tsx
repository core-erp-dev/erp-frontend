'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { House, ArrowLeft, DotsThreeVertical, PencilSimple, Trash, Plus, Eye, Copy, Check, Tray } from '@phosphor-icons/react';
import { Button, TextField, Input, Label, Breadcrumbs, BreadcrumbsItem, Spinner, Dropdown, Alert, Separator, Chip, Table } from '@heroui/react';

import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { useOrgUnitDetail } from '@/modules/organization/organization-units/hooks/use-org-unit-detail';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { UNIT_TYPE_LABEL, UNIT_TYPE_CHIP_COLOR } from '@/modules/organization/organization-units/types';

export default function OrganizationUnitDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { hasPerm } = usePermission();

  const { unit, isLoading, error, deleteUnit, isDeleting } = useOrgUnitDetail(id);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyCode = useCallback((unitId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(unitId);
    setTimeout(() => setCopiedId(null), 3000);
  }, []);

  const handleDeleteConfirm = async () => {
    const success = await deleteUnit();
    if (success) {
      setIsDeleteOpen(false);
      router.push('/organization/organization-units');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{error || 'Organization unit not found'}</Alert.Title>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  const children = unit.children ?? [];
  const showDropdown = hasPerm(PERM.POSITION_UPDATE) || hasPerm(PERM.POSITION_DELETE);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem>Organization</BreadcrumbsItem>
        <BreadcrumbsItem href="/organization/organization-units">Organization Units</BreadcrumbsItem>
        <BreadcrumbsItem>{unit.unitName}</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button isIconOnly variant="tertiary" onPress={() => router.back()} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">{unit.unitName}</h1>
        </div>
        <div className="flex items-center gap-2">
          {showDropdown && (
            <Dropdown>
              <Button isIconOnly variant="tertiary" aria-label="Options">
                <DotsThreeVertical className="h-5 w-5" />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu onAction={(key) => {
                  if (key === 'edit') router.push(`/organization/organization-units/${id}/edit`);
                  if (key === 'delete') setIsDeleteOpen(true);
                }}>
                  {hasPerm(PERM.POSITION_UPDATE) && (
                    <Dropdown.Item id="edit" textValue="Edit">
                      <PencilSimple className="h-4 w-4 text-muted-foreground" />
                      <span>Edit</span>
                    </Dropdown.Item>
                  )}
                  {hasPerm(PERM.POSITION_DELETE) && (
                    <Dropdown.Item id="delete" textValue="Delete" variant="danger">
                      <Trash className="h-4 w-4 text-danger" />
                      <span className="text-danger">Delete</span>
                    </Dropdown.Item>
                  )}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          )}
        </div>
      </div>

      {/* Unit Information */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Unit Information</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Code</Label>
            <Input value={unit.unitCode} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Name</Label>
            <Input value={unit.unitName} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Type</Label>
            <Input value={UNIT_TYPE_LABEL[unit.unitType] ?? unit.unitType} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Status</Label>
            <Input value={unit.isActive ? 'Active' : 'Inactive'} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Parent Unit</Label>
            <Input value={unit.parentName || '-'} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Description</Label>
            <Input value={unit.description || '-'} readOnly />
          </TextField>
        </div>
      </div>

      <Separator />

      {/* Subordinate Units */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Subordinate Units</h2>
          {hasPerm(PERM.POSITION_CREATE) && (
            <Button variant="primary" size="sm" onPress={() => router.push(`/organization/organization-units/create?parentId=${unit.id}`)}>
              <Plus className="h-4 w-4" />
              Add Subordinate
            </Button>
          )}
        </div>
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Subordinate Units" className="min-w-[500px]">
              <Table.Header>
                <Table.Column id="code" isRowHeader>Unit Code</Table.Column>
                <Table.Column id="name">Unit Name</Table.Column>
                <Table.Column id="type">Type</Table.Column>
                <Table.Column id="actions" aria-label="Actions" className="text-center">{''}</Table.Column>
              </Table.Header>
              <Table.Body
                renderEmptyState={() =>
                  children.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                      <Tray className="h-8 w-8" />
                      <span className="text-sm">No subordinate units</span>
                    </div>
                  ) : null
                }
              >
                {children.map((child) => (
                  <Table.Row key={child.id} id={child.id}>
                    <Table.Cell className="font-medium text-foreground">
                      <div className="flex items-center gap-1">
                        {child.unitCode}
                        <Button
                          isIconOnly
                          variant="ghost"
                          size="sm"
                          aria-label={`Copy code ${child.unitCode}`}
                          onPress={() => handleCopyCode(child.id, child.unitCode)}
                        >
                          {copiedId === child.id ? (
                            <Check className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <Link
                        href={`/organization/organization-units/${child.id}`}
                        className="text-foreground hover:underline font-medium"
                      >
                        {child.unitName}
                      </Link>
                    </Table.Cell>
                    <Table.Cell>
                      <Chip size="sm" color={UNIT_TYPE_CHIP_COLOR[child.unitType] ?? 'default'} variant="soft">
                        {UNIT_TYPE_LABEL[child.unitType] ?? child.unitType}
                      </Chip>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center justify-end gap-1">
                        {hasPerm(PERM.POSITION_READ) && (
                          <Button
                            isIconOnly
                            variant="tertiary"
                            size="sm"
                            aria-label={`View ${child.unitName}`}
                            onPress={() => router.push(`/organization/organization-units/${child.id}`)}
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
        name={unit.unitName}
        entityLabel="organization unit"
        warning="A unit with active child units or active positions cannot be deleted."
        isDeleting={isDeleting}
      />
    </div>
  );
}
