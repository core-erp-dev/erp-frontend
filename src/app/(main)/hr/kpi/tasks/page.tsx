"use client";

import { useState, useCallback, useMemo } from "react";
import { Plus, ArrowsClockwise, Warning } from "@phosphor-icons/react";
import { Button, SearchField, Select } from "@heroui/react";
import { ListBox } from "@heroui/react";

import { TaskDataTable } from "@/modules/hr/kpi/components/task-data-table";
import { TaskFormModal } from "@/modules/hr/kpi/components/task-form-modal";
import { DeleteTaskDialog } from "@/modules/hr/kpi/components/delete-task-dialog";
import { ApprovalModal } from "@/modules/hr/kpi/components/approval-modal";
import { useKpiTaskData } from "@/modules/hr/kpi/hooks/use-task-data";
import { useKpiTaskForm } from "@/modules/hr/kpi/hooks/use-task-form";
import {
  CreateTaskRequest,
  UpdateTaskRequest,
  KpiTaskStatus,
  KPI_TASK_STATUS_LABELS,
} from "@/modules/hr/kpi/types";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Semua Status' },
  ...Object.entries(KPI_TASK_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

export default function KpiTasksPage() {
  const {
    tasks,
    isLoading,
    pagination,
    filters,
    setFilters,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    approveTask,
  } = useKpiTaskData();

  const {
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
  } = useKpiTaskForm();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Banner: count tasks needing attention
  const pendingTargetCount = useMemo(
    () => tasks.filter((t) => t.status === "PENDING_TARGET").length,
    [tasks],
  );
  const rejectedCount = useMemo(
    () => tasks.filter((t) => t.status === "REJECTED_BY_ADMIN").length,
    [tasks],
  );
  const showBanner = pendingTargetCount > 0 || rejectedCount > 0;

  const onFormSubmit = async (data: CreateTaskRequest | UpdateTaskRequest) => {
    if (selectedTask) {
      await updateTask(selectedTask.id, data);
    } else {
      await createTask(data as CreateTaskRequest);
    }
  };

  const handlePageChange = useCallback(
    (page: number) => {
      fetchTasks(page - 1, pagination?.size ?? 10);
    },
    [fetchTasks, pagination?.size],
  );

  const handleRefresh = useCallback(() => {
    fetchTasks(pagination?.page ?? 0, pagination?.size ?? 10);
  }, [fetchTasks, pagination?.page, pagination?.size]);

  const handleSearch = useCallback(
    (value: string) => {
      setSearchQuery(value);
      setFilters({ ...filters, search: value || undefined });
    },
    [filters, setFilters],
  );

  const handleStatusFilter = useCallback(
    (value: string) => {
      setStatusFilter(value);
      setFilters({
        ...filters,
        status: (value || undefined) as KpiTaskStatus | undefined,
      });
    },
    [filters, setFilters],
  );

  const onApprovalSubmit = async (rejectReason?: string) => {
    if (!selectedTask) return false;
    const result = await approveTask(selectedTask.id, {
      taskId: selectedTask.id,
      action: rejectReason ? "REJECT" : "APPROVE",
      rejectReason,
    });
    return result !== null;
  };

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Banner notifikasi */}
      {showBanner && (
        <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
          <Warning className="h-5 w-5 text-warning flex-shrink-0" />
          <div className="text-sm">
            {pendingTargetCount > 0 && (
              <span className="font-medium text-warning">
                {pendingTargetCount} tugas menunggu pengisian target
              </span>
            )}
            {pendingTargetCount > 0 && rejectedCount > 0 && (
              <span className="text-muted-foreground"> dan </span>
            )}
            {rejectedCount > 0 && (
              <span className="font-medium text-danger">
                {rejectedCount} tugas ditolak
              </span>
            )}
            <span className="text-muted-foreground"> — perlu tindakan segera.</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">
            Manajemen Tugas KPI
          </h1>
          <Button
            isIconOnly
            variant="tertiary"
            size="sm"
            className="pointer-events-none text-sm font-medium"
            aria-label={`Total ${pagination?.totalElements ?? 0} tugas`}
          >
            {pagination?.totalElements ?? 0}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SearchField
              name="search"
              value={searchQuery}
              onChange={handleSearch}
              className="w-70"
            >
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input
                  aria-label="Cari tugas KPI"
                  placeholder="Cari aktivitas, jabatan..."
                />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>

            <Select
              className="w-48"
              selectedKey={statusFilter || ''}
              onSelectionChange={(key) => handleStatusFilter(String(key))}
              aria-label="Filter status"
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {STATUS_OPTIONS.map((opt) => (
                    <ListBox.Item key={opt.value} id={opt.value} textValue={opt.label}>
                      {opt.label}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              variant="tertiary"
              onPress={handleRefresh}
              isDisabled={isLoading}
              aria-label="Muat ulang data"
            >
              <ArrowsClockwise
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
            <Button variant="primary" onPress={handleCreateTask}>
              <Plus className="h-4 w-4" />
              Tambah Tugas
            </Button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="w-full">
        <TaskDataTable
          tasks={tasks}
          isLoading={isLoading}
          searchQuery={searchQuery}
          pagination={pagination}
          onPageChange={handlePageChange}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
          onApprove={handleApprovalTask}
        />
      </div>

      {/* Modals */}
      <TaskFormModal
        isOpen={isFormModalOpen}
        onClose={handleFormModalClose}
        onSubmit={onFormSubmit}
        task={selectedTask}
        isSubmitting={isSubmitting}
      />

      <DeleteTaskDialog
        isOpen={isDeleteDialogOpen}
        onClose={handleDeleteDialogClose}
        onConfirm={() =>
          handleDeleteConfirm(() => deleteTask(selectedTask!.id))
        }
        taskName={selectedTask?.taskName || ""}
        childCount={selectedTask?.childTaskCount ?? 0}
        isDeleting={isDeleting}
      />

      <ApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={handleApprovalModalClose}
        onApprove={onApprovalSubmit}
        task={selectedTask}
        isProcessing={isApproving}
      />
    </div>
  );
}
