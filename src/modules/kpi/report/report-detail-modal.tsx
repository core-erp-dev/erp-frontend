'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Button, Chip, Surface, Spinner, Label } from '@heroui/react';
import { X, DownloadSimple } from '@phosphor-icons/react';
import { reportV1Api } from './report-v1-api';
import { REPORT_STATUS_LABEL, REPORT_STATUS_CHIP_COLOR, type KpiReportResponse } from './report-v1.types';

type DetailMode = 'MY' | 'REVIEW';

interface ReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: KpiReportResponse | null;
  mode: DetailMode;
  /** Only for REVIEW mode: callbacks for approve/reject */
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  /**
   * UX guard: true when the actor submitted this report (visible in the queue
   * but NOT actionable). The backend is the authoritative self-review ban.
   */
  disableDecisions?: boolean;
}

export function ReportDetailModal({
  isOpen, onClose, report, mode, onApprove, onReject, disableDecisions,
}: ReportDetailModalProps) {
  /* ── Evidence loading ── */
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const evidenceUrlRef = useRef<string | null>(null);

  const loadEvidence = useCallback(async (reportId: string) => {
    setIsLoadingEvidence(true);
    setEvidenceError(null);
    try {
      const blob = await reportV1Api.getEvidence(reportId);
      // Revoke previous URL
      if (evidenceUrlRef.current) URL.revokeObjectURL(evidenceUrlRef.current);
      const url = URL.createObjectURL(blob);
      evidenceUrlRef.current = url;
      setEvidenceUrl(url);
    } catch {
      setEvidenceError('Gagal memuat bukti.');
    } finally {
      setIsLoadingEvidence(false);
    }
  }, []);

  // Load evidence when modal opens with a report
  useEffect(() => {
    if (isOpen && report?.id) {
      loadEvidence(report.id);
    }
    return () => {
      if (evidenceUrlRef.current) {
        URL.revokeObjectURL(evidenceUrlRef.current);
        evidenceUrlRef.current = null;
        setEvidenceUrl(null);
      }
    };
  }, [isOpen, report?.id, loadEvidence]);

  /* ── Evidence download ── */
  const downloadEvidence = useCallback(() => {
    if (!evidenceUrl || !report?.evidenceOriginalFilename) return;
    const a = document.createElement('a');
    a.href = evidenceUrl;
    a.download = report.evidenceOriginalFilename;
    a.click();
  }, [evidenceUrl, report?.evidenceOriginalFilename]);

  if (!report) return null;

  const isReviewMode = mode === 'REVIEW';

  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Backdrop isDismissable={false}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[600px]">
            <Modal.Header>
              <Modal.Heading>Detail Laporan</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col gap-4">
                {/* ── Activity Context ── */}
                <Surface className="rounded-2xl p-4">
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Aktivitas</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <DetailField label="Name" value={report.activityName} />
                    <DetailField label="Unit" value={report.unit} />
                    <DetailField label="Target" value={String(report.activityTargetValue)} />
                    <DetailField label="Realisasi (bertambah)" value={String(report.realizedValue)} />
                  </div>
                </Surface>

                {/* ── Report Details ── */}
                <Surface className="rounded-2xl p-4">
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Laporan</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <DetailField label="Tanggal" value={report.reportDate} />
                    <DetailField label="Status" value={
                      <Chip size="sm" color={REPORT_STATUS_CHIP_COLOR[report.status]} variant="soft">
                        {REPORT_STATUS_LABEL[report.status]}
                      </Chip>
                    } />
                    <div className="col-span-2">
                      <DetailField label="Deskripsi" value={report.executionDescription} />
                    </div>
                    {report.note && (
                      <div className="col-span-2">
                        <DetailField label="Catatan" value={report.note} />
                      </div>
                    )}
                    <DetailField label="Diajukan Oleh" value={report.submittedByUserName} />
                    <DetailField label="Peninjau" value={report.reviewerUserName ?? 'Antrean perusahaan'} />
                  </div>
                </Surface>

                {/* ── Review Info ── */}
                {report.status !== 'PENDING' && (
                  <Surface className="rounded-2xl p-4">
                    <h3 className="mb-2 text-sm font-semibold text-foreground">Peninjauan</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <DetailField label="Ditinjau Pada" value={
                        report.reviewedAt
                          ? new Date(report.reviewedAt).toLocaleDateString('id-ID', {
                              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                            })
                          : '-'
                      } />
                      {report.rejectionReason && (
                        <div className="col-span-2">
                          <Label className="text-xs text-muted-foreground">Alasan Penolakan</Label>
                          <p className="mt-0.5 text-sm text-danger">{report.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  </Surface>
                )}

                {/* ── Evidence ── */}
                <Surface className="rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Bukti</h3>
                    {evidenceUrl && !isLoadingEvidence && (
                      <Button variant="tertiary" size="sm" onPress={downloadEvidence}>
                        <DownloadSimple className="h-4 w-4" />
                        Unduh
                      </Button>
                    )}
                  </div>
                  <div className="mt-2">
                    {isLoadingEvidence ? (
                      <div className="flex items-center justify-center py-8">
                        <Spinner size="sm" />
                      </div>
                    ) : evidenceError ? (
                      <p className="text-sm text-danger">{evidenceError}</p>
                    ) : evidenceUrl ? (
                      <div>
                        <img src={evidenceUrl} alt="Evidence" className="max-h-96 w-full rounded-lg object-contain bg-surface-secondary" />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {report.evidenceOriginalFilename} &middot; {report.evidenceContentType}
                          {report.evidenceFileSize ? ` (${(report.evidenceFileSize / 1024).toFixed(1)} KB)` : ''}
                        </p>
                      </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Bukti belum dimuat.</p>
                    )}
                  </div>
                </Surface>
              </div>
            </Modal.Body>
            <Modal.Footer>
              {isReviewMode && report.status === 'PENDING' && (
                <div className="flex w-full gap-2">
                  {disableDecisions ? (
                    <Button variant="secondary" className="flex-1" isDisabled>
                      You cannot review your own report
                    </Button>
                  ) : (
                    <>
                      <Button variant="danger" className="flex-1" onPress={() => onReject?.(report.id)}>
                        Tolak
                      </Button>
                      <Button variant="primary" className="flex-1" onPress={() => onApprove?.(report.id)}>
                        Setujui
                      </Button>
                    </>
                  )}
                </div>
              )}
              {(!isReviewMode || report.status !== 'PENDING') && (
                <Button variant="secondary" onPress={onClose}>
                  <X className="h-4 w-4" />
                  Tutup
                </Button>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

/* ── Helper ── */

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-foreground">{value}</p>
    </div>
  );
}
