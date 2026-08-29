'use client';

import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Alert,
  Breadcrumbs,
  BreadcrumbsItem,
  Button,
  FieldError,
  Form,
  Input,
  Label,
  Spinner,
  TextArea,
  TextField,
  toast,
} from '@heroui/react';
import { ArrowLeft, FloppyDisk, House } from '@phosphor-icons/react';
import { ActivityIndicatorMultiSelect } from '@/modules/kpi/activity/activity-indicator-multi-select';
import type { RecoverableConflict } from '@/modules/kpi/shared/domain-errors';
import type { KpiActivityManageOptions, KpiActivityResponse } from '@/modules/kpi/activity/activity-v1.types';
import { kpiAdminV1Api } from './kpi-admin-v1-api';

interface AdminEditActivityPageProps {
  activity: KpiActivityResponse;
  onBack: () => void;
  onSuccess: () => void;
  onConflict: () => void;
}

const editSchema = z.object({
  activityName: z.string().trim().min(1, 'Nama aktivitas wajib diisi'),
  description: z.string(),
  unit: z.string().trim().min(1, 'Satuan wajib diisi'),
  targetValue: z.string().refine((value) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) > 0, 'Target harus berupa angka positif'),
  corporateKpiIds: z.array(z.string()).min(1, 'Pilih minimal satu indikator KPI Perusahaan'),
  reason: z.string().trim().min(1, 'Alasan administratif wajib diisi'),
});

type EditFormValues = z.infer<typeof editSchema>;

