'use client';

import React, { useEffect, useState } from 'react';
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
  NumberField,
  Select,
  ListBox,
} from '@heroui/react';
import { KpiTask, CreateTaskRequest, UpdateTaskRequest } from '../types';
import { corporateKpiApi } from '../services/corporate-kpi-api';
import { organizationApi } from '@/modules/hr/hierarchy/services/organization-api';
import type { CorporateKpiResponse } from '../types';
import type { PositionTree } from '@/modules/hr/hierarchy/types';

const getTaskFormSchema = (isEditMode: boolean) =>
  z.object({
    taskName: z.string().min(1, 'Nama tugas wajib diisi').max(500, 'Nama tugas maksimal 500 karakter'),
    annualTarget: z.number().min(0, 'Target tidak boleh negatif').nullable().optional(),
    periodYear: z.number().min(2020, 'Tahun tidak valid').max(2100, 'Tahun tidak valid'),
    ...(isEditMode
      ? {}
      : {
          positionId: z.number().min(1, 'Pilih posisi'),
          corporateKpiId: z.string().min(1, 'KPI Korporat wajib dipilih'),
        }),
  });

type TaskFormValues = z.infer<ReturnType<typeof getTaskFormSchema>>;

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskRequest | UpdateTaskRequest) => Promise<void>;
  task?: KpiTask | null;
  isSubmitting?: boolean;
  periodYear?: number;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  task,
  isSubmitting = false,
  periodYear,
}) => {
  const isEditMode = !!task;
  const isActiveLocked = isEditMode && task?.status === 'ACTIVE';

  const [positions, setPositions] = useState<PositionTree[]>([]);
  const [corporateKpis, setCorporateKpis] = useState<CorporateKpiResponse[]>([]);

  // Flatten position tree for the select dropdown
  const flatPositions = React.useMemo(() => {
    const result: { id: number; label: string; level: number }[] = [];
    const walk = (items: PositionTree[], level: number) => {
      for (const item of items) {
        result.push({ id: item.id, label: item.positionName, level });
        if (item.children?.length) walk(item.children, level + 1);
      }
    };
    walk(positions, 0);
    return result;
  }, [positions]);

  // Flatten corporate KPIs for the select dropdown
  const flatCorporateKpis = React.useMemo(() => {
    const result: { id: string; label: string; level: number }[] = [];
    const walk = (items: CorporateKpiResponse[], level: number) => {
      for (const item of items) {
        result.push({ id: item.id, label: `${item.indicatorCode} — ${item.indicatorName}`, level });
        if (item.children?.length) walk(item.children, level + 1);
      }
    };
    walk(corporateKpis, 0);
    return result;
  }, [corporateKpis]);

  // Fetch positions and corporate KPIs when the modal opens in create mode
  useEffect(() => {
    if (isOpen && !isEditMode) {
      organizationApi.fetchPositionTree().then(setPositions).catch(() => {});
      corporateKpiApi.getAll(periodYear).then(setCorporateKpis).catch(() => {});
    }
  }, [isOpen, isEditMode, periodYear]);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(getTaskFormSchema(isEditMode)),
    defaultValues: {
      taskName: '',
      annualTarget: null,
      periodYear: new Date().getFullYear(),
      ...(isEditMode ? {} : { positionId: 0, corporateKpiId: '' }),
    },
  });

  useEffect(() => {
    if (task) {
      form.reset({
        taskName: task.taskName,
        annualTarget: task.annualTarget ?? null,
        periodYear: task.periodYear,
      });
    } else {
      form.reset({
        taskName: '',
        annualTarget: null,
        periodYear: new Date().getFullYear(),
        positionId: 0,
        corporateKpiId: '',
      });
    }
  }, [task, isOpen, form]);

  const handleSubmit = async (values: TaskFormValues) => {
    if (isEditMode && task) {
      const updateData: UpdateTaskRequest = {
        taskName: values.taskName,
        annualTarget: values.annualTarget ?? null,
        periodYear: values.periodYear,
      };
      await onSubmit(updateData);
    } else {
      const formValues = values as TaskFormValues & { positionId: number; corporateKpiId: string };
      const createData: CreateTaskRequest = {
        positionId: formValues.positionId,
        corporateKpiId: formValues.corporateKpiId,
        taskName: values.taskName,
        annualTarget: values.annualTarget ?? null,
        periodYear: values.periodYear,
      };
      await onSubmit(createData);
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
                {isEditMode ? 'Edit Tugas KPI' : 'Tambah Tugas KPI Baru'}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2">
              <form id="task-form" onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
                {isEditMode && (
                  <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{task?.taskCode}</span>
                    {' '} — {task?.positionName}
                  </div>
                )}

                {isActiveLocked && (
                  <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
                    Tugas sudah aktif. Perubahan target akan mengubah status menjadi &quot;Menunggu Persetujuan&quot;.
                  </div>
                )}

                {/* Position Select (create mode only) */}
                {!isEditMode && (
                  <Controller
                    control={form.control}
                    name={'positionId' as never}
                    render={({ field, fieldState }) => (
                      <Select
                        isRequired
                        className="w-full"
                        placeholder="Pilih Jabatan"
                        value={field.value ? String(field.value) : null}
                        onChange={(val) => field.onChange(Number(val))}
                        isInvalid={!!fieldState.error}
                        isDisabled={isSubmitting}
                      >
                        <Label>Jabatan</Label>
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {flatPositions.map((pos) => (
                              <ListBox.Item key={pos.id} id={String(pos.id)} textValue={pos.label}>
                                <span style={{ paddingLeft: `${pos.level * 16}px` }}>{pos.label}</span>
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    )}
                  />
                )}

                {/* Corporate KPI Select (create mode only) */}
                {!isEditMode && (
                  <Controller
                    control={form.control}
                    name={'corporateKpiId' as never}
                    render={({ field, fieldState }) => (
                      <Select
                        isRequired
                        className="w-full"
                        placeholder="Pilih KPI Korporat"
                        value={field.value || null}
                        onChange={(val) => field.onChange(String(val))}
                        isInvalid={!!fieldState.error}
                        isDisabled={isSubmitting}
                      >
                        <Label>KPI Korporat</Label>
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {flatCorporateKpis.map((kpi) => (
                              <ListBox.Item key={kpi.id} id={kpi.id} textValue={kpi.label}>
                                <span style={{ paddingLeft: `${kpi.level * 16}px` }}>{kpi.label}</span>
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    )}
                  />
                )}

                <Controller
                  control={form.control}
                  name="taskName"
                  render={({ field, fieldState }) => (
                    <TextField
                      isRequired
                      validationBehavior="aria"
                      className="w-full"
                      name={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      isInvalid={!!fieldState.error}
                      isDisabled={isSubmitting || isActiveLocked}
                    >
                      <Label>Nama Aktivitas</Label>
                      <Input placeholder="Contoh: Menyelesaikan tiket helpdesk" />
                      {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                    </TextField>
                  )}
                />

                <Controller
                  control={form.control}
                  name="annualTarget"
                  render={({ field, fieldState }) => (
                    <TextField
                      validationBehavior="aria"
                      className="w-full"
                      name={field.name}
                      value={(field.value ?? '').toString()}
                      onChange={(val) => {
                        const num = val === '' ? null : Number(val);
                        field.onChange(num);
                      }}
                      isInvalid={!!fieldState.error}
                      isDisabled={isSubmitting}
                    >
                      <Label>Target Tahunan</Label>
                      <Input
                        type="number"
                        placeholder="Masukkan target tahunan"
                        min="0"
                      />
                      {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                    </TextField>
                  )}
                />

                <Controller
                  control={form.control}
                  name="periodYear"
                  render={({ field, fieldState }) => (
                    <TextField
                      isRequired
                      validationBehavior="aria"
                      className="w-full"
                      name={field.name}
                      value={field.value?.toString() ?? ''}
                      onChange={(val) => field.onChange(Number(val))}
                      isInvalid={!!fieldState.error}
                      isDisabled={isSubmitting}
                    >
                      <Label>Tahun Periode</Label>
                      <Input
                        type="number"
                        placeholder="2026"
                        min="2020"
                        max="2100"
                      />
                      {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                    </TextField>
                  )}
                />
              </form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose} isDisabled={isSubmitting}>
                Batal
              </Button>
              <Button
                type="submit"
                form="task-form"
                variant="primary"
                isDisabled={isSubmitting}
                isPending={isSubmitting}
              >
                {isEditMode ? 'Simpan Perubahan' : 'Tambah Tugas'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
