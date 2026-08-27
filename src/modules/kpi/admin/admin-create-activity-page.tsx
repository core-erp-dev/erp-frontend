'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Breadcrumbs,
  BreadcrumbsItem,
  Button,
  ComboBox,
  EmptyState,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  Spinner,
  TextArea,
  TextField,
  toast,
  useFilter,
} from '@heroui/react';
import { ArrowLeft, FloppyDisk, House } from '@phosphor-icons/react';
import { ActivityIndicatorMultiSelect } from '@/modules/kpi/activity/activity-indicator-multi-select';
import type {
  KpiActivityManageAssigneeOption,
  KpiActivityManageOptions,
} from '@/modules/kpi/activity/activity-v1.types';
import { kpiAdminV1Api } from './kpi-admin-v1-api';

interface AdminCreateActivityPageProps {
  onSuccess: () => void;
  onBack: () => void;
}

const MONTH_OPTIONS = [
  { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' }, { value: 4, label: 'April' },
  { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' }, { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' }, { value: 12, label: 'Desember' },
];

const createSchema = z.object({
  assignedToUserPositionId: z.string().min(1, 'Penanggung jawab wajib dipilih'),
  parentId: z.string(),
  periodYear: z.number().int().positive('Tahun periode wajib dipilih'),
  periodMonth: z.number().int().min(1).max(12, 'Bulan periode wajib dipilih'),
  corporateKpiIds: z.array(z.string()),
  activityName: z.string().trim().min(1, 'Nama aktivitas wajib diisi'),
  description: z.string(),
  unit: z.string().trim().min(1, 'Satuan wajib diisi'),
  targetValue: z.string().refine((value) => {
    const parsed = Number(value);
    return value.trim() !== '' && Number.isFinite(parsed) && parsed > 0;
  }, 'Target harus berupa angka positif'),
  reason: z.string().trim().min(1, 'Alasan administratif wajib diisi'),
}).superRefine((values, context) => {
  if (!values.parentId && values.corporateKpiIds.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['corporateKpiIds'],
      message: 'Pilih minimal satu indikator KPI Perusahaan',
    });
  }
});

type CreateFormValues = z.infer<typeof createSchema>;

function assigneeText(option: KpiActivityManageAssigneeOption): string {
  return `${option.userFullName} • ${option.positionName}`;
}

