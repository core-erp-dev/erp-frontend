'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { House, ArrowLeft, Check } from '@phosphor-icons/react';
import {
  Button,
  TextField,
  Input,
  Label,
  FieldError,
  Breadcrumbs,
  BreadcrumbsItem,
  Spinner,
} from '@heroui/react';

import { useAuthStore } from '@/store/auth-store';
import { employeeApi } from '../services/employee-api';
import type { CoreUser, UserCreateRequest, UserUpdateRequest, PositionOption } from '../types';

const getFormSchema = (isEditMode: boolean) =>
  z.object({
    email: z.string().email('Format email tidak valid'),
    fullName: z.string().min(1, 'Nama lengkap wajib diisi'),
    nip: z.string().optional(),
    password: isEditMode
      ? z.string().optional().or(z.literal(''))
      : z.string().min(6, 'Kata sandi minimal 6 karakter'),
    defaultPositionId: z.number({ message: 'Jabatan wajib dipilih' }).min(1, 'Jabatan wajib dipilih'),
    isActive: z.boolean(),
  });

type FormValues = z.infer<ReturnType<typeof getFormSchema>>;

interface EmployeeFormProps {
  mode: 'create' | 'edit';
  initialData?: CoreUser | null;
  onSuccess: () => void;
}

/** Flatten nested position tree into a flat list with indent labels */
function flattenPositions(tree: PositionOption[], prefix = ''): { id: number; label: string }[] {
  const result: { id: number; label: string }[] = [];
  for (const node of tree) {
    const indent = prefix ? `${prefix} › ` : '';
    result.push({ id: node.id, label: `${indent}${node.positionName}` });
    if (node.children && node.children.length > 0) {
      result.push(...flattenPositions(node.children, `${indent}${node.positionName}`));
    }
  }
  return result;
}

export function EmployeeForm({ mode, initialData, onSuccess }: EmployeeFormProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [positions, setPositions] = useState<PositionOption[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditMode = mode === 'edit';
  const hasPerm = (perm: string) => (user?.permissions ?? []).includes(perm);

  const form = useForm<FormValues>({
    resolver: zodResolver(getFormSchema(isEditMode)),
    defaultValues: {
      email: '',
      fullName: '',
      nip: '',
      password: '',
      defaultPositionId: undefined as unknown as number,
      isActive: true,
    },
  });

  // Fetch positions on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await employeeApi.getPositions();
        setPositions(data);
      } catch {
        // fail silently
      } finally {
        setIsLoadingPositions(false);
      }
    })();
  }, []);

  // Populate form in edit mode
  useEffect(() => {
    if (initialData) {
      form.reset({
        email: initialData.email,
        fullName: initialData.fullName,
        nip: initialData.nip || '',
        password: '',
        defaultPositionId: initialData.primaryPosition?.positionId,
        isActive: initialData.isActive,
      });
    }
  }, [initialData, form]);

  const flatPositions = useMemo(() => flattenPositions(positions), [positions]);

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (isEditMode && initialData) {
        const payload: UserUpdateRequest = {
          email: values.email,
          fullName: values.fullName,
          nip: values.nip,
          isActive: values.isActive,
          defaultPositionId: values.defaultPositionId,
        };
        await employeeApi.updateUser(initialData.id, payload);
      } else {
        const payload: UserCreateRequest = {
          email: values.email,
          fullName: values.fullName,
          nip: values.nip,
          password: values.password,
          defaultPositionId: values.defaultPositionId,
        };
        await employeeApi.createUser(payload);
      }
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      {/* Breadcrumbs */}
      <Breadcrumbs>
        <BreadcrumbsItem href="/">
          <House className="h-4 w-4" />
        </BreadcrumbsItem>
        <BreadcrumbsItem href="/hr">HR</BreadcrumbsItem>
        <BreadcrumbsItem href="/hr/employees">Karyawan</BreadcrumbsItem>
        <BreadcrumbsItem>{isEditMode ? 'Edit' : 'Tambah'}</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center gap-3">
        <Button
          isIconOnly
          variant="tertiary"
          onPress={() => router.push('/hr/employees')}
          aria-label="Kembali"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">
          {isEditMode ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}
        </h1>
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-5">
        {/* Email */}
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <TextField
              isRequired
              validationBehavior="aria"
              className="w-full"
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              isInvalid={!!fieldState.error}
              isDisabled={isSubmitting}
            >
              <Label>Email</Label>
              <Input placeholder="contoh@perusahaan.com" type="email" autoComplete="email" />
              {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
            </TextField>
          )}
        />

        {/* Nama Lengkap */}
        <Controller
          control={form.control}
          name="fullName"
          render={({ field, fieldState }) => (
            <TextField
              isRequired
              validationBehavior="aria"
              className="w-full"
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              isInvalid={!!fieldState.error}
              isDisabled={isSubmitting}
            >
              <Label>Nama Lengkap</Label>
              <Input placeholder="Masukkan nama lengkap" autoComplete="name" />
              {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
            </TextField>
          )}
        />

        {/* NIP */}
        <Controller
          control={form.control}
          name="nip"
          render={({ field, fieldState }) => (
            <TextField
              validationBehavior="aria"
              className="w-full"
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              isInvalid={!!fieldState.error}
              isDisabled={isSubmitting}
            >
              <Label>NIP (Nomor Induk Pegawai)</Label>
              <Input placeholder="Masukkan NIP" />
              {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
            </TextField>
          )}
        />

        {/* Password (create only) */}
        {!isEditMode && (
          <Controller
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <TextField
                isRequired
                validationBehavior="aria"
                className="w-full"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                isInvalid={!!fieldState.error}
                isDisabled={isSubmitting}
              >
                <Label>Kata Sandi</Label>
                <Input placeholder="Minimal 6 karakter" type="password" autoComplete="new-password" />
                {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
              </TextField>
            )}
          />
        )}

        {/* Jabatan Dropdown */}
        <Controller
          control={form.control}
          name="defaultPositionId"
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground">
                Jabatan <span className="text-red-500">*</span>
              </Label>
              {isLoadingPositions ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Spinner size="sm" /> Memuat jabatan...
                </div>
              ) : (
                <select
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    field.onChange(val ? Number(val) : undefined);
                  }}
                  disabled={isSubmitting}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                    fieldState.error
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-gray-200 focus:border-[#006FEE]'
                  } bg-background outline-none`}
                >
                  <option value="">Pilih jabatan...</option>
                  {flatPositions.map((pos) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.label}
                    </option>
                  ))}
                </select>
              )}
              {fieldState.error && (
                <span className="text-xs text-red-500">{fieldState.error.message}</span>
              )}
            </div>
          )}
        />

        {/* Status Aktif (edit only) */}
        {isEditMode && hasPerm('employee:update') && (
          <Controller
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  disabled={isSubmitting}
                  className="h-4 w-4 rounded border-gray-300 text-[#006FEE] focus:ring-[#006FEE]"
                />
                <span className="text-sm text-foreground">Karyawan Aktif</span>
              </div>
            )}
          />
        )}

        {/* Error */}
        {submitError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="secondary"
            onPress={() => router.push('/hr/employees')}
            isDisabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            isDisabled={isSubmitting}
            isPending={isSubmitting}
          >
            <Check className="h-4 w-4" />
            {isEditMode ? 'Simpan Perubahan' : 'Tambah Karyawan'}
          </Button>
        </div>
      </form>
    </div>
  );
}
