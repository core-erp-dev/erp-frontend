import { useState } from 'react';
import { KpiTask } from '../types';

interface UseKpiTaskFormReturn {
  isFormModalOpen: boolean;
  selectedTask: KpiTask | null;
  isSubmitting: boolean;
  handleCreateTask: () => void;
  handleEditTask: (task: KpiTask) => void;
  handleFormModalClose: () => void;
  handleFormSubmit: (callback: () => Promise<boolean>) => Promise<void>;

  isDeleteDialogOpen: boolean;
  isDeleting: boolean;
  handleDeleteTask: (task: KpiTask) => void;
  handleDeleteDialogClose: () => void;
  handleDeleteConfirm: (callback: () => Promise<boolean>) => Promise<void>;

  isApprovalModalOpen: boolean;
  isApproving: boolean;
  handleApprovalTask: (task: KpiTask) => void;
  handleApprovalModalClose: () => void;
  handleApprovalSubmit: (callback: () => Promise<boolean>) => Promise<void>;
}

export function useKpiTaskForm(): UseKpiTaskFormReturn {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<KpiTask | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const handleCreateTask = () => {
    setSelectedTask(null);
    setIsFormModalOpen(true);
  };

  const handleEditTask = (task: KpiTask) => {
    setSelectedTask(task);
    setIsFormModalOpen(true);
  };

  const handleFormModalClose = () => {
    setIsFormModalOpen(false);
    setSelectedTask(null);
  };

  const handleFormSubmit = async (callback: () => Promise<boolean>) => {
    setIsSubmitting(true);
    try {
      const success = await callback();
      if (success) {
        setIsFormModalOpen(false);
        setSelectedTask(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = (task: KpiTask) => {
    setSelectedTask(task);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false);
    setSelectedTask(null);
  };

  const handleDeleteConfirm = async (callback: () => Promise<boolean>) => {
    setIsDeleting(true);
    try {
      const success = await callback();
      if (success) {
        setIsDeleteDialogOpen(false);
        setSelectedTask(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApprovalTask = (task: KpiTask) => {
    setSelectedTask(task);
    setIsApprovalModalOpen(true);
  };

  const handleApprovalModalClose = () => {
    setIsApprovalModalOpen(false);
    setSelectedTask(null);
  };

  const handleApprovalSubmit = async (callback: () => Promise<boolean>) => {
    setIsApproving(true);
    try {
      const success = await callback();
      if (success) {
        setIsApprovalModalOpen(false);
        setSelectedTask(null);
      }
    } finally {
      setIsApproving(false);
    }
  };

  return {
    isFormModalOpen,
    selectedTask,
    isSubmitting,
    handleCreateTask,
    handleEditTask,
    handleFormModalClose,
    handleFormSubmit,

    isDeleteDialogOpen,
    isDeleting,
    handleDeleteTask,
    handleDeleteDialogClose,
    handleDeleteConfirm,

    isApprovalModalOpen,
    isApproving,
    handleApprovalTask,
    handleApprovalModalClose,
    handleApprovalSubmit,
  };
}
