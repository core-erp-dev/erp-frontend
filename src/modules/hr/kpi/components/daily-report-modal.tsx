'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Modal,
  Button,
  TextField,
  Input,
  Label,
  FieldError,
  Alert,
} from '@heroui/react';
import { Upload, FileCheck, AlertTriangle, Lock } from 'lucide-react';
import { KpiTask, KpiReport } from '../types';
import { kpiReportApi } from '../services/report-api';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const reportSchema = z.object({
  reportDate: z.string().min(1, 'Tanggal lapor wajib diisi'),
  description: z.string().min(5, 'Uraian minimal 5 karakter'),
  dailyTarget: z.number().min(0, 'Target minimal 0'),
  dailyRealization: z.number().min(0, 'Realisasi minimal 0'),
});

type ReportFormValues = z.infer<typeof reportSchema>;

interface DailyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  task: KpiTask | null;
  editReport?: KpiReport | null;
}

export const DailyReportModal: React.FC<DailyReportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  task,
  editReport,
}) => {
  const isEditMode = !!editReport;
  const isLocked = isEditMode && editReport?.approvalStatus === 'APPROVED';

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date();
  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  }, []);

  const maxDate = today.toISOString().split('T')[0];

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reportDate: today.toISOString().split('T')[0],
      description: '',
      dailyTarget: 0,
      dailyRealization: 0,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (editReport) {
        form.reset({
          reportDate: editReport.reportDate,
          description: editReport.description,
          dailyTarget: editReport.dailyTarget,
          dailyRealization: editReport.dailyRealization,
        });
      } else {
        form.reset({
          reportDate: today.toISOString().split('T')[0],
          description: '',
          dailyTarget: 0,
          dailyRealization: 0,
        });
      }
      setFile(null);
      setFileError('');
    }
  }, [editReport, isOpen, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    setFileError('');

    if (!selected) {
      setFile(null);
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setFileError('File terlalu besar. Maksimal 10MB.');
      setFile(null);
      return;
    }

    if (!ALLOWED_TYPES.includes(selected.type)) {
      setFileError('Format file tidak didukung. Gunakan JPG, PNG, WebP, PDF, atau DOCX.');
      setFile(null);
      return;
    }

    setFile(selected);
  };

  const handleSubmit = async (values: ReportFormValues) => {
    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await kpiReportApi.updateReport(editReport!.id, {
          reportDate: values.reportDate,
          description: values.description,
          dailyTarget: values.dailyTarget,
          dailyRealization: values.dailyRealization,
        }, file ?? undefined);
      } else {
        await kpiReportApi.createReport({
          taskId: task!.id,
          reportDate: values.reportDate,
          description: values.description,
          dailyTarget: values.dailyTarget,
          dailyRealization: values.dailyRealization,
        }, file ?? undefined);
      }
      onSuccess();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Gagal menyimpan laporan';
      setFileError(msg);
    } finally {
      setIsSubmitting(false);
    }
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
                {isLocked ? 'Detail Laporan' : isEditMode ? 'Edit Laporan Harian' : 'Buat Laporan Harian'}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2">
              {/* Locked State Banner */}
              {isLocked && (
                <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
                  <Lock className="h-4 w-4 flex-shrink-0" />
                  Laporan sudah disetujui dan tidak dapat diubah.
                </div>
              )}

              {/* Task Info */}
              {task && (
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                  <span className="font-medium text-foreground">{task.taskName}</span>
                  <span className="ml-2 text-muted-foreground">
                    ({task.taskCode}) — {task.unit}
                  </span>
                </div>
              )}

              <form id="report-form" onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
                <Controller
                  control={form.control}
                  name="reportDate"
                  render={({ field, fieldState }) => (
                    <TextField
                      isRequired
                      validationBehavior="aria"
                      className="w-full"
                      name={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      isInvalid={!!fieldState.error}
                      isDisabled={isSubmitting || isLocked}
                    >
                      <Label>Tanggal Lapor</Label>
                      <Input
                        type="date"
                        min={minDate}
                        max={maxDate}
                      />
                      {fieldState.error ? (
                        <FieldError>{fieldState.error.message}</FieldError>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Maksimal mundur 7 hari dari hari ini
                        </span>
                      )}
                    </TextField>
                  )}
                />

                <Controller
                  control={form.control}
                  name="description"
                  render={({ field, fieldState }) => (
                    <TextField
                      isRequired
                      validationBehavior="aria"
                      className="w-full"
                      name={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      isInvalid={!!fieldState.error}
                      isDisabled={isSubmitting || isLocked}
                    >
                      <Label>Uraian Kegiatan</Label>
                      <Input placeholder="Jelaskan kegiatan yang dilakukan..." />
                      {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                    </TextField>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Controller
                    control={form.control}
                    name="dailyTarget"
                    render={({ field, fieldState }) => (
                      <TextField
                        isRequired
                        validationBehavior="aria"
                        className="w-full"
                        name={field.name}
                        value={(field.value ?? 0).toString()}
                        onChange={(val) => field.onChange(Number(val) || 0)}
                        isInvalid={!!fieldState.error}
                        isDisabled={isSubmitting || isLocked}
                      >
                        <Label>Target Harian</Label>
                        <Input type="number" placeholder="0" min="0" />
                        {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                      </TextField>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="dailyRealization"
                    render={({ field, fieldState }) => (
                      <TextField
                        isRequired
                        validationBehavior="aria"
                        className="w-full"
                        name={field.name}
                        value={(field.value ?? 0).toString()}
                        onChange={(val) => field.onChange(Number(val) || 0)}
                        isInvalid={!!fieldState.error}
                        isDisabled={isSubmitting || isLocked}
                      >
                        <Label>Realisasi Harian</Label>
                        <Input type="number" placeholder="0" min="0" />
                        {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                      </TextField>
                    )}
                  />
                </div>

                {/* File Upload */}
                {!isLocked && (
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm">Upload Bukti (Opsional)</Label>
                    <div className="flex items-center gap-3">
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:border-accent hover:text-accent transition-colors">
                        <Upload className="h-4 w-4" />
                        {file ? file.name : 'Pilih file...'}
                        <input
                          type="file"
                          className="hidden"
                          accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
                          onChange={handleFileChange}
                        />
                      </label>
                      {editReport?.evidenceUrl && !file && (
                        <span className="text-xs text-info">Bukti lama sudah ada</span>
                      )}
                    </div>
                    {file && (
                      <div className="flex items-center gap-2 text-xs text-success">
                        <FileCheck className="h-3 w-3" />
                        {file.name} ({(file.size / 1024).toFixed(0)} KB)
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Format: JPG, PNG, WebP, PDF, DOCX. Maksimal 10MB.
                    </span>
                  </div>
                )}

                {/* Show existing evidence for locked reports */}
                {isLocked && editReport?.evidenceUrl && (
                  <div className="flex items-center gap-2">
                    <a
                      href={editReport.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-info hover:underline"
                    >
                      <FileCheck className="h-4 w-4" />
                      Lihat bukti yang diunggah
                    </a>
                  </div>
                )}

                {/* File Error */}
                {fileError && (
                  <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {fileError}
                  </div>
                )}

                {/* Backdate Warning */}
                {form.watch('reportDate') && form.watch('reportDate') < maxDate && (
                  <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    Anda melaporkan untuk tanggal lampau ({new Date(form.watch('reportDate')).toLocaleDateString('id-ID')}).
                  </div>
                )}
              </form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose} isDisabled={isSubmitting}>
                {isLocked ? 'Tutup' : 'Batal'}
              </Button>
              {!isLocked && (
                <Button
                  type="submit"
                  form="report-form"
                  variant="primary"
                  isDisabled={isSubmitting || !!fileError}
                  isPending={isSubmitting}
                >
                  {isEditMode ? 'Simpan Perubahan' : 'Kirim Laporan'}
                </Button>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
