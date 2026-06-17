'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { House, ArrowLeft, FloppyDisk } from '@phosphor-icons/react';
import {
  Button,
  TextField,
  Input,
  Label,
  FieldError,
  Breadcrumbs,
  BreadcrumbsItem,
  Select,
  ListBox,
  DatePicker,
  DateField,
  Calendar,
  TextArea,
  Surface,
  I18nProvider,
  toast,
} from '@heroui/react';
import { parseDate } from '@internationalized/date';

import { employeeApi } from '../services/employee-api';
import type { CoreUser, UserCreateRequest, UserUpdateRequest, PositionOption } from '../types';

const getFormSchema = (isEditMode: boolean) =>
  z.object({
    fullName: z.string().min(1, 'Nama lengkap wajib diisi'),
    birthDate: z.string().optional(),
    gender: z.string().optional(),
    phoneNumber: z.string().optional().refine((val) => !val || /^[0-9+\-\s()]*$/.test(val), {
      message: 'Nomor telepon hanya boleh berisi angka',
    }),
    email: z.string().email('Format email tidak valid'),
    address: z.string().optional(),
    nip: z.string().optional(),
    defaultPositionId: z.string().optional(),
    joinDate: isEditMode
      ? z.string().optional()
      : z.string().min(1, 'Tanggal bergabung wajib diisi'),
    password: isEditMode
      ? z.string().optional().or(z.literal(''))
      : z.string().min(6, 'Kata sandi minimal 6 karakter'),
  });

type FormValues = z.infer<ReturnType<typeof getFormSchema>>;

interface EmployeeFormProps {
  mode: 'create' | 'edit';
  initialData?: CoreUser | null;
  onSuccess: () => void;
}

function flattenPositions(tree: PositionOption[], prefix = ''): { id: string; label: string }[] {
  const result: { id: string; label: string }[] = [];
  for (const node of tree) {
    const indent = prefix ? `${prefix} › ` : '';
    result.push({ id: node.id, label: `${indent}${node.positionName}` });
    if (node.children?.length) result.push(...flattenPositions(node.children, `${indent}${node.positionName}`));
  }
  return result;
}

function DateFieldPicker({ label, value, onChange, isDisabled, isInvalid, errorMessage }: {
  label: string; value: string; onChange: (v: string) => void; isDisabled: boolean; isInvalid?: boolean; errorMessage?: string;
}) {
  return (
    <I18nProvider locale="id-ID">
      <DatePicker className="w-full" value={value ? parseDate(value) : null} onChange={(d) => onChange(d ? d.toString() : '')} isDisabled={isDisabled} isInvalid={isInvalid}>
        <Label>{label}</Label>
        <DateField.Group fullWidth>
          <DateField.Input>{(s) => <DateField.Segment segment={s} />}</DateField.Input>
          <DateField.Suffix><DatePicker.Trigger><DatePicker.TriggerIndicator /></DatePicker.Trigger></DateField.Suffix>
        </DateField.Group>
        {errorMessage && <FieldError>{errorMessage}</FieldError>}
        <DatePicker.Popover>
          <Calendar aria-label={`Pilih ${label.toLowerCase()}`}>
            <Calendar.Header>
              <Calendar.YearPickerTrigger><Calendar.YearPickerTriggerHeading /><Calendar.YearPickerTriggerIndicator /></Calendar.YearPickerTrigger>
              <Calendar.NavButton slot="previous" /><Calendar.NavButton slot="next" />
            </Calendar.Header>
            <Calendar.Grid>
              <Calendar.GridHeader>{(d) => <Calendar.HeaderCell>{d}</Calendar.HeaderCell>}</Calendar.GridHeader>
              <Calendar.GridBody>{(d) => <Calendar.Cell date={d} />}</Calendar.GridBody>
            </Calendar.Grid>
            <Calendar.YearPickerGrid><Calendar.YearPickerGridBody>{({ year }) => <Calendar.YearPickerCell year={year} />}</Calendar.YearPickerGridBody></Calendar.YearPickerGrid>
          </Calendar>
        </DatePicker.Popover>
      </DatePicker>
    </I18nProvider>
  );
}

