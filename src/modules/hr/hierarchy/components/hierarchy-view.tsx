'use client';

import React from 'react';
import {
  Button,
  Chip,
  Dropdown,
  Modal,
  SearchField,
  Spinner,
  Table,
} from '@heroui/react';
import {
  RefreshCw,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  UserPlus,
  Search,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { PositionFormModal } from './position-form-modal';
import { AssignUserModal } from '@/modules/hr/employees/components/assign-user-modal';
import { useHierarchyData } from '../hooks/use-hierarchy-data';
import { getLevelColor, getInitials } from '../../shared/utils';
import type { PositionRow } from '../../shared/utils/position-helpers';

export const HierarchyView: React.FC = () => {
  const {
    isLoading,
    isRefreshing,
    positions,
    flatPositions,
    filteredPositions,
    tableItems,
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

  const renderPositionRow = (item: PositionRow) => {
    const pos = item.position;

    return (
      <Table.Row id={item.key} textValue={pos.positionName}>
        <Table.Cell textValue={pos.positionName}>
          {({ hasChildItems, isExpanded, isTreeColumn }: { hasChildItems: boolean; isExpanded: boolean; isTreeColumn: boolean }) => (
            <span className="flex items-center gap-2">
              {hasChildItems && isTreeColumn ? (
                <Button
                  isIconOnly
                  aria-label="Tampilkan karyawan"
                  size="sm"
                  slot="chevron"
                  variant="ghost"
                >
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 text-muted-foreground transition-transform duration-150',
                      isExpanded ? 'rotate-90' : '',
                    )}
                  />
                </Button>
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

        <Table.Cell>{pos.parentName || '—'}</Table.Cell>

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
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
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
                    <Pencil className="size-4 shrink-0 text-muted-foreground" />
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
                    <Trash2 className="size-4 shrink-0" />
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
      <div className="flex flex-col gap-4">
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

        <div className="flex items-center justify-between">
          <SearchField
            name="search"
            value={searchTerm}
            onChange={setSearchTerm}
            className="w-70"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input
                aria-label="Cari posisi"
                placeholder="Cari posisi..."
              />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>

          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              variant="tertiary"
              onPress={() => fetchPositions(true)}
              isDisabled={isRefreshing}
              aria-label="Muat ulang struktur organisasi"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </Button>
            <Button variant="primary" onPress={handleAddRootPosition}>
              <Plus className="h-4 w-4" />
              Tambah Jabatan
            </Button>
          </div>
        </div>
      </div>

      {!isLoading && filteredPositions.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">
            {searchTerm ? 'Jabatan Tidak Ditemukan' : 'Belum Ada Jabatan'}
          </h3>
          <p className="mb-6 max-w-sm text-center text-muted-foreground">
            {searchTerm
              ? 'Tidak ada jabatan yang cocok dengan pencarian Anda.'
              : 'Mulai bangun hierarki organisasi dengan menambahkan jabatan pertama.'}
          </p>
          {!searchTerm && (
            <Button variant="primary" onPress={handleAddRootPosition}>
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
                    <div className="flex h-24 flex-col items-center justify-center gap-2 text-muted-foreground">
                      <span className="text-sm">
                        {searchTerm
                          ? 'Tidak ada jabatan yang cocok dengan pencarian.'
                          : 'Belum ada data jabatan.'}
                      </span>
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
                  <AlertTriangle className="h-5 w-5 text-warning" />
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
