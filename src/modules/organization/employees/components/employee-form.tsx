'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { House, ArrowLeft, FloppyDisk, Trash, Tray } from '@phosphor-icons/react';
import {
  Button,
  Form,
  TextField,
  Input,
  Label,
  FieldError,
  Breadcrumbs,
  BreadcrumbsItem,
  Select,
  ListBox,
  TextArea,
  Separator,
  ComboBox,
  Collection,
  EmptyState,
  Chip,
  Checkbox,
  Table,
  Spinner,
} from '@heroui/react';

import { RoleMultiSelect } from '@/components/shared/role-multi-select';
import { DateFieldPicker } from '@/components/shared/date-field-picker';
import { GENDER, GENDER_LABEL } from '@/constants/gender';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import type { CoreUser, UserCreateRequest, UserUpdateRequest, PositionOption } from '../types';
import { useEmployeeFormData } from '../hooks/use-employee-form-data';
import {
  addPendingPosition,
  removePendingPosition,
  setPendingPrimary,
  type PendingPosition,
} from '../utils/pending-position-utils';
import {
  buildPositionPayload,
  buildRolesUpdate,
  isPositionless as isPositionlessData,
} from '../utils/employee-mode-utils';
import { resolveEditReturn } from '../utils/employee-navigation-utils';

const getFormSchema = (isEditMode: boolean) =>
  z.object({
    fullName: z.string().min(1, 'Nama lengkap wajib diisi'),
    birthDate: z.string().optional(),
    gender: z.string().optional(),
    phoneNumber: z.string().optional().refine((val) => !val || /^[0-9+\-\s()]*$/.test(val), {
      message: 'Nomor telepon hanya boleh berisi angka',
    }),
    email: z
      .string()
      .min(1, 'Email wajib diisi')
      .email('Format email tidak valid'),
    address: z.string().optional(),
    nip: z.string().optional(),
    joinDate: z.string().min(1, 'Tanggal bergabung wajib diisi'),
    password: isEditMode
      ? z.string().optional().or(z.literal(''))
      : z.string().min(6, 'Password minimal 6 karakter'),
  });

type FormValues = z.infer<ReturnType<typeof getFormSchema>>;

interface EmployeeFormProps {
  mode: 'create' | 'edit';
  initialData?: CoreUser | null;
  /** Called after a successful submit; passes the created employee id in create mode. */
  onSuccess: (createdId?: string) => void;
}