export function AdminCreateActivityPage({ onSuccess, onBack }: AdminCreateActivityPageProps) {
  const currentYear = new Date().getFullYear();
  const { contains } = useFilter({ sensitivity: 'base' });
  const [options, setOptions] = useState<KpiActivityManageOptions | null>(null);
  const [loadedYear, setLoadedYear] = useState<number | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      assignedToUserPositionId: '', parentId: '', periodYear: currentYear,
      periodMonth: new Date().getMonth() + 1, corporateKpiIds: [],
      activityName: '', description: '', unit: '', targetValue: '', reason: '',
    },
  });

  const selectedAssigneeId = useWatch({ control: form.control, name: 'assignedToUserPositionId' });
  const selectedParentId = useWatch({ control: form.control, name: 'parentId' });
  const selectedYear = useWatch({ control: form.control, name: 'periodYear' });
  const isRoot = !selectedParentId;
  const parentOptions = useMemo(
    () => (options?.parentActivities ?? []).filter((parent) => parent.assigneeUserPositionId === selectedAssigneeId),
    [options?.parentActivities, selectedAssigneeId],
  );
  const yearOptions = options?.periodYears ?? [];

  const loadOptions = useCallback(async (year: number) => {
    setIsLoadingOptions(true);
    try {
      const data = await kpiAdminV1Api.getManageOptions(year);
      setOptions(data);
      setLoadedYear(year);
      const fallbackYear = data.periodYears.includes(year) ? year : data.periodYears[0];
      if (fallbackYear && fallbackYear !== form.getValues('periodYear')) {
        form.setValue('periodYear', fallbackYear, { shouldValidate: false });
        form.setValue('corporateKpiIds', [], { shouldValidate: false });
        form.clearErrors('corporateKpiIds');
      }
    } catch (error: unknown) {
      setOptions({ assignees: [], parentActivities: [], indicators: [], periodYears: [] });
      setLoadedYear(year);
      toast.danger(error instanceof Error ? error.message : 'Gagal memuat opsi pengelolaan aktivitas.');
    } finally {
      setIsLoadingOptions(false);
    }
  }, [form]);

  useEffect(() => {
    void loadOptions(selectedYear);
  }, [loadOptions, selectedYear]);

  const handleSubmit = useCallback(async (values: CreateFormValues) => {
    setIsSubmitting(true);
    try {
      await kpiAdminV1Api.adminCreateActivity({
        assignedToUserPositionId: values.assignedToUserPositionId,
        parentId: values.parentId || undefined,
        corporateKpiIds: values.parentId ? undefined : values.corporateKpiIds,
        periodYear: values.parentId ? undefined : values.periodYear,
        periodMonth: values.parentId ? undefined : values.periodMonth,
        activityName: values.activityName.trim(),
        description: values.description.trim() || undefined,
        unit: values.unit.trim(),
        targetValue: Number(values.targetValue),
        reason: values.reason.trim(),
      });
      toast.success('Aktivitas berhasil dibuat.');
      onSuccess();
    } catch (error: unknown) {
      toast.danger(error instanceof Error ? error.message : 'Gagal membuat aktivitas.');
    } finally {
      setIsSubmitting(false);
    }
  }, [onSuccess]);

  const isLoadingPage = isLoadingOptions || options === null || loadedYear !== selectedYear;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem>KPI</BreadcrumbsItem>
        <BreadcrumbsItem href="/kpi/activities/all">Semua Aktivitas</BreadcrumbsItem>
        <BreadcrumbsItem>Buat Aktivitas</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center gap-3">
        <Button isIconOnly variant="tertiary" onPress={onBack} aria-label="Kembali">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Buat Aktivitas</h1>
      </div>

      {isLoadingPage ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="md" />
        </div>
      ) : (
        <Form
          validationBehavior="aria"
          onSubmit={(event) => { form.handleSubmit(handleSubmit)(event); }}
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-foreground">Informasi Dasar</h2>

            <Controller
              control={form.control}
              name="assignedToUserPositionId"
              render={({ field, fieldState }) => (
                <ComboBox
                  className="w-full"
                  variant="primary"
                  selectedKey={field.value || null}
                  onSelectionChange={(key) => {
                    field.onChange(key ? String(key) : '');
                    form.setValue('parentId', '', { shouldValidate: false });
                    form.setValue('corporateKpiIds', [], { shouldValidate: false });
                    form.clearErrors('corporateKpiIds');
                  }}
                  isRequired
                  isInvalid={fieldState.invalid}
                  isDisabled={isSubmitting}
                  allowsEmptyCollection
                  menuTrigger="input"
                  defaultFilter={contains}
                >
                  <Label>Penanggung Jawab</Label>
                  <ComboBox.InputGroup>
                    <Input variant="primary" placeholder="Pilih penanggung jawab" />
                    <ComboBox.Trigger />
                  </ComboBox.InputGroup>
                  <ComboBox.Popover>
                    <ListBox renderEmptyState={() => (
                      <EmptyState>{options.assignees.length ? 'Penanggung jawab tidak ditemukan' : 'Tidak ada data penanggung jawab'}</EmptyState>
                    )}>
                      {options.assignees.map((assignee) => (
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
              name="parentId"
              render={({ field, fieldState }) => (
                <ComboBox
                  className="w-full"
                  variant="primary"
                  selectedKey={field.value || null}
                  onSelectionChange={(key) => {
                    field.onChange(key ? String(key) : '');
                    form.setValue('corporateKpiIds', [], { shouldValidate: false });
                    form.clearErrors('corporateKpiIds');
                  }}
                  isInvalid={fieldState.invalid}
                  isDisabled={isSubmitting || !selectedAssigneeId}
                  allowsEmptyCollection
                  menuTrigger="input"
                  defaultFilter={contains}
                >
                  <Label>Aktivitas Induk</Label>
                  <ComboBox.InputGroup>
                    <Input variant="primary" placeholder="Pilih aktivitas induk" />
                    <ComboBox.Trigger />
                  </ComboBox.InputGroup>
                  <ComboBox.Popover>
                    <ListBox renderEmptyState={() => <EmptyState>Aktivitas induk tidak ditemukan</EmptyState>}>
                      <ListBox.Item id="" textValue="Tanpa induk">Tanpa induk</ListBox.Item>
                      {parentOptions.map((parent) => (
                        <ListBox.Item key={parent.id} id={parent.id} textValue={parent.activityName}>
                          {parent.activityName}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </ComboBox.Popover>
                  <FieldError>{fieldState.error?.message}</FieldError>
                </ComboBox>
              )}
            />

            {isRoot && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Controller
                    control={form.control}
                    name="periodYear"
                    render={({ field, fieldState }) => (
                      <Select
                        className="w-full"
                        variant="primary"
                        selectedKey={String(field.value)}
                        onSelectionChange={(key) => {
                          field.onChange(Number(key));
                          form.setValue('corporateKpiIds', [], { shouldValidate: false });
                          form.clearErrors('corporateKpiIds');
                        }}
                        isRequired
                        isInvalid={fieldState.invalid}
                        isDisabled={isSubmitting}
                      >
                        <Label>Tahun Periode</Label>
                        <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                        <Select.Popover>
                          <ListBox renderEmptyState={() => <EmptyState>Tidak ada periode KPI yang tersedia</EmptyState>}>
                            {yearOptions.map((year) => <ListBox.Item key={year} id={String(year)} textValue={String(year)}>{year}</ListBox.Item>)}
                          </ListBox>
                        </Select.Popover>
                        <FieldError>{fieldState.error?.message}</FieldError>
                      </Select>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="periodMonth"
                    render={({ field, fieldState }) => (
                      <Select
                        className="w-full"
                        variant="primary"
                        selectedKey={String(field.value)}
                        onSelectionChange={(key) => field.onChange(Number(key))}
                        isRequired
                        isInvalid={fieldState.invalid}
                        isDisabled={isSubmitting}
                      >
                        <Label>Bulan Periode</Label>
                        <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {MONTH_OPTIONS.map((month) => <ListBox.Item key={month.value} id={String(month.value)} textValue={month.label}>{month.label}</ListBox.Item>)}
                          </ListBox>
                        </Select.Popover>
                        <FieldError>{fieldState.error?.message}</FieldError>
                      </Select>
                    )}
                  />
                </div>

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
              </>
            )}

            <Controller
              control={form.control}
              name="activityName"
              render={({ field, fieldState }) => (
                <TextField isRequired validationBehavior="native" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                  <Label>Nama Aktivitas</Label>
                  <Input variant="primary" placeholder="Masukkan nama aktivitas" />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )}
            />
            <Controller
              control={form.control}
              name="description"
              render={({ field, fieldState }) => (
                <TextField validationBehavior="native" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                  <Label>Deskripsi</Label>
                  <TextArea variant="primary" placeholder="Masukkan deskripsi" rows={2} />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="targetValue"
                render={({ field, fieldState }) => (
                  <TextField isRequired validationBehavior="native" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                    <Label>Target</Label>
                    <Input variant="primary" placeholder="Masukkan target" type="number" />
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </TextField>
                )}
              />
              <Controller
                control={form.control}
                name="unit"
                render={({ field, fieldState }) => (
                  <TextField isRequired validationBehavior="native" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                    <Label>Satuan</Label>
                    <Input variant="primary" placeholder="Masukkan satuan" />
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </TextField>
                )}
              />
            </div>
            <Controller
              control={form.control}
              name="reason"
              render={({ field, fieldState }) => (
                <TextField isRequired validationBehavior="native" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                  <Label>Alasan</Label>
                  <TextArea variant="primary" placeholder="Masukkan alasan administratif" rows={2} />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onPress={onBack} isDisabled={isSubmitting}>Batal</Button>
            <Button type="submit" variant="primary" isDisabled={isSubmitting} isPending={isSubmitting}>
              <FloppyDisk className="h-4 w-4" />
              Simpan
            </Button>
          </div>
        </Form>
      )}
    </div>
  );
}
