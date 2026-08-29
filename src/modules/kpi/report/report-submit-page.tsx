'use client';
/* eslint-disable @next/next/no-img-element -- Preview is a local object URL selected by the user. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Breadcrumbs, BreadcrumbsItem, Button, FieldError, Form, Input, Label, ListBox, Select, Spinner, TextArea, TextField } from '@heroui/react';
import { ArrowLeft, House, X } from '@phosphor-icons/react';
import { useReportData } from './use-report-data';
import { activityV1Api, extractActivityV1Error } from '@/modules/kpi/activity/activity-v1-api';
import type { KpiActivityResponse } from '@/modules/kpi/activity/activity-v1.types';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function ReportSubmitPage() {
  const router = useRouter();
  const { submitReport, isSubmitting } = useReportData();
  const [activities, setActivities] = useState<KpiActivityResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [executionDescription, setExecutionDescription] = useState('');
  const [realizedValue, setRealizedValue] = useState('');
  const [note, setNote] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadActivities = useCallback(async () => {
    setIsLoading(true); setLoadError(null);
    try { setActivities((await activityV1Api.getActivities('mine')).filter((item) => item.status === 'ACTIVE')); }
    catch (error) { setActivities([]); setLoadError(extractActivityV1Error(error)); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { void loadActivities(); setReportDate(new Date().toISOString().slice(0, 10)); }, [loadActivities]);
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  const selectedActivity = activities.find((activity) => activity.id === selectedActivityId);
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null; setEvidenceFile(file); setEvidencePreview(null);
    if (file && ALLOWED_MIME.includes(file.type) && file.size <= MAX_FILE_SIZE) {
      const url = URL.createObjectURL(file); previewRef.current = url; setEvidencePreview(url);
    }
    setErrors((current) => ({ ...current, evidence: '' }));
  };
  const validate = () => {
    const next: Record<string, string> = {};
    if (!selectedActivityId) next.activity = 'Pilih aktivitas.';
    if (!reportDate) next.date = 'Tanggal laporan wajib diisi.';
    if (!executionDescription.trim()) next.description = 'Deskripsi pelaksanaan wajib diisi.';
    else if (executionDescription.length > 2000) next.description = 'Deskripsi pelaksanaan maksimal 2.000 karakter.';
    const number = Number(realizedValue);
    if (!realizedValue || !Number.isFinite(number) || number <= 0) next.value = 'Nilai realisasi harus berupa angka positif.';
    if (note.length > 1000) next.note = 'Catatan maksimal 1.000 karakter.';
    if (!evidenceFile) next.evidence = 'Bukti foto wajib diisi.';
    else if (!ALLOWED_MIME.includes(evidenceFile.type)) next.evidence = 'Bukti harus berupa gambar JPEG, PNG, atau WebP.';
    else if (evidenceFile.size > MAX_FILE_SIZE) next.evidence = 'Ukuran berkas maksimal 5 MB.';
    setErrors(next); return Object.keys(next).length === 0;
  };
  const handleSubmit = async () => {
    if (!validate() || !evidenceFile) return;
    const success = await submitReport({ activityId: selectedActivityId, reportDate, executionDescription: executionDescription.trim(), realizedValue: Number(realizedValue), note: note.trim() || undefined }, evidenceFile);
    if (success) router.replace('/kpi/reports');
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="md" /></div>;
  if (loadError) return <div className="mx-auto flex w-full max-w-4xl flex-col gap-6"><Alert status="danger"><Alert.Indicator /><Alert.Content><Alert.Title>{loadError}</Alert.Title></Alert.Content></Alert><div className="flex gap-2"><Button variant="primary" onPress={() => void loadActivities()}>Coba Lagi</Button><Button variant="secondary" onPress={() => router.replace('/kpi/reports')}>Kembali</Button></div></div>;
  if (!activities.length) return <div className="mx-auto flex w-full max-w-4xl flex-col gap-6"><Breadcrumbs><BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem><BreadcrumbsItem>KPI</BreadcrumbsItem><BreadcrumbsItem href="/kpi/reports">Laporan Saya</BreadcrumbsItem><BreadcrumbsItem>Ajukan Laporan</BreadcrumbsItem></Breadcrumbs><div className="rounded-3xl bg-surface-secondary p-8 text-center"><h2 className="text-base font-semibold text-foreground">Tidak ada aktivitas aktif</h2><p className="mt-2 text-sm text-muted-foreground">Anda harus ditugaskan ke aktivitas aktif untuk mengajukan laporan.</p><Button className="mt-4" variant="secondary" onPress={() => router.replace('/kpi/reports')}><ArrowLeft className="h-4 w-4" />Kembali</Button></div></div>;

  return <div className="mx-auto flex w-full max-w-4xl flex-col gap-6"><Breadcrumbs><BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem><BreadcrumbsItem>KPI</BreadcrumbsItem><BreadcrumbsItem href="/kpi/reports">Laporan Saya</BreadcrumbsItem><BreadcrumbsItem>Ajukan Laporan</BreadcrumbsItem></Breadcrumbs><div className="flex items-center gap-3"><Button isIconOnly variant="tertiary" onPress={() => router.replace('/kpi/reports')} aria-label="Kembali"><ArrowLeft className="h-5 w-5" /></Button><h1 className="text-xl font-semibold text-foreground">Ajukan Laporan</h1></div><Form id="report-submit-form" validationBehavior="aria" onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }} className="flex flex-col gap-4"><Select variant="primary" isRequired selectedKey={selectedActivityId || null} onSelectionChange={(key) => { setSelectedActivityId(String(key ?? '')); setErrors((current) => ({ ...current, activity: '' })); }} isInvalid={Boolean(errors.activity)}><Label>Aktivitas</Label><Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger><Select.Popover><ListBox>{activities.map((activity) => <ListBox.Item key={activity.id} id={activity.id} textValue={activity.activityName}><div className="flex flex-col"><span className="font-medium">{activity.activityName}</span><span className="text-xs text-muted-foreground">Target: {activity.targetValue} {activity.unit} · Periode: {activity.periodYear}/{String(activity.periodMonth).padStart(2, '0')}</span></div></ListBox.Item>)}</ListBox></Select.Popover><FieldError>{errors.activity}</FieldError></Select>{selectedActivity && <div className="rounded-xl bg-surface-secondary p-3 text-sm"><p className="font-medium">{selectedActivity.activityName}</p><p className="mt-1 text-xs text-muted-foreground">Target: {selectedActivity.targetValue} {selectedActivity.unit} · Kemajuan: {selectedActivity.progressPercent}%</p><p className="mt-1 text-xs text-muted-foreground">Nilai realisasi bersifat tambahan untuk periode ini.</p></div>}<TextField isRequired value={reportDate} onChange={setReportDate} isInvalid={Boolean(errors.date)}><Label>Tanggal Laporan</Label><Input variant="primary" type="date" /><FieldError>{errors.date}</FieldError></TextField><TextField isRequired value={executionDescription} onChange={setExecutionDescription} isInvalid={Boolean(errors.description)}><Label>Deskripsi Pelaksanaan</Label><TextArea variant="primary" placeholder="Jelaskan pekerjaan yang telah diselesaikan" rows={3} /><FieldError>{errors.description}</FieldError></TextField><p className="-mt-3 text-right text-xs text-muted-foreground">{executionDescription.length}/2000</p><TextField isRequired value={realizedValue} onChange={setRealizedValue} isInvalid={Boolean(errors.value)}><Label>Nilai Realisasi {selectedActivity ? `(${selectedActivity.unit})` : ''}</Label><Input variant="primary" type="number" step="any" placeholder="Masukkan nilai tambahan untuk periode ini" /><FieldError>{errors.value}</FieldError></TextField><p className="-mt-3 text-xs text-muted-foreground">Nilai yang disetujui akan dijumlahkan otomatis.</p><TextField value={note} onChange={setNote} isInvalid={Boolean(errors.note)}><Label>Catatan</Label><TextArea variant="primary" placeholder="Catatan opsional" rows={2} /><FieldError>{errors.note}</FieldError></TextField><div><Label className="mb-1 block">Bukti Foto (JPEG, PNG, atau WebP, maksimal 5 MB)</Label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary" />{errors.evidence && <p className="mt-1 text-xs text-danger">{errors.evidence}</p>}{evidencePreview && <div className="mt-2"><img src={evidencePreview} alt="Pratinjau bukti" className="max-h-48 rounded-lg object-contain" /><p className="mt-1 text-xs text-muted-foreground">{evidenceFile?.name} ({((evidenceFile?.size ?? 0) / 1024).toFixed(1)} KB)</p></div>}</div></Form><div className="flex justify-end gap-2"><Button variant="secondary" onPress={() => router.replace('/kpi/reports')} isDisabled={isSubmitting}><X className="h-4 w-4" />Batal</Button><Button variant="primary" type="submit" form="report-submit-form" isDisabled={isSubmitting} isPending={isSubmitting}>Kirim Laporan</Button></div></div>;
}
