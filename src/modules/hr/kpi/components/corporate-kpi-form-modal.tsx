'use client';

import React, { useEffect } from 'react';
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
  Select,
  ListBox,
} from '@heroui/react';
import type {
  CorporateKpiResponse,
  CreateCorporateKpiRequest,
  UpdateCorporateKpiRequest,
} from '../types';

const getFormSchema = (isEditMode: boolean) =>
  z.object({
    indicatorCode: z.string().min(1, 'Kode indikator wajib diisi').max(50, 'Kode indikator maksimal 50 karakter'),
    indicatorName: z.string().min(1, 'Nama indikator wajib diisi').max(500, 'Nama indikator maksimal 500 karakter'),
    weight: z.number().min(0, 'Bobot tidak boleh negatif').max(100, 'Bobot tidak boleh melebihi 100%').nullable().optional(),
    businessTarget: z.number().min(0, 'Target tidak boleh negatif').nullable().optional(),
    parentId: z.string().nullable().optional(),
    periodYear: z.number().min(2020, 'Tahun tidak valid').max(2100, 'Tahun tidak valid'),
  });

type FormValues = z.infer<ReturnType<typeof getFormSchema>>;

interface CorporateKpiFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCorporateKpiRequest | UpdateCorporateKpiRequest) => Promise<void>;
  mode: 'create' | 'edit';
  initialData?: CorporateKpiResponse;
  parentOptions: CorporateKpiResponse[];
  currentYear: number;
}

/**
 * Flatten tree into a list with depth for indent display.
 * Excludes self and descendants when editing.
 */
function flattenWithDepth(
  items: CorporateKpiResponse[],
  excludeId?: string,
  depth = 0,
): { id: string; label: string; depth: number }[] {
  const result: { id: string; label: string; depth: number }[] = [];
  for (const item of items) {
    if (item.id === excludeId) continue;
    const indent = depth > 0 ? `${'  '.repeat(depth)}└── ` : '';
    result.push({
      id: item.id,
      label: `${indent}${item.indicatorCode} — ${item.indicatorName}`,
      depth,
    });
    if (item.children && item.children.length > 0) {
      result.push(...flattenWithDepth(item.children, excludeId, depth + 1));
    }
  }
  return result;
}

