'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { House, ArrowLeft, FloppyDisk } from '@phosphor-icons/react';
import {
  Button, Form, TextField, Input, Label, FieldError,
  Breadcrumbs, BreadcrumbsItem,
  Select, ListBox, TextArea, ComboBox, Collection,
  Alert, Spinner,
} from '@heroui/react';

import type { OrganizationUnitResponse, CreateOrganizationUnitRequest, UpdateOrganizationUnitRequest } from '../types';
import { OrganizationUnitType, UNIT_TYPE_LABEL_ID } from '../types';
import { useOrgUnitFormData } from '../hooks/use-org-unit-form-data';
import { resolveCreateReturn, resolveEditReturn } from '../utils/org-unit-navigation-utils';

const formSchema = z.object({
  unitCode: z
    .string()
    .trim()
    .min(1, 'Kode unit wajib diisi')
    .max(50, 'Kode unit maksimal 50 karakter'),
  unitName: z
    .string()
    .trim()
    .min(1, 'Nama unit wajib diisi')
    .max(150, 'Nama unit maksimal 150 karakter'),
  unitType: z.string().min(1, 'Jenis unit wajib diisi'),
  parentId: z.string().nullable().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const UNIT_TYPE_OPTIONS = Object.values(OrganizationUnitType);

interface OrgUnitFormProps {
  mode: 'create' | 'edit';
  initialData?: OrganizationUnitResponse | null;
  onSuccess: (unitId: string) => void;
}

interface ParentOption {
  id: string;
  label: string;
  searchText: string;
}

/** Flatten the tree into selectable parent candidates (label = unit name only). */
function buildParentOptions(
  nodes: OrganizationUnitResponse[],
  excludeId: string | null,
): ParentOption[] {
  const result: ParentOption[] = [];
  for (const node of nodes) {
    const children = node.children ?? [];
    if (node.id !== excludeId) {
      result.push({
        id: node.id,
        label: node.unitName,
        searchText: `${node.unitCode} ${node.unitName}`.toLowerCase(),
      });
    }
    // Descendants of the edited unit are excluded too (would create a cycle).
    result.push(...buildParentOptions(children, excludeId));
  }
  return result;
}

export function OrgUnitForm({ mode, initialData, onSuccess }: OrgUnitFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = mode === 'edit';

  const { treeUnits, isLoadingData, submitCreate, submitUpdate } = useOrgUnitFormData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Origin marker: pushed by the calling page (list / detail). Deep links have none.
  const fromParam = searchParams.get('from');

  // Get parentId from query params (for "Tambah Unit Bawahan")
  const queryParentId = searchParams.get('parentId');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      unitCode: '',
      unitName: '',
      unitType: '',
      parentId: queryParentId || null,
      description: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        unitCode: initialData.unitCode,
        unitName: initialData.unitName,
        unitType: initialData.unitType,
        parentId: initialData.parentId ?? null,
        description: initialData.description ?? '',
      });
    }
  }, [initialData, form]);

  // Set parentId from query params on create mode (only if the option still exists)
  useEffect(() => {
    if (!isEditMode && queryParentId && treeUnits.length > 0) {
      const exists = treeUnits.some((n) => n.id === queryParentId);
      if (exists) form.setValue('parentId', queryParentId);
    }
  }, [isEditMode, queryParentId, treeUnits, form]);

  // Parent candidates: exclude the unit itself (edit) and all its descendants.
  const parentOptions = useMemo(
    () => buildParentOptions(treeUnits, isEditMode && initialData ? initialData.id : null),
    [treeUnits, isEditMode, initialData],
  );

  // ── ComboBox parent: RAC manages the input internally (selected text is the
  // option label; typing filters; clearing the input auto-resets the value via
  // react-stately, which fires onSelectionChange(null)). No controlled
  // inputValue — otherwise Backspace could never clear the field.
  const handleParentSelectionChange = useCallback((key: string | number | null) => {
    const parentId = key != null ? String(key) : null;
    form.setValue('parentId', parentId, { shouldDirty: true });
  }, [form]);

  const goBack = useCallback(() => {
    if (isEditMode && initialData) {
      const target = resolveEditReturn(fromParam, initialData.id);
      if (target === 'back') router.back();
      else router.replace(target.replace);
    } else {
      const target = resolveCreateReturn(fromParam);
      if (target === 'back') router.back();
      else router.replace(target.replace);
    }
  }, [isEditMode, initialData, fromParam, router]);

  const handleSubmit = async (values: FormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    if (isEditMode && initialData) {
      const payload: UpdateOrganizationUnitRequest = {
        unitCode: values.unitCode.trim(),
        unitName: values.unitName.trim(),
        unitType: values.unitType as OrganizationUnitType,
        parentId: values.parentId ?? null,
        description: values.description?.trim() || undefined,
      };
      const ok = await submitUpdate(initialData.id, payload);
      setIsSubmitting(false);
      if (ok) onSuccess(initialData.id);
      else setSubmitError('Gagal menyimpan perubahan unit organisasi');
    } else {
      const payload: CreateOrganizationUnitRequest = {
        unitCode: values.unitCode.trim(),
        unitName: values.unitName.trim(),
        unitType: values.unitType as OrganizationUnitType,
        parentId: values.parentId || undefined,
        description: values.description?.trim() || undefined,
      };
      const newId = await submitCreate(payload);
      setIsSubmitting(false);
      if (newId) onSuccess(newId);
      else setSubmitError('Gagal menambah unit organisasi');
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
        <BreadcrumbsItem href="/organization/organization-units">Unit Organisasi</BreadcrumbsItem>
        <BreadcrumbsItem>{isEditMode ? 'Edit' : 'Tambah'}</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center gap-3">
        <Button isIconOnly variant="tertiary" onPress={goBack} aria-label="Kembali" isDisabled={isSubmitting}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">
          {isEditMode ? 'Edit Unit Organisasi' : 'Tambah Unit Organisasi'}
        </h1>
      </div>

      <Form
        validationBehavior="aria"
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit(handleSubmit)(e);
        }}
        className="flex flex-col gap-6"
      >
          {/* ── INFORMASI DASAR ── */}
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-foreground">Informasi Dasar</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Controller
                control={form.control}
                name="unitCode"
                render={({ field, fieldState }) => (
                  <TextField isRequired validationBehavior="native" className="w-full"
                    name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref}
                    isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                    <Label>Kode Unit</Label>
                    <Input placeholder="Masukkan kode unit" />
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </TextField>
                )}
              />
              <Controller
                control={form.control}
                name="unitName"
                render={({ field, fieldState }) => (
                  <TextField isRequired validationBehavior="native" className="w-full"
                    name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref}
                    isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                    <Label>Nama Unit</Label>
                    <Input placeholder="Masukkan nama unit" />
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </TextField>
                )}
              />
              <Controller
                control={form.control}
                name="unitType"
                render={({ field, fieldState }) => (
                  <Select
                    className="w-full"
                    isRequired
                    selectedKey={field.value || null}
                    onSelectionChange={(k) => field.onChange(k ? String(k) : '')}
                    isDisabled={isSubmitting}
                    isInvalid={fieldState.invalid}
                    placeholder="Pilih jenis unit"
                  >
                    <Label>Jenis Unit</Label>
                    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {UNIT_TYPE_OPTIONS.map((type) => (
                          <ListBox.Item key={type} id={type} textValue={UNIT_TYPE_LABEL_ID[type]}>
                            {UNIT_TYPE_LABEL_ID[type]}
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </Select>
                )}
              />
              <Controller
                control={form.control}
                name="parentId"
                render={({ field, fieldState }) => (
                  <ComboBox
                    className="w-full"
                    selectedKey={field.value || null}
                    onSelectionChange={handleParentSelectionChange}
                    isDisabled={isSubmitting}
                    isInvalid={fieldState.invalid}
                    allowsEmptyCollection
                    menuTrigger="focus"
                    defaultFilter={(text, inputValue) => {
                      if (!inputValue) return true;
                      const q = inputValue.toLowerCase();
                      // Match by unit name (label) OR unit code — case-insensitive.
                      if (text.toLowerCase().includes(q)) return true;
                      const opt = parentOptions.find((p) => p.label === text);
                      return opt ? opt.searchText.includes(q) : false;
                    }}
                  >
                    <Label>Unit Induk</Label>
                    <ComboBox.InputGroup>
                      <Input placeholder="Pilih unit induk" />
                      <ComboBox.Trigger />
                    </ComboBox.InputGroup>
                    <ComboBox.Popover>
                      <ListBox
                        renderEmptyState={() => (
                          <div className="px-3 py-2 text-sm text-muted-foreground">Unit tidak ditemukan</div>
                        )}
                      >
                        <ListBox.Item key="__none__" id="__none__" textValue="Tanpa unit induk">
                          Tanpa unit induk
                        </ListBox.Item>
                        <Collection items={parentOptions}>
                          {(opt: ParentOption) => (
                            <ListBox.Item key={opt.id} id={opt.id} textValue={opt.label}>
                              {opt.label}
                            </ListBox.Item>
                          )}
                        </Collection>
                      </ListBox>
                    </ComboBox.Popover>
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </ComboBox>
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
                  <TextArea placeholder="Masukkan deskripsi unit" rows={2} />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )}
            />
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
