'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { House, ArrowLeft, FloppyDisk, Briefcase, X, Plus } from '@phosphor-icons/react';
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
  TextArea,
  Surface,
  Spinner,
  SearchField,
  toast,
} from '@heroui/react';

import { DateFieldPicker } from '@/components/shared/date-field-picker';
import { GENDER, GENDER_LABEL } from '@/constants/gender';
import { employeeApi } from '../services/employee-api';
import type { CoreUser, UserCreateRequest, UserUpdateRequest, PositionOption, UserPositionResponse } from '../types';
import { useDebounce } from '@/hooks/use-debounce';

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
      try { setPositions(await employeeApi.getPositions()); } catch { /* positions fetch failed — dropdown will be empty */ } finally { setIsLoadingPositions(false); }
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

  const NIL_UUID = '00000000-0000-0000-0000-000000000000';
  const flatPositions = useMemo(() => flattenPositions(positions), [positions]);

  // ── Multi-position: secondary positions (edit mode only) ──
  const [secondaryPositions, setSecondaryPositions] = useState<UserPositionResponse[]>([]);
  const [isAssignExpanded, setIsAssignExpanded] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignResults, setAssignResults] = useState<PositionOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const debouncedAssignSearch = useDebounce(assignSearch, 400);

  // Load user positions on mount (edit mode)
  useEffect(() => {
    if (isEditMode && initialData) {
      employeeApi.getUserPositions(initialData.id).then(setSecondaryPositions).catch(() => {});
    }
  }, [isEditMode, initialData]);

  // Debounced position search for inline assign
  useEffect(() => {
    if (!debouncedAssignSearch.trim()) { setAssignResults([]); return; }
    let cancelled = false;
    setIsSearching(true);
    // Use the already-loaded position tree for instant search
    const q = debouncedAssignSearch.toLowerCase();
    const filtered = positions.filter(p => p.positionName.toLowerCase().includes(q) || p.positionCode.toLowerCase().includes(q)).slice(0, 10);
    if (!cancelled) { setAssignResults(filtered); setIsSearching(false); }
    return () => { cancelled = true; };
  }, [debouncedAssignSearch, positions]);

  const handleAssignSecondary = async (positionId: string) => {
    if (!initialData) return;
    setIsAssigning(true);
    try {
      const result = await employeeApi.assignUserToPosition({
        userId: initialData.id,
        positionId,
        startDate: new Date().toISOString().split('T')[0],
        isPrimary: false,
      });
      setSecondaryPositions(prev => [...prev, result]);
      setIsAssignExpanded(false);
      setAssignSearch('');
      setAssignResults([]);
      toast.success('Jabatan rangkap berhasil ditambahkan');
    } catch (err: unknown) {
      toast.danger(err instanceof Error ? err.message : 'Gagal menambah jabatan');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveSecondary = async (up: UserPositionResponse) => {
    try {
      await employeeApi.deactivateUserPosition(up.id);
      setSecondaryPositions(prev => prev.filter(p => p.id !== up.id));
      toast.success('Jabatan rangkap dilepas');
    } catch (err: unknown) {
      toast.danger(err instanceof Error ? err.message : 'Gagal melepas jabatan');
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const base = {
        email: values.email, fullName: values.fullName,
        nip: values.nip || undefined, defaultPositionId: values.defaultPositionId || null,
        joinDate: values.joinDate, phoneNumber: values.phoneNumber || undefined,
        gender: values.gender || undefined, birthDate: values.birthDate || undefined,
        address: values.address || undefined,
      };
      if (isEditMode && initialData) {
        const updateData = base as UserUpdateRequest;
        await employeeApi.updateUser(initialData.id, updateData);
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
  if (isLoadingPositions) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }
  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem href="/hr">HR</BreadcrumbsItem>
        <BreadcrumbsItem href="/hr/organization/employees">Karyawan</BreadcrumbsItem>
        <BreadcrumbsItem>{isEditMode ? 'Edit' : 'Tambah'}</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center gap-3">
        <Button isIconOnly variant="tertiary" onPress={() => router.back()} aria-label="Kembali">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">
          {isEditMode ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}
        </h1>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">

        {/* ── INFORMASI PRIBADI ── */}
        <Surface className="flex flex-col gap-4 rounded-3xl p-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Informasi Pribadi</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller control={form.control} name="fullName" render={({ field, fieldState }) => (
              <TextField isRequired validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} isInvalid={!!fieldState.error} isDisabled={isSubmitting}>
                <Label>Nama Lengkap</Label>
                <Input variant="secondary" placeholder="Masukkan nama lengkap" />
                {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
              </TextField>
            )} />
            <Controller control={form.control} name="gender" render={({ field }) => (
              <Select variant="secondary" className="w-full" selectedKey={field.value || null} onSelectionChange={(k) => field.onChange(String(k || ''))} isDisabled={isSubmitting} placeholder="Pilih jenis kelamin">
                <Label>Jenis Kelamin</Label>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id={GENDER.MALE} textValue={GENDER_LABEL[GENDER.MALE]}>{GENDER_LABEL[GENDER.MALE]}</ListBox.Item>
                    <ListBox.Item id={GENDER.FEMALE} textValue={GENDER_LABEL[GENDER.FEMALE]}>{GENDER_LABEL[GENDER.FEMALE]}</ListBox.Item>
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
                <Input variant="secondary" placeholder="08xxxxxxxxxx" type="tel" />
                {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
              </TextField>
            )} />
          </div>
          <Controller control={form.control} name="email" render={({ field, fieldState }) => (
            <TextField isRequired validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} isInvalid={!!fieldState.error} isDisabled={isSubmitting}>
              <Label>Email</Label>
              <Input variant="secondary" placeholder="contoh@perusahaan.com" type="email" />
              {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
            </TextField>
          )} />
          <Controller control={form.control} name="address" render={({ field, fieldState }) => (
            <TextField validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} isInvalid={!!fieldState.error} isDisabled={isSubmitting}>
              <Label>Alamat</Label>
              <TextArea variant="secondary" placeholder="Masukkan alamat" rows={3} />
              {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
            </TextField>
          )} />
        </Surface>

        {/* ── DATA KEPEGAWAIAN ── */}
        <Surface className="flex flex-col gap-4 rounded-3xl p-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Data Kepegawaian</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller control={form.control} name="nip" render={({ field, fieldState }) => (
              <TextField validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} isInvalid={!!fieldState.error} isDisabled={isSubmitting}>
                <Label>NIP</Label>
                <Input variant="secondary" placeholder="Masukkan NIP" />
                {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
              </TextField>
            )} />
            <Controller control={form.control} name="defaultPositionId" render={({ field }) => {
              const selectedKey = field.value || NIL_UUID;
              const handleChange = (k: React.Key | null) => {
                field.onChange(k === NIL_UUID ? undefined : String(k));
              };
              return (
              <Select key={selectedKey} variant="secondary" className="w-full" selectedKey={selectedKey} onSelectionChange={handleChange} isDisabled={isSubmitting || isLoadingPositions} placeholder="Pilih jabatan">
                <Label>Jabatan</Label>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item key={NIL_UUID} id={NIL_UUID} textValue="Tanpa Jabatan">Tanpa Jabatan</ListBox.Item>
                    {flatPositions.map((p) => <ListBox.Item key={p.id} id={String(p.id)} textValue={p.label}>{p.label}</ListBox.Item>)}
                  </ListBox>
                </Select.Popover>
              </Select>
              );
            }} />
            <Controller control={form.control} name="joinDate" render={({ field, fieldState }) => (
              <DateFieldPicker label="Tanggal Bergabung" value={field.value || ''} onChange={field.onChange} isDisabled={isSubmitting} isRequired={!isEditMode} isInvalid={!!fieldState.error} errorMessage={fieldState.error?.message} />
            )} />
            {!isEditMode && (
              <Controller control={form.control} name="password" render={({ field, fieldState }) => (
                <TextField isRequired validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} isInvalid={!!fieldState.error} isDisabled={isSubmitting}>
                  <Label>Kata Sandi</Label>
                  <Input variant="secondary" placeholder="Minimal 6 karakter" type="password" />
                  {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                </TextField>
              )} />
            )}
          </div>
        </Surface>

        {/* ── JABATAN RANGKAP (edit mode only) ── */}
        {isEditMode && (
          <Surface className="flex flex-col gap-4 rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Jabatan Rangkap</h2>
              <Button
                variant={isAssignExpanded ? 'secondary' : 'primary'}
                size="sm"
                onPress={() => { setIsAssignExpanded(!isAssignExpanded); setAssignSearch(''); setAssignResults([]); }}
                isDisabled={isSubmitting || isAssigning}
              >
                {isAssignExpanded ? <><X className="h-4 w-4" />Batal</> : <><Plus className="h-4 w-4" />Tambah Rangkap</>}
              </Button>
            </div>

            {/* Inline assign */}
            {isAssignExpanded && (
              <div className="space-y-2">
                <SearchField value={assignSearch} onChange={setAssignSearch} variant="secondary" autoFocus isDisabled={isAssigning}>
                  <SearchField.Group>
                    <SearchField.SearchIcon />
                    <SearchField.Input placeholder="Cari jabatan..." />
                    <SearchField.ClearButton />
                  </SearchField.Group>
                </SearchField>
                {isSearching ? (
                  <div className="flex justify-center py-2"><Spinner size="sm" /></div>
                ) : assignResults.length > 0 ? (
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {assignResults
                      .filter(pos => !secondaryPositions.some(up => up.positionId === pos.id))
                      .map(pos => (
                        <Button
                          key={pos.id}
                          variant="ghost"
                          className="w-full justify-between rounded-xl bg-surface-secondary px-4 py-2.5 text-left text-sm h-auto"
                          isDisabled={isAssigning}
                          onPress={() => handleAssignSecondary(pos.id)}
                        >
                          <span>
                            <span className="font-medium text-foreground">{pos.positionName}</span>
                            <span className="ml-2 text-xs text-gray-400">{pos.positionCode}</span>
                          </span>
                          <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </Button>
                      ))}
                  </div>
                ) : assignSearch.trim() ? (
                  <p className="py-2 text-center text-sm text-gray-400">Tidak ada hasil</p>
                ) : null}
              </div>
            )}

            {/* Existing secondary positions */}
            {(() => {
              const nonPrimary = secondaryPositions.filter(p => !p.isPrimary && p.isActive);
              if (nonPrimary.length === 0 && !isAssignExpanded) {
                return <p className="text-sm text-gray-400">Tidak ada jabatan rangkap</p>;
              }
              return (
                <div className="space-y-2">
                  {nonPrimary.map(up => (
                    <div key={up.id} className="flex items-center justify-between rounded-xl bg-surface-secondary px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Briefcase className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <span className="font-medium text-foreground">{up.positionName}</span>
                          <span className="ml-2 text-xs text-gray-400">{up.positionCode}</span>
                        </div>
                      </div>
                      <Button
                        isIconOnly
                        variant="danger-soft"
                        size="sm"
                        aria-label={`Lepas ${up.positionName}`}
                        isDisabled={isSubmitting || isAssigning}
                        onPress={() => handleRemoveSecondary(up)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Surface>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onPress={() => router.back()} isDisabled={isSubmitting}>Batal</Button>
          <Button type="submit" variant="primary" isDisabled={isSubmitting} isPending={isSubmitting}>
            <FloppyDisk className="h-4 w-4" />
            {isEditMode ? 'Simpan Perubahan' : 'Simpan'}
          </Button>
        </div>
      </form>
    </div>
  );
}
