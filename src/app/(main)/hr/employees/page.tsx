"use client";

import { useState } from "react";
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

  // Wire form submit to data operations
  const onFormSubmit = async (data: UserCreateRequest | UserUpdateRequest) => {
    if (selectedUser) {
      await updateUser(selectedUser.id, data);
    } else {
      await createUser(data as UserCreateRequest);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        {/* Title */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">
            Semua Karyawan
          </h1>

          <Button
            isIconOnly
            variant="tertiary"
            size="sm"
            className="pointer-events-none text-sm font-medium"
            aria-label={`Total ${users.length} karyawan`}
          >
            {users.length}
          </Button>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center justify-between">
          <SearchField
            name="search"
            value={searchQuery}
            onChange={setSearchQuery}
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
            {/* Refresh */}
            <Button
              isIconOnly
              variant="tertiary"
              onPress={fetchUsers}
              isDisabled={isLoading}
              aria-label="Muat ulang data karyawan"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>

            {/* Add Employee */}
            <Button variant="primary" onPress={handleCreateUser}>
              <Plus className="h-4 w-4" />
              Tambah Karyawan
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="w-full">
        <DataTable
          users={users}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
          onAssignPosition={handleAssignPosition}
        />
      </div>

      {/* User Form Modal */}
      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={handleFormModalClose}
        onSubmit={onFormSubmit}
        user={selectedUser}
        isSubmitting={isSubmitting}
      />

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={handleDeleteDialogClose}
        onConfirm={() => handleDeleteConfirm(() => deleteUser(selectedUser!.id))}
        userName={selectedUser?.fullName || ""}
        isDeleting={isDeleting}
      />

      {/* Assign Position Modal */}
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
