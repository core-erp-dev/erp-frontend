'use client';
/* eslint-disable @next/next/no-img-element -- Blob URLs are rendered from authenticated evidence downloads. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Breadcrumbs, BreadcrumbsItem, Button, Chip, Input, Label, Spinner, TextField } from '@heroui/react';
import { ArrowLeft, DownloadSimple, House } from '@phosphor-icons/react';
import { reportV1Api, extractReportV1Error } from './report-v1-api';
import { REPORT_STATUS_CHIP_COLOR, REPORT_STATUS_LABEL, type KpiReportResponse } from './report-v1.types';
import { ReportReviewDialog } from './report-review-dialog';

function DetailField({ label, value }: { label: string; value: string }) {
  return <TextField isReadOnly className="pointer-events-none w-full"><Label>{label}</Label><Input value={value} readOnly /></TextField>;
}

export function ReportDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') === 'review' ? 'review' : 'mine';
  const listHref = from === 'review' ? '/kpi/report-reviews' : '/kpi/reports';
  const listLabel = from === 'review' ? 'Persetujuan Laporan' : 'Laporan Saya';
  const [report, setReport] = useState<KpiReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const evidenceUrlRef = useRef<string | null>(null);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<'APPROVE' | 'REJECT' | null>(null);

  const loadEvidence = useCallback(async (reportId: string) => {
    setIsLoadingEvidence(true); setEvidenceError(null);
    try {
      const blob = await reportV1Api.getEvidence(reportId);
      if (evidenceUrlRef.current) URL.revokeObjectURL(evidenceUrlRef.current);
      const url = URL.createObjectURL(blob); evidenceUrlRef.current = url; setEvidenceUrl(url);
    } catch (loadError) { setEvidenceError(extractReportV1Error(loadError)); }
    finally { setIsLoadingEvidence(false); }
  }, []);
  useEffect(() => {
    let active = true; setIsLoading(true); setError(null); setReport(null);
    void reportV1Api.getReportById(id).then((data) => { if (active) { setReport(data); void loadEvidence(data.id); } }).catch((loadError) => { if (active) setError(extractReportV1Error(loadError)); }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; if (evidenceUrlRef.current) { URL.revokeObjectURL(evidenceUrlRef.current); evidenceUrlRef.current = null; } };
  }, [id, loadEvidence]);
  const downloadEvidence = () => { if (!evidenceUrl || !report) return; const link = document.createElement('a'); link.href = evidenceUrl; link.download = report.evidenceOriginalFilename; link.click(); };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="md" /></div>;
  if (error || !report) return <div className="flex w-full flex-col gap-6"><Alert status="danger"><Alert.Indicator /><Alert.Content><Alert.Title>{error || 'Laporan tidak ditemukan.'}</Alert.Title></Alert.Content></Alert><Button variant="secondary" className="self-start" onPress={() => router.replace(listHref)}><ArrowLeft className="h-4 w-4" />Kembali</Button></div>;
  const canReview = from === 'review' && report.status === 'PENDING';

  return <div className="mx-auto flex w-full max-w-4xl flex-col gap-6"><Breadcrumbs><BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem><BreadcrumbsItem>KPI</BreadcrumbsItem><BreadcrumbsItem href={listHref}>{listLabel}</BreadcrumbsItem><BreadcrumbsItem>Detail Laporan</BreadcrumbsItem></Breadcrumbs><div className="flex items-center gap-3"><Button isIconOnly variant="tertiary" onPress={() => router.replace(listHref)} aria-label="Kembali"><ArrowLeft className="h-5 w-5" /></Button><h1 className="truncate text-xl font-semibold text-foreground">{report.activityName}</h1></div><section className="flex flex-col gap-4"><h2 className="text-sm font-semibold text-foreground">Informasi Aktivitas</h2><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><DetailField label="Nama Aktivitas" value={report.activityName} /><DetailField label="Satuan" value={report.unit} /><DetailField label="Nilai Target" value={String(report.activityTargetValue)} /><DetailField label="Nilai Realisasi" value={String(report.realizedValue)} /></div></section><section className="flex flex-col gap-4"><h2 className="text-sm font-semibold text-foreground">Informasi Laporan</h2><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><DetailField label="Tanggal Laporan" value={report.reportDate} /><div className="flex flex-col gap-1"><Label>Status</Label><Chip className="w-fit" size="sm" color={REPORT_STATUS_CHIP_COLOR[report.status]} variant="soft">{REPORT_STATUS_LABEL[report.status]}</Chip></div><DetailField label="Deskripsi Pelaksanaan" value={report.executionDescription} /><DetailField label="Catatan" value={report.note || '-'} /><DetailField label="Diajukan Oleh" value={report.submittedByUserName} /><DetailField label="Peninjau" value={report.reviewerUserName || 'Antrean perusahaan'} /></div>{report.rejectionReason && <div><Label>Alasan Penolakan</Label><p className="mt-1 text-sm text-danger">{report.rejectionReason}</p></div>}</section><section className="flex flex-col gap-4"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-foreground">Bukti</h2>{evidenceUrl && !isLoadingEvidence && <Button variant="tertiary" size="sm" onPress={downloadEvidence}><DownloadSimple className="h-4 w-4" />Unduh</Button>}</div>{isLoadingEvidence ? <div className="flex h-40 items-center justify-center"><Spinner size="sm" /></div> : evidenceError ? <Alert status="danger"><Alert.Indicator /><Alert.Content><Alert.Title>Gagal memuat bukti</Alert.Title><Alert.Description>{evidenceError}</Alert.Description></Alert.Content><Button variant="secondary" size="sm" onPress={() => void loadEvidence(report.id)}>Coba Lagi</Button></Alert> : evidenceUrl ? <div><img src={evidenceUrl} alt="Bukti laporan" className="max-h-96 w-full rounded-lg bg-surface-secondary object-contain" /><p className="mt-1 text-xs text-muted-foreground">{report.evidenceOriginalFilename} · {report.evidenceContentType}{report.evidenceFileSize ? ` (${(report.evidenceFileSize / 1024).toFixed(1)} KB)` : ''}</p></div> : null}</section>{canReview && <div className="flex justify-end gap-2"><Button variant="danger" onPress={() => setDialogMode('REJECT')}>Tolak</Button><Button variant="primary" onPress={() => setDialogMode('APPROVE')}>Setujui</Button></div>}{dialogMode && <ReportReviewDialog isOpen onClose={() => setDialogMode(null)} report={report} mode={dialogMode} onSuccess={() => router.replace(listHref)} />}</div>;
}
