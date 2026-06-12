"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Tabs,
  ProgressBar,
  Skeleton,
  Card,
  Button,
  toast,
} from "@heroui/react";
import {
  ArrowLeft,
  Plus,
  FileText,
  Users,
  Download,
  RotateCcw,
} from "lucide-react";
import { kpiTaskApi } from "@/modules/hr/kpi/services/task-api";
import { kpiReportApi } from "@/modules/hr/kpi/services/report-api";
import {
  KpiTask,
  KpiReport,
  SubordinateTaskResponse,
  KPI_TASK_STATUS_LABELS,
  KPI_TASK_STATUS_COLORS,
  REPORT_STATUS_LABELS,
  REPORT_STATUS_COLORS,
  PaginatedResponse,
} from "@/modules/hr/kpi/types";
import { DailyReportModal } from "@/modules/hr/kpi/components/daily-report-modal";
import { AmendModal } from "@/modules/hr/kpi/components/amend-modal";

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [task, setTask] = useState<KpiTask | null>(null);
  const [reports, setReports] = useState<KpiReport[]>([]);
  const [subordinates, setSubordinates] = useState<SubordinateTaskResponse[]>([]);
  const [isLoadingTask, setIsLoadingTask] = useState(true);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [isLoadingSubordinates, setIsLoadingSubordinates] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<KpiReport | null>(null);
  const [reportPagination, setReportPagination] = useState<PaginatedResponse<KpiReport> | null>(null);
  const [isAmendOpen, setIsAmendOpen] = useState(false);
  const [amendTarget, setAmendTarget] = useState<KpiReport | null>(null);

  const fetchTask = useCallback(async () => {
    try {
      setIsLoadingTask(true);
      const result = await kpiTaskApi.getTaskById(taskId);
      setTask(result);
    } catch {
      // Error handled in API
    } finally {
      setIsLoadingTask(false);
    }
  }, [taskId]);

  const fetchReports = useCallback(async (page = 0, size = 10) => {
    try {
      setIsLoadingReports(true);
      const result = await kpiReportApi.getReports({
        taskId: taskId,
        page,
        size,
      });
      setReports(result.content);
      setReportPagination(result);
    } catch {
      // Error handled
    } finally {
      setIsLoadingReports(false);
    }
  }, [taskId]);

  const fetchSubordinates = useCallback(async () => {
    try {
      setIsLoadingSubordinates(true);
      const result = await kpiTaskApi.getSubordinateTasks(taskId);
      setSubordinates(result);
    } catch {
      // Error handled
    } finally {
      setIsLoadingSubordinates(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
    fetchReports();
  }, [fetchTask, fetchReports]);

  const handleTabChange = (key: string | number) => {
    if (key === "subordinates" && subordinates.length === 0 && !isLoadingSubordinates) {
      fetchSubordinates();
    }
  };

  const handleReportSuccess = () => {
    setIsReportModalOpen(false);
    setEditingReport(null);
    fetchReports();
    fetchTask(); // Refresh task for updated realisasi
  };

  const handleAmendConfirm = async (reason: string) => {
    if (!amendTarget) return;
    try {
      await kpiReportApi.amendReport(amendTarget.id, { reason });
      toast.success("Persetujuan berhasil ditarik kembali", {
        description: "Laporan dikembalikan ke status revisi.",
      });
      fetchReports();
      fetchTask();
    } catch {
      toast.danger("Gagal menarik persetujuan");
    }
    setAmendTarget(null);
    setIsAmendOpen(false);
  };

  const persentase = task?.achievementPercentage ?? 0;
  const progressColor = persentase >= 80 ? "success" : persentase >= 60 ? "warning" : "danger";
  const hasSubordinates = (task?.childTaskCount ?? 0) > 0;

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Back Button */}
      <Button
        variant="tertiary"
        onPress={() => router.push("/hr/kpi/tasks")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit px-0"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Daftar Tugas
      </Button>

      {isLoadingTask ? (
        <Card className="p-6 space-y-4">
          <Skeleton className="h-6 w-64 rounded" />
          <Skeleton className="h-4 w-48 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-20 w-full rounded" />
        </Card>
      ) : task ? (
        <>
          {/* Task Header */}
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-foreground">
                    {task.taskName}
                  </h1>
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
                  <span>KPI Induk: {task.corporateKpiName}</span>
                  <span className="text-border">|</span>
                  <span>Periode: {task.periodYear}</span>
                </div>
                {(task.assignedEmployees?.length ?? 0) > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {task.assignedEmployees?.map((e) => e.fullName).join(", ") ?? "Belum ditugaskan"}
                  </div>
                )}
              </div>

              {task.status === "ACTIVE" && (
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => {
                    setEditingReport(null);
                    setIsReportModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Buat Laporan
                </Button>
              )}
            </div>

            {/* Progress Section */}
            <div className="mt-6 flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Target: {task.annualTarget.toLocaleString("id-ID")} {task.unit}
                </span>
                <span className="font-medium text-foreground">
                  {persentase.toFixed(2)}% tercapai
                </span>
              </div>
              <ProgressBar
                aria-label="Progres capaian"
                value={Math.min(persentase, 100)}
                color={progressColor}
                size="lg"
                className="w-full"
              >
                <ProgressBar.Track>
                  <ProgressBar.Fill />
                </ProgressBar.Track>
              </ProgressBar>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Realisasi: {task.annualRealization.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                </span>
                <span>
                  Sisa: {Math.max(0, task.annualTarget - task.annualRealization).toLocaleString("id-ID")} {task.unit}
                </span>
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <Tabs
            className="w-full"
            defaultSelectedKey="reports"
            onSelectionChange={handleTabChange}
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label="Detail tugas">
                <Tabs.Tab id="reports">
                  <FileText className="h-4 w-4" />
                  Riwayat Laporan
                  <Tabs.Indicator />
                </Tabs.Tab>
                {hasSubordinates && (
                  <Tabs.Tab id="subordinates">
                    <Users className="h-4 w-4" />
                    Tugas Bawahan
                    <Tabs.Indicator />
                  </Tabs.Tab>
                )}
              </Tabs.List>
            </Tabs.ListContainer>

            {/* Tab: Riwayat Laporan */}
            <Tabs.Panel className="pt-4" id="reports">
              {isLoadingReports ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              ) : reports.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
                  <FileText className="h-8 w-8" />
                  <span className="text-sm">Belum ada laporan untuk tugas ini.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-start justify-between rounded-lg border border-border bg-card px-4 py-3"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {new Date(report.reportDate).toLocaleDateString("id-ID", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${REPORT_STATUS_COLORS[report.approvalStatus]}`}
                          >
                            {REPORT_STATUS_LABELS[report.approvalStatus]}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{report.description}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>Target: {report.dailyTarget}</span>
                          <span className="text-border">|</span>
                          <span>Realisasi: {report.dailyRealization}</span>
                        </div>
                        {report.rejectReason && (
                          <div className="mt-1 rounded bg-danger/5 px-2 py-1 text-xs text-danger">
                            Alasan penolakan: {report.rejectReason}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {report.evidenceUrl && (
                          <a
                            href={report.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-info hover:underline"
                          >
                            <Download className="h-3 w-3" />
                            Bukti
                          </a>
                        )}
                        {report.approvalStatus === "PENDING" && (
                          <Button
                            size="sm"
                            variant="tertiary"
                            onPress={() => {
                              setEditingReport(report);
                              setIsReportModalOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                        )}
                        {report.approvalStatus === "APPROVED" && (
                          <Button
                            size="sm"
                            variant="tertiary"
                            onPress={() => {
                              setAmendTarget(report);
                              setIsAmendOpen(true);
                            }}
                          >
                            <RotateCcw className="h-3 w-3" />
                            Minta Revisi
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Pagination */}
                  {reportPagination && reportPagination.totalElements > 10 && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="tertiary"
                        isDisabled={reportPagination.page === 0}
                        onPress={() => fetchReports(reportPagination.page - 1)}
                      >
                        Sebelumnya
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Hal {reportPagination.page + 1} dari {reportPagination.totalPages}
                      </span>
                      <Button
                        size="sm"
                        variant="tertiary"
                        isDisabled={reportPagination.last}
                        onPress={() => fetchReports(reportPagination.page + 1)}
                      >
                        Selanjutnya
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Tabs.Panel>

            {/* Tab: Tugas Bawahan */}
            {hasSubordinates && (
              <Tabs.Panel className="pt-4" id="subordinates">
                {isLoadingSubordinates ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                  </div>
                ) : subordinates.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Users className="h-8 w-8" />
                    <span className="text-sm">Tidak ada data tugas bawahan.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {subordinates.map((sub) => (
                      <div
                        key={sub.taskId}
                        className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {sub.taskName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({sub.taskCode})
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{sub.positionName}</span>
                            <span className="text-border">|</span>
                            <span>Pegawai: {sub.employeeName ?? "Belum ditugaskan"}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-right">
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Capaian</span>
                            <span className="text-sm font-semibold text-foreground">
                              {sub.achievementPercentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-24">
                            <ProgressBar
                              aria-label={`Progres ${sub.taskName}`}
                              value={Math.min(sub.achievementPercentage, 100)}
                              color={sub.achievementPercentage >= 80 ? "success" : sub.achievementPercentage >= 60 ? "warning" : "danger"}
                              size="sm"
                            >
                              <ProgressBar.Track>
                                <ProgressBar.Fill />
                              </ProgressBar.Track>
                            </ProgressBar>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Tabs.Panel>
            )}
          </Tabs>
        </>
      ) : (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          Tugas tidak ditemukan.
        </div>
      )}

      {/* Daily Report Modal */}
      <DailyReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setEditingReport(null);
        }}
        onSuccess={handleReportSuccess}
        task={task}
        editReport={editingReport}
      />

      {/* Amend Modal */}
      <AmendModal
        isOpen={isAmendOpen}
        onClose={() => {
          setIsAmendOpen(false);
          setAmendTarget(null);
        }}
        onConfirm={handleAmendConfirm}
        reportInfo={
          amendTarget
            ? `Laporan tanggal ${new Date(amendTarget.reportDate).toLocaleDateString("id-ID")} — ${amendTarget.description.slice(0, 50)}${amendTarget.description.length > 50 ? "..." : ""}`
            : undefined
        }
      />
    </div>
  );
}
