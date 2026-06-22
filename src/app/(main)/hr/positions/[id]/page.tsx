'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { House, ArrowLeft, DotsThreeVertical, PencilSimple, Trash, Users, TreeStructure, Plus } from '@phosphor-icons/react';
import { Button, Breadcrumbs, BreadcrumbsItem, Spinner, Dropdown, Alert, Surface, toast } from '@heroui/react';

import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { usePositionDetail } from '@/modules/hr/positions/hooks/use-position-detail';
import { organizationApi } from '@/modules/hr/positions/services/organization-api';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';

export default function PositionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { hasPerm } = usePermission();

  const { position, isLoading, error } = usePositionDetail(id);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await organizationApi.deletePosition(id);
      toast.success('Jabatan berhasil dihapus');
      setIsDeleteOpen(false);
      router.push('/hr/positions');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus jabatan';
      toast.danger(msg);
    } finally {
      setIsDeleting(false);
    }
  };

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
  const showDropdown = hasPerm(PERM.POSITION_UPDATE) || hasPerm(PERM.POSITION_DELETE);

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem href="/hr">HR</BreadcrumbsItem>
        <BreadcrumbsItem href="/hr/positions">Struktur Jabatan</BreadcrumbsItem>
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
          {hasPerm(PERM.POSITION_CREATE) && (
            <Button variant="secondary" onPress={() => router.push(`/hr/positions/create?parentId=${position.id}`)}>
              <Plus className="h-4 w-4" />
              Tambah Bawahan
            </Button>
          )}
          {showDropdown && (
            <Dropdown>
              <Button isIconOnly variant="tertiary" aria-label="Opsi">
                <DotsThreeVertical className="h-5 w-5" />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu onAction={(key) => {
                  if (key === 'edit') router.push(`/hr/positions/${id}/edit`);
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
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground">
          <TreeStructure className="h-4 w-4" />
          Informasi Jabatan
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kode" value={position.positionCode} />
          <Field label="Nama" value={position.positionName} />
          <Field label="Deskripsi" value={position.description || '-'} />
          <Field label="Level" value={String(position.positionLevel)} />
          <Field label="Lapor Ke" value={position.parentName || '- (Root)'} />
        </div>
      </Surface>

      {/* Bawahan Langsung */}
      <Surface className="rounded-3xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground">
          <TreeStructure className="h-4 w-4" />
          Bawahan Langsung
        </h2>
        {position.children.length > 0 ? (
          <div className="space-y-2">
            {position.children.map((child) => (
              <Button
                key={child.id}
                variant="ghost"
                aria-label={`Buka ${child.positionName}`}
                onPress={() => router.push(`/hr/positions/${child.id}`)}
                className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-left hover:border-[#006FEE] transition-colors h-auto"
              >
                <div>
                  <div className="text-sm font-medium text-foreground">{child.positionName}</div>
                  <div className="text-xs text-gray-400">{child.positionCode}</div>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                  {(child.assignedUsers ?? []).length} karyawan
                </span>
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Tidak ada bawahan langsung</p>
        )}
      </Surface>

      {/* Penjabat Saat Ini */}
      <Surface className="rounded-3xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground">
          <Users className="h-4 w-4" />
          Penjabat Saat Ini
        </h2>
        {assignedUsers.length > 0 ? (
          <div className="space-y-2">
            {assignedUsers.map((u) => (
              <Button
                key={u.id}
                variant="ghost"
                aria-label={`Buka ${u.fullName}`}
                onPress={() => router.push(`/hr/employees/${u.id}`)}
                className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-left hover:border-[#006FEE] transition-colors h-auto"
              >
                <div>
                  <div className="text-sm font-medium text-foreground">{u.fullName}</div>
                  <div className="text-xs text-gray-400">{u.email}</div>
                </div>
                <span className="font-mono text-xs text-gray-400">{u.nip || '-'}</span>
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Belum ada karyawan yang menduduki jabatan ini</p>
        )}
      </Surface>

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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}
