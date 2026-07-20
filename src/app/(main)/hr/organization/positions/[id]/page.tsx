'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { House, ArrowLeft, DotsThreeVertical, PencilSimple, Trash, Plus, UserPlus, X } from '@phosphor-icons/react';
import { Button, Breadcrumbs, BreadcrumbsItem, Spinner, Dropdown, Alert, Surface, SearchField, toast } from '@heroui/react';

import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { useDebounce } from '@/hooks/use-debounce';
import { DetailField } from '@/components/shared/detail-field';
import { usePositionDetail } from '@/modules/hr/organization/positions/hooks/use-position-detail';
import { employeeApi } from '@/modules/hr/organization/employees/services/employee-api';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import type { CoreUser } from '@/modules/hr/organization/employees/types';

export default function PositionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { hasPerm } = usePermission();

  const { position, isLoading, error, deletePosition, isDeleting } = usePositionDetail(id);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Assign karyawan state
  const [isAssignExpanded, setIsAssignExpanded] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignUsers, setAssignUsers] = useState<CoreUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const handleDeleteConfirm = async () => {
    const success = await deletePosition();
    if (success) {
      setIsDeleteOpen(false);
      router.push('/hr/organization/positions');
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
      toast.success(`${fullName} berhasil ditugaskan`);
      setIsAssignExpanded(false);
      setAssignSearch('');
      setAssignUsers([]);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menugaskan karyawan';
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
            <Alert.Title>{error || 'Jabatan tidak ditemukan'}</Alert.Title>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  const assignedUsers = position.assignedUsers ?? [];
  const assignedIds = new Set(assignedUsers.map((u) => u.id));
  const showDropdown = hasPerm(PERM.POSITION_UPDATE) || hasPerm(PERM.POSITION_DELETE);

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem href="/hr">HR</BreadcrumbsItem>
        <BreadcrumbsItem href="/hr/organization/positions">Struktur Jabatan</BreadcrumbsItem>
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
              <Button isIconOnly variant="tertiary" aria-label="Opsi">
                <DotsThreeVertical className="h-5 w-5" />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu onAction={(key) => {
                  if (key === 'edit') router.push(`/hr/organization/positions/${id}/edit`);
                  if (key === 'delete') setIsDeleteOpen(true);
                }}>
                  {hasPerm(PERM.POSITION_UPDATE) && (
                    <Dropdown.Item id="edit" textValue="Edit">
                      <div className="flex items-center gap-2"><PencilSimple className="h-4 w-4 text-muted-foreground" /><span>Edit</span></div>
                    </Dropdown.Item>
                  )}
                  {hasPerm(PERM.POSITION_DELETE) && (
                    <Dropdown.Item id="delete" textValue="Hapus" variant="danger">
                      <div className="flex items-center gap-2 text-danger"><Trash className="h-4 w-4" /><span>Hapus</span></div>
                    </Dropdown.Item>
                  )}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          )}
        </div>
      </div>

      {/* Informasi Jabatan */}
      <Surface className="rounded-3xl p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">Informasi Jabatan</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailField label="Kode" value={position.positionCode} />
          <DetailField label="Nama" value={position.positionName} />
          <DetailField label="Deskripsi" value={position.description || '-'} />
          <DetailField label="Level" value={String(position.positionLevel)} />
          <DetailField label="Bagian/Unit" value={position.unitName || '-'} />
          <DetailField label="Lapor Ke" value={position.parentName || '-'} />
        </div>
      </Surface>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Bawahan Langsung */}
        <Surface className="rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Bawahan Langsung</h2>
            {hasPerm(PERM.POSITION_CREATE) && (
              <Button variant="primary" size="sm" onPress={() => router.push(`/hr/organization/positions/create?parentId=${position.id}`)}>
                <Plus className="h-4 w-4" />
                Tambah
              </Button>
            )}
          </div>
          {position.children.length > 0 ? (
            <div className="space-y-2">
              {position.children.map((child) => (
                <Link
                  key={child.id}
                  href={`/hr/organization/positions/${child.id}`}
                  className="flex items-center justify-between rounded-xl bg-surface-secondary px-4 py-3 text-sm transition-colors hover:bg-surface-tertiary"
                >
                  <div>
                    <span className="font-medium text-foreground">{child.positionName}</span>
                    <span className="ml-2 text-xs text-gray-400">{child.positionCode}</span>
                  </div>
                  <span className="text-xs text-gray-400">{(child.assignedUsers ?? []).length} karyawan</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Tidak ada bawahan langsung</p>
          )}
        </Surface>

        {/* Daftar Karyawan */}
        <Surface className="rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Daftar Karyawan</h2>
            {hasPerm(PERM.POSITION_ASSIGN_USER) && (
              <Button
                variant={isAssignExpanded ? 'secondary' : 'primary'}
                size="sm"
                onPress={() => { setIsAssignExpanded(!isAssignExpanded); setAssignSearch(''); setAssignUsers([]); }}
              >
                {isAssignExpanded ? (
                  <><X className="h-4 w-4" />Batalkan</>
                ) : (
                  <><UserPlus className="h-4 w-4" />Tugaskan</>
                )}
              </Button>
            )}
          </div>

          {/* Inline Assign Form */}
          {isAssignExpanded && (
            <div className="mb-4 space-y-3">
              <SearchField className="w-full" value={assignSearch} onChange={handleAssignSearch} variant="secondary" autoFocus onClear={() => { setAssignSearch(''); setAssignUsers([]); }} isDisabled={isSearching}>
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder="Cari nama, NIP, atau email..." />
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
                <p className="py-2 text-center text-sm text-gray-400">Tidak ada hasil</p>
              ) : null}
            </div>
          )}

          {assignedUsers.length > 0 ? (
            <div className="space-y-2">
              {assignedUsers.map((u) => (
                <Link
                  key={u.id}
                  href={`/hr/organization/employees/${u.id}`}
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
            <p className="text-sm text-gray-400">Belum ada karyawan di jabatan ini</p>
          )}
        </Surface>
      </div>

      <DeleteConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        name={position.positionName}
        entityLabel="jabatan"
        warning="Jabatan yang masih memiliki bawahan atau karyawan aktif tidak dapat dihapus."
        isDeleting={isDeleting}
      />
    </div>
  );
}
