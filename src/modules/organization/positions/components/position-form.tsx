'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { House, ArrowLeft, FloppyDisk } from '@phosphor-icons/react';
import {
  Button, Form, TextField, Input, Label, FieldError,
  Breadcrumbs, BreadcrumbsItem, Separator,
  ListBox, TextArea, ComboBox, Chip,
  EmptyState,
  Alert, Spinner,
} from '@heroui/react';

import { RoleMultiSelect } from '@/components/shared/role-multi-select';
import { organizationApi } from '@/modules/organization/positions/services/organization-api';
import { UNIT_TYPE_LABEL, UNIT_TYPE_CHIP_COLOR } from '@/modules/organization/organization-units/types';
import type { PositionTree, PositionRequest, PositionUpdateRequest } from '@/modules/organization/positions/types';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { usePositionFormData } from '../hooks/use-position-form-data';
import { resolveCreateReturn, resolveEditReturn } from '../utils/position-navigation-utils';

interface PositionFormProps {
  mode: 'create' | 'edit';
  initialData?: PositionTree | null;
  onSuccess: (newId: string | null) => void;
}

interface ParentOption {
  id: string;
  label: string;
  searchText: string;
}

/** Flatten the tree into parent candidates (label = position name only, no path).
 *  When `excludeId` is set (edit mode), the position itself and its whole
 *  subtree are skipped so no hierarchy cycle can be created. */
function buildParentOptions(nodes: PositionTree[], excludeId: string | null): ParentOption[] {
  const result: ParentOption[] = [];
  const walk = (list: PositionTree[]) => {
    for (const n of list) {
      if (excludeId && n.id === excludeId) continue; // skip self + descendants
      result.push({
        id: n.id,
        label: n.positionName,
        searchText: `${n.positionCode} ${n.positionName}`.toLowerCase(),
      });
      walk(Array.isArray(n.children) ? n.children : []);
    }
  };
  walk(Array.isArray(nodes) ? nodes : []);
  return result;
}

