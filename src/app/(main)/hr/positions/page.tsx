'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  House, Plus, TreeStructure, SquaresFour, PencilSimple, Eye, Trash, ArrowCounterClockwise,
} from '@phosphor-icons/react';
import {
  Button, Breadcrumbs, BreadcrumbsItem, Spinner, Table, toast,
} from '@heroui/react';

import { useAuthStore } from '@/store/auth-store';
import { organizationApi } from '@/modules/hr/hierarchy/services/organization-api';
import type { PositionTree, AssignedUser } from '@/modules/hr/hierarchy/types';
import { extractErrorMessage } from '@/types/api';

type ViewMode = 'table' | 'tree';

export default function PositionsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hasPerm = (p: string) => (user?.permissions ?? []).includes(p);

  const [positions, setPositions] = useState<PositionTree[]>([]);
  const [flatPositions, setFlatPositions] = useState<PositionTree[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');

  const fetchPositions = useCallback(async () => {
    setIsLoading(true);
    try {
      const tree = await organizationApi.fetchPositionTree();
      setPositions(tree);
      setFlatPositions(flattenTree(tree));
    } catch {
      toast.danger('Gagal memuat data jabatan');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPositions(); }, [fetchPositions]);

  const handleDelete = async (pos: PositionTree) => {
    if (!confirm(`Hapus jabatan "${pos.positionName}"?`)) return;
    try {
      await organizationApi.deletePosition(pos.id);
      toast.success('Jabatan berhasil dihapus');
      fetchPositions();
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Gagal menghapus jabatan'));
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem href="/hr">HR</BreadcrumbsItem>
        <BreadcrumbsItem>Struktur Jabatan</BreadcrumbsItem>
      </Breadcrumbs>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Struktur Jabatan</h1>
        <div className="flex items-center gap-2">
          {/* View Switcher */}
          <div className="flex rounded-lg border border-border">
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 rounded-l-lg px-3 py-2 text-sm transition-colors ${
                viewMode === 'tree'
                  ? 'bg-[#006FEE] text-white'
                  : 'bg-background text-muted-foreground hover:bg-gray-50'
              }`}
            >
              <TreeStructure className="h-4 w-4" />
              Tree
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 rounded-r-lg px-3 py-2 text-sm transition-colors ${
                viewMode === 'table'
                  ? 'bg-[#006FEE] text-white'
                  : 'bg-background text-muted-foreground hover:bg-gray-50'
              }`}
            >
              <SquaresFour className="h-4 w-4" />
              Tabel
            </button>
          </div>

          {hasPerm('position:create') && (
            <Link href="/hr/positions/create">
              <Button variant="primary">
                <Plus className="h-4 w-4" />
                Tambah Jabatan
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner size="md" />
        </div>
      ) : viewMode === 'tree' ? (
        <TreeView
          positions={positions}
          onEdit={(p) => router.push(`/hr/positions/${p.id}/edit`)}
          onView={(p) => router.push(`/hr/positions/${p.id}`)}
          onDelete={handleDelete}
          hasPerm={hasPerm}
        />
      ) : (
        <TableView
          positions={flatPositions}
          onEdit={(p) => router.push(`/hr/positions/${p.id}/edit`)}
          onView={(p) => router.push(`/hr/positions/${p.id}`)}
          onDelete={handleDelete}
          hasPerm={hasPerm}
        />
      )}
    </div>
  );
}

// ─── Tree View ────────────────────────────────────────────────

function TreeView({
  positions, onEdit, onView, onDelete, hasPerm,
}: {
  positions: PositionTree[];
  onEdit: (p: PositionTree) => void;
  onView: (p: PositionTree) => void;
  onDelete: (p: PositionTree) => void;
  hasPerm: (p: string) => boolean;
}) {
  if (positions.length === 0) {
    return <div className="py-12 text-center text-gray-400">Belum ada jabatan</div>;
  }
  return (
    <div className="space-y-2">
      {positions.map((p) => (
        <TreeNode
          key={p.id}
          position={p}
          depth={0}
          onEdit={onEdit}
          onView={onView}
          onDelete={onDelete}
          hasPerm={hasPerm}
        />
      ))}
    </div>
  );
}

function TreeNode({
  position, depth, onEdit, onView, onDelete, hasPerm,
}: {
  position: PositionTree;
  depth: number;
  onEdit: (p: PositionTree) => void;
  onView: (p: PositionTree) => void;
  onDelete: (p: PositionTree) => void;
  hasPerm: (p: string) => boolean;
}) {
  const userCount = (position.assignedUsers ?? []).length;
  return (
    <div>
      <div
        className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:border-[#006FEE]"
        style={{ marginLeft: depth * 24 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
            <TreeStructure className="h-4 w-4 text-[#006FEE]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">{position.positionName}</div>
            <div className="text-xs text-gray-400">
              {position.positionCode}
              {position.description && ` · ${position.description}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            {userCount} karyawan
          </span>
          <div className="flex items-center gap-1">
            {hasPerm('position:read') && (
              <Button isIconOnly variant="tertiary" size="sm" onPress={() => onView(position)}>
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {hasPerm('position:update') && (
              <Button isIconOnly variant="tertiary" size="sm" onPress={() => onEdit(position)}>
                <PencilSimple className="h-4 w-4" />
              </Button>
            )}
            {hasPerm('position:delete') && (
              <Button isIconOnly variant="danger-soft" size="sm" onPress={() => onDelete(position)}>
                <Trash className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      {position.children.length > 0 && (
        <div className="mt-1 space-y-1 border-l-2 border-gray-100 ml-6 pl-3">
          {position.children.map((child) => (
            <TreeNode
              key={child.id}
              position={child}
              depth={depth + 1}
              onEdit={onEdit}
              onView={onView}
              onDelete={onDelete}
              hasPerm={hasPerm}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Table View ───────────────────────────────────────────────

function TableView({
  positions, onEdit, onView, onDelete, hasPerm,
}: {
  positions: PositionTree[];
  onEdit: (p: PositionTree) => void;
  onView: (p: PositionTree) => void;
  onDelete: (p: PositionTree) => void;
  hasPerm: (p: string) => boolean;
}) {
  if (positions.length === 0) {
    return <div className="py-12 text-center text-gray-400">Belum ada jabatan</div>;
  }
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Daftar Jabatan">
          <Table.Header>
            <Table.Column id="code" isRowHeader>Kode</Table.Column>
            <Table.Column id="name">Nama Jabatan</Table.Column>
            <Table.Column id="parent">Atasan Langsung</Table.Column>
            <Table.Column id="users">Karyawan</Table.Column>
            <Table.Column id="actions" className="text-center">{''}</Table.Column>
          </Table.Header>
          <Table.Body>
            {positions.map((p) => (
              <Table.Row key={p.id}>
                <Table.Cell className="font-mono text-xs text-muted-foreground">
                  {p.positionCode}
                </Table.Cell>
                <Table.Cell className="font-medium text-foreground">
                  {p.positionName}
                </Table.Cell>
                <Table.Cell className="text-muted-foreground">
                  {p.parentName || '—'}
                </Table.Cell>
                <Table.Cell>
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                    {(p.assignedUsers ?? []).length}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center justify-end gap-1">
                    {hasPerm('position:read') && (
                      <Button isIconOnly variant="tertiary" size="sm" onPress={() => onView(p)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {hasPerm('position:update') && (
                      <Button isIconOnly variant="tertiary" size="sm" onPress={() => onEdit(p)}>
                        <PencilSimple className="h-4 w-4" />
                      </Button>
                    )}
                    {hasPerm('position:delete') && (
                      <Button isIconOnly variant="danger-soft" size="sm" onPress={() => onDelete(p)}>
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
  );
}

// ─── Helpers ──────────────────────────────────────────────────

function flattenTree(tree: PositionTree[]): PositionTree[] {
  const result: PositionTree[] = [];
  const walk = (nodes: PositionTree[]) => {
    for (const n of nodes) {
      result.push(n);
      if (n.children.length > 0) walk(n.children);
    }
  };
  walk(tree);
  return result;
}
