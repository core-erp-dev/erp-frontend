"use client";

import { useState, useCallback, useMemo } from "react";
import { Plus, ArrowsClockwise, SlidersHorizontal, FunnelSimple, Check, X } from "@phosphor-icons/react";
import {
  Button,
  SearchField,
  Dropdown,
  Header,
  Label,
} from "@heroui/react";
import type { Selection } from "@heroui/react";

import { DataTable } from "@/modules/hr/employees/components/data-table";
import { UserFormModal } from "@/modules/hr/employees/components/user-form-modal";
import { DeleteConfirmDialog } from "@/modules/hr/employees/components/delete-confirm-dialog";
import { AssignUserModal } from "@/modules/hr/employees/components/assign-user-modal";
import {
  UserCreateRequest,
  UserUpdateRequest,
} from "@/modules/hr/employees/types";
import { useEmployeeData } from "@/modules/hr/employees/hooks/use-employee-data";
import { useEmployeeForm } from "@/modules/hr/employees/hooks/use-employee-form";

type SortField = "fullName" | "nip" | "createdAt";
type SortDir = "asc" | "desc";

export default function EmployeePage() {
  const {
    users,
    positions,
    isLoading,
    pagination,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    assignPosition,
  } = useEmployeeData();

  const {
    isFormModalOpen,
    selectedUser,
    isSubmitting,
    handleCreateUser,
    handleEditUser,
    handleFormModalClose,
    isDeleteDialogOpen,
    isDeleting,
    handleDeleteUser,
    handleDeleteDialogClose,
    handleDeleteConfirm,
    isAssignModalOpen,
    assignUserId,
    isAssigning,
    handleAssignPosition,
    handleAssignModalClose,
    handleAssignSubmit,
  } = useEmployeeForm();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterKeys, setFilterKeys] = useState<Selection>(new Set());
  const [sortField, setSortField] = useState<SortField>("fullName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Client-side filter + sort
  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Collect selected filters
    const selected = filterKeys instanceof Set ? filterKeys : new Set<string>();
    const statusKeys = new Set<string>();
    const posKeys = new Set<string>();
    selected.forEach((k) => {
      const key = String(k);
      if (key.startsWith("status:")) statusKeys.add(key.replace("status:", ""));
      if (key.startsWith("pos:")) posKeys.add(key.replace("pos:", ""));
    });

    // Filter by status
    if (statusKeys.size > 0) {
      result = result.filter((u) => {
        return (
          (statusKeys.has("active") && u.isActive) ||
          (statusKeys.has("inactive") && !u.isActive)
        );
      });
    }

    // Filter by position
    if (posKeys.size > 0) {
      result = result.filter((u) => {
        const posName = u.primaryPosition?.positionName;
        return posName ? posKeys.has(posName) : false;
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortField === "createdAt") {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return sortDir === "asc" ? dateA - dateB : dateB - dateA;
      }
      const valA = sortField === "nip" ? a.nip || "" : a.fullName || "";
      const valB = sortField === "nip" ? b.nip || "" : b.fullName || "";
      const cmp = valA.localeCompare(valB, "id");
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [users, filterKeys, sortField, sortDir]);

  // Unique positions from users
  const positionNames = useMemo(() => {
    const names = new Set<string>();
    users.forEach((u) => {
      if (u.primaryPosition?.positionName) {
        names.add(u.primaryPosition.positionName);
      }
    });
    return Array.from(names).sort();
  }, [users]);

  const onFormSubmit = async (data: UserCreateRequest | UserUpdateRequest) => {
    if (selectedUser) {
      await updateUser(selectedUser.id, data);
    } else {
      await createUser(data as UserCreateRequest);
    }
  };

  const handlePageChange = useCallback(
    (page: number) => {
      fetchUsers(page - 1, pagination?.size ?? 10, searchQuery || undefined);
    },
    [fetchUsers, pagination?.size, searchQuery],
  );

  const handleRefresh = useCallback(() => {
    fetchUsers(pagination?.page ?? 0, pagination?.size ?? 10);
  }, [fetchUsers, pagination?.page, pagination?.size]);

  const handleSearch = useCallback(
    (value: string) => {
      setSearchQuery(value);
      fetchUsers(0, pagination?.size ?? 10, value || undefined);
    },
    [fetchUsers, pagination?.size],
  );

  const activeFilterCount = filterKeys instanceof Set ? filterKeys.size : 0;

  const sortOptions = [
    { field: "fullName" as SortField, label: "Nama (A-Z)", dir: "asc" as SortDir },
    { field: "fullName" as SortField, label: "Nama (Z-A)", dir: "desc" as SortDir },
    { field: "createdAt" as SortField, label: "Terbaru", dir: "desc" as SortDir },
    { field: "createdAt" as SortField, label: "Terlama", dir: "asc" as SortDir },
  ];

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Row 1: Title + Refresh + Tambah */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">
            Semua Karyawan
          </h1>
          <Button
            isIconOnly
            variant="tertiary"
            size="sm"
            className="pointer-events-none text-sm font-medium"
            aria-label={`Total ${pagination?.totalElements ?? 0} karyawan`}
          >
            {pagination?.totalElements ?? 0}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            isIconOnly
            variant="tertiary"
            onPress={handleRefresh}
            isDisabled={isLoading}
            aria-label="Muat ulang data karyawan"
          >
            <ArrowsClockwise
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
          <Button variant="primary" onPress={handleCreateUser}>
            <Plus className="h-4 w-4" />
            Tambah Karyawan
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
              {activeFilterCount > 0 && (
                <>
                  <span className="mx-0.5 h-4 w-px bg-border" />
                  <span className="text-sm font-medium text-foreground">{activeFilterCount}</span>
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
                  <Header>Status</Header>
                  <Dropdown.Item id="status:active" textValue="Aktif">
                    <Dropdown.ItemIndicator />
                    <Label>Aktif</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="status:inactive" textValue="Tidak Aktif">
                    <Dropdown.ItemIndicator />
                    <Label>Tidak Aktif</Label>
                  </Dropdown.Item>
                </Dropdown.Section>
                <Dropdown.Section>
                  <Header>Jabatan</Header>
                  {positionNames.map((name) => (
                    <Dropdown.Item key={name} id={`pos:${name}`} textValue={name}>
                      <Dropdown.ItemIndicator />
                      <Label>{name}</Label>
                    </Dropdown.Item>
                  ))}
                </Dropdown.Section>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>

          {/* Sort Dropdown */}
          <Dropdown>
            <Button variant="tertiary" aria-label="Urutkan">
              <FunnelSimple className="h-4 w-4" />
              Urut
              {(sortField !== "fullName" || sortDir !== "asc") && (
                <>
                  <span className="mx-0.5 h-4 w-px bg-border" />
                  <Check className="h-4 w-4" />
                </>
              )}
            </Button>
            <Dropdown.Popover>
              <Dropdown.Menu
                onAction={(key) => {
                  const opt = sortOptions[Number(key)];
                  if (opt) {
                    setSortField(opt.field);
                    setSortDir(opt.dir);
                  }
                }}
              >
                {sortOptions.map((opt, i) => (
                  <Dropdown.Item key={i} id={String(i)} textValue={opt.label}>
                    <Label>{opt.label}</Label>
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>

          {/* Reset Button */}
          {(activeFilterCount > 0 || sortField !== "fullName" || sortDir !== "asc") && (
            <Button
              isIconOnly
              variant="tertiary"
              aria-label="Reset filter dan urutan"
              onPress={() => {
                setFilterKeys(new Set());
                setSortField("fullName");
                setSortDir("asc");
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <SearchField
          name="search"
          value={searchQuery}
          onChange={handleSearch}
          className="w-72"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              aria-label="Cari karyawan"
              placeholder="Cari NIP, Nama, Jabatan"
            />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </div>

      {/* Table */}
      <div className="w-full">
        <DataTable
          users={filteredUsers}
          isLoading={isLoading}
          searchQuery={searchQuery}
          pagination={pagination}
          onPageChange={handlePageChange}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
          onAssignPosition={handleAssignPosition}
        />
      </div>

      {/* Modals */}
      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={handleFormModalClose}
        onSubmit={onFormSubmit}
        user={selectedUser}
        isSubmitting={isSubmitting}
      />

      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={handleDeleteDialogClose}
        onConfirm={() => handleDeleteConfirm(() => deleteUser(selectedUser!.id))}
        userName={selectedUser?.fullName || ""}
        isDeleting={isDeleting}
      />

      <AssignUserModal
        isOpen={isAssignModalOpen}
        onClose={handleAssignModalClose}
        onSuccess={(data) => handleAssignSubmit(() => assignPosition(data))}
        userId={assignUserId}
        users={users}
        positions={positions}
        isSubmitting={isAssigning}
      />
    </div>
  );
}
