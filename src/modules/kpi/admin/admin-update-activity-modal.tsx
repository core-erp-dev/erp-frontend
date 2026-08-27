'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Alert,
  Button,
  ComboBox,
  EmptyState,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Spinner,
  TextArea,
  TextField,
  toast,
  useFilter,
} from '@heroui/react';
import { X as XIcon } from '@phosphor-icons/react';
import { kpiAdminV1Api } from './kpi-admin-v1-api';
import type { RecoverableConflict } from '@/modules/kpi/shared/domain-errors';
import type {
  KpiActivityManageAssigneeOption,
  KpiActivityManageOptions,
  KpiActivityResponse,
} from '@/modules/kpi/activity/activity-v1.types';
import { ActivityIndicatorMultiSelect } from '@/modules/kpi/activity/activity-indicator-multi-select';

interface AdminUpdateActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The Activity to mutate, including its authoritative persisted version. */
  activity: KpiActivityResponse;
  /** Called after a successful mutation (refetch Activity detail + lists). */
  onSuccess: () => void;
  /** Called after ACTIVITY_VERSION_CONFLICT (refetch authoritative data). */
  onConflict: () => void;
  initialAction?: AdminAction;
}

type AdminAction = 'UPDATE' | 'REASSIGN' | 'CANCEL';

const updateSchema = z.object({
  action: z.enum(['UPDATE', 'REASSIGN', 'CANCEL']),
  reason: z.string().trim().min(1, 'Alasan administratif wajib diisi'),
  activityName: z.string(),
  description: z.string(),
  unit: z.string(),
  targetValue: z.string(),
  corporateKpiIds: z.array(z.string()),
  assignedToUserPositionId: z.string(),
}).superRefine((values, context) => {
  if (values.action === 'UPDATE') {
    if (!values.activityName.trim()) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['activityName'], message: 'Nama aktivitas wajib diisi' });
    }
    if (!values.unit.trim()) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['unit'], message: 'Satuan wajib diisi' });
    }
    const target = Number(values.targetValue);
    if (values.targetValue.trim() === '' || !Number.isFinite(target) || target <= 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['targetValue'], message: 'Target harus berupa angka positif' });
    }
    if (values.corporateKpiIds.length === 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['corporateKpiIds'], message: 'Pilih minimal satu indikator KPI Perusahaan' });
    }
  }
  if (values.action === 'REASSIGN' && !values.assignedToUserPositionId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['assignedToUserPositionId'], message: 'Penanggung jawab baru wajib dipilih' });
  }
});

type UpdateFormValues = z.infer<typeof updateSchema>;

function assigneeText(option: KpiActivityManageAssigneeOption): string {
  return `${option.userFullName} • ${option.positionName}`;
}