export function AdminEditActivityPage({ activity, onBack, onSuccess, onConflict }: AdminEditActivityPageProps) {
  const [options, setOptions] = useState<KpiActivityManageOptions | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [conflict, setConflict] = useState<RecoverableConflict | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const indicators = activity.corporateKpis
    ?? (activity.corporateKpiId ? [{ id: activity.corporateKpiId }] : []);
  const isChild = Boolean(activity.parentId);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      activityName: activity.activityName,
      description: activity.description ?? '',
      unit: activity.unit,
      targetValue: String(activity.targetValue),
      corporateKpiIds: indicators.map((indicator) => indicator.id),
      reason: '',
    },
  });

  const loadOptions = useCallback(async () => {
    setIsLoadingOptions(true);
    try {
      setOptions(await kpiAdminV1Api.getManageOptions(activity.periodYear));
    } catch (error: unknown) {
      setOptions({ assignees: [], parentActivities: [], indicators: [], periodYears: [] });
      toast.danger(error instanceof Error ? error.message : 'Gagal memuat opsi pengelolaan aktivitas.');
    } finally {
      setIsLoadingOptions(false);
    }
  }, [activity.periodYear]);

  useEffect(() => {
    form.reset({
      activityName: activity.activityName,
      description: activity.description ?? '',
      unit: activity.unit,
      targetValue: String(activity.targetValue),
      corporateKpiIds: indicators.map((indicator) => indicator.id),
      reason: '',
    });
    setConflict(null);
    void loadOptions();
  // The activity snapshot is authoritative for this page instance.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity.id, form, loadOptions]);

  const handleSubmit = async (values: EditFormValues) => {
    setConflict(null);
    setIsSubmitting(true);
    try {
      await kpiAdminV1Api.adminUpdateActivity(activity.id, {
        action: 'UPDATE',
        expectedVersion: activity.version,
        reason: values.reason.trim(),
        activityName: values.activityName.trim(),
        description: values.description.trim() || undefined,
        unit: values.unit.trim(),
        targetValue: Number(values.targetValue),
      corporateKpiIds: isChild ? undefined : values.corporateKpiIds,
      });
      toast.success('Aktivitas berhasil diperbarui.');
      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal memperbarui aktivitas.';
      if (message.includes('Activity was modified by another user')) {
        setConflict({ kind: 'version-conflict', message: 'Aktivitas ini diubah oleh pengguna lain. Muat ulang sebelum mengirim ulang.', refetch: true });
        onConflict();
      } else toast.danger(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem>KPI</BreadcrumbsItem>
        <BreadcrumbsItem href="/kpi/activities/all">Semua Aktivitas</BreadcrumbsItem>
        <BreadcrumbsItem>Edit Aktivitas</BreadcrumbsItem>
      </Breadcrumbs>
      <div className="flex items-center gap-3">
        <Button isIconOnly variant="tertiary" onPress={onBack} aria-label="Kembali"><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="truncate text-xl font-semibold text-foreground">Edit Aktivitas</h1>
      </div>
      {isLoadingOptions || options === null ? (
        <div className="flex h-64 items-center justify-center"><Spinner size="md" /></div>
      ) : (
        <Form validationBehavior="aria" onSubmit={(event) => { form.handleSubmit(handleSubmit)(event); }} className="flex flex-col gap-6">
          {conflict && <Alert status="warning"><Alert.Indicator /><Alert.Content><Alert.Title>{conflict.message}</Alert.Title></Alert.Content></Alert>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField isDisabled className="w-full">
              <Label>Aktivitas</Label>
              <Input variant="secondary" value={activity.activityName} readOnly aria-label="Aktivitas" />
            </TextField>
            <TextField isDisabled className="w-full">
              <Label>Versi</Label>
              <Input variant="secondary" value={String(activity.version)} readOnly aria-label="Versi" />
            </TextField>
          </div>
          {isChild ? (
            <div className="rounded-lg bg-secondary-soft p-3 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">Indicator diwariskan dari aktivitas induk</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {(activity.corporateKpis ?? []).map((indicator) => (
                  <span key={indicator.id}>{indicator.code} — {indicator.name}</span>
                ))}
                {(!activity.corporateKpis || activity.corporateKpis.length === 0) && activity.corporateKpiName && (
                  <span>{activity.corporateKpiCode} — {activity.corporateKpiName}</span>
                )}
              </div>
            </div>
          ) : (
            <Controller
              control={form.control}
              name="corporateKpiIds"
              render={({ field, fieldState }) => (
                <ActivityIndicatorMultiSelect
                  indicators={options.indicators}
                  selectedIds={field.value}
                  onChange={field.onChange}
                  isRequired
                  variant="primary"
                  isInvalid={form.formState.isSubmitted && fieldState.invalid}
                  errorMessage={form.formState.isSubmitted ? fieldState.error?.message : undefined}
                />
              )}
            />
          )}
          <Controller
            control={form.control}
            name="activityName"
            render={({ field, fieldState }) => (
              <TextField isRequired validationBehavior="native" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                <Label>Nama Aktivitas</Label><Input variant="primary" placeholder="Masukkan nama aktivitas" aria-label="Nama Aktivitas" /><FieldError>{fieldState.error?.message}</FieldError>
              </TextField>
            )}
          />
          <Controller
            control={form.control}
            name="description"
            render={({ field, fieldState }) => (
              <TextField validationBehavior="native" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                <Label>Deskripsi</Label><TextArea variant="primary" placeholder="Masukkan deskripsi" rows={2} aria-label="Deskripsi" /><FieldError>{fieldState.error?.message}</FieldError>
              </TextField>
            )}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="targetValue"
              render={({ field, fieldState }) => (
                <TextField isRequired validationBehavior="native" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                  <Label>Target</Label><Input variant="primary" placeholder="Masukkan target" type="number" aria-label="Target" /><FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )}
            />
            <Controller
              control={form.control}
              name="unit"
              render={({ field, fieldState }) => (
                <TextField isRequired validationBehavior="native" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                  <Label>Satuan</Label><Input variant="primary" placeholder="Masukkan satuan" aria-label="Satuan" /><FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )}
            />
          </div>
          <Controller
            control={form.control}
            name="reason"
            render={({ field, fieldState }) => (
              <TextField isRequired validationBehavior="native" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                <Label>Alasan</Label><TextArea variant="primary" placeholder="Masukkan alasan administratif" rows={2} aria-label="Alasan" /><FieldError>{fieldState.error?.message}</FieldError>
              </TextField>
            )}
          />
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onPress={onBack} isDisabled={isSubmitting}>Batal</Button>
            <Button type="submit" variant="primary" isDisabled={isSubmitting} isPending={isSubmitting}><FloppyDisk className="h-4 w-4" />Simpan Perubahan</Button>
          </div>
        </Form>
      )}
    </div>
  );
}
