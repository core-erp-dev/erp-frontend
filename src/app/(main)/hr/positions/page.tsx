'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, House, ArrowsClockwise, TreeStructure, SquaresFour } from '@phosphor-icons/react';
import { Breadcrumbs, BreadcrumbsItem, Button, SearchField, toast } from '@heroui/react';

import { useAuthStore } from '@/store/auth-store';
import { PositionTable } from '@/modules/hr/hierarchy/components/position-table';
import { DeleteConfirmDialog } from '@/modules/hr/hierarchy/components/delete-confirm-dialog';
import { usePositionData } from '@/modules/hr/hierarchy/hooks/use-position-data';
import { useDebounce } from '@/hooks/use-debounce';
import type { PositionTree } from '@/modules/hr/hierarchy/types';

type ViewMode = 'table' | 'tree';

export default function PositionsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hasPerm = (perm: string) => (user?.permissions ?? []).includes(perm);

  const {
    positions,
    flatPositions,
    isLoading,
    filters,
    setSearch,
    setPage,
    refresh,
    deletePosition,
  } = usePositionData();

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Search
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [lastSearched, setLastSearched] = useState('');
  if (debouncedSearch !== lastSearched) {
    setLastSearched(debouncedSearch);
    setSearch(debouncedSearch);
  }

  // Delete dialog
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<PositionTree | null>(null);

  const handleDelete = useCallback((pos: PositionTree) => {
    setSelectedPosition(pos);
    setIsDeleteOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedPosition) return;
    setIsDeleting(true);
    try {
      await deletePosition(selectedPosition.id);
      setIsDeleteOpen(false);
      setSelectedPosition(null);
    } finally {
      setIsDeleting(false);
    }
  }, [selectedPosition, deletePosition]);

  // Expand/collapse for tree view
  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Expand all root nodes by default when switching to tree view
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'tree' && expandedIds.size === 0) {
      const rootIds = new Set(positions.map((p) => p.id));
      setExpandedIds(rootIds);
    }
  }, [positions, expandedIds.size]);

  // Filtered positions for table view
  const filteredFlat = useMemo(() => {
    if (!debouncedSearch) return flatPositions;
    const q = debouncedSearch.toLowerCase();
    return flatPositions.filter(
      (p) =>
        p.positionName.toLowerCase().includes(q) ||
        p.positionCode.toLowerCase().includes(q)
    );
  }, [flatPositions, debouncedSearch]);

  // Paginated positions for table view
  const paginatedPositions = useMemo(() => {
    const start = (filters.page - 1) * filters.size;
    return filteredFlat.slice(start, start + filters.size);
  }, [filteredFlat, filters.page, filters.size]);

  // Filtered tree for tree view
  const filteredTree = useMemo(() => {
    if (!debouncedSearch) return positions;
    const q = debouncedSearch.toLowerCase();
    return filterTree(positions, q);
  }, [positions, debouncedSearch]);

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem href="/hr">HR</BreadcrumbsItem>
        <BreadcrumbsItem>Struktur Jabatan</BreadcrumbsItem>
      </Breadcrumbs>

      {/* Row 1: Title + Refresh + View Switcher + Tambah */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">Struktur Jabatan</h1>
          <Button
            isIconOnly
            variant="tertiary"
            size="sm"
            className="pointer-events-none text-sm font-medium"
            aria-label={`Total ${flatPositions.length} jabatan`}
          >
            {flatPositions.length}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {/* View Switcher */}
          <div className="flex rounded-lg border border-border">
            <button
              onClick={() => handleViewModeChange('table')}
              className={`flex items-center gap-1.5 rounded-l-lg px-3 py-2 text-sm transition-colors ${
                viewMode === 'table'
                  ? 'bg-[#006FEE] text-white'
                  : 'bg-background text-muted-foreground hover:bg-gray-50'
              }`}
            >
              <SquaresFour className="h-4 w-4" />
              Tabel
            </button>
            <button
              onClick={() => handleViewModeChange('tree')}
              className={`flex items-center gap-1.5 rounded-r-lg px-3 py-2 text-sm transition-colors ${
                viewMode === 'tree'
                  ? 'bg-[#006FEE] text-white'
                  : 'bg-background text-muted-foreground hover:bg-gray-50'
              }`}
            >
              <TreeStructure className="h-4 w-4" />
              Tree
            </button>
          </div>

          {/* Refresh */}
          <Button
            isIconOnly
            variant="tertiary"
            onPress={() => refresh()}
            isDisabled={isLoading}
            aria-label="Muat ulang"
          >
            <ArrowsClockwise className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          {hasPerm('position:create') && (
            <Button variant="primary" onPress={() => router.push('/hr/positions/create')}>
              <Plus className="h-4 w-4" />
              Tambah Jabatan
            </Button>
          )}
        </div>
      </div>

      {/* Row 2: Search (table view only) */}
      {viewMode === 'table' && (
        <div className="flex items-center justify-end">
          <SearchField
            name="search"
            value={searchInput}
            onChange={setSearchInput}
            className="w-72"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Cari kode atau nama jabatan" aria-label="Cari jabatan" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>
      )}

      {/* Table */}
      <div className="w-full">
        <PositionTable
          positions={viewMode === 'table' ? paginatedPositions : filteredTree}
          isLoading={isLoading}
          totalItems={viewMode === 'table' ? filteredFlat.length : filteredTree.length}
          page={filters.page}
          pageSize={filters.size}
          onPageChange={setPage}
          onDelete={handleDelete}
          viewMode={viewMode}
          expandedIds={expandedIds}
          onToggleExpand={handleToggleExpand}
        />
      </div>

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => { setIsDeleteOpen(false); setSelectedPosition(null); }}
        onConfirm={handleDeleteConfirm}
        positionName={selectedPosition?.positionName || ''}
        isDeleting={isDeleting}
      />
    </div>
  );
}

function filterTree(nodes: PositionTree[], query: string): PositionTree[] {
  const result: PositionTree[] = [];
  for (const node of nodes) {
    const matchesSelf =
      node.positionName.toLowerCase().includes(query) ||
      node.positionCode.toLowerCase().includes(query);
    const filteredChildren = filterTree(node.children, query);
    if (matchesSelf || filteredChildren.length > 0) {
      result.push({ ...node, children: filteredChildren });
    }
  }
  return result;
}
