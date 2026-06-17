'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { House, ArrowLeft, DotsThreeVertical, PencilSimple, Trash, Users, TreeStructure, Plus } from '@phosphor-icons/react';
import { Button, Breadcrumbs, BreadcrumbsItem, Spinner, Dropdown, toast } from '@heroui/react';

import { useAuthStore } from '@/store/auth-store';
import { organizationApi } from '@/modules/hr/positions/services/organization-api';
import { DeleteConfirmDialog } from '@/modules/hr/positions/components/delete-confirm-dialog';
import type { PositionTree } from '@/modules/hr/positions/types';

export default function PositionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const user = useAuthStore((s) => s.user);
  const hasPerm = (perm: string) => (user?.permissions ?? []).includes(perm);

  const [position, setPosition] = useState<PositionTree | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const tree = await organizationApi.fetchPositionTree();
        const found = findInTree(tree, id);
        if (!found) setError('Jabatan tidak ditemukan');
        else setPosition(found);
      } catch {
        setError('Gagal memuat data jabatan');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

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
        <span className="ml-3 text-sm text-gray-500">Memuat data jabatan...</span>
      </div>
    );
  }

  if (error || !position) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error || 'Jabatan tidak ditemukan'}
        </div>
      </div>
    );
  }

  const assignedUsers = position.assignedUsers ?? [];
  const showDropdown = hasPerm('position:update') || hasPerm('position:delete');

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem href="/hr">HR</BreadcrumbsItem>
        <BreadcrumbsItem href="/hr/positions">Jabatan</BreadcrumbsItem>
        <BreadcrumbsItem>{position.positionName}</BreadcrumbsItem>
      </Breadcrumbs>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button isIconOnly variant="tertiary" onPress={() => router.push('/hr/positions')} aria-label="Kembali">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{position.positionName}</h1>
            <span className="font-mono text-xs text-gray-400">{position.positionCode}</span>
          </div>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            position.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {position.isActive ? 'Aktif' : 'Nonaktif'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasPerm('position:create') && (
            <Button variant="secondary" onPress={() => router.push(`/hr/positions/create?parentId=${id}`)}>
              <Plus className="h-4 w-4" />
              Tambah Bawahan
            </Button>
          )}
          {showDropdown && (
            <Dropdown>
              <Button isIconOnly variant="tertiary" aria-label="Opsi">
                <DotsThreeVertical className="h-4 w-4" />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu onAction={(key) => {
                  if (key === 'edit') router.push(`/hr/positions/${id}/edit`);
                  if (key === 'delete') setIsDeleteOpen(true);
                }}>
                  {hasPerm('position:update') && (
                    <Dropdown.Item id="edit" textValue="Edit">
                      <div className="flex items-center gap-2"><PencilSimple className="h-4 w-4 text-muted-foreground" /><span>Edit</span></div>
                    </Dropdown.Item>
                  )}
                  {hasPerm('position:delete') && (
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

      {/* Section 1: Info */}
      <div className="rounded-xl border border-border bg-background p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Informasi Jabatan</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kode" value={position.positionCode} />
          <Field label="Nama" value={position.positionName} />
          <Field label="Deskripsi" value={position.description || '-'} />
          <Field label="Level" value={String(position.positionLevel)} />
          <Field label="Lapor Ke" value={position.parentName || '- (Root)'} />
        </div>
      </div>

      {/* Section 2: Bawahan Langsung */}
      <div className="rounded-xl border border-border bg-background p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-400">
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
      </div>

      {/* Section 3: Penjabat Saat Ini */}
      <div className="rounded-xl border border-border bg-background p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-400">
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
      </div>

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        positionName={position.positionName}
        isDeleting={isDeleting}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

function findInTree(tree: PositionTree[], id: string): PositionTree | null {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children.length > 0) {
      const found = findInTree(node.children, id);
      if (found) return found;
    }
  }
  return null;
}
