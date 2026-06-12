import { useState } from 'react';
import { CoreUser } from '../types';

interface UseEmployeeFormReturn {
  // Form modal state
  isFormModalOpen: boolean;
  selectedUser: CoreUser | null;
  isSubmitting: boolean;
  handleCreateUser: () => void;
  handleEditUser: (user: CoreUser) => void;
  handleFormModalClose: () => void;
  handleFormSubmit: (callback: () => Promise<boolean>) => Promise<void>;

  // Delete dialog state
  isDeleteDialogOpen: boolean;
  isDeleting: boolean;
  handleDeleteUser: (user: CoreUser) => void;
  handleDeleteDialogClose: () => void;
  handleDeleteConfirm: (callback: () => Promise<boolean>) => Promise<void>;

  // Assign modal state
  isAssignModalOpen: boolean;
  assignUserId: string | null;
  isAssigning: boolean;
  handleAssignPosition: (user: CoreUser) => void;
  handleAssignModalClose: () => void;
  handleAssignSubmit: (callback: () => Promise<boolean>) => Promise<void>;
}

export function useEmployeeForm(): UseEmployeeFormReturn {
  // Form modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CoreUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Assign modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Form modal handlers
  const handleCreateUser = () => {
    setSelectedUser(null);
    setIsFormModalOpen(true);
  };

  const handleEditUser = (user: CoreUser) => {
    setSelectedUser(user);
    setIsFormModalOpen(true);
  };

  const handleFormModalClose = () => {
    setIsFormModalOpen(false);
    setSelectedUser(null);
  };

  const handleFormSubmit = async (callback: () => Promise<boolean>) => {
    setIsSubmitting(true);
    try {
      const success = await callback();
      if (success) {
        setIsFormModalOpen(false);
        setSelectedUser(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete dialog handlers
  const handleDeleteUser = (user: CoreUser) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  const handleDeleteConfirm = async (callback: () => Promise<boolean>) => {
    setIsDeleting(true);
    try {
      const success = await callback();
      if (success) {
        setIsDeleteDialogOpen(false);
        setSelectedUser(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Assign modal handlers
  const handleAssignPosition = (user: CoreUser) => {
    setAssignUserId(user.id);
    setIsAssignModalOpen(true);
  };

  const handleAssignModalClose = () => {
    setIsAssignModalOpen(false);
    setAssignUserId(null);
  };

  const handleAssignSubmit = async (callback: () => Promise<boolean>) => {
    setIsAssigning(true);
    try {
      const success = await callback();
      if (success) {
        setIsAssignModalOpen(false);
        setAssignUserId(null);
      }
    } finally {
      setIsAssigning(false);
    }
  };

  return {
    // Form modal
    isFormModalOpen,
    selectedUser,
    isSubmitting,
    handleCreateUser,
    handleEditUser,
    handleFormModalClose,
    handleFormSubmit,

    // Delete dialog
    isDeleteDialogOpen,
    isDeleting,
    handleDeleteUser,
    handleDeleteDialogClose,
    handleDeleteConfirm,

    // Assign modal
    isAssignModalOpen,
    assignUserId,
    isAssigning,
    handleAssignPosition,
    handleAssignModalClose,
    handleAssignSubmit,
  };
}
