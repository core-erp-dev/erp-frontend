"use client";

import { useState, useCallback } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button, SearchField } from "@heroui/react";

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

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-4">
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

        <div className="flex items-center justify-between">
          <SearchField
            name="search"
            value={searchQuery}
            onChange={handleSearch}
            className="w-70"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input
                aria-label="Cari karyawan"
                placeholder="Cari karyawan..."
              />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>

          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              variant="tertiary"
              onPress={handleRefresh}
              isDisabled={isLoading}
              aria-label="Muat ulang data karyawan"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
            <Button variant="primary" onPress={handleCreateUser}>
              <Plus className="h-4 w-4" />
              Tambah Karyawan
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full">
        <DataTable
          users={users}
          isLoading={isLoading}
          searchQuery={searchQuery}
          pagination={pagination}
          onPageChange={handlePageChange}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
          onAssignPosition={handleAssignPosition}
        />
      </div>

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
