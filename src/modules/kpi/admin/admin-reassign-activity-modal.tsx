'use client';

import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Button,
  ComboBox,
  EmptyState,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  Spinner,
  TextArea,
  TextField,
  toast,
  useFilter,
} from '@heroui/react';
import { X } from '@phosphor-icons/react';
import { kpiAdminV1Api } from './kpi-admin-v1-api';
import type {
  KpiActivityManageAssigneeOption,
  KpiActivityManageOptions,
  KpiActivityResponse,
} from '@/modules/kpi/activity/activity-v1.types';

interface AdminReassignActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: KpiActivityResponse;
  onSuccess: () => void;
  onConflict: () => void;
}

const reassignSchema = z.object({
  assignedToUserPositionId: z.string().min(1, 'Penanggung jawab baru wajib dipilih'),
  reason: z.string().trim().min(1, 'Alasan administratif wajib diisi'),
});

type ReassignFormValues = z.infer<typeof reassignSchema>;

function assigneeText(option: KpiActivityManageAssigneeOption): string {
  return `${option.userFullName} • ${option.positionName}`;
}

export function AdminReassignActivityModal({
  isOpen,
  onClose,
  activity,
  onSuccess,
  onConflict,
}: AdminReassignActivityModalProps) {
  const { contains } = useFilter({ sensitivity: 'base' });
  const [options, setOptions] = useState<KpiActivityManageOptions | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ReassignFormValues>({
    resolver: zodResolver(reassignSchema),
    defaultValues: { assignedToUserPositionId: '', reason: '' },
  });

  const loadOptions = useCallback(async () => {
    setIsLoadingOptions(true);
    try {
      setOptions(await kpiAdminV1Api.getManageOptions(activity.periodYear));
    } catch (error: unknown) {
      setOptions({ assignees: [], parentActivities: [], indicators: [], periodYears: [] });
      toast.danger(error instanceof Error ? error.message : 'Gagal memuat opsi penanggung jawab.');
    } finally {
      setIsLoadingOptions(false);
    }
  }, [activity.periodYear]);

  useEffect(() => {
    if (!isOpen) {
      setOptions(null);
      return;
    }
    form.reset({ assignedToUserPositionId: '', reason: '' });
    void loadOptions();
  }, [form, isOpen, loadOptions]);

  const handleSubmit = async (values: ReassignFormValues) => {
    setIsSubmitting(true);
    try {
      await kpiAdminV1Api.adminUpdateActivity(activity.id, {
        action: 'REASSIGN',
        assignedToUserPositionId: values.assignedToUserPositionId,
        reason: values.reason.trim(),
        expectedVersion: activity.version,
      });
      toast.success('Penanggung jawab aktivitas berhasil dialihkan.');
      onSuccess();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal mengalihkan penanggung jawab.';
      if (message.includes('Activity was modified by another user')) onConflict();
      else toast.danger(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const assignees = options?.assignees ?? [];

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      isDismissable={!isSubmitting && !isLoadingOptions}
      onOpenChange={(open) => { if (!open) onClose(); }}
    >
      <Modal.Container scroll="outside">
        <Modal.Dialog className="sm:max-w-[600px]">
          {isLoadingOptions || options === null ? (
            <div className="flex min-h-64 items-center justify-center"><Spinner size="md" /></div>
          ) : (
            <>
              <Modal.Header className="relative flex items-center justify-center">
                <Modal.Heading className="text-center">Alihkan Penanggung Jawab</Modal.Heading>
                <Modal.CloseTrigger className="absolute right-0" />
              </Modal.Header>
              <Modal.Body className="p-6">
                <Form
                  id="admin-reassign-activity-form"
                  validationBehavior="aria"
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="flex flex-col gap-4"
                >
                  <div className="rounded-lg bg-secondary-soft p-3 text-sm text-muted-foreground">
                    Aktivitas: <span className="font-medium text-foreground">{activity.activityName}</span>
                  </div>
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
                          <ListBox renderEmptyState={() => <EmptyState>{assignees.length ? 'Penanggung jawab tidak ditemukan' : 'Tidak ada data penanggung jawab'}</EmptyState>}>
                            {assignees.map((assignee) => (
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
                  <Controller
                    control={form.control}
                    name="reason"
                    render={({ field, fieldState }) => (
                      <TextField isRequired validationBehavior="native" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                        <Label>Alasan</Label>
                        <TextArea variant="secondary" placeholder="Masukkan alasan administratif" rows={2} />
                        <FieldError>{fieldState.error?.message}</FieldError>
                      </TextField>
                    )}
                  />
                </Form>
              </Modal.Body>
              <Modal.Footer className="flex justify-end gap-2">
                <Button variant="secondary" onPress={onClose} isDisabled={isSubmitting}><X className="h-4 w-4" />Batal</Button>
                <Button variant="primary" type="submit" form="admin-reassign-activity-form" isDisabled={isSubmitting} isPending={isSubmitting}>Simpan</Button>
              </Modal.Footer>
            </>
          )}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
