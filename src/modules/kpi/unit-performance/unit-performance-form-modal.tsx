'use client';

import React, { useCallback, useMemo } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Modal,
  Button,
  Form,
  TextField,
  Input,
  Label,
  FieldError,
  ComboBox,
  ListBox,
  EmptyState,
  useFilter,
} from '@heroui/react';
import type { OrganizationUnitResponse } from '@/modules/organization/organization-units/types';
import type {
  UnitPerformanceRow,
  CreateUnitPerformanceRequest,
  UpdateUnitPerformanceRequest,
} from './unit-performance.types';

export type UnitPerformanceFormMode = 'CREATE' | 'EDIT';

export interface UnitPerformanceFormModalProps {
  mode: UnitPerformanceFormMode;
  isOpen: boolean;
  onClose: () => void;
  /**
   * Returns true when the mutation succeeded. CREATE payload carries
   * organizationUnitId + weight; EDIT carries weight only.
   */
  onSubmit: (
    payload: CreateUnitPerformanceRequest | UpdateUnitPerformanceRequest,
    id?: string,
  ) => Promise<boolean>;
  /** EDIT only — the configuration being edited. */
  row?: UnitPerformanceRow;
  /** All current rows — drives the projected total and the picker exclusion. */
  rows: UnitPerformanceRow[];
  /** Flattened active org units (already excluding configured ones by the page). */
  orgUnits: OrganizationUnitResponse[];
  isSubmitting: boolean;
}

interface UnitPerformanceFormValues {
  organizationUnitId: string;
  /** String-typed so 0/empty/decimals are validated precisely. */
  weight: string;
}

const WEIGHT_PATTERN = /^\d+(\.\d{1,2})?$/;