export function EmployeeForm({ mode, initialData, onSuccess }: EmployeeFormProps) {
  const router = useRouter();
  const [positions, setPositions] = useState<PositionOption[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = mode === 'edit';

  const form = useForm<FormValues>({
    resolver: zodResolver(getFormSchema(isEditMode)),
    defaultValues: {
      fullName: '', birthDate: '', gender: '', phoneNumber: '',
      email: '', address: '', nip: '',
      defaultPositionId: undefined,
      joinDate: '', password: '',
    },
  });

  useEffect(() => {
    (async () => {
      try { setPositions(await employeeApi.getPositions()); } catch {} finally { setIsLoadingPositions(false); }
    })();
  }, []);

  useEffect(() => {
    if (initialData) {
      form.reset({
        fullName: initialData.fullName || '',
        birthDate: initialData.birthDate || '',
        gender: initialData.gender || '',
        phoneNumber: initialData.phoneNumber || '',
        email: initialData.email,
        address: initialData.address || '',
        nip: initialData.nip || '',
        defaultPositionId: initialData.primaryPosition?.positionId,
        joinDate: initialData.joinDate || '',
        password: '',
      });
    }
  }, [initialData, form]);

  const flatPositions = useMemo(() => flattenPositions(positions), [positions]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const base = {
        email: values.email, fullName: values.fullName,
        nip: values.nip || undefined, defaultPositionId: values.defaultPositionId,
        joinDate: values.joinDate, phoneNumber: values.phoneNumber || undefined,
        gender: values.gender || undefined, birthDate: values.birthDate || undefined,
        address: values.address || undefined,
      };
      if (isEditMode && initialData) {
        await employeeApi.updateUser(initialData.id, base as UserUpdateRequest);
        toast.success('Karyawan berhasil diperbarui');
      } else {
        await employeeApi.createUser({ ...base, password: values.password } as UserCreateRequest);
        toast.success('Karyawan berhasil ditambahkan');
      }
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      toast.danger(msg);
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem href="/hr">HR</BreadcrumbsItem>
        <BreadcrumbsItem href="/hr/employees">Karyawan</BreadcrumbsItem>
        <BreadcrumbsItem>{isEditMode ? 'Edit' : 'Tambah'}</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center gap-3">
        <Button isIconOnly variant="tertiary" onPress={() => router.push('/hr/employees')} aria-label="Kembali">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">
          {isEditMode ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}
        </h1>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">

        {/* ── INFORMASI PRIBADI ── */}
        <Surface variant="transparent" className="flex flex-col gap-4 rounded-3xl border p-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Informasi Pribadi</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller control={form.control} name="fullName" render={({ field, fieldState }) => (
              <TextField isRequired validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} isInvalid={!!fieldState.error} isDisabled={isSubmitting}>
                <Label>Nama Lengkap</Label>
                <Input placeholder="Masukkan nama lengkap" />
                {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
              </TextField>
            )} />
            <Controller control={form.control} name="gender" render={({ field }) => (
              <Select className="w-full" selectedKey={field.value || null} onSelectionChange={(k) => field.onChange(String(k || ''))} isDisabled={isSubmitting} placeholder="Pilih jenis kelamin">
                <Label>Jenis Kelamin</Label>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="L" textValue="Laki-laki">Laki-laki</ListBox.Item>
                    <ListBox.Item id="P" textValue="Perempuan">Perempuan</ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            )} />
            <Controller control={form.control} name="birthDate" render={({ field }) => (
              <DateFieldPicker label="Tanggal Lahir" value={field.value || ''} onChange={field.onChange} isDisabled={isSubmitting} />
            )} />
            <Controller control={form.control} name="phoneNumber" render={({ field, fieldState }) => (
              <TextField validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} isInvalid={!!fieldState.error} isDisabled={isSubmitting}>
                <Label>No. Telepon</Label>
                <Input placeholder="08xxxxxxxxxx" type="tel" />
                {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
              </TextField>
            )} />
          </div>
          <Controller control={form.control} name="email" render={({ field, fieldState }) => (
            <TextField isRequired validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} isInvalid={!!fieldState.error} isDisabled={isSubmitting}>
              <Label>Email</Label>
              <Input placeholder="contoh@perusahaan.com" type="email" />
              {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
            </TextField>
          )} />
          <Controller control={form.control} name="address" render={({ field, fieldState }) => (
            <TextField validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} isInvalid={!!fieldState.error} isDisabled={isSubmitting}>
              <Label>Alamat</Label>
              <TextArea placeholder="Masukkan alamat" rows={3} />
              {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
            </TextField>
          )} />
        </Surface>

        {/* ── DATA KEPEGAWAIAN ── */}
        <Surface variant="transparent" className="flex flex-col gap-4 rounded-3xl border p-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Data Kepegawaian</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller control={form.control} name="nip" render={({ field, fieldState }) => (
              <TextField validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} isInvalid={!!fieldState.error} isDisabled={isSubmitting}>
                <Label>NIP</Label>
                <Input placeholder="Masukkan NIP" />
                {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
              </TextField>
            )} />
            <Controller control={form.control} name="defaultPositionId" render={({ field, fieldState }) => (
              <Select className="w-full" selectedKey={field.value != null ? String(field.value) : null} onSelectionChange={(k) => field.onChange(k ? String(k) : undefined)} isInvalid={!!fieldState.error} isDisabled={isSubmitting || isLoadingPositions} placeholder="Pilih jabatan">
                <Label>Jabatan</Label>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {flatPositions.map((p) => <ListBox.Item key={p.id} id={String(p.id)} textValue={p.label}>{p.label}</ListBox.Item>)}
                  </ListBox>
                </Select.Popover>
              </Select>
            )} />
            <Controller control={form.control} name="joinDate" render={({ field, fieldState }) => (
              <DateFieldPicker label="Tanggal Bergabung" value={field.value || ''} onChange={field.onChange} isDisabled={isSubmitting} isInvalid={!!fieldState.error} errorMessage={fieldState.error?.message} />
            )} />
            {!isEditMode && (
              <Controller control={form.control} name="password" render={({ field, fieldState }) => (
                <TextField isRequired validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} isInvalid={!!fieldState.error} isDisabled={isSubmitting}>
                  <Label>Kata Sandi</Label>
                  <Input placeholder="Minimal 6 karakter" type="password" />
                  {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                </TextField>
              )} />
            )}
          </div>
        </Surface>

        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onPress={() => router.push('/hr/employees')} isDisabled={isSubmitting}>Batal</Button>
          <Button type="submit" variant="primary" isDisabled={isSubmitting} isPending={isSubmitting}>
            <FloppyDisk className="h-4 w-4" />
            {isEditMode ? 'Simpan Perubahan' : 'Simpan'}
          </Button>
        </div>
      </form>
    </div>
  );
}
