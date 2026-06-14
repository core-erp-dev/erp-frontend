'use client';

import React from 'react';
import {
  Modal,
  Button,
} from '@heroui/react';
import {
  CalendarBlank,
  User,
  FileText,
  Target,
  TrendUp,
  DownloadSimple,
  CheckCircle,
  XCircle,
  Clock,
} from '@phosphor-icons/react';
import {
  KpiReport,
  REPORT_STATUS_LABELS,
  REPORT_STATUS_COLORS,
} from '../types';

interface ReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: KpiReport | null;
  onAmend?: (report: KpiReport) => void;
  canAmend?: boolean;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  isOpen,
  onClose,
  report,
  onAmend,
  canAmend = false,
}) => {
  if (!report) return null;

  const statusIcon = {
    PENDING: <Clock className="h-4 w-4 text-warning" />,
    APPROVED: <CheckCircle className="h-4 w-4 text-success" />,
    REJECTED: <XCircle className="h-4 w-4 text-danger" />,
    PENDING_REVISION: <Clock className="h-4 w-4 text-info" />,
  };

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-lg">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading className="px-2">
                Detail Laporan Harian
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2">
              <div className="flex flex-col gap-4">
                {/* Status */}
                <div className="flex items-center gap-2">
                  {statusIcon[report.approvalStatus]}
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${REPORT_STATUS_COLORS[report.approvalStatus]}`}
                  >
                    {REPORT_STATUS_LABELS[report.approvalStatus]}
                  </span>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarBlank className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">Tanggal</p>
                      <p className="text-foreground font-medium">
                        {new Date(report.reportDate).toLocaleDateString('id-ID', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">Pelapor</p>
                      <p className="text-foreground font-medium">{report.employeeName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">Target Harian</p>
                      <p className="text-foreground font-medium">{report.dailyTarget}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <TrendUp className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">Realisasi</p>
                      <p className="text-foreground font-medium">{report.dailyRealization}</p>
                    </div>
                  </div>
                </div>

                {/* Aktivitas */}
                <div className="flex items-start gap-2 text-sm">
                  <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">Aktivitas</p>
                    <p className="text-foreground font-medium">
                      {report.taskName} ({report.taskCode})
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <p className="mb-1 text-xs text-muted-foreground">Uraian Kegiatan</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{report.description}</p>
                </div>

                {/* Evidence */}
                {report.evidenceUrl && (
                  <div className="flex items-center gap-2">
                    <a
                      href={report.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-info hover:bg-info/5 transition-colors"
                    >
                      <DownloadSimple className="h-4 w-4" />
                      Lihat Bukti Lampiran
                    </a>
                  </div>
                )}

                {/* Approval Info */}
                {report.approverName && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4" />
                    Disetujui oleh {report.approverName}
                    {report.approvedAt && (
                      <span>
                        pada {new Date(report.approvedAt).toLocaleDateString('id-ID')}
                      </span>
                    )}
                  </div>
                )}

                {/* Reject Reason */}
                {report.rejectReason && (
                  <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                    <p className="mb-1 text-xs font-medium">Alasan Penolakan:</p>
                    <p>{report.rejectReason}</p>
                  </div>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer>
              {canAmend && report.approvalStatus === 'APPROVED' && onAmend && (
                <Button
                  variant="secondary"
                  onPress={() => onAmend(report)}
                  className="text-warning border-warning/30"
                >
                  Minta Revisi
                </Button>
              )}
              <Button variant="secondary" onPress={onClose}>
                Tutup
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
