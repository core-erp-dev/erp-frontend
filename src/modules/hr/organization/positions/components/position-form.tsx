'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Key } from '@heroui/react';
import { House, ArrowLeft, FloppyDisk } from '@phosphor-icons/react';
import {
  Button, TextField, Input, Label, FieldError,
  Breadcrumbs, BreadcrumbsItem, Surface,
  Select, ListBox, TextArea,
  Autocomplete, EmptyState, SearchField, Tag, TagGroup, useFilter,
  Alert, Spinner,
} from '@heroui/react';

import { organizationApi } from '@/modules/hr/organization/positions/services/organization-api';
import { roleApi } from '@/modules/hr/settings/services/role-api';
import type { PositionTree, PositionRequest, PositionUpdateRequest } from '@/modules/hr/organization/positions/types';
import type { RoleResponse } from '@/modules/hr/organization/employees/types';

const formSchema = z.object({
  positionCode: z.string().min(1, 'Kode jabatan wajib diisi'),
  positionName: z.string().min(1, 'Nama jabatan wajib diisi'),
  description: z.string().optional(),
  parentId: z.string().nullable().optional(),
  roleIds: z.array(z.number()).min(1, 'Pilih minimal 1 role'),
});

type FormValues = z.infer<typeof formSchema>;

interface PositionFormProps {
  mode: 'create' | 'edit';
  initialData?: PositionTree | null;
  onSuccess: () => void;
}

