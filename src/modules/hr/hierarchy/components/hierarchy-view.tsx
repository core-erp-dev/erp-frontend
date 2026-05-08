'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PositionTreeNode } from './position-tree-node';
import { PositionFormModal } from './position-form-modal';
import { AssignUserModal } from '@/modules/hr/employees/components/assign-user-modal';
import { PositionTree, PositionRequest, PositionUpdateRequest } from '../types';
import { organizationApi } from '../services/organization-api';
import { employeeApi } from '@/modules/hr/employees/services/employee-api';
import { CoreUser } from '@/modules/hr/employees/types';
import { RefreshCw, TreePine, Plus } from 'lucide-react';
import { AxiosError } from 'axios';

export const HierarchyView: React.FC = () => {
  const [positions, setPositions] = useState<PositionTree[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<PositionTree | null>(
    null
  );
  const [parentPositionId, setParentPositionId] = useState<number | null>(null);

  // Assign User Modal states
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignPositionId, setAssignPositionId] = useState<number | null>(null);
  const [allUsers, setAllUsers] = useState<CoreUser[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchPositions = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await organizationApi.fetchPositionTree();
      setPositions(data);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to fetch position hierarchy';
      toast.error(errorMessage, {
        description: 'Please try again later.',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPositions();
    // Fetch all users for the assign modal
    employeeApi.getUsers().then(setAllUsers).catch(() => {});
  }, [fetchPositions]);

  // Handle Add Sub-ordinate
  const handleAddSubordinate = (parentId: number) => {
    setSelectedPosition(null);
    setParentPositionId(parentId);
    setIsFormModalOpen(true);
  };

  // Handle Edit
  const handleEdit = (position: PositionTree) => {
    setSelectedPosition(position);
    setParentPositionId(null);
    setIsFormModalOpen(true);
  };

  // Handle Delete
  const handleDelete = async (position: PositionTree) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the position "${position.positionName}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await organizationApi.deletePosition(position.id);
      toast.success('Position deleted successfully', {
        description: `"${position.positionName}" has been removed.`,
      });
      fetchPositions(true);
    } catch (error) {
      // Handle specific error types
      let errorTitle = 'Failed to delete position';
      let errorDescription = 'Please try again later.';

      if (error instanceof AxiosError && error.response) {
        const detail = error.response.data?.detail || '';
        const status = error.response.status;

        if (status === 400) {
          if (detail.toLowerCase().includes('orphan')) {
            errorTitle = 'Cannot Delete: Has Sub-ordinates';
            errorDescription =
              'This position has sub-ordinate positions. Please remove or reassign them first.';
          } else if (
            detail.toLowerCase().includes('user') ||
            detail.toLowerCase().includes('assign')
          ) {
            errorTitle = 'Cannot Delete: Has Assigned Users';
            errorDescription =
              'This position has users assigned to it. Please reassign or remove them first.';
          } else if (
            detail.toLowerCase().includes('circular') ||
            detail.toLowerCase().includes('reference')
          ) {
            errorTitle = 'Circular Reference Detected';
            errorDescription =
              'This operation would create a circular reference in the hierarchy.';
          } else {
            errorDescription = detail || errorDescription;
          }
        }
      }

      toast.error(errorTitle, {
        description: errorDescription,
      });
    }
  };

  // Handle Assign User - open modal with position pre-filled
  const handleAssignUser = (position: PositionTree) => {
    setAssignPositionId(position.id);
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
      toast.success('User assigned successfully', {
        description: 'The position assignment has been saved.',
      });
      setIsAssignModalOpen(false);
      setAssignPositionId(null);
      fetchPositions(true);
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

  // Handle Form Submit
  const handleFormSubmit = async (
    data: PositionRequest | PositionUpdateRequest
  ) => {
    try {
      if (selectedPosition) {
        // Edit mode
        const updateData = data as PositionUpdateRequest;
        await organizationApi.updatePosition(selectedPosition.id, updateData);
        toast.success('Position updated successfully', {
          description: `"${updateData.positionName || selectedPosition.positionName}" has been updated.`,
        });
      } else {
        // Create mode
        const createData = data as PositionRequest;
        await organizationApi.createPosition(createData);
        toast.success('Position created successfully', {
          description: `"${createData.positionName}" has been added to the hierarchy.`,
        });
      }
      fetchPositions(true);
    } catch (error) {
      let errorTitle = selectedPosition
        ? 'Failed to update position'
        : 'Failed to create position';
      let errorDescription = 'Please check your input and try again.';

      if (error instanceof AxiosError && error.response) {
        const detail = error.response.data?.detail || '';
        const status = error.response.status;

        if (status === 400) {
          if (
            detail.toLowerCase().includes('circular') ||
            detail.toLowerCase().includes('reference')
          ) {
            errorTitle = 'Circular Reference Detected';
            errorDescription =
              'The selected parent would create a circular reference in the hierarchy.';
          } else {
            errorDescription = detail || errorDescription;
          }
        } else if (status === 409) {
          errorTitle = 'Duplicate Position Code';
          errorDescription =
            'A position with this code already exists. Please use a unique code.';
        }
      }

      toast.error(errorTitle, {
        description: errorDescription,
      });
      throw error;
    }
  };

  // Handle Add Root Position
  const handleAddRootPosition = () => {
    setSelectedPosition(null);
    setParentPositionId(null);
    setIsFormModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TreePine className="h-6 w-6" />
            Organization Hierarchy
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your organizations position structure and reporting lines.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPositions(true)}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Button size="sm" onClick={handleAddRootPosition}>
            <Plus className="h-4 w-4 mr-2" />
            Add Root Position
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-28 w-[90%]" />
          <Skeleton className="h-28 w-[85%]" />
        </div>
      ) : positions.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <TreePine className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Positions Yet</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-sm">
            Start building your organization hierarchy by adding your first
            position.
          </p>
          <Button onClick={handleAddRootPosition}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Position
          </Button>
        </div>
      ) : (
        /* Tree View */
        <div className="space-y-2">
          {positions.map((position) => (
            <PositionTreeNode
              key={position.id}
              position={position}
              onAddSubordinate={handleAddSubordinate}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAssignUser={handleAssignUser}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      <PositionFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedPosition(null);
          setParentPositionId(null);
        }}
        onSubmit={handleFormSubmit}
        position={selectedPosition}
        parentId={parentPositionId}
        allPositions={positions}
      />

      {/* Assign User Modal */}
      <AssignUserModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setAssignPositionId(null);
        }}
        onSuccess={handleAssignSubmit}
        positionId={assignPositionId}
        users={allUsers}
        positions={positions}
        isSubmitting={isAssigning}
      />
    </div>
  );
};
