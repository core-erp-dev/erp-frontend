'use client';

import { Suspense, useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { House, ArrowLeft, DotsThreeVertical, PencilSimple, Trash, Plus, UserPlus, X, Eye, Copy, Check, Tray } from '@phosphor-icons/react';
import { Button, TextField, Input, Label, Breadcrumbs, BreadcrumbsItem, Spinner, Dropdown, Alert, Separator, toast, Chip, Table, ComboBox, Collection, ListBox, EmptyState } from '@heroui/react';

import { ForbiddenAccess } from '@/components/shared/forbidden-access';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { useDebounce } from '@/hooks/use-debounce';
import { usePositionDetail } from '@/modules/organization/positions/hooks/use-position-detail';
import { employeeApi } from '@/modules/organization/employees/services/employee-api';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import type { CoreUser } from '@/modules/organization/employees/types';
import type { AssignedUser } from '@/modules/organization/positions/types';

function PositionDetailGuard({ children }: { children: React.ReactNode }) {
  const { hasAnyPerm } = usePermission();
  if (!hasAnyPerm(PERM.POSITION_READ, PERM.POSITION_MANAGE)) {
    return <ForbiddenAccess />;
  }
  return <>{children}</>;
}

function PositionDetailPageInner() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { hasPerm } = usePermission();

  const { position, isLoading, error, deletePosition, isDeleting, refresh } = usePositionDetail(id);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyCode = useCallback((itemId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(itemId);
    setTimeout(() => setCopiedId(null), 3000);
  }, []);

  // Assign employee state
  const [isAssignExpanded, setIsAssignExpanded] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignUsers, setAssignUsers] = useState<CoreUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedAssignUser, setSelectedAssignUser] = useState<CoreUser | null>(null);

  // Remove assignment dialog state
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<AssignedUser | null>(null);

  const handleDeleteConfirm = async () => {
    const success = await deletePosition();
    if (success) {
      setIsDeleteOpen(false);
      router.replace('/organization/positions');
    }
  };

  const handleAssignSearch = useCallback((term: string) => {
    setAssignSearch(term);
    if (term.trim()) setIsSearching(true);
  }, []);

  const debouncedSearch = useDebounce(assignSearch, 400);

  useEffect(() => {
    if (!debouncedSearch.trim()) { setAssignUsers([]); setIsSearching(false); return; }
    let cancelled = false;
    setIsSearching(true);
    employeeApi.getUsers({ search: debouncedSearch, size: 10 })
      .then((result) => { if (!cancelled) setAssignUsers(result.content); })
      .catch(() => { if (!cancelled) setAssignUsers([]); })
      .finally(() => { if (!cancelled) setIsSearching(false); });
    return () => { cancelled = true; };
  }, [debouncedSearch]);

  const handleCancelAssign = useCallback(() => {
    setIsAssignExpanded(false);
    setAssignSearch('');
    setAssignUsers([]);
    setSelectedAssignUser(null);
  }, []);

  const handleAssignSubmit = useCallback(async () => {
    if (!selectedAssignUser) return;
    setIsAssigning(true);
    try {
      await employeeApi.assignUserToPosition({ userId: selectedAssignUser.id, positionId: id, startDate: new Date().toISOString().split('T')[0], isPrimary: false });
      toast.success(`${selectedAssignUser.fullName} berhasil ditugaskan`);
      handleCancelAssign();
      refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menugaskan pegawai';
      toast.danger(msg);
    } finally {
      setIsAssigning(false);
    }
  }, [id, selectedAssignUser, handleCancelAssign, refresh]);

  // Remove an employee's assignment from this position (deactivates the UserPosition row only)
  const handleRemoveRequest = useCallback((user: AssignedUser) => {
    setRemoveTarget(user);
    setIsRemoveDialogOpen(true);
  }, []);

  const handleRemoveConfirm = useCallback(async () => {
    if (!removeTarget) return;
    setIsRemoving(true);
    try {
      const userPositions = await employeeApi.getUserPositions(removeTarget.id);
      const assignment = userPositions.find((up) => up.positionId === id && up.isActive);
      if (!assignment) {
        throw new Error('Penugasan tidak ditemukan');
      }
      await employeeApi.deactivateUserPosition(assignment.id);
      toast.success(`Pegawai "${removeTarget.fullName}" dihapus dari jabatan ini`);
      setIsRemoveDialogOpen(false);
      setRemoveTarget(null);
      refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus pegawai dari jabatan ini';
      toast.danger(msg);
    } finally {
      setIsRemoving(false);
    }
  }, [removeTarget, id, refresh]);

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
            <Alert.Title>{error || 'Jabatan tidak ditemukan'}</Alert.Title>
          </Alert.Content>
        </Alert>
        <Button variant="secondary" onPress={() => router.back()} className="self-start">
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
      </div>
    );
  }

  const assignedUsers = position.assignedUsers ?? [];
  const assignedIds = new Set(assignedUsers.map((u) => u.id));
  const showDropdown = hasPerm(PERM.POSITION_MANAGE);
  const children = position.children ?? [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem>Organisasi</BreadcrumbsItem>
        <BreadcrumbsItem href="/organization/positions">Struktur Jabatan</BreadcrumbsItem>
        <BreadcrumbsItem>{position.positionName}</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button isIconOnly variant="tertiary" onPress={() => router.back()} aria-label="Kembali">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">{position.positionName}</h1>
        </div>
        <div className="flex items-center gap-2">
          {showDropdown && (
            <Dropdown>
              <Button isIconOnly variant="tertiary" aria-label="Opsi jabatan">
                <DotsThreeVertical className="h-5 w-5" />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu onAction={(key) => {
                  if (key === 'edit') router.push(`/organization/positions/${id}/edit?from=detail`);
                  if (key === 'delete') setIsDeleteOpen(true);
                }}>
                  <Dropdown.Item id="edit" textValue="Edit">
                    <div className="flex items-center gap-2"><PencilSimple className="h-4 w-4 text-muted-foreground" /><span>Edit</span></div>
                  </Dropdown.Item>
                  <Dropdown.Item id="delete" textValue="Hapus" variant="danger">
                    <div className="flex items-center gap-2 text-danger"><Trash className="h-4 w-4" /><span>Hapus</span></div>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          )}
        </div>
      </div>

      {/* Informasi Jabatan */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Informasi Jabatan</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Kode Jabatan</Label>
            <Input value={position.positionCode} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Nama Jabatan</Label>
            <Input value={position.positionName} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Unit Organisasi</Label>
            <Input value={position.organizationUnit?.unitName || position.unitName || '-'} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Atasan</Label>
            {position.parentId ? (
              <Link
                href={`/organization/positions/${position.parentId}`}
                className="block truncate text-foreground hover:underline font-medium"
              >
                {position.parentName || '-'}
              </Link>
            ) : (
              <Input value={position.parentName || '-'} readOnly />
            )}
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Deskripsi</Label>
            <Input value={position.description || '-'} readOnly />
          </TextField>
          <TextField isReadOnly className="pointer-events-none w-full">
            <Label>Level</Label>
            <Input value={String(position.positionLevel)} readOnly />
          </TextField>
        </div>
      </div>

      <Separator />

      {/* Jabatan Bawahan */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Jabatan Bawahan</h2>
          {hasPerm(PERM.POSITION_MANAGE) && (
            <Button variant="primary" size="sm" onPress={() => router.push(`/organization/positions/create?parentId=${position.id}&from=detail`)}>
              <Plus className="h-4 w-4" />
              Tambah Jabatan Bawahan
            </Button>
          )}
        </div>
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Jabatan Bawahan" className="min-w-[500px]">
              <Table.Header>
                <Table.Column id="code" isRowHeader>Kode</Table.Column>
                <Table.Column id="name">Nama Jabatan</Table.Column>
                <Table.Column id="level">Level</Table.Column>
                <Table.Column id="employees">Pegawai</Table.Column>
                <Table.Column id="actions" aria-label="Aksi" className="text-center">{''}</Table.Column>
              </Table.Header>
              <Table.Body
                renderEmptyState={() =>
                  children.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                      <Tray className="h-8 w-8" />
                      <span className="text-sm">Tidak ada jabatan bawahan</span>
                    </div>
                  ) : null
                }
              >
                {children.map((child) => (
                  <Table.Row key={child.id} id={child.id}>
                    <Table.Cell className="font-medium text-foreground">
                      <div className="flex items-center gap-1">
                        {child.positionCode}
                        <Button
                          isIconOnly
                          variant="ghost"
                          size="sm"
                          aria-label={`Salin kode ${child.positionCode}`}
                          onPress={() => handleCopyCode(child.id, child.positionCode)}
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
                        href={`/organization/positions/${child.id}`}
                        className="text-foreground hover:underline font-medium"
                      >
                        {child.positionName}
                      </Link>
                    </Table.Cell>
                    <Table.Cell className="text-muted-foreground">
                      {child.positionLevel ?? '-'}
                    </Table.Cell>
                    <Table.Cell>
                      <Chip size="sm" variant="soft" className="pointer-events-none">
                        {(child.assignedUsers ?? []).length}
                      </Chip>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          isIconOnly
                          variant="tertiary"
                          size="sm"
                          aria-label={`Lihat ${child.positionName}`}
                          onPress={() => router.push(`/organization/positions/${child.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </div>

      <Separator />

      {/* Pegawai */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Pegawai</h2>
          {hasPerm(PERM.USER_MANAGE) && (
            isAssignExpanded ? (
              <Button variant="tertiary" size="sm" onPress={handleCancelAssign}>
                <X className="h-4 w-4" />
                Batal
              </Button>
            ) : (
              <Button variant="primary" size="sm" onPress={() => setIsAssignExpanded(true)}>
                <UserPlus className="h-4 w-4" />
                Tugaskan Pegawai
              </Button>
            )
          )}
        </div>

        {/* Tugaskan Pegawai — HeroUI ComboBox */}
        {isAssignExpanded && (
          <div className="flex items-start gap-2">
            <ComboBox
              aria-label="Cari pegawai"
              className="flex-1"
              inputValue={assignSearch}
              onInputChange={handleAssignSearch}
              onSelectionChange={(key) => {
                const user = assignUsers.find((u) => u.id === key);
                setSelectedAssignUser(user ?? null);
              }}
              disabledKeys={[...assignedIds]}
              isDisabled={isAssigning}
              allowsEmptyCollection
              defaultFilter={() => true}
              menuTrigger="focus"
            >
              <ComboBox.InputGroup>
                <Input placeholder="Cari nama, NIP, atau email" />
                <ComboBox.Trigger />
              </ComboBox.InputGroup>
              <ComboBox.Popover>
                <ListBox
                  renderEmptyState={() =>
                    isSearching ? (
                      <div className="flex justify-center py-4"><Spinner size="sm" /></div>
                    ) : (
                      <EmptyState>Pegawai tidak ditemukan</EmptyState>
                    )
                  }
                >
                  <Collection items={assignUsers}>
                    {(user) => (
                      <ListBox.Item key={user.id} id={user.id} textValue={user.fullName}>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{user.fullName}</span>
                          <span className="text-xs text-muted-foreground">{user.nip || user.email}</span>
                        </div>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    )}
                  </Collection>
                </ListBox>
              </ComboBox.Popover>
            </ComboBox>
            <Button
              variant="primary"
              onPress={() => handleAssignSubmit()}
              isDisabled={!selectedAssignUser || isAssigning}
              isPending={isAssigning}
            >
              Simpan
            </Button>
          </div>
        )}

        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Pegawai pada Jabatan" className="min-w-[500px]">
              <Table.Header>
                <Table.Column id="nip" isRowHeader>NIP</Table.Column>
                <Table.Column id="name">Nama</Table.Column>
                <Table.Column id="email">Email</Table.Column>
                <Table.Column id="actions" aria-label="Aksi" className="text-center">{''}</Table.Column>
              </Table.Header>
              <Table.Body
                renderEmptyState={() =>
                  assignedUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                      <Tray className="h-8 w-8" />
                      <span className="text-sm">Tidak ada pegawai pada jabatan ini</span>
                    </div>
                  ) : null
                }
              >
                {assignedUsers.map((user) => (
                  <Table.Row key={user.id} id={user.id}>
                    <Table.Cell className="font-medium text-foreground">
                      {user.nip || '-'}
                    </Table.Cell>
                    <Table.Cell>
                      <Link
                        href={`/organization/employees/${user.id}`}
                        className="text-foreground hover:underline font-medium"
                      >
                        {user.fullName}
                      </Link>
                    </Table.Cell>
                    <Table.Cell className="text-muted-foreground">
                      {user.email || '-'}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          isIconOnly
                          variant="tertiary"
                          size="sm"
                          aria-label={`Lihat ${user.fullName}`}
                          onPress={() => router.push(`/organization/employees/${user.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {hasPerm(PERM.USER_MANAGE) && (
                          <Button
                            isIconOnly
                            variant="danger-soft"
                            size="sm"
                            aria-label={`Hapus ${user.fullName}`}
                            onPress={() => handleRemoveRequest(user)}
                          >
                            <Trash className="h-4 w-4" />
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
        name={position.positionName}
        entityLabel="jabatan"
        warning="Jabatan yang masih memiliki bawahan atau pegawai aktif tidak dapat dihapus."
        isDeleting={isDeleting}
      />

      <DeleteConfirmDialog
        isOpen={isRemoveDialogOpen}
        onClose={() => { setIsRemoveDialogOpen(false); setRemoveTarget(null); }}
        onConfirm={handleRemoveConfirm}
        name={removeTarget?.fullName || ''}
        entityLabel="penugasan"
        warning="Pegawai akan dihapus dari jabatan ini saja. Akun pegawai tidak dihapus."
        isDeleting={isRemoving}
      />
    </div>
  );
}

export default function PositionDetailPage() {
  return (
    <Suspense fallback={null}>
      <PositionDetailGuard>
        <PositionDetailPageInner />
      </PositionDetailGuard>
    </Suspense>
  );
}
