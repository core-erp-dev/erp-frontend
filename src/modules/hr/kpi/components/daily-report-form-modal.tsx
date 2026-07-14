'use client';

import React, { useEffect, useCallback } from 'react';
import { Modal, Button, Surface, TextField, Input, TextArea, Label, FieldError } from '@heroui/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KpiTaskResponse, KpiReportResponse, CreateKpiReportRequest, UpdateKpiReportRequest } from '../types';
import { formatTaskPeriod } from '../utils';

const reportSchema = z.object({
  taskId: z.string().min(1, 'Pilih tugas'),
  reportDate: z.string().min(1, 'Tanggal wajib diisi'),
  description: z.string().optional(),
  dailyTarget: z.number().min(0, 'Target minimal 0'),
  dailyRealization: z.number().min(0, 'Realisasi minimal 0'),
  unit: z.string().optional(),
});

type FormValues = z.infer<typeof reportSchema>;

interface DailyReportFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  task: KpiTaskResponse | null;
  report: KpiReportResponse | null;
  isSubmitting: boolean;
  onClose: () => void;
  onCreate: (data: CreateKpiReportRequest) => void;
  onUpdate: (reportId: string, data: UpdateKpiReportRequest) => void;
}

/**
 * Validate report date is within the task's period month and year.
 */
function validateReportPeriod(
  reportDate: string,
  task: KpiTaskResponse | null,
): string | null {
  if (!reportDate || !task) return null;
  const d = new Date(reportDate);
  if (isNaN(d.getTime())) return null;
  const reportYear = d.getFullYear();
  const reportMonth = d.getMonth() + 1; // JS months are 0-indexed

  if (reportYear !== task.periodYear || reportMonth !== task.periodMonth) {
    const periodLabel = formatTaskPeriod(task.periodMonth, task.periodYear);
    return `Tanggal laporan harus berada pada periode tugas ${periodLabel}`;
  }
  return null;
}

export const DailyReportFormModal: React.FC<DailyReportFormModalProps> = ({
  isOpen, mode, task, report, isSubmitting,
  onClose, onCreate, onUpdate,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      taskId: '', reportDate: todayStr, description: '', dailyTarget: 0, dailyRealization: 0, unit: '',
    },
  });

  const currentReportDate = watch('reportDate');

  // Cross-month validation error
  const crossMonthError = React.useMemo(
    () => validateReportPeriod(currentReportDate, task),
    [currentReportDate, task],
  );

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'create' && task) {
      reset({
        taskId: task.id,
        reportDate: todayStr,
        description: '',
        dailyTarget: 0,
        dailyRealization: 0,
        unit: task.unit ?? '',
      });
    } else if (mode === 'edit' && report) {
      reset({
        taskId: report.taskId,
        reportDate: report.reportDate ? report.reportDate.split('T')[0] : todayStr,
        description: report.description ?? '',
        dailyTarget: report.dailyTarget,
        dailyRealization: report.dailyRealization,
        unit: report.unit ?? '',
      });
    }
  }, [isOpen, mode, task, report, todayStr, reset]);

  const handleSave = useCallback(() => {
    handleSubmit((v) => {
      // Check cross-month before submit
      const crossErr = validateReportPeriod(v.reportDate, task);
      if (crossErr) {
        // Backend will also enforce; let user see inline error
        return;
      }

      const payload = {
        taskId: v.taskId,
        reportDate: v.reportDate,
        description: v.description || undefined,
        dailyTarget: v.dailyTarget,
        dailyRealization: v.dailyRealization,
        unit: v.unit || undefined,
      };
      if (mode === 'create') {
        onCreate(payload as CreateKpiReportRequest);
      } else if (report) {
        onUpdate(report.id, payload as UpdateKpiReportRequest);
      }
    })();
  }, [handleSubmit, mode, report, onCreate, onUpdate, task]);

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} isDismissable={false} onOpenChange={(o) => { if (!o) onClose(); }}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[480px]">
            <Modal.Header className="items-center text-center">
              <Modal.Heading>{mode === 'create' ? 'Lapor Harian' : 'Edit Laporan'}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Surface className="flex flex-col gap-4 rounded-3xl p-6">
                {mode === 'create' && task && (
                  <div className="rounded-xl bg-surface-secondary px-4 py-3">
                    <p className="text-sm font-medium text-foreground">{task.taskName}</p>
                    <p className="text-xs text-muted-foreground">
                      {task.taskCode} — {formatTaskPeriod(task.periodMonth, task.periodYear)}
                    </p>
                  </div>
                )}

                <TextField isRequired isInvalid={!!errors.reportDate || !!crossMonthError}>
                  <Label>Tanggal</Label>
                  <Input variant="secondary" type="date" {...register('reportDate')} />
                  {errors.reportDate && <FieldError>{errors.reportDate.message}</FieldError>}
                  {!errors.reportDate && crossMonthError && <FieldError>{crossMonthError}</FieldError>}
                </TextField>

                <TextField isInvalid={!!errors.description}>
                  <Label>Deskripsi</Label>
                  <TextArea variant="secondary" placeholder="Deskripsi kegiatan..." rows={2} {...register('description')} />
                  <FieldError />
                </TextField>

                <div className="grid grid-cols-2 gap-3">
                  <TextField isInvalid={!!errors.dailyTarget}>
                    <Label>Target Harian</Label>
                    <Input variant="secondary" type="number" placeholder="0" {...register('dailyTarget', { valueAsNumber: true })} />
                    <FieldError />
                  </TextField>
                  <TextField isRequired isInvalid={!!errors.dailyRealization}>
                    <Label>Realisasi Harian</Label>
                    <Input variant="secondary" type="number" placeholder="0" {...register('dailyRealization', { valueAsNumber: true })} />
                    <FieldError />
                  </TextField>
                </div>

                <TextField isInvalid={!!errors.unit}>
                  <Label>Satuan</Label>
                  <Input variant="secondary" placeholder="Satuan" {...register('unit')} />
                  <FieldError />
                </TextField>
              </Surface>
            </Modal.Body>
            <Modal.Footer className="flex-col-reverse">
              <Button className="w-full" variant="primary" onPress={handleSave} isDisabled={isSubmitting || !!crossMonthError} isPending={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
              </Button>
              <Button className="w-full" variant="secondary" slot="close" onPress={onClose} isDisabled={isSubmitting}>Batal</Button>
            </Modal.Footer>
            <Modal.CloseTrigger />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