export function EmployeeForm({ mode, initialData, onSuccess }: EmployeeFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = mode === 'edit';
  const { hasPerm } = usePermission();
  // The whole position/role section renders under user:manage — backend now
  // allows user:manage read-only lookups of positions and roles.
  const canAssignPositions = hasPerm(PERM.USER_MANAGE);

  const {
    positions,
    isLoadingPositions,
    roles,
    isLoadingRoles,
    submitCreate,
    submitUpdate,
    submitRoles,
  } = useEmployeeFormData();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Mode: positioned (positions) vs positionless (direct roles) ──
  // Lazy initial state — edit opens positionless when the employee has no
  // active position.
  const [isPositionless, setIsPositionless] = useState<boolean>(() =>
    isEditMode ? isPositionlessData(initialData) : false,
  );
  const [roleError, setRoleError] = useState<string | null>(null);

  // ── Pending position assignments (local until submit) ──
  const [pendingPositions, setPendingPositions] = useState<PendingPosition[]>(() => {
    if (isEditMode && initialData) {
      return (initialData.positions ?? [])
        .filter((p) => p.isActive)
        .map((up) => ({
          positionId: up.positionId,
          positionName: up.positionName,
          positionCode: up.positionCode,
          isPrimary: up.isPrimary,
          startDate: up.startDate,
        }));
    }
    return [];
  });
  const [assignSearch, setAssignSearch] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<PositionOption | null>(null);

  // ── Selected direct roles (positionless mode) ──
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>(() => {
    if (isEditMode && initialData) {
      return (initialData.roles ?? []).map((r) => r.id);
    }
    return [];
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(getFormSchema(isEditMode)),
    defaultValues: {
      fullName: '', birthDate: '', gender: '', phoneNumber: '',
      email: '', address: '', nip: '',
      joinDate: '', password: '',
    },
  });

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
        joinDate: initialData.joinDate || '',
        password: '',
      });
    }
  }, [initialData, form]);

  // ── Position selector helpers ──
  const flatPositionOptions = useMemo(() => {
    const result: PositionOption[] = [];
    const walk = (nodes: PositionOption[]) => {
      for (const node of nodes) {
        result.push(node);
        if (node.children?.length) walk(node.children);
      }
    };
    walk(positions);
    return result;
  }, [positions]);

  const departmentByPositionId = useMemo(() => {
    const map = new Map<string, string>();
    const walk = (nodes: PositionOption[]) => {
      for (const node of nodes) {
        if (node.organizationUnit?.unitName) map.set(node.id, node.organizationUnit.unitName);
        if (node.children?.length) walk(node.children);
      }
    };
    walk(positions);
    return map;
  }, [positions]);

  const selectedPositionIds = useMemo(
    () => new Set(pendingPositions.map((p) => p.positionId)),
    [pendingPositions],
  );

  // ── Role selector helpers (shared RoleMultiSelect) ──

  const handleAddPosition = useCallback(() => {
    if (!selectedPosition) return;
    setPendingPositions((prev) => addPendingPosition(prev, {
      positionId: selectedPosition.id,
      positionName: selectedPosition.positionName,
      positionCode: selectedPosition.positionCode,
      startDate: new Date().toISOString().split('T')[0],
    }));
    setSelectedPosition(null);
    setAssignSearch('');
  }, [selectedPosition]);

  const handleRemovePosition = useCallback((positionId: string) => {
    setPendingPositions((prev) => removePendingPosition(prev, positionId));
  }, []);

  const handleSetPrimary = useCallback((positionId: string) => {
    setPendingPositions((prev) => setPendingPrimary(prev, positionId));
  }, []);

  // Deterministic back with explicit fallback for deep links / refresh:
  // - edit opened from Detail (?from=detail) → back to the valid Detail entry;
  // - deep link / unknown origin → replace to the related Detail (edit) or the
  //   list (create) — never to Create or an arbitrary history entry.
  const goBack = useCallback(() => {
    if (isEditMode && initialData) {
      const decision = resolveEditReturn(searchParams.get('from'), initialData.id);
      if (decision === 'back') {
        router.back();
        return;
      }
      router.replace(decision.replace);
      return;
    }
    router.replace('/organization/employees');
  }, [router, initialData, isEditMode, searchParams]);

  const onSubmit = async (values: FormValues) => {
    setRoleError(null);

    // Positionless mode requires at least one direct role (backend rule for
    // users without an active position).
    if (isPositionless && selectedRoleIds.length === 0) {
      setRoleError('Pegawai tanpa posisi wajib memiliki minimal satu Role');
      return;
    }

    setIsSubmitting(true);
    const base: UserUpdateRequest = {
      email: values.email, fullName: values.fullName,
      nip: values.nip || undefined,
      joinDate: values.joinDate, phoneNumber: values.phoneNumber || undefined,
      gender: values.gender || undefined, birthDate: values.birthDate || undefined,
      address: values.address || undefined,
    };

    // Mutually exclusive payload: positioned → positions; positionless → [] + roles.
    base.positions = buildPositionPayload(
      isPositionless,
      pendingPositions.map((p) => ({
        positionId: p.positionId,
        isPrimary: p.isPrimary,
        startDate: p.startDate,
      })),
    );

    const rolesUpdate = buildRolesUpdate(isPositionless, isEditMode, selectedRoleIds);

    if (isEditMode && initialData) {
      const ok = await submitUpdate(initialData.id, base);
      if (!ok) { setIsSubmitting(false); return; }
      // Apply the direct-role change (drop for positioned mode, replace for
      // positionless mode). Backend resolves roles against the CURRENT active
      // positions, so the positions update must land first.
      if (rolesUpdate) {
        const rolesOk = await submitRoles(initialData.id, rolesUpdate.roleIds);
        if (!rolesOk) { setIsSubmitting(false); return; }
      }
      setIsSubmitting(false);
      onSuccess();
    } else {
      const created = await submitCreate({ ...base, password: values.password } as UserCreateRequest & { password: string });
      if (!created) { setIsSubmitting(false); return; }
      // Positionless create: assign direct roles right after creation.
      if (rolesUpdate) {
        const rolesOk = await submitRoles(created.id, rolesUpdate.roleIds);
        if (!rolesOk) { setIsSubmitting(false); return; }
      }
      setIsSubmitting(false);
      onSuccess(created.id);
    }
  };

  if (isLoadingPositions && !isPositionless) {
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
        <BreadcrumbsItem>Organisasi</BreadcrumbsItem>
        <BreadcrumbsItem href="/organization/employees">Pegawai</BreadcrumbsItem>
        <BreadcrumbsItem>{isEditMode ? 'Edit Pegawai' : 'Tambah Pegawai'}</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center gap-3">
        <Button isIconOnly variant="tertiary" onPress={goBack} aria-label="Kembali">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">
          {isEditMode ? 'Edit Pegawai' : 'Tambah Pegawai'}
        </h1>
      </div>

      <Form
        validationBehavior="aria"
        onSubmit={(e) => {
          form.handleSubmit(
            onSubmit,
            (errors) => console.log("FORM ERRORS", errors),
          )(e);
        }}
        className="flex flex-col gap-6"
      >

        {/* ── INFORMASI PRIBADI ── */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">Informasi Pribadi</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller control={form.control} name="fullName" render={({ field, fieldState }) => (
              <TextField isRequired validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                <Label>Nama Lengkap</Label>
                <Input placeholder="Masukkan nama lengkap" />
                <FieldError>{fieldState.error?.message}</FieldError>
              </TextField>
            )} />
            <Controller control={form.control} name="gender" render={({ field }) => (
              <Select className="w-full" selectedKey={field.value || null} onSelectionChange={(k) => field.onChange(String(k || ''))} isDisabled={isSubmitting} placeholder="Pilih jenis kelamin">
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
              <TextField validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                <Label>Nomor Telepon</Label>
                <Input placeholder="Masukkan nomor telepon" type="tel" />
                <FieldError>{fieldState.error?.message}</FieldError>
              </TextField>
            )} />
          </div>
          <Controller control={form.control} name="email" render={({ field, fieldState }) => (
            <TextField isRequired validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
              <Label>Email</Label>
              <Input placeholder="Masukkan email" type="email" />
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )} />
          <Controller control={form.control} name="address" render={({ field, fieldState }) => (
            <TextField validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
              <Label>Alamat</Label>
              <TextArea placeholder="Masukkan alamat" rows={3} />
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )} />
        </div>

        <Separator />

        {/* ── DATA KEPEGAWAIAN ── */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">Data Kepegawaian</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller control={form.control} name="nip" render={({ field, fieldState }) => (
              <TextField validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                <Label>NIP</Label>
                <Input placeholder="Masukkan NIP" />
                <FieldError>{fieldState.error?.message}</FieldError>
              </TextField>
            )} />
            <Controller control={form.control} name="joinDate" render={({ field, fieldState }) => (
              <DateFieldPicker label="Tanggal Bergabung" value={field.value || ''} onChange={field.onChange} isDisabled={isSubmitting} isRequired isInvalid={fieldState.invalid} errorMessage={fieldState.error?.message} />
            )} />
            {!isEditMode && (
              <Controller control={form.control} name="password" render={({ field, fieldState }) => (
                <TextField isRequired validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                  <Label>Password</Label>
                  <Input placeholder="Masukkan password" type="password" />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )} />
            )}
          </div>
        </div>

        {/* ── MODE: TANPA POSISI (checkbox) — separated from both sections ── */}
        {canAssignPositions && (
          <>
            <Separator />
            <Checkbox
              isSelected={isPositionless}
              onChange={(selected) => {
                setIsPositionless(selected);
                setRoleError(null);
              }}
              isDisabled={isSubmitting}
            >
              {/* Default content slot is vertical (flex-col) — make the label
                  sit on the same horizontal line, right of the checkbox. */}
              <Checkbox.Content className="flex-row items-center gap-2">
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                Tanpa posisi
              </Checkbox.Content>
            </Checkbox>
            <Separator />
          </>
        )}

        {/* ── POSISI (mode berposisi) ── */}
        {canAssignPositions && !isPositionless && (
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-foreground">Posisi</h2>

            {/* Pemilih posisi — HeroUI ComboBox + tombol Tambah inline */}
            <div className="flex items-start gap-2">
              <ComboBox
                aria-label="Cari posisi"
                className="flex-1"
                inputValue={assignSearch}
                onInputChange={setAssignSearch}
                onSelectionChange={(key) => {
                  const pos = flatPositionOptions.find((p) => p.id === key);
                  setSelectedPosition(pos ?? null);
                }}
                disabledKeys={[...selectedPositionIds]}
                isDisabled={isSubmitting}
                allowsEmptyCollection
                defaultFilter={(text, inputValue) => {
                  if (!inputValue) return true;
                  return text.toLowerCase().includes(inputValue.toLowerCase());
                }}
                menuTrigger="input"
              >
                <ComboBox.InputGroup>
                  <Input placeholder="Cari posisi" />
                  <ComboBox.Trigger />
                </ComboBox.InputGroup>
                <ComboBox.Popover>
                  <ListBox
                    renderEmptyState={() => (
                      <EmptyState>Posisi tidak ditemukan</EmptyState>
                    )}
                  >
                    {/* NOTE: items must go through Collection/children — react-stately
                        skips filtering entirely when items is passed to ComboBox
                        ("No default filter if items are controlled"). */}
                    <Collection items={flatPositionOptions}>
                      {(pos: PositionOption) => (
                        <ListBox.Item key={pos.id} id={pos.id} textValue={pos.positionName}>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{pos.positionName}</span>
                            <span className="text-xs text-muted-foreground">{pos.positionCode}</span>
                          </div>
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      )}
                    </Collection>
                  </ListBox>
                </ComboBox.Popover>
              </ComboBox>
              <Button
                variant="primary"
                onPress={handleAddPosition}
                isDisabled={!selectedPosition || isSubmitting}
              >
                Tambah
              </Button>
            </div>

            {/* Tabel posisi terpilih */}
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="Posisi Dipilih" className="min-w-[500px]">
                  <Table.Header>
                    <Table.Column id="name" isRowHeader>Nama Posisi</Table.Column>
                    <Table.Column id="code">Kode</Table.Column>
                    <Table.Column id="department">Departemen</Table.Column>
                    <Table.Column id="primary">Utama</Table.Column>
                    <Table.Column id="actions" aria-label="Aksi" className="text-center">{''}</Table.Column>
                  </Table.Header>
                  <Table.Body
                    renderEmptyState={() =>
                      pendingPositions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                          <Tray className="h-8 w-8" />
                          <span className="text-sm">Belum ada posisi ditambahkan</span>
                        </div>
                      ) : null
                    }
                  >
                    {pendingPositions.map((p) => (
                      <Table.Row key={p.positionId} id={p.positionId}>
                        <Table.Cell className="font-medium text-foreground">
                          {p.positionName}
                        </Table.Cell>
                        <Table.Cell className="text-muted-foreground">
                          {p.positionCode}
                        </Table.Cell>
                        <Table.Cell className="text-muted-foreground">
                          {departmentByPositionId.get(p.positionId) || '-'}
                        </Table.Cell>
                        <Table.Cell>
                          {p.isPrimary ? (
                            <Chip size="sm" variant="soft" color="accent">Utama</Chip>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="tertiary"
                              size="sm"
                              isDisabled={p.isPrimary || isSubmitting}
                              onPress={() => handleSetPrimary(p.positionId)}
                            >
                              Jadikan Utama
                            </Button>
                            <Button
                              isIconOnly
                              variant="danger-soft"
                              size="sm"
                              aria-label={`Hapus ${p.positionName}`}
                              isDisabled={isSubmitting}
                              onPress={() => handleRemovePosition(p.positionId)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </div>
        )}

        {/* ── ROLE (mode tanpa posisi) ── */}
        {canAssignPositions && isPositionless && (
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-foreground">Role</h2>

            {isLoadingRoles ? (
              <div className="flex h-16 items-center justify-center">
                <Spinner size="sm" />
              </div>
            ) : (
              /* Shared with Create/Edit Position (RoleMultiSelect) — Autocomplete
                 multiselect + chips + search filter + empty state. */
              <RoleMultiSelect
                roles={roles}
                value={selectedRoleIds}
                onChange={(ids) => {
                  setSelectedRoleIds(ids);
                  setRoleError(null);
                }}
                label="Role"
                placeholder="Cari Role"
                isRequired
                isInvalid={!!roleError}
                isDisabled={isSubmitting}
                errorMessage={roleError || undefined}
              />
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onPress={goBack} isDisabled={isSubmitting}>Batal</Button>
          <Button type="submit" variant="primary" isDisabled={isSubmitting} isPending={isSubmitting}>
            <FloppyDisk className="h-4 w-4" />
            {isEditMode ? 'Simpan Perubahan' : 'Simpan'}
          </Button>
        </div>
      </Form>
    </div>
  );
}
