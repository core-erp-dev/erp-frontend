'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { House, ArrowLeft, DotsThreeVertical, PencilSimple, Trash, Plus, UserPlus, X } from '@phosphor-icons/react';
import { Button, TextField, Input, Label, Breadcrumbs, BreadcrumbsItem, Spinner, Dropdown, Alert, Surface, Separator, SearchField, toast } from '@heroui/react';

import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { useDebounce } from '@/hooks/use-debounce';
import { usePositionDetail } from '@/modules/organization/positions/hooks/use-position-detail';
import { employeeApi } from '@/modules/organization/employees/services/employee-api';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import type { CoreUser } from '@/modules/organization/employees/types';

export default function PositionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { hasPerm } = usePermission();

  const { position, isLoading, error, deletePosition, isDeleting } = usePositionDetail(id);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Assign employee state
  const [isAssignExpanded, setIsAssignExpanded] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignUsers, setAssignUsers] = useState<CoreUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const handleDeleteConfirm = async () => {
    const success = await deletePosition();
    if (success) {
      setIsDeleteOpen(false);
      router.push('/organization/positions');
    }
  };

  const handleAssignSearch = useCallback((term: string) => {
    setAssignSearch(term);
  }, []);

  const debouncedSearch = useDebounce(assignSearch, 400);

  useEffect(() => {
    if (!debouncedSearch.trim()) { setAssignUsers([]); return; }
    let cancelled = false;
    setIsSearching(true);
    employeeApi.getUsers({ search: debouncedSearch, size: 10 })
      .then((result) => { if (!cancelled) setAssignUsers(result.content); })
      .catch(() => { if (!cancelled) setAssignUsers([]); })
      .finally(() => { if (!cancelled) setIsSearching(false); });
    return () => { cancelled = true; };
  }, [debouncedSearch]);

  const handleAssignSubmit = useCallback(async (userId: string, fullName: string) => {
    setIsAssigning(true);
    try {
      await employeeApi.assignUserToPosition({ userId, positionId: id, startDate: new Date().toISOString().split('T')[0], isPrimary: false });
      toast.success(`${fullName} successfully assigned`);
      setIsAssignExpanded(false);
      setAssignSearch('');
      setAssignUsers([]);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to assign employee';
      toast.danger(msg);
    } finally {
      setIsAssigning(false);
    }
  }, [id, router]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (error || !position) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{error || 'Position not found'}</Alert.Title>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  const assignedUsers = position.assignedUsers ?? [];
  const assignedIds = new Set(assignedUsers.map((u) => u.id));
  const showDropdown = hasPerm(PERM.POSITION_UPDATE) || hasPerm(PERM.POSITION_DELETE);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem>Organization</BreadcrumbsItem>
        <BreadcrumbsItem>Position Structure</BreadcrumbsItem>
        <BreadcrumbsItem>{position.positionName}</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button isIconOnly variant="tertiary" onPress={() => router.back()} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">{position.positionName}</h1>
        </div>
        <div className="flex items-center gap-2">
          {showDropdown && (
            <Dropdown>
              <Button isIconOnly variant="tertiary" aria-label="Options">
                <DotsThreeVertical className="h-5 w-5" />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu onAction={(key) => {
                  if (key === 'edit') router.push(`/organization/positions/${id}/edit`);
                  if (key === 'delete') setIsDeleteOpen(true);
                }}>
                  {hasPerm(PERM.POSITION_UPDATE) && (
                    <Dropdown.Item id="edit" textValue="Edit">
                      <div className="flex items-center gap-2"><PencilSimple className="h-4 w-4 text-muted-foreground" /><span>Edit</span></div>
                    </Dropdown.Item>
                  )}
                  {hasPerm(PERM.POSITION_DELETE) && (
                    <Dropdown.Item id="delete" textValue="Delete" variant="danger">
                      <div className="flex items-center gap-2 text-danger"><Trash className="h-4 w-4" /><span>Delete</span></div>
                    </Dropdown.Item>
                  )}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          )}
        </div>
      </div>

      {/* Position Information */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Position Information</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Code</Label>
            <Input value={position.positionCode} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Name</Label>
            <Input value={position.positionName} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Description</Label>
            <Input value={position.description || '-'} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Level</Label>
            <Input value={String(position.positionLevel)} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Department/Unit</Label>
            <Input value={position.unitName || '-'} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Reports To</Label>
            <Input value={position.parentName || '-'} readOnly />
          </TextField>
        </div>
      </div>

      <Separator />

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Direct Subordinates */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">Direct Subordinates</h2>
          {position.children.length > 0 ? (
            <div className="space-y-2">
              {position.children.map((child) => (
                <Link
                  key={child.id}
                  href={`/organization/positions/${child.id}`}
                  className="flex items-center justify-between rounded-xl bg-surface-secondary px-4 py-3 text-sm transition-colors hover:bg-surface-tertiary"
                >
                  <div>
                    <span className="font-medium text-foreground">{child.positionName}</span>
                    <span className="ml-2 text-xs text-gray-400">{child.positionCode}</span>
                  </div>
                  <span className="text-xs text-gray-400">{(child.assignedUsers ?? []).length} employees</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No direct subordinates</p>
          )}
          {hasPerm(PERM.POSITION_CREATE) && (
            <Button variant="primary" size="sm" className="self-start" onPress={() => router.push(`/organization/positions/create?parentId=${position.id}`)}>
              <Plus className="h-4 w-4" />
              Add Subordinate
            </Button>
          )}
        </div>

        {/* Employee List */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">Employee List</h2>

          {/* Inline Assign Form */}
          {hasPerm(PERM.POSITION_ASSIGN_USER) && !isAssignExpanded && (
            <Button variant="primary" size="sm" className="self-start" onPress={() => setIsAssignExpanded(true)}>
              <UserPlus className="h-4 w-4" />
              Assign Employee
            </Button>
          )}

          {isAssignExpanded && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Assign Employee</span>
                <Button variant="tertiary" size="sm" onPress={() => { setIsAssignExpanded(false); setAssignSearch(''); setAssignUsers([]); }}>
                  <X className="h-4 w-4" />Cancel
                </Button>
              </div>
              <SearchField className="w-full" value={assignSearch} onChange={handleAssignSearch} autoFocus onClear={() => { setAssignSearch(''); setAssignUsers([]); }} isDisabled={isSearching}>
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder="Search name, NIP, or email..." />
                  <SearchField.ClearButton />
                </SearchField.Group>
              </SearchField>
              {isSearching ? (
                <div className="flex justify-center py-4"><Spinner size="sm" /></div>
              ) : assignUsers.length > 0 ? (
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {assignUsers
                    .filter((u) => !assignedIds.has(u.id))
                    .map((u) => (
                      <Button
                        key={u.id}
                        variant="ghost"
                        className="w-full justify-between rounded-xl bg-surface-secondary px-4 py-2.5 text-left text-sm h-auto transition-colors hover:bg-surface-tertiary"
                        isDisabled={isAssigning}
                        onPress={() => handleAssignSubmit(u.id, u.fullName)}
                      >
                        <span>
                          <span className="font-medium text-foreground">{u.fullName}</span>
                          <span className="ml-2 text-xs text-gray-400">{u.nip || u.email}</span>
                        </span>
                        <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                      </Button>
                    ))}
                </div>
              ) : assignSearch.trim() ? (
                <p className="py-2 text-center text-sm text-gray-400">No results</p>
              ) : null}
            </div>
          )}

          {assignedUsers.length > 0 ? (
            <div className="space-y-2">
              {assignedUsers.map((u) => (
                <Link
                  key={u.id}
                  href={`/organization/employees/${u.id}`}
                  className="flex items-center justify-between rounded-xl bg-surface-secondary px-4 py-3 text-sm transition-colors hover:bg-surface-tertiary"
                >
                  <div>
                    <span className="font-medium text-foreground">{u.fullName}</span>
                    <span className="ml-2 text-xs text-gray-400">{u.email}</span>
                  </div>
                  <span className="text-xs text-gray-400">{u.nip || '-'}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No employees in this position</p>
          )}
        </div>
      </div>

      <DeleteConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        name={position.positionName}
        entityLabel="position"
        warning="Position that still has subordinates or active employees cannot be deleted."
        isDeleting={isDeleting}
      />
    </div>
  );
}
