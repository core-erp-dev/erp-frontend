"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { RefreshCw, CheckCircle } from "lucide-react";
import { Button, Skeleton } from "@heroui/react";
import { ApprovalModal } from "@/modules/hr/kpi/components/approval-modal";
import { useKpiTaskData } from "@/modules/hr/kpi/hooks/use-task-data";
import { useKpiTaskForm } from "@/modules/hr/kpi/hooks/use-task-form";
import {
  KpiTask,
  KPI_TASK_STATUS_LABELS,
  KPI_TASK_STATUS_COLORS,
  KpiTaskStatus,
} from "@/modules/hr/kpi/types";

export default function KpiApprovalsPage() {
  const {
    tasks,
    isLoading,
    fetchTasks,
    approveTask,
    pagination,
    filters,
    setFilters,
  } = useKpiTaskData();

  const {
    selectedTask,
    isApproving,
    handleApprovalTask,
    handleApprovalModalClose,
    isApprovalModalOpen,
  } = useKpiTaskForm();

  // Set filter to only show PENDING_ADMIN_APPROVAL
  useEffect(() => {
    setFilters({ status: "PENDING_ADMIN_APPROVAL" });
  }, [setFilters]);

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">
            Pusat Persetujuan KPI
          </h1>
          <Button
            isIconOnly
            variant="tertiary"
            size="sm"
            className="pointer-events-none text-sm font-medium"
            aria-label={`Total ${pagination?.totalElements ?? 0} tugas menunggu`}
          >
            {pagination?.totalElements ?? 0}
          </Button>
        </div>

        <Button
          isIconOnly
          variant="tertiary"
          onPress={() => fetchTasks(0, pagination?.size ?? 10)}
          isDisabled={isLoading}
          aria-label="Muat ulang data"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Queue List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
          <CheckCircle className="h-8 w-8 text-success" />
          <span className="text-sm">Tidak ada tugas yang menunggu persetujuan.</span>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.filter((t) => t.status === "PENDING_ADMIN_APPROVAL").map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{task.taskName}</span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${KPI_TASK_STATUS_COLORS[task.status]}`}
                  >
                    {KPI_TASK_STATUS_LABELS[task.status]}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{task.taskCode}</span>
                  <span className="text-border">|</span>
                  <span>{task.positionName}</span>
                  <span className="text-border">|</span>
                  <span>Diajukan oleh: {task.createdByName}</span>
                </div>
                {task.annualTarget != null && (
                  <div className="text-sm text-muted-foreground">
                    Target: {task.annualTarget.toLocaleString("id-ID")} {task.unit}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onPress={() => handleApprovalTask(task)}
                >
                  <CheckCircle className="h-4 w-4" />
                  Proses
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approval Modal */}
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