function buildSchema(isEdit: boolean) {
  return z.object({
    organizationUnitId: isEdit
      ? z.string().optional()
      : z.string().min(1, 'Organization unit is required'),
    weight: z
      .string()
      .min(1, 'Weight is required')
      .refine((v) => WEIGHT_PATTERN.test(v.trim()), 'Weight must be a number with at most 2 decimals')
      .refine((v) => Number(v) > 0, 'Weight must be greater than 0')
      .refine((v) => Number(v) <= 100, 'Weight must not exceed 100'),
  });
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export const UnitPerformanceFormModal: React.FC<UnitPerformanceFormModalProps> = ({
  mode,
  isOpen,
  onClose,
  onSubmit,
  row,
  rows,
  orgUnits,
  isSubmitting,
}) => {
  const isEdit = mode === 'EDIT';
  const schema = buildSchema(isEdit);
  const { contains } = useFilter({ sensitivity: 'base' });

  const currentTotal = useMemo(
    () => rows.reduce((sum, r) => sum + r.weight, 0),
    [rows],
  );

  const initial: UnitPerformanceFormValues = {
    organizationUnitId: row?.organizationUnitId ?? '',
    weight: row ? String(row.weight) : '',
  };

  const { control, handleSubmit, watch } = useForm<UnitPerformanceFormValues>({
    resolver: zodResolver(schema) as Resolver<UnitPerformanceFormValues>,
    defaultValues: initial,
  });

  // ── Projected total (B3): >100 blocked, =100 complete, <100 allowed ──
  const weightValue = Number(watch('weight'));
  const weightValid = WEIGHT_PATTERN.test(watch('weight')?.trim() ?? '');
  const projected = isEdit
    ? currentTotal - (row?.weight ?? 0) + (weightValid ? weightValue : 0)
    : currentTotal + (weightValid ? weightValue : 0);
  const projectedExceeds = projected > 100 + 1e-9;
  const projectedComplete = Math.abs(projected - 100) < 1e-9;
  const projectedLabel = `${round2(projected)}%`;
  const remainingLabel = `${round2(100 - projected)}%`;

  const formKey = `${mode}--${row?.id ?? 'new'}--${isOpen}`;

  const onFormSubmit = useCallback(
    async (data: UnitPerformanceFormValues) => {
      const weight = Number(data.weight);
      if (isEdit) {
        const ok = await onSubmit({ weight } satisfies UpdateUnitPerformanceRequest, row?.id);
        if (!ok) throw new Error('Submit failed');
      } else {
        const ok = await onSubmit({ organizationUnitId: data.organizationUnitId, weight } satisfies CreateUnitPerformanceRequest);
        if (!ok) throw new Error('Submit failed');
      }
    },
    [isEdit, row?.id, onSubmit],
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (projectedExceeds) return; // hard block — backend parity
    handleSubmit(
      onFormSubmit as (data: UnitPerformanceFormValues) => Promise<void>,
      (formErrors) => console.log('FORM ERRORS', formErrors),
    )();
  };

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        isDismissable={!isSubmitting}
        onOpenChange={(open: boolean) => { if (!open) onClose(); }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[480px]">
            <Modal.Header className="flex items-center justify-between">
              <Modal.Heading>{isEdit ? 'Edit Unit' : 'Add Unit'}</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>

            <Modal.Body className="p-6">
              <Form
                key={formKey}
                id="unit-performance-form"
                validationBehavior="aria"
                onSubmit={handleFormSubmit}
                className="flex flex-col gap-4"
              >
                {isEdit ? (
                  /* Edit: unit identity comes from Organization Unit — read-only */
                  <div className="flex w-full flex-col gap-1 rounded-lg bg-surface-secondary p-3">
                    <span className="text-xs text-muted-foreground">Unit (from Organization Unit)</span>
                    <span className="font-medium text-foreground">
                      {row?.unitCode} — {row?.unitName}
                    </span>
                  </div>
                ) : (
                  <Controller
                    name="organizationUnitId"
                    control={control}
                    render={({ field, fieldState }) => (
                      <ComboBox
                        className="w-full"
                        isRequired
                        selectedKey={field.value || null}
                        onSelectionChange={(key) => field.onChange(key ? String(key) : '')}
                        isInvalid={fieldState.invalid}
                        isDisabled={isSubmitting}
                        allowsEmptyCollection
                        defaultFilter={contains}
                      >
                        <Label>Organization Unit</Label>
                        <ComboBox.InputGroup>
                          <Input placeholder="Select organization unit" />
                          <ComboBox.Trigger />
                        </ComboBox.InputGroup>
                        <ComboBox.Popover>
                          <ListBox renderEmptyState={() => <EmptyState>No available units</EmptyState>}>
                            {orgUnits.map((unit) => (
                              <ListBox.Item
                                key={unit.id}
                                id={unit.id}
                                textValue={`${unit.unitCode} - ${unit.unitName}`}
                              >
                                <span>{unit.unitCode} — {unit.unitName}</span>
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

                <Controller
                  name="weight"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      className="w-full"
                      name={field.name}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      isRequired
                      isInvalid={fieldState.invalid}
                      isDisabled={isSubmitting}
                      validationBehavior="aria"
                      variant="secondary"
                    >
                      <Label>Weight (%)</Label>
                      <Input placeholder="e.g. 25" inputMode="decimal" />
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </TextField>
                  )}
                />

                {/* Projected total — the three-state rule surfaced live */}
                {projectedExceeds ? (
                  <p className="text-xs text-danger">
                    After save, total weight would be {projectedLabel} — exceeds 100%.
                  </p>
                ) : projectedComplete ? (
                  <p className="text-xs text-success">
                    After save, total weight: {projectedLabel} (complete).
                  </p>
                ) : (
                  <p className="text-xs text-warning">
                    After save, total weight: {projectedLabel} (incomplete — remaining {remainingLabel}).
                  </p>
                )}
              </Form>
            </Modal.Body>

            <Modal.Footer className="flex justify-end gap-2">
              <Button variant="secondary" onPress={onClose} isDisabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="unit-performance-form"
                isDisabled={isSubmitting || projectedExceeds}
                isPending={isSubmitting}
              >
                {isEdit ? 'Save Changes' : 'Add'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