export function PositionForm({ mode, initialData, onSuccess }: PositionFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = mode === 'edit';
  const { hasPerm } = usePermission();

  const canEditOrgUnit = hasPerm(PERM.POSITION_MANAGE);

  const { allPositions, roles, orgUnits, isLoadingData, lookupError, canBindRoles, submitCreate, submitUpdate } =
    usePositionFormData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const formSchema = useMemo(() => z.object({
    positionCode: z.string().trim().min(1, 'Kode jabatan wajib diisi'),
    positionName: z.string().trim().min(1, 'Nama jabatan wajib diisi'),
    description: z.string().optional(),
    parentId: z.string().nullable().optional(),
    organizationUnitId: isEditMode
      ? z.string().optional()
      : z.string().trim().min(1, 'Unit organisasi wajib diisi'),
    roleIds: canBindRoles
      ? z.array(z.number()).min(1, 'Pilih minimal 1 role')
      : z.array(z.number()).optional(),
  }), [isEditMode, canBindRoles]);

  type FormValues = z.infer<typeof formSchema>;

  const queryParentId = searchParams.get('parentId');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      positionCode: '',
      positionName: '',
      description: '',
      parentId: queryParentId || null,
      organizationUnitId: '',
      roleIds: [],
    },
  });

  // Prefill edit mode once lookups finished loading (position tree, org units,
  // roles). Role ids are fetched only for role:manage actors.
  useEffect(() => {
    if (!isEditMode || !initialData || isLoadingData) return;
    let cancelled = false;
    (async () => {
      let roleIds: number[] = [];
      if (canBindRoles) {
        try {
          roleIds = (await organizationApi.getPositionRoles(initialData.id)).map((r) => r.id);
        } catch {
          roleIds = [];
        }
      }
      if (cancelled) return;
      form.reset({
        positionCode: initialData.positionCode,
        positionName: initialData.positionName,
        description: initialData.description ?? '',
        parentId: initialData.parentId,
        organizationUnitId: initialData.organizationUnit?.id ?? '',
        roleIds,
      });
    })();
    return () => { cancelled = true; };
  }, [isEditMode, initialData, isLoadingData, canBindRoles, form]);

  const parentOptions = useMemo(
    () => buildParentOptions(allPositions, isEditMode ? (initialData?.id ?? null) : null),
    [allPositions, isEditMode, initialData],
  );

  const goBack = useCallback(() => {
    const from = searchParams.get('from');
    const target = isEditMode
      ? resolveEditReturn(from, initialData?.id ?? '')
      : resolveCreateReturn(from);
    if (target === 'back') router.back();
    else router.replace(target.replace);
  }, [searchParams, isEditMode, initialData, router]);

  const handleSubmit = async (values: FormValues) => {
    if (isSubmitting) return; // double-submit guard
    setIsSubmitting(true);
    setSubmitError(null);

    if (isEditMode && initialData) {
      const payload: PositionUpdateRequest = {
        positionCode: values.positionCode,
        positionName: values.positionName,
        description: values.description || undefined,
        parentId: values.parentId,
        organizationUnitId: canEditOrgUnit ? (values.organizationUnitId || null) : undefined,
      };
      const ok = await submitUpdate(
        initialData.id,
        payload,
        canBindRoles ? (values.roleIds ?? []) : [],
        canBindRoles,
      );
      setIsSubmitting(false);
      if (ok) onSuccess(null);
      else setSubmitError('Gagal memperbarui jabatan');
    } else {
      const payload: PositionRequest = {
        positionCode: values.positionCode,
        positionName: values.positionName,
        description: values.description || undefined,
        parentId: values.parentId || undefined,
        // Create mode: schema requires a non-empty organizationUnitId.
        organizationUnitId: values.organizationUnitId!,
      };
      const newId = await submitCreate(payload, canBindRoles ? (values.roleIds ?? []) : []);
      setIsSubmitting(false);
      if (newId) onSuccess(newId);
      else setSubmitError('Gagal menambahkan jabatan');
    }
  };

  if (isLoadingData) {
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
        <BreadcrumbsItem href="/organization/positions">Struktur Jabatan</BreadcrumbsItem>
        <BreadcrumbsItem>{isEditMode ? 'Edit Jabatan' : 'Tambah Jabatan'}</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center gap-3">
        <Button isIconOnly variant="tertiary" onPress={goBack} aria-label="Kembali">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">
          {isEditMode ? 'Edit Jabatan' : 'Tambah Jabatan'}
        </h1>
      </div>

      {lookupError && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{lookupError}</Alert.Title>
          </Alert.Content>
        </Alert>
      )}

      <Form
        validationBehavior="aria"
        onSubmit={(e) => {
          form.handleSubmit(handleSubmit)(e);
        }}
        className="flex flex-col gap-6"
      >
        {/* ── INFORMASI DASAR ── */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">Informasi Dasar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="positionCode"
              render={({ field, fieldState }) => (
                <TextField isRequired validationBehavior="native" className="w-full"
                  name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref}
                  isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                  <Label>Kode Jabatan</Label>
                  <Input placeholder="Masukkan kode jabatan" />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )}
            />
            <Controller
              control={form.control}
              name="positionName"
              render={({ field, fieldState }) => (
                <TextField isRequired validationBehavior="native" className="w-full"
                  name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref}
                  isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                  <Label>Nama Jabatan</Label>
                  <Input placeholder="Masukkan nama jabatan" />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )}
            />
          </div>
          <Controller
            control={form.control}
            name="description"
            render={({ field, fieldState }) => (
              <TextField validationBehavior="native" className="w-full"
                name={field.name} value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref}
                isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                <Label>Deskripsi</Label>
                <TextArea placeholder="Masukkan deskripsi jabatan" rows={2} />
                <FieldError>{fieldState.error?.message}</FieldError>
              </TextField>
            )}
          />
        </div>

        <Separator />

        {/* ── STRUKTUR & AKSES ── */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">Struktur &amp; Akses</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Atasan — ComboBox (searchable, name-only label, no cycle) */}
            <Controller
              control={form.control}
              name="parentId"
              render={({ field, fieldState }) => (
                <ComboBox
                  className="w-full"
                  selectedKey={field.value || null}
                  onSelectionChange={(k) => field.onChange(k ? String(k) : null)}
                  isDisabled={isSubmitting}
                  isInvalid={fieldState.invalid}
                  allowsEmptyCollection
                  menuTrigger="focus"
                  defaultFilter={(text, inputValue) => {
                    if (!inputValue) return true;
                    const q = inputValue.toLowerCase();
                    const opt = parentOptions.find((p) => p.label === text);
                    return opt ? opt.searchText.includes(q) : text.toLowerCase().includes(q);
                  }}
                >
                  <Label>Atasan</Label>
                  <ComboBox.InputGroup>
                    <Input placeholder="Cari atasan" />
                    <ComboBox.Trigger />
                  </ComboBox.InputGroup>
                  <ComboBox.Popover>
                    <ListBox renderEmptyState={() => <EmptyState>Jabatan tidak ditemukan</EmptyState>}>
                      <ListBox.Item id="" textValue="Tanpa atasan">Tanpa atasan</ListBox.Item>
                      {parentOptions.map((p) => (
                        <ListBox.Item key={p.id} id={p.id} textValue={p.label}>{p.label}</ListBox.Item>
                      ))}
                    </ListBox>
                  </ComboBox.Popover>
                  <FieldError>{fieldState.error?.message}</FieldError>
                </ComboBox>
              )}
            />
            {/* Unit Organisasi — ComboBox (name-only label, search by code or name) */}
            {canEditOrgUnit && (
              <Controller
                control={form.control}
                name="organizationUnitId"
                render={({ field, fieldState }) => (
                  <ComboBox
                    className="w-full"
                    isRequired={!isEditMode}
                    selectedKey={field.value || null}
                    onSelectionChange={(key) => field.onChange(key ? String(key) : '')}
                    isInvalid={!!fieldState.error}
                    isDisabled={isSubmitting}
                    allowsEmptyCollection
                    menuTrigger="focus"
                    defaultFilter={(text, inputValue) => {
                      if (!inputValue) return true;
                      const q = inputValue.toLowerCase();
                      const unit = (orgUnits ?? []).find((u) => u.unitName === text);
                      return unit
                        ? `${unit.unitCode} ${unit.unitName}`.toLowerCase().includes(q)
                        : text.toLowerCase().includes(q);
                    }}
                  >
                    <Label>Unit Organisasi</Label>
                    <ComboBox.InputGroup>
                      <Input placeholder="Cari unit organisasi" />
                      <ComboBox.Trigger />
                    </ComboBox.InputGroup>
                    <ComboBox.Popover>
                      <ListBox renderEmptyState={() => <EmptyState>Tidak ada unit organisasi</EmptyState>}>
                        {(orgUnits ?? []).map((unit) => (
                          <ListBox.Item key={unit.id} id={unit.id} textValue={unit.unitName}>
                            <div className="flex items-center gap-2">
                              <span>{unit.unitName}</span>
                              <Chip size="sm" variant="soft" color={UNIT_TYPE_CHIP_COLOR[unit.unitType] ?? 'default'}>
                                {UNIT_TYPE_LABEL[unit.unitType] ?? unit.unitType}
                              </Chip>
                            </div>
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
            {/* Role — shared RoleMultiSelect (Autocomplete + chips). Rendered
                for every position:manage actor (Role is an official form
                lookup); only role:manage actors persist role bindings. */}
            {canEditOrgUnit && (
              <Controller
                control={form.control}
                name="roleIds"
                render={({ field, fieldState }) => (
                  <RoleMultiSelect
                    roles={roles}
                    value={field.value ?? []}
                    onChange={field.onChange}
                    label="Role"
                    placeholder="Cari role"
                    isRequired={canBindRoles}
                    isInvalid={!!fieldState.error}
                    isDisabled={isSubmitting}
                    errorMessage={fieldState.error?.message}
                  />
                )}
              />
            )}
          </div>
        </div>

        {/* Error */}
        {submitError && (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{submitError}</Alert.Title>
            </Alert.Content>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="secondary" onPress={goBack} isDisabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" variant="primary" isDisabled={isSubmitting} isPending={isSubmitting}>
            <FloppyDisk className="h-4 w-4" />
            {isEditMode ? 'Simpan Perubahan' : 'Simpan'}
          </Button>
        </div>
      </Form>
    </div>
  );
}
