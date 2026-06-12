"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Button,
  Skeleton,
  SearchField,
} from "@heroui/react";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  Filter,
} from "lucide-react";
import { kpiReportApi } from "@/modules/hr/kpi/services/report-api";
import {
  KpiReport,
  ReportApprovalStatus,
  ReportFilterParams,
  REPORT_STATUS_LABELS,
  REPORT_STATUS_COLORS,
  PaginatedResponse,
} from "@/modules/hr/kpi/types";
import { ReportDetailModal } from "@/modules/hr/kpi/components/report-detail-modal";
import { RejectModal } from "@/modules/hr/kpi/components/reject-modal";
import { AmendModal } from "@/modules/hr/kpi/components/amend-modal";
import { toast } from "@heroui/react";
import { extractErrorMessage } from "@/types/api";

const STATUS_OPTIONS: { value: ReportApprovalStatus | ""; label: string }[] = [
  { value: "", label: "Semua Status" },
  { value: "PENDING", label: "Menunggu" },
  { value: "APPROVED", label: "Disetujui" },
  { value: "REJECTED", label: "Ditolak" },
  { value: "PENDING_REVISION", label: "Revisi" },
];

export default function ReportApprovalPage() {
  const [reports, setReports] = useState<KpiReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReportApprovalStatus | "">("PENDING");
  const [pagination, setPagination] = useState<PaginatedResponse<KpiReport> | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Modal states
  const [selectedReport, setSelectedReport] = useState<KpiReport | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<KpiReport | null>(null);
  const [isAmendOpen, setIsAmendOpen] = useState(false);
  const [amendTarget, setAmendTarget] = useState<KpiReport | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReports = useCallback(async (page = 0) => {
    try {
      setIsLoading(true);
      const params: ReportFilterParams = {
        page,
        size: 10,
      };
      if (statusFilter) {
        params.approvalStatus = statusFilter;
      }
      const result = await kpiReportApi.getReports(params);
      setReports(result.content);
      setPagination(result);
      setCurrentPage(page);
    } catch {
      toast.danger("Gagal memuat data laporan");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleApprove = async (report: KpiReport) => {
    setActionLoading(report.id);
    try {
      await kpiReportApi.approveReport(report.id, {
        reportId: report.id,
        action: "APPROVE",
      });
      toast.success("Laporan berhasil disetujui", {
        description: `Laporan ${report.employeeName} tanggal ${new Date(report.reportDate).toLocaleDateString("id-ID")} telah disetujui.`,
      });
      fetchReports(currentPage);
    } catch (error) {
      toast.danger(extractErrorMessage(error, "Gagal menyetujui laporan"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectTarget) return;
    setActionLoading(rejectTarget.id);
    try {
      await kpiReportApi.approveReport(rejectTarget.id, {
        reportId: rejectTarget.id,
        action: "REJECT",
        rejectReason: reason,
      });
      toast.danger("Laporan berhasil ditolak", {
        description: `Laporan ${rejectTarget.employeeName} telah ditolak.`,
      });
      fetchReports(currentPage);
    } catch (error) {
      toast.danger(extractErrorMessage(error, "Gagal menolak laporan"));
    } finally {
      setActionLoading(null);
      setRejectTarget(null);
    }
  };

  const handleAmendConfirm = async (reason: string) => {
    if (!amendTarget) return;
    setActionLoading(amendTarget.id);
    try {
      await kpiReportApi.amendReport(amendTarget.id, { reason });
      toast.success("Persetujuan berhasil ditarik kembali", {
        description: "Pegawai perlu mengirim laporan baru sebagai pengganti.",
      });
      fetchReports(currentPage);
    } catch (error) {
      toast.danger(extractErrorMessage(error, "Gagal menarik persetujuan"));
    } finally {
      setActionLoading(null);
      setAmendTarget(null);
    }
  };

  const openReject = (report: KpiReport) => {
    setRejectTarget(report);
    setIsRejectOpen(true);
  };

  const openAmend = (report: KpiReport) => {
    setAmendTarget(report);
    setIsAmendOpen(true);
  };

  const openDetail = (report: KpiReport) => {
    setSelectedReport(report);
    setIsDetailOpen(true);
  };

  // Client-side search filter
  const filteredReports = search
    ? reports.filter(
        (r) =>
          r.employeeName.toLowerCase().includes(search.toLowerCase()) ||
          r.taskName.toLowerCase().includes(search.toLowerCase()) ||
          r.taskCode.toLowerCase().includes(search.toLowerCase()) ||
          r.description.toLowerCase().includes(search.toLowerCase()),
      )
    : reports;

  const pendingCount = reports.filter((r) => r.approvalStatus === "PENDING").length;

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Persetujuan Laporan Harian
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola laporan harian yang dikirim oleh bawahan Anda
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onPress={() => fetchReports(currentPage)}
          isDisabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Info Banner */}
      {statusFilter === "PENDING" && pendingCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          <Filter className="h-4 w-4 flex-shrink-0" />
          Terdapat <strong>{pendingCount} laporan</strong> menunggu persetujuan Anda.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchField
          className="w-full sm:max-w-xs"
          value={search}
          onChange={setSearch}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Cari nama, aktivitas, uraian..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <div className="flex items-center gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={statusFilter === opt.value ? "primary" : "tertiary"}
              size="sm"
              onPress={() => setStatusFilter(opt.value)}
              className={statusFilter === opt.value ? "" : "text-muted-foreground"}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
          <CheckCircle className="h-8 w-8" />
          <span className="text-sm">
            {statusFilter === "PENDING"
              ? "Tidak ada laporan yang menunggu persetujuan."
              : "Tidak ada laporan ditemukan."}
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              {/* Left: Report Info */}
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground truncate">
                    {report.employeeName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({report.taskCode})
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${REPORT_STATUS_COLORS[report.approvalStatus]}`}
                  >
                    {REPORT_STATUS_LABELS[report.approvalStatus]}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {report.taskName}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {new Date(report.reportDate).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-border">|</span>
                  <span>Realisasi: {report.dailyRealization}</span>
                  <span className="text-border">|</span>
                  <span className="truncate max-w-[200px]">{report.description}</span>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Quick Approve (only PENDING) */}
                {report.approvalStatus === "PENDING" && (
                  <Button
                    size="sm"
                    variant="primary"
                    isDisabled={actionLoading === report.id}
                    isPending={actionLoading === report.id}
                    onPress={() => handleApprove(report)}
                    className="bg-success text-success-foreground hover:bg-success/90"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Setuju
                  </Button>
                )}

                {/* Quick Reject (only PENDING) */}
                {report.approvalStatus === "PENDING" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    isDisabled={actionLoading === report.id}
                    onPress={() => openReject(report)}
                    className="text-danger border-danger/30 hover:bg-danger/5"
                  >
                    <XCircle className="h-4 w-4" />
                    Tolak
                  </Button>
                )}

                {/* Amend (only APPROVED) */}
                {report.approvalStatus === "APPROVED" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    isDisabled={actionLoading === report.id}
                    onPress={() => openAmend(report)}
                  >
                    Minta Revisi
                  </Button>
                )}

                {/* Detail */}
                <Button
                  size="sm"
                  variant="tertiary"
                  onPress={() => openDetail(report)}
                >
                  <Eye className="h-4 w-4" />
                  Detail
                </Button>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                size="sm"
                variant="tertiary"
                isDisabled={currentPage === 0}
                onPress={() => fetchReports(currentPage - 1)}
              >
                Sebelumnya
              </Button>
              <span className="text-sm text-muted-foreground">
                Hal {currentPage + 1} dari {pagination.totalPages}
              </span>
              <Button
                size="sm"
                variant="tertiary"
                isDisabled={pagination.last}
                onPress={() => fetchReports(currentPage + 1)}
              >
                Selanjutnya
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <ReportDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        report={selectedReport}
        onAmend={openAmend}
        canAmend={true}
      />

      <RejectModal
        isOpen={isRejectOpen}
        onClose={() => {
          setIsRejectOpen(false);
          setRejectTarget(null);
        }}
        onConfirm={handleRejectConfirm}
        reportInfo={
          rejectTarget
            ? `Laporan ${rejectTarget.employeeName} — ${rejectTarget.taskName} (${new Date(rejectTarget.reportDate).toLocaleDateString("id-ID")})`
            : undefined
        }
      />

      <AmendModal
        isOpen={isAmendOpen}
        onClose={() => {
          setIsAmendOpen(false);
          setAmendTarget(null);
        }}
        onConfirm={handleAmendConfirm}
        reportInfo={
          amendTarget
            ? `Laporan ${amendTarget.employeeName} — ${amendTarget.taskName} (${new Date(amendTarget.reportDate).toLocaleDateString("id-ID")})`
            : undefined
        }
      />
    </div>
  );
}
