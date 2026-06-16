'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { House, ArrowLeft, PencilSimple, Users, TreeStructure } from '@phosphor-icons/react';
import { Button, Breadcrumbs, BreadcrumbsItem, Spinner } from '@heroui/react';

import { useAuthStore } from '@/store/auth-store';
import { organizationApi } from '@/modules/hr/hierarchy/services/organization-api';
import type { PositionTree, AssignedUser } from '@/modules/hr/hierarchy/types';

export default function PositionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const user = useAuthStore((s) => s.user);
  const hasPerm = (p: string) => (user?.permissions ?? []).includes(p);

  const [position, setPosition] = useState<PositionTree | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const tree = await organizationApi.fetchPositionTree();
        const found = findInTree(tree, id);
        if (!found) {
          setError('Jabatan tidak ditemukan');
        } else {
          setPosition(found);
        }
      } catch {
        setError('Gagal memuat data jabatan');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="md" />
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

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
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
        </div>
        {hasPerm('position:update') && (
          <Link href={`/hr/positions/${id}/edit`}>
            <Button variant="primary">
              <PencilSimple className="h-4 w-4" />
              Edit
            </Button>
          </Link>
        )}
      </div>

      {/* Section 1: Info */}
      <div className="rounded-xl border border-border bg-background p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Informasi Jabatan</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kode" value={position.positionCode} />
          <Field label="Nama" value={position.positionName} />
          <Field label="Deskripsi" value={position.description || '—'} />
          <Field label="Level" value={String(position.positionLevel)} />
          <Field label="Lapor Ke" value={position.parentName || '— (Root)'} />
          <Field
            label="Status"
            value={
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                position.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {position.isActive ? 'Aktif' : 'Nonaktif'}
              </span>
            }
          />
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
              <Link
                key={child.id}
                href={`/hr/positions/${child.id}`}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:border-[#006FEE] transition-colors"
              >
                <div>
                  <div className="text-sm font-medium text-foreground">{child.positionName}</div>
                  <div className="text-xs text-gray-400">{child.positionCode}</div>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                  {(child.assignedUsers ?? []).length} karyawan
                </span>
              </Link>
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
              <Link
                key={u.id}
                href={`/hr/employees/${u.id}`}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:border-[#006FEE] transition-colors"
              >
                <div>
                  <div className="text-sm font-medium text-foreground">{u.fullName}</div>
                  <div className="text-xs text-gray-400">{u.email}</div>
                </div>
                <span className="font-mono text-xs text-gray-400">{u.nip || '—'}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Belum ada karyawan yang menduduki jabatan ini</p>
        )}
      </div>
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
