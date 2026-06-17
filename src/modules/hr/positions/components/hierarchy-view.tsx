'use client';

import React, { useMemo, useState } from 'react';
import type { Selection } from '@heroui/react';
import {
  Button,
  Chip,
  Dropdown,
  Header,
  Label,
  Modal,
  SearchField,
  Spinner,
  Table,
} from '@heroui/react';
import {
  ArrowsClockwise,
  CaretRight,
  Check,
  DotsThreeVertical,
  FunnelSimple,
  PencilSimple,
  Plus,
  SlidersHorizontal,
  Trash,
  Tray,
  UserPlus,
  Warning,
  X,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

import { PositionFormModal } from './position-form-modal';
import { AssignUserModal } from '@/modules/hr/employees/components/assign-user-modal';
import { useHierarchyData } from '../hooks/use-hierarchy-data';
import { getLevelColor, getInitials, buildTableItems } from '../../shared/utils/position-helpers';
import type { FlatPosition } from '../../shared/utils/flatten-positions';
import type { PositionRow } from '../../shared/utils/position-helpers';
import type { PositionTree } from '../types';

export const HierarchyView: React.FC = () => {
  const {
    isLoading,
    isRefreshing,
    positions,
    flatPositions,
    filteredPositions,
    searchTerm,
    setSearchTerm,
    expandedKeys,
    setExpandedKeys,
    isFormModalOpen,
    selectedPosition,
    parentPositionId,
    handleAddRootPosition,
    handleAddSubordinate,
    handleEdit,
    handleFormModalClose,
    handleFormSubmit,
    isAssignModalOpen,
    assignPositionId,
    allUsers,
    isAssigning,
    handleAssignUser,
    handleAssignModalClose,
    handleAssignSubmit,
    isDeleteDialogOpen,
    deletingPosition,
    isDeleting,
    handleDeleteRequest,
    handleDeleteDialogClose,
    handleDeleteConfirm,
    fetchPositions,
  } = useHierarchyData();

  // Filter & Sort state
  const [filterKeys, setFilterKeys] = useState<Selection>(new Set());
  const [sortField, setSortField] = useState<'name' | 'staff' | 'level'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const isDefaultSort = sortField === 'name' && sortDir === 'asc';
  const filterCount = (filterKeys as Set<string>).size;

  const sortedAndFilteredPositions = useMemo(() => {
    const fk = filterKeys as Set<string>;
    const matchVacant = fk.has('vacant');
    const matchOccupied = fk.has('occupied');
    const hasStatusFilter = matchVacant || matchOccupied;
    const matchLevels = new Set<number>();
    if (fk.has('level:1')) matchLevels.add(1);
    if (fk.has('level:2')) matchLevels.add(2);
    if (fk.has('level:3')) matchLevels.add(3);
    const hasLevelFilter = matchLevels.size > 0;
    const hasAnyFilter = hasStatusFilter || hasLevelFilter;

    // Fast path: no filters and default sort
    if (!hasAnyFilter && isDefaultSort) {
      return filteredPositions;
    }

    // Build search set from filteredPositions (already search-filtered)
    const searchIds = new Set(filteredPositions.map((p) => p.id));

    // Sort comparator for PositionTree nodes
    const sortCmp = (a: PositionTree, b: PositionTree) => {
      let cmp = 0;
      if (sortField === 'name')
        cmp = a.positionName.localeCompare(b.positionName, 'id');
      else if (sortField === 'staff')
        cmp = (a.assignedUsers?.length ?? 0) - (b.assignedUsers?.length ?? 0);
      else if (sortField === 'level') cmp = a.positionLevel - b.positionLevel;
      return sortDir === 'asc' ? cmp : -cmp;
    };

    // Check if a position passes active filters
    const passesFilter = (pos: PositionTree): boolean => {
      if (!searchIds.has(pos.id)) return false;
      if (hasStatusFilter) {
        const vacant = (pos.assignedUsers ?? []).length === 0;
        if (matchVacant && !matchOccupied && !vacant) return false;
        if (matchOccupied && !matchVacant && vacant) return false;
      }
      if (hasLevelFilter && !matchLevels.has(pos.positionLevel)) return false;
      return true;
    };

    // Recursive filter + sort, preserving tree integrity
    const processTree = (
      nodes: PositionTree[],
      parentName: string | null = null,
    ): FlatPosition[] => {
      const kept: { node: PositionTree; flat: FlatPosition[] }[] = [];

      for (const node of nodes) {
        const childFlat = processTree(
          node.children ?? [],
          node.positionName,
        );
        const nodePasses = passesFilter(node);

        if (nodePasses || childFlat.length > 0) {
          const fp: FlatPosition = {
            id: node.id,
            positionCode: node.positionCode,
            positionName: node.positionName,
            positionLevel: node.positionLevel,
            parentId: node.parentId,
            parentName,
            isActive: node.isActive,
            assignedUsers: node.assignedUsers ?? [],
          };
          kept.push({ node, flat: [fp, ...childFlat] });
        }
      }

      // Sort siblings at this level
      kept.sort((a, b) => sortCmp(a.node, b.node));

      return kept.flatMap((k) => k.flat);
    };

    return processTree(positions);
  }, [positions, filteredPositions, filterKeys, sortField, sortDir]);

  const tableItems = useMemo(
    () => buildTableItems(sortedAndFilteredPositions),
    [sortedAndFilteredPositions],
  );

  const renderPositionRow = (item: PositionRow) => {
    const pos = item.position;

    return (
      <Table.Row id={item.key} textValue={pos.positionName}>
        <Table.Cell textValue={pos.positionName}>
          {({ hasChildItems, isExpanded, isTreeColumn }: { hasChildItems: boolean; isExpanded: boolean; isTreeColumn: boolean }) => (
            <span className="flex items-center gap-2">
              {hasChildItems && isTreeColumn ? (
                <span className="mr-2 shrink-0">
                  <CaretRight
                    className={cn(
                      'h-4 w-4 text-muted-foreground transition-transform duration-150',
                      isExpanded ? 'rotate-90' : '',
                    )}
                  />
                </span>
              ) : null}
              <span className="font-medium">{pos.positionName}</span>
            </span>
          )}
        </Table.Cell>

        <Table.Cell>
          <code className="rounded bg-default-100 px-1.5 py-0.5 text-xs">
            {pos.positionCode}
          </code>
        </Table.Cell>

        <Table.Cell>
          <Chip size="sm" color={getLevelColor(pos.positionLevel)} variant="soft">
            Level {pos.positionLevel}
          </Chip>
        </Table.Cell>

        <Table.Cell>{pos.parentName || '-'}</Table.Cell>

        <Table.Cell>
          <span className="font-medium tabular-nums">
            {pos.assignedUsers.length}
          </span>
        </Table.Cell>

        <Table.Cell>
          <Dropdown>
              <Button
                variant="tertiary"
                isIconOnly
                size="sm"
                aria-label={`Menu aksi untuk ${pos.positionName}`}
              >
                <DotsThreeVertical className="h-4 w-4 text-muted-foreground" />
              </Button>
            <Dropdown.Popover>
              <Dropdown.Menu
                aria-label={`Menu aksi untuk ${pos.positionName}`}
                onAction={(key) => {
                  switch (key) {
                    case 'edit':
                      handleEdit(pos);
                      break;
                    case 'delete':
                      handleDeleteRequest(pos);
                      break;
                    case 'add-sub':
                      handleAddSubordinate(pos.id);
                      break;
                    case 'assign':
                      handleAssignUser(pos);
                      break;
                  }
                }}
              >
                <Dropdown.Item id="edit" textValue="Edit">
                  <div className="flex items-center gap-2">
                    <PencilSimple className="size-4 shrink-0 text-muted-foreground" />
                    <span>Edit</span>
                  </div>
                </Dropdown.Item>
                <Dropdown.Item id="assign" textValue="Tugaskan Karyawan">
                  <div className="flex items-center gap-2">
                    <UserPlus className="size-4 shrink-0 text-muted-foreground" />
                    <span>Tugaskan Karyawan</span>
                  </div>
                </Dropdown.Item>
                <Dropdown.Item id="add-sub" textValue="Tambah Bawahan">
                  <div className="flex items-center gap-2">
                    <Plus className="size-4 shrink-0 text-muted-foreground" />
                    <span>Tambah Bawahan</span>
                  </div>
                </Dropdown.Item>
                <Dropdown.Item id="delete" textValue="Hapus" variant="danger">
                  <div className="flex items-center gap-2 text-danger">
                    <Trash className="size-4 shrink-0" />
                    <span>Hapus</span>
                  </div>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </Table.Cell>

        <Table.Collection items={item.children}>
          {(child) => {
            if (child.key.startsWith('empty-')) {
              return (
                <Table.Row id={child.key}>
                  <Table.Cell>
                    <span className="pl-10 text-sm italic text-muted-foreground">
                      Belum ada karyawan di jabatan ini.
                    </span>
                  </Table.Cell>
                  <Table.Cell />
                  <Table.Cell />
                  <Table.Cell />
                  <Table.Cell />
                  <Table.Cell />
                </Table.Row>
              );
            }

            return (
              <Table.Row id={child.key} textValue={child.fullName}>
                <Table.Cell>
                  <div className="flex items-center gap-3 py-1 pl-6">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {getInitials(child.fullName)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {child.fullName}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {child.nip ? `NIP: ${child.nip}` : child.email}
                      </div>
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell />
                <Table.Cell />
                <Table.Cell />
                <Table.Cell />
                <Table.Cell />
              </Table.Row>
            );
          }}
        </Table.Collection>
      </Table.Row>
    );
  };

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Row 1: Title + Refresh + Tambah */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">
            Struktur Jabatan
          </h1>
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
          <Button
            isIconOnly
            variant="tertiary"
            onPress={() => fetchPositions(true)}
            isDisabled={isRefreshing}
            aria-label="Muat ulang struktur organisasi"
          >
            <ArrowsClockwise
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </Button>
          <Button variant="primary" onPress={handleAddRootPosition}>
            <Plus className="h-4 w-4" />
            Tambah Jabatan
          </Button>
        </div>
      </div>

      {/* Row 2: Filter + Sort (left) | Search (right) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Filter Dropdown */}
          <Dropdown>
            <Button variant="tertiary" aria-label="Filter">
              <SlidersHorizontal className="h-4 w-4" />
              Filter
              {filterCount > 0 && (
                <>
                  <span className="mx-0.5 h-4 w-px bg-border" />
                  <span className="text-sm font-medium text-foreground">
                    {filterCount}
                  </span>
                </>
              )}
            </Button>
            <Dropdown.Popover className="min-w-[220px]">
              <Dropdown.Menu
                selectedKeys={filterKeys}
                selectionMode="multiple"
                onSelectionChange={setFilterKeys}
              >
                <Dropdown.Section>
                  <Header>Ketersediaan</Header>
                  <Dropdown.Item id="vacant" textValue="Kosong (Vacant)">
                    <Dropdown.ItemIndicator />
                    <Label>Kosong (Vacant)</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="occupied" textValue="Terisi">
                    <Dropdown.ItemIndicator />
                    <Label>Terisi</Label>
                  </Dropdown.Item>
                </Dropdown.Section>
                <Dropdown.Section>
                  <Header>Level</Header>
                  <Dropdown.Item
                    id="level:1"
                    textValue="Level 1 - Top Management"
                  >
                    <Dropdown.ItemIndicator />
                    <Label>Level 1 - Top Management</Label>
                  </Dropdown.Item>
                  <Dropdown.Item
                    id="level:2"
                    textValue="Level 2 - Middle Management"
                  >
                    <Dropdown.ItemIndicator />
                    <Label>Level 2 - Middle Management</Label>
                  </Dropdown.Item>
                  <Dropdown.Item
                    id="level:3"
                    textValue="Level 3 - Staff/Operational"
                  >
                    <Dropdown.ItemIndicator />
                    <Label>Level 3 - Staff/Operational</Label>
                  </Dropdown.Item>
                </Dropdown.Section>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>

          {/* Sort Dropdown */}
          <Dropdown>
            <Button variant="tertiary" aria-label="Urutkan">
              <FunnelSimple className="h-4 w-4" />
              Urut
              {!isDefaultSort && (
                <>
                  <span className="mx-0.5 h-4 w-px bg-border" />
                  <Check className="h-4 w-4" />
                </>
              )}
            </Button>
            <Dropdown.Popover>
              <Dropdown.Menu
                onAction={(key) => {
                  switch (key) {
                    case 'name-asc':
                      setSortField('name');
                      setSortDir('asc');
                      break;
                    case 'name-desc':
                      setSortField('name');
                      setSortDir('desc');
                      break;
                    case 'staff-desc':
                      setSortField('staff');
                      setSortDir('desc');
                      break;
                    case 'level-desc':
                      setSortField('level');
                      setSortDir('desc');
                      break;
                  }
                }}
              >
                <Dropdown.Item id="name-asc" textValue="Nama Jabatan (A-Z)">
                  <Label>Nama Jabatan (A-Z)</Label>
                </Dropdown.Item>
                <Dropdown.Item id="name-desc" textValue="Nama Jabatan (Z-A)">
                  <Label>Nama Jabatan (Z-A)</Label>
                </Dropdown.Item>
                <Dropdown.Item
                  id="staff-desc"
                  textValue="Jumlah Staf (Terbanyak)"
                >
                  <Label>Jumlah Staf (Terbanyak)</Label>
                </Dropdown.Item>
                <Dropdown.Item
                  id="level-desc"
                  textValue="Level Jabatan (Tertinggi)"
                >
                  <Label>Level Jabatan (Tertinggi)</Label>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>

          {/* Reset Button (conditional) */}
          {(filterCount > 0 || !isDefaultSort) && (
            <Button
              isIconOnly
              variant="tertiary"
              aria-label="Reset"
              onPress={() => {
                setFilterKeys(new Set());
                setSortField('name');
                setSortDir('asc');
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <SearchField
          name="search"
          value={searchTerm}
          onChange={setSearchTerm}
          className="w-72"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              aria-label="Cari jabatan"
              placeholder="Cari jabatan"
            />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </div>

      {!isLoading && sortedAndFilteredPositions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
          <Tray className="h-8 w-8" />
          <span className="text-sm">Tidak ada data</span>
          {!searchTerm && filterCount === 0 && (
            <Button variant="primary" onPress={handleAddRootPosition} className="mt-4">
              <Plus className="h-4 w-4" />
              Tambah Jabatan Pertama
            </Button>
          )}
        </div>
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content
              aria-label="Tabel hierarki jabatan"
              className="min-w-225"
              selectionMode="single"
              expandedKeys={expandedKeys}
              onExpandedChange={setExpandedKeys}
              treeColumn="name"
            >
              <Table.Header>
                <Table.Column isRowHeader id="name">
                  Nama Jabatan
                </Table.Column>
                <Table.Column id="code">Kode</Table.Column>
                <Table.Column id="level">Level</Table.Column>
                <Table.Column id="parent">Atasan Langsung</Table.Column>
                <Table.Column id="staff">Jumlah Staf</Table.Column>
                <Table.Column id="actions" aria-label="Aksi" className="w-16 text-center">{''}</Table.Column>
              </Table.Header>
              <Table.Body
                items={isLoading ? [] : tableItems}
                renderEmptyState={() =>
                    isLoading ? (
                      <div className="flex h-24 items-center justify-center">
                        <Spinner size="md" />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                        <Tray className="h-8 w-8" />
                        <span className="text-sm">Tidak ada data</span>
                      </div>
                    )
                  }
              >
                {renderPositionRow}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}

      <PositionFormModal
        isOpen={isFormModalOpen}
        onClose={handleFormModalClose}
        onSubmit={handleFormSubmit}
        position={selectedPosition}
        parentId={parentPositionId}
        allPositions={positions}
      />

      <AssignUserModal
        isOpen={isAssignModalOpen}
        onClose={handleAssignModalClose}
        onSuccess={handleAssignSubmit}
        positionId={assignPositionId}
        users={allUsers}
        positions={positions}
        isSubmitting={isAssigning}
      />

      {/* Delete Position Dialog (replaces window.confirm) */}
      <Modal>
        <Modal.Backdrop
          isOpen={isDeleteDialogOpen}
          onOpenChange={(open) => {
            if (!open) handleDeleteDialogClose();
          }}
        >
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading className="px-2 flex items-center gap-2">
                  <Warning className="h-5 w-5 text-warning" />
                  Konfirmasi Hapus Jabatan
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="p-2">
                <p className="text-sm text-muted-foreground">
                  Apakah Anda yakin ingin menghapus jabatan{' '}
                  <strong className="text-foreground">{deletingPosition?.positionName}</strong>?
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="secondary"
                  onPress={handleDeleteDialogClose}
                  isDisabled={isDeleting}
                >
                  Batal
                </Button>
                <Button
                  variant="danger"
                  onPress={handleDeleteConfirm}
                  isDisabled={isDeleting}
                  isPending={isDeleting}
                >
                  {isDeleting ? 'Menghapus...' : 'Hapus Jabatan'}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
};