export function PositionForm({ mode, initialData, onSuccess }: PositionFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = mode === 'edit';

  const [allPositions, setAllPositions] = useState<PositionTree[]>([]);
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { contains } = useFilter({ sensitivity: 'base' });

  // Get parentId from query params (for "Tambah Bawahan")
  const queryParentId = searchParams.get('parentId');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      positionCode: '',
      positionName: '',
      description: '',
      parentId: queryParentId || null,
      roleIds: [],
    },
  });

  useEffect(() => {
    (async () => {
      try {
        const [tree, rolesList] = await Promise.all([
          organizationApi.fetchPositionTree(),
          roleApi.getRoles(),
        ]);
        setAllPositions(tree);
        setRoles(rolesList);
      } catch {
        // fail silently
      } finally {
        setIsLoadingData(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (initialData && roles.length > 0) {
      organizationApi.getPositionRoles(initialData.id).then((posRoles) => {
        form.reset({
          positionCode: initialData.positionCode,
          positionName: initialData.positionName,
          description: initialData.description ?? '',
          parentId: initialData.parentId,
          roleIds: posRoles.map((r) => r.id),
        });
      });
    }
  }, [initialData, roles, form]);

  // Set parentId from query params on create mode
  useEffect(() => {
    if (!isEditMode && queryParentId && allPositions.length > 0) {
      form.setValue('parentId', queryParentId);
    }
  }, [isEditMode, queryParentId, allPositions, form]);

  const flatParents = useMemo(() => {
    const result: { id: string; label: string }[] = [];
    const walk = (nodes: PositionTree[], prefix = '') => {
      for (const n of nodes) {
        if (isEditMode && initialData && n.id === initialData.id) continue;
        result.push({ id: n.id, label: `${prefix}${n.positionName}` });
        if (n.children.length > 0) walk(n.children, `${prefix}${n.positionName} › `);
      }
    };
    walk(allPositions);
    return result;
  }, [allPositions, isEditMode, initialData]);

  // Sort roles: selected first, then unselected
  const roleIds = form.watch('roleIds');
  const sortedRoles = useMemo(() => {
    const selectedIds = new Set(roleIds);
    return [...roles].sort((a, b) => {
      const aSelected = selectedIds.has(a.id) ? 0 : 1;
      const bSelected = selectedIds.has(b.id) ? 0 : 1;
      return aSelected - bSelected;
    });
  }, [roles, roleIds]);

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (isEditMode && initialData) {
        const payload: PositionUpdateRequest = {
          positionCode: values.positionCode,
          positionName: values.positionName,
          description: values.description || undefined,
          parentId: values.parentId,
        };
        await organizationApi.updatePosition(initialData.id, payload);

        const currentRoles = await organizationApi.getPositionRoles(initialData.id);
        const currentIds = currentRoles.map((r) => r.id);
        const toAdd = values.roleIds.filter((id) => !currentIds.includes(id));
        const toRemove = currentIds.filter((id) => !values.roleIds.includes(id));
        for (const roleId of toAdd) await organizationApi.assignRoleToPosition(initialData.id, roleId);
        for (const roleId of toRemove) await organizationApi.removeRoleFromPosition(initialData.id, roleId);
      } else {
        const payload: PositionRequest = {
          positionCode: values.positionCode,
          positionName: values.positionName,
          description: values.description || undefined,
          parentId: values.parentId || undefined,
        };
        const newPos = await organizationApi.createPosition(payload);
        for (const roleId of values.roleIds) await organizationApi.assignRoleToPosition(newPos.id, roleId);
      }
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
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
        <BreadcrumbsItem href="/hr">HR</BreadcrumbsItem>
        <BreadcrumbsItem href="/hr/organization/positions">Jabatan</BreadcrumbsItem>
        <BreadcrumbsItem>{isEditMode ? 'Edit' : 'Tambah'}</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center gap-3">
        <Button isIconOnly variant="tertiary" onPress={() => router.back()} aria-label="Kembali">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">
          {isEditMode ? 'Edit Jabatan' : 'Tambah Jabatan Baru'}
        </h1>
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-6">

          {/* ── INFORMASI DASAR ── */}
          <Surface className="flex flex-col gap-4 rounded-3xl p-6">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Informasi Dasar</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Controller
                control={form.control}
                name="positionCode"
                render={({ field, fieldState }) => (
                  <TextField isRequired validationBehavior="aria" className="w-full"
                    name={field.name} value={field.value} onChange={field.onChange}
                    isInvalid={!!fieldState.error} isDisabled={isSubmitting}>
                    <Label>Kode Jabatan</Label>
                    <Input variant="secondary" placeholder="Contoh: MGR-HRD-001" />
                    {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                  </TextField>
                )}
              />
              <Controller
                control={form.control}
                name="positionName"
                render={({ field, fieldState }) => (
                  <TextField isRequired validationBehavior="aria" className="w-full"
                    name={field.name} value={field.value} onChange={field.onChange}
                    isInvalid={!!fieldState.error} isDisabled={isSubmitting}>
                    <Label>Nama Jabatan</Label>
                    <Input variant="secondary" placeholder="Contoh: Manager HRD" />
                    {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                  </TextField>
                )}
              />
            </div>
            <Controller
              control={form.control}
              name="description"
              render={({ field, fieldState }) => (
                <TextField validationBehavior="aria" className="w-full"
                  name={field.name} value={field.value ?? ''} onChange={field.onChange}
                  isInvalid={!!fieldState.error} isDisabled={isSubmitting}>
                  <Label>Deskripsi</Label>
                  <TextArea variant="secondary" placeholder="Deskripsi singkat jabatan" rows={2} />
                  {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                </TextField>
              )}
            />
          </Surface>

          {/* ── STRUKTUR & AKSES ── */}
          <Surface className="flex flex-col gap-4 rounded-3xl p-6">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Struktur & Akses</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Atasan — HeroUI Select */}
              <Controller
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <Select
                    variant="secondary"
                    className="w-full"
                    selectedKey={field.value || null}
                    onSelectionChange={(k) => field.onChange(k ? String(k) : null)}
                    isDisabled={isSubmitting}
                    placeholder="Tanpa atasan"
                  >
                    <Label>Atasan</Label>
                    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item id="" textValue="Tanpa atasan">Tanpa atasan</ListBox.Item>
                        {flatParents.map((p) => (
                          <ListBox.Item key={p.id} id={p.id} textValue={p.label}>{p.label}</ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                )}
              />
              {/* Role — Autocomplete Multiselect + Search */}
              <Controller
                control={form.control}
                name="roleIds"
                render={({ field, fieldState }) => {
                  const selectedKeys = (field.value ?? []).map(String);
                  const onRemoveTags = (keys: Set<Key>) => {
                    const removeSet = new Set(Array.from(keys).map(Number));
                    field.onChange((field.value ?? []).filter((id) => !removeSet.has(id)));
                  };

                  return (
                    <Autocomplete
                      variant="secondary"
                      className="w-full"
                      placeholder="Pilih role"
                      selectionMode="multiple"
                      isRequired
                      value={selectedKeys}
                      onChange={(keys) => {
                        const arr = Array.isArray(keys) ? keys : keys != null ? [keys] : [];
                        field.onChange(arr.map(Number));
                      }}
                      isInvalid={!!fieldState.error}
                      isDisabled={isSubmitting}
                    >
                      <Label>Role</Label>
                      <Autocomplete.Trigger>
                        <Autocomplete.Value>
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {({ defaultChildren, isPlaceholder, state }: any) => {
                            if (isPlaceholder || state.selectedItems.length === 0) {
                              return defaultChildren;
                            }
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            const selectedItemsKeys = state.selectedItems.map((item: any) => item.key);
                            return (
                              <TagGroup size="sm" onRemove={onRemoveTags}>
                                <TagGroup.List>
                                  {selectedItemsKeys.map((key: Key) => {
                                    const role = roles.find((r) => String(r.id) === String(key));
                                    if (!role) return null;
                                    return (
                                      <Tag key={role.id} id={String(role.id)}>
                                        {role.roleCode}
                                      </Tag>
                                    );
                                  })}
                                </TagGroup.List>
                              </TagGroup>
                            );
                          }}
                        </Autocomplete.Value>
                        <Autocomplete.ClearButton />
                        <Autocomplete.Indicator />
                      </Autocomplete.Trigger>
                      {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                      <Autocomplete.Popover>
                        <Autocomplete.Filter filter={contains}>
                          <SearchField autoFocus name="search" variant="secondary">
                            <SearchField.Group>
                              <SearchField.SearchIcon />
                              <SearchField.Input placeholder="Cari role..." />
                              <SearchField.ClearButton />
                            </SearchField.Group>
                          </SearchField>
                          <ListBox renderEmptyState={() => <EmptyState>Role tidak ditemukan</EmptyState>}>
                            {sortedRoles.map((role) => (
                              <ListBox.Item key={role.id} id={String(role.id)} textValue={role.roleCode}>
                                <div className="flex flex-col">
                                  <span>{role.roleCode}</span>
                                  {role.description && (
                                    <span className="text-xs text-muted-foreground">{role.description}</span>
                                  )}
                                </div>
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Autocomplete.Filter>
                      </Autocomplete.Popover>
                    </Autocomplete>
                  );
                }}
              />
            </div>
          </Surface>

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
            <Button variant="secondary" onPress={() => router.back()} isDisabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isDisabled={isSubmitting} isPending={isSubmitting}>
              <FloppyDisk className="h-4 w-4" />
              Simpan
            </Button>
          </div>
        </form>
    </div>
  );
}