export function AdminUpdateActivityModal({
  isOpen, onClose, activity, onSuccess, onConflict, initialAction = 'UPDATE',
}: AdminUpdateActivityModalProps) {
  const { contains } = useFilter({ sensitivity: 'base' });
  const [options, setOptions] = useState<KpiActivityManageOptions | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [conflict, setConflict] = useState<RecoverableConflict | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      action: 'UPDATE',
      reason: '',
      activityName: activity.activityName,
      description: activity.description ?? '',
      unit: activity.unit,
      targetValue: String(activity.targetValue),
      corporateKpiIds: activity.corporateKpis?.map((kpi) => kpi.id)
        ?? (activity.corporateKpiId ? [activity.corporateKpiId] : []),
      assignedToUserPositionId: '',
    },
  });

  const action = useWatch({ control: form.control, name: 'action' });
  const showLoading = isOpen && initialAction !== 'CANCEL' && (isLoadingOptions || options === null);

  const loadOptions = useCallback(async () => {
    setIsLoadingOptions(true);
    try {
      setOptions(await kpiAdminV1Api.getManageOptions(activity.periodYear));
    } catch {
      setOptions({ assignees: [], parentActivities: [], indicators: [], periodYears: [] });
      toast.danger('Gagal memuat opsi pengelolaan aktivitas.');
    } finally {
      setIsLoadingOptions(false);
    }
  }, [activity.periodYear]);

  useEffect(() => {
    if (!isOpen) {
      setOptions(null);
      return;
    }
    form.reset({
      action: initialAction,
      reason: '',
      activityName: activity.activityName,
      description: activity.description ?? '',
      unit: activity.unit,
      targetValue: String(activity.targetValue),
      corporateKpiIds: activity.corporateKpis?.map((kpi) => kpi.id)
        ?? (activity.corporateKpiId ? [activity.corporateKpiId] : []),
      assignedToUserPositionId: '',
    });
    setConflict(null);
    if (initialAction !== 'CANCEL') void loadOptions();
  }, [activity, form, initialAction, isOpen, loadOptions]);

  const handleSubmit = useCallback(async (values: UpdateFormValues) => {
    setConflict(null);
    setIsSubmitting(true);
    try {
      await kpiAdminV1Api.adminUpdateActivity(activity.id, {
        action: values.action,
        reason: values.reason.trim(),
        expectedVersion: activity.version,
        activityName: values.action === 'UPDATE' ? values.activityName.trim() : undefined,
        description: values.action === 'UPDATE' ? values.description.trim() || undefined : undefined,
        unit: values.action === 'UPDATE' ? values.unit.trim() : undefined,
        targetValue: values.action === 'UPDATE' ? Number(values.targetValue) : undefined,
        corporateKpiIds: values.action === 'UPDATE' ? values.corporateKpiIds : undefined,
        assignedToUserPositionId: values.action === 'REASSIGN' ? values.assignedToUserPositionId : undefined,
      });
      toast.success(values.action === 'CANCEL' ? 'Aktivitas berhasil dibatalkan.' : 'Aktivitas berhasil diperbarui.');
      onSuccess();
      onClose();
    } catch (error) {
      const raw = error instanceof Error ? error.message : 'Gagal memperbarui aktivitas.';
      if (raw.includes('Activity was modified by another user')) {
        setConflict({
          kind: 'version-conflict',
          message: 'Aktivitas ini diubah oleh pengguna lain. Muat ulang sebelum mengirim ulang.',
          refetch: true,
        });
        onConflict();
      } else {
        toast.danger(raw);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [activity.id, activity.version, onClose, onConflict, onSuccess]);

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      isDismissable={!isSubmitting && !showLoading}
      onOpenChange={(open: boolean) => { if (!open) onClose(); }}
    >
        <Modal.Container scroll="outside">
          <Modal.Dialog className="sm:max-w-[600px]">
            {showLoading ? (
              <div className="flex min-h-64 items-center justify-center">
                <Spinner size="md" />
              </div>
            ) : (
              <>
                <Modal.Header className="relative flex items-center justify-center">
                  <Modal.Heading className="text-center">
                    {action === 'CANCEL' ? 'Batalkan Aktivitas' : 'Kelola Aktivitas'}
                  </Modal.Heading>
                  <Modal.CloseTrigger className="absolute right-0" />
                </Modal.Header>
                <Modal.Body className="p-6">
                  <Form
                    id="admin-update-activity-form"
                    validationBehavior="aria"
                    onSubmit={form.handleSubmit(handleSubmit)}
                    className="flex flex-col gap-4"
                  >
                    {conflict && (
                      <Alert status="warning">
                        <Alert.Indicator />
                        <Alert.Content><Alert.Title>{conflict.message}</Alert.Title></Alert.Content>
                      </Alert>
                    )}

                    <div className="rounded-lg bg-secondary-soft p-3 text-sm text-muted-foreground">
                      <div>Aktivitas: <span className="font-medium text-foreground">{activity.activityName}</span></div>
                      <div>Versi: <span className="font-medium text-foreground">{activity.version}</span></div>
                    </div>

                    {initialAction !== 'CANCEL' && (
                      <Controller
                        control={form.control}
                        name="action"
                        render={({ field, fieldState }) => (
                          <Select
                            className="w-full"
                            variant="secondary"
                            selectedKey={field.value}
                            onSelectionChange={(key) => field.onChange(String(key))}
                            isInvalid={fieldState.invalid}
                            isDisabled={isSubmitting}
                          >
                            <Label>Aksi</Label>
                            <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                            <Select.Popover>
                              <ListBox>
                                <ListBox.Item id="UPDATE" textValue="Ubah detail">Ubah detail</ListBox.Item>
                                <ListBox.Item id="REASSIGN" textValue="Ganti penanggung jawab">Ganti penanggung jawab</ListBox.Item>
                                <ListBox.Item id="CANCEL" textValue="Batalkan aktivitas">Batalkan aktivitas</ListBox.Item>
                              </ListBox>
                            </Select.Popover>
                            <FieldError>{fieldState.error?.message}</FieldError>
                          </Select>
                        )}
                      />
                    )}

                    {action === 'UPDATE' && (
                      <>
                        <Controller
                          control={form.control}
                          name="corporateKpiIds"
                          render={({ field, fieldState }) => (
                            <ActivityIndicatorMultiSelect
                              indicators={options?.indicators ?? []}
                              selectedIds={field.value}
                              onChange={field.onChange}
                              isRequired
                            isInvalid={form.formState.isSubmitted && fieldState.invalid}
                            errorMessage={form.formState.isSubmitted ? fieldState.error?.message : undefined}
                            />
                          )}
                        />
                        <Controller
                          control={form.control}
                          name="activityName"
                          render={({ field, fieldState }) => (
                            <TextField isRequired validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                              <Label>Nama Aktivitas</Label>
                              <Input variant="secondary" placeholder="Masukkan nama aktivitas" />
                              <FieldError>{fieldState.error?.message}</FieldError>
                            </TextField>
                          )}
                        />
                        <Controller
                          control={form.control}
                          name="description"
                          render={({ field, fieldState }) => (
                            <TextField validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                              <Label>Deskripsi</Label>
                              <TextArea variant="secondary" placeholder="Masukkan deskripsi" rows={2} />
                              <FieldError>{fieldState.error?.message}</FieldError>
                            </TextField>
                          )}
                        />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <Controller
                            control={form.control}
                            name="targetValue"
                            render={({ field, fieldState }) => (
                              <TextField isRequired validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                                <Label>Target</Label>
                                <Input variant="secondary" placeholder="Masukkan target" type="number" />
                                <FieldError>{fieldState.error?.message}</FieldError>
                              </TextField>
                            )}
                          />
                          <Controller
                            control={form.control}
                            name="unit"
                            render={({ field, fieldState }) => (
                              <TextField isRequired validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                                <Label>Satuan</Label>
                                <Input variant="secondary" placeholder="Masukkan satuan" />
                                <FieldError>{fieldState.error?.message}</FieldError>
                              </TextField>
                            )}
                          />
                        </div>
                      </>
                    )}

                    {action === 'REASSIGN' && (
                      <Controller
                        control={form.control}
                        name="assignedToUserPositionId"
                        render={({ field, fieldState }) => (
                          <ComboBox
                            className="w-full"
                            variant="secondary"
                            selectedKey={field.value || null}
                            onSelectionChange={(key) => field.onChange(key ? String(key) : '')}
                            isRequired
                            isInvalid={fieldState.invalid}
                            isDisabled={isSubmitting}
                            allowsEmptyCollection
                            menuTrigger="input"
                            defaultFilter={contains}
                          >
                            <Label>Penanggung Jawab Baru</Label>
                            <ComboBox.InputGroup>
                              <Input variant="secondary" placeholder="Pilih penanggung jawab baru" />
                              <ComboBox.Trigger />
                            </ComboBox.InputGroup>
                            <ComboBox.Popover>
                              <ListBox renderEmptyState={() => (
                                <EmptyState>
                                  {options?.assignees?.length ? 'Penanggung jawab tidak ditemukan' : 'Tidak ada data penanggung jawab'}
                                </EmptyState>
                              )}>
                                {(options?.assignees ?? []).map((assignee) => (
                                  <ListBox.Item key={assignee.userPositionId} id={assignee.userPositionId} textValue={assigneeText(assignee)}>
                                    <span>{assignee.userFullName}</span>
                                    <span className="text-muted-foreground"> • {assignee.positionName}</span>
                                    <ListBox.ItemIndicator />
                                  </ListBox.Item>
                                ))}
                              </ListBox>
                            </ComboBox.Popover>
                            <FieldError>{fieldState.error?.message}</FieldError>
                          </ComboBox>
                        )}
                      />
                    )}

                    <Controller
                      control={form.control}
                      name="reason"
                      render={({ field, fieldState }) => (
                        <TextField isRequired validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                          <Label>Alasan</Label>
                          <TextArea variant="secondary" placeholder="Masukkan alasan administratif" rows={2} />
                          <FieldError>{fieldState.error?.message}</FieldError>
                        </TextField>
                      )}
                    />
                  </Form>
                </Modal.Body>
                <Modal.Footer className="flex justify-end gap-2">
                  <Button variant="secondary" onPress={onClose} isDisabled={isSubmitting}>
                    <XIcon className="h-4 w-4" />
                    Batal
                  </Button>
                  <Button
                    variant={action === 'CANCEL' ? 'danger' : 'primary'}
                    type="submit"
                    form="admin-update-activity-form"
                    isDisabled={isSubmitting}
                    isPending={isSubmitting}
                  >
                    {action === 'CANCEL' ? 'Batalkan Aktivitas' : 'Simpan Perubahan'}
                  </Button>
                </Modal.Footer>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
  );
}