export const CorporateKpiFormModal: React.FC<CorporateKpiFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  mode,
  initialData,
  parentOptions,
  currentYear,
}) => {
  const isEditMode = mode === 'edit';

  const form = useForm<FormValues>({
    resolver: zodResolver(getFormSchema(isEditMode)),
    defaultValues: {
      indicatorCode: '',
      indicatorName: '',
      weight: null,
      businessTarget: null,
      parentId: null,
      periodYear: currentYear,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData && isEditMode) {
        form.reset({
          indicatorCode: initialData.indicatorCode,
          indicatorName: initialData.indicatorName,
          weight: initialData.weight ?? undefined,
          businessTarget: initialData.businessTarget ?? undefined,
          parentId: initialData.parentId ?? null,
          periodYear: initialData.periodYear,
        });
      } else {
        form.reset({
          indicatorCode: '',
          indicatorName: '',
          weight: null,
          businessTarget: null,
          parentId: null,
          periodYear: currentYear,
        });
      }
    }
  }, [isOpen, initialData, isEditMode, currentYear, form]);

  const handleSubmit = async (values: FormValues) => {
    if (isEditMode) {
      const updateData: UpdateCorporateKpiRequest = {
        indicatorCode: values.indicatorCode,
        indicatorName: values.indicatorName,
        weight: values.weight ?? undefined,
        businessTarget: values.businessTarget ?? undefined,
        parentId: values.parentId || null,
      };
      await onSubmit(updateData);
    } else {
      const createData: CreateCorporateKpiRequest = {
        indicatorCode: values.indicatorCode,
        indicatorName: values.indicatorName,
        weight: values.weight ?? undefined,
        businessTarget: values.businessTarget ?? undefined,
        parentId: values.parentId || null,
        periodYear: values.periodYear,
      };
      await onSubmit(createData);
    }
  };

  const flatOptions = flattenWithDepth(parentOptions, isEditMode ? initialData?.id : undefined);

  // Calculate total weight of siblings for the selected parent
  const selectedParentId = form.watch('parentId');
  const currentWeight = form.watch('weight') ?? 0;
  const siblingWeightTotal = React.useMemo(() => {
    if (!selectedParentId) return 0;
    // Find the parent in the tree and sum weights of its children (excluding current item in edit mode)
    const findParent = (items: CorporateKpiResponse[]): CorporateKpiResponse | null => {
      for (const item of items) {
        if (item.id === selectedParentId) return item;
        if (item.children?.length) {
          const found = findParent(item.children);
          if (found) return found;
        }
      }
      return null;
    };
    const parent = findParent(parentOptions);
    if (!parent?.children?.length) return 0;
    return parent.children
      .filter((child) => !(isEditMode && child.id === initialData?.id))
      .reduce((sum, child) => sum + (child.weight ?? 0), 0);
  }, [selectedParentId, parentOptions, isEditMode, initialData?.id]);

  const totalWeightWithCurrent = siblingWeightTotal + currentWeight;
  const showWeightWarning = selectedParentId && totalWeightWithCurrent > 100;

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
                {isEditMode ? 'Edit KPI Korporat' : 'Tambah KPI Korporat Baru'}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2">
              <form id="corporate-kpi-form" onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
                {isEditMode && initialData && (
                  <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{initialData.indicatorCode}</span>
                  </div>
                )}

                <Controller
                  control={form.control}
                  name="indicatorCode"
                  render={({ field, fieldState }) => (
                    <TextField
                      isRequired
                      validationBehavior="aria"
                      className="w-full"
                      name={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      isInvalid={!!fieldState.error}
                    >
                      <Label>Kode Indikator</Label>
                      <Input placeholder="Contoh: CK-IT-001" />
                      {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                    </TextField>
                  )}
                />

                <Controller
                  control={form.control}
                  name="indicatorName"
                  render={({ field, fieldState }) => (
                    <TextField
                      isRequired
                      validationBehavior="aria"
                      className="w-full"
                      name={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      isInvalid={!!fieldState.error}
                    >
                      <Label>Nama Indikator</Label>
                      <Input placeholder="Contoh: Produktivitas IT" />
                      {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                    </TextField>
                  )}
                />

                <Controller
                  control={form.control}
                  name="weight"
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
                    >
                      <Label>Bobot (%)</Label>
                      <Input
                        type="number"
                        placeholder="0-100"
                        min="0"
                        max="100"
                      />
                      {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                    </TextField>
                  )}
                />

                {/* Weight progress indicator */}
                {selectedParentId && siblingWeightTotal > 0 && (
                  <div className="-mt-2 px-1">
                    <p className="text-xs text-muted-foreground">
                      Total bobot anak: {siblingWeightTotal}%
                    </p>
                    {showWeightWarning && (
                      <p className="text-xs text-warning mt-0.5">
                        ⚠ Total bobot ({totalWeightWithCurrent}%) melebihi 100%
                      </p>
                    )}
                  </div>
                )}

                <Controller
                  control={form.control}
                  name="businessTarget"
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
                    >
                      <Label>Target Bisnis</Label>
                      <Input
                        type="number"
                        placeholder="Masukkan target bisnis"
                        min="0"
                      />
                      {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                    </TextField>
                  )}
                />

                <Controller
                  control={form.control}
                  name="parentId"
                  render={({ field }) => (
                    <Select
                      className="w-full"
                      placeholder="Pilih parent (opsional)"
                      selectedKey={field.value ?? ''}
                      onSelectionChange={(key) => {
                        field.onChange(key === '' ? null : String(key));
                      }}
                    >
                      <Label>KPI Induk</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item id="" textValue="Root - Tidak ada parent">
                            (Root - Tidak ada parent)
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          {flatOptions.map((opt) => (
                            <ListBox.Item key={opt.id} id={opt.id} textValue={opt.label}>
                              {opt.label}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
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
                      isDisabled={isEditMode}
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
              <Button variant="secondary" onPress={onClose}>
                Batal
              </Button>
              <Button
                type="submit"
                form="corporate-kpi-form"
                variant="primary"
              >
                {isEditMode ? 'Simpan Perubahan' : 'Tambah KPI'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
