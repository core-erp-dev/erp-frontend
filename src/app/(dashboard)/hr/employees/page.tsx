'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/modules/hr/employees/components/data-table';
import { UserFormModal } from '@/modules/hr/employees/components/user-form-modal';
import { DeleteConfirmDialog } from '@/modules/hr/employees/components/delete-confirm-dialog';
import { AssignUserModal } from '@/modules/hr/employees/components/assign-user-modal';
import { employeeApi } from '@/modules/hr/employees/services/employee-api';
import { organizationApi } from '@/modules/hr/hierarchy/services/organization-api';
import { CoreUser, UserCreateRequest, UserUpdateRequest } from '@/modules/hr/employees/types';
import { PositionTree } from '@/modules/hr/hierarchy/types';
import { toast } from 'sonner';
import { AxiosError } from 'axios';

export default function EmployeePage() {
  const [users, setUsers] = useState<CoreUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CoreUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Assign Position Modal states
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState<string | null>(null);
  const [positions, setPositions] = useState<PositionTree[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await employeeApi.getUsers();
      setUsers(data);
    } catch (error) {
      toast.error('Failed to fetch users');
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPositions = useCallback(async () => {
    try {
      const data = await organizationApi.fetchPositionTree();
      setPositions(data);
    } catch {
      // silently fail - positions are only needed for the assign modal
    }
  }, []);

  // Fetch users and positions on component mount
  useEffect(() => {
    fetchUsers();
    fetchPositions();
  }, [fetchUsers, fetchPositions]);

  const handleCreateUser = () => {
    setSelectedUser(null);
    setIsFormModalOpen(true);
  };

  const handleEditUser = (user: CoreUser) => {
    setSelectedUser(user);
    setIsFormModalOpen(true);
  };

  const handleDeleteUser = (user: CoreUser) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: UserCreateRequest | UserUpdateRequest) => {
    try {
      setIsSubmitting(true);

      if (selectedUser) {
        // Update existing user
        await employeeApi.updateUser(selectedUser.id, data);
        toast.success('User updated successfully');
      } else {
        // Create new user
        await employeeApi.createUser(data as UserCreateRequest);
        toast.success('User created successfully');
      }

      setIsFormModalOpen(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (error) {
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } })?.response?.data?.message
        : undefined;

      toast.error(
        errorMessage ||
        (selectedUser ? 'Failed to update user' : 'Failed to create user')
      );
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;

    try {
      setIsDeleting(true);
      await employeeApi.deleteUser(selectedUser.id);
      toast.success('User deactivated successfully');
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (error) {
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } })?.response?.data?.message
        : undefined;

      toast.error(
        errorMessage || 'Failed to deactivate user'
      );
      console.error('Error deleting user:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleModalClose = () => {
    setIsFormModalOpen(false);
    setSelectedUser(null);
  };

  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  // Handle Assign Position - open modal with user pre-filled
  const handleAssignPosition = (user: CoreUser) => {
    setAssignUserId(user.id);
    setIsAssignModalOpen(true);
  };

  // Handle Assign User submission
  const handleAssignSubmit = async (data: {
    userId: string;
    positionId: number;
    startDate: string;
    isPrimary: boolean;
  }) => {
    try {
      setIsAssigning(true);
      await employeeApi.assignUserToPosition(data);
      toast.success('Position assigned successfully', {
        description: 'The employee has been assigned to the position.',
      });
      setIsAssignModalOpen(false);
      setAssignUserId(null);
      fetchUsers();
    } catch (error) {
      const errorMessage =
        error instanceof AxiosError && error.response?.data?.message
          ? error.response.data.message
          : 'Failed to assign user to position';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and access permissions
          </p>
        </div>
        <Button onClick={handleCreateUser} className="gap-2">
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Data Table Card */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            users={users}
            isLoading={isLoading}
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
            onAssignPosition={handleAssignPosition}
          />
        </CardContent>
      </Card>

      {/* User Form Modal */}
      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={handleModalClose}
        onSubmit={handleFormSubmit}
        user={selectedUser}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={handleDeleteDialogClose}
        onConfirm={handleDeleteConfirm}
        userName={selectedUser?.fullName || ''}
        isDeleting={isDeleting}
      />

      {/* Assign Position Modal */}
      <AssignUserModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setAssignUserId(null);
        }}
        onSuccess={handleAssignSubmit}
        userId={assignUserId}
        users={users}
        positions={positions}
        isSubmitting={isAssigning}
      />
    </div>
  );
}
