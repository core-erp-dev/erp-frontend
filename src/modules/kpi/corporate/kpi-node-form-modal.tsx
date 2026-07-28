'use client';

import React, { useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
  Select,
  ListBox,
} from '@heroui/react';
import type { CorporateKpiNode, CreateKpiRequest, UpdateKpiRequest, KpiNodeType } from './corporate-kpi.types';

export type FormMode =
  | 'CREATE_ASPECT'
  | 'CREATE_INDICATOR'
  | 'EDIT_ASPECT'
  | 'EDIT_INDICATOR';

export interface KpiNodeFormModalProps {
  mode: FormMode;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateKpiRequest | UpdateKpiRequest, id?: string) => Promise<boolean>;
  preselectedParentId?: string;
  node?: CorporateKpiNode;
  aspects: CorporateKpiNode[];
  selectedYear: number;
  isSubmitting: boolean;
}

const MODE_TITLE: Record<FormMode, string> = {
  CREATE_ASPECT: 'Add Corporate KPI',
  CREATE_INDICATOR: 'Add Corporate KPI',
  EDIT_ASPECT: 'Edit Aspect',
  EDIT_INDICATOR: 'Edit Indicator',
};

/* ── Schema ── */

function buildSchema(isIndicator: boolean) {
  const base = {
    code: z.string().min(1, 'Code is required').max(50, 'Code must be at most 50 characters'),
    name: z.string().min(1, 'Name is required').max(255, 'Name must be at most 255 characters'),
    description: z.string().optional(),
    nodeType: z.enum(['ASPECT', 'INDICATOR']),
  };

  if (isIndicator) {
    return z.object({
      ...base,
      parentId: z.string().min(1, 'Parent Aspect is required'),
      unit: z.string().min(1, 'Unit is required').max(50, 'Unit must be at most 50 characters'),
      targetValue: z.coerce.number().positive('Target value must be greater than zero'),
    });
  }

  return z.object({
    ...base,
    parentId: z.string().optional(),
    unit: z.string().optional(),
    targetValue: z.coerce.number().optional(),
  });
}

type AspectFormValues = z.input<ReturnType<typeof buildSchema>>;

/* ── Inner form component ── */

interface FormBodyProps {
  initial: AspectFormValues;
  isEdit: boolean;
  isIndicator: boolean;
  mode: FormMode;
  node?: CorporateKpiNode;
  aspects: CorporateKpiNode[];
  isSubmitting: boolean;
  selectedYear: number;
  preselectedParentId?: string;
  onClose: () => void;
  onSubmit: (data: CreateKpiRequest | UpdateKpiRequest, id?: string) => Promise<boolean>;
}

function FormBody({
  initial,
  isEdit,
  isIndicator,
  mode,
  node,
  aspects,
  isSubmitting,
  selectedYear,
  preselectedParentId,
  onClose,
  onSubmit,
}: FormBodyProps) {
  const schema = buildSchema(isIndicator);
  const {
    control,
    handleSubmit,
    watch,
    setValue,
  } = useForm<AspectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial,
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  });

  const nodeType = watch('nodeType');
  const aspectOptions = useMemo(() => aspects.filter((a) => a.nodeType === 'ASPECT'), [aspects]);

  const onFormSubmit = useCallback(
    async (data: Record<string, unknown>) => {
      const isInd = data.nodeType === 'INDICATOR';
      if (isInd) {
        const payload: CreateKpiRequest | UpdateKpiRequest = isEdit
          ? {
              code: data.code as string,
              name: data.name as string,
              parentId: (data.parentId as string) || null,
              unit: (data.unit as string) || null,
              targetValue: (data.targetValue as number) ?? null,
              description: (data.description as string) || null,
            }
          : {
              code: data.code as string,
              name: data.name as string,
              nodeType: 'INDICATOR' as KpiNodeType,
              year: selectedYear,
              parentId: (data.parentId as string) || null,
              unit: (data.unit as string) || null,
              targetValue: (data.targetValue as number) ?? null,
              description: (data.description as string) || null,
            };
        const ok = await onSubmit(payload, isEdit ? node?.id : undefined);
        if (!ok) throw new Error('Submit failed');
      } else {
        const payload: CreateKpiRequest | UpdateKpiRequest = isEdit
          ? {
              code: data.code as string,
              name: data.name as string,
              parentId: null,
              unit: null,
              targetValue: null,
              description: (data.description as string) || null,
            }
          : {
              code: data.code as string,
              name: data.name as string,
              nodeType: 'ASPECT' as KpiNodeType,
              year: selectedYear,
              parentId: null,
              unit: null,
              targetValue: null,
              description: (data.description as string) || null,
            };
        const ok = await onSubmit(payload, isEdit ? node?.id : undefined);
        if (!ok) throw new Error('Submit failed');
      }
    },
    [isEdit, node?.id, onSubmit, selectedYear],
  );

  const handleTypeChange = useCallback(
    (key: React.Key | null) => {
      if (!key) return;
      const newType = key as KpiNodeType;
      setValue('nodeType', newType, { shouldValidate: true });
      if (newType === 'ASPECT') {
        setValue('parentId', '', { shouldDirty: true });
        setValue('unit', '', { shouldDirty: true });
        setValue('targetValue', undefined, { shouldDirty: true });
      }
    },
    [setValue],
  );

  return (
    <Form
      validationBehavior="aria"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(
          onFormSubmit as (data: AspectFormValues) => Promise<void>,
          (formErrors) => console.log('FORM ERRORS', formErrors),
        )();
      }}
      className="flex flex-col gap-4"
    >
      {/* Type selector — only shown on create; disabled in edit */}
      {!isEdit && (
        <Controller
          name="nodeType"
          control={control}
          render={({ field, fieldState }) => (
            <Select
              className="w-full"
              selectedKey={field.value}
              onSelectionChange={(key) => handleTypeChange(key)}
              isRequired
              isInvalid={fieldState.invalid}
              variant="secondary"
            >
              <Label>Type</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="ASPECT" textValue="Aspect">
                    Aspect
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="INDICATOR" textValue="Indicator">
                    Indicator
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
              <FieldError>{fieldState.error?.message}</FieldError>
            </Select>
          )}
        />
      )}

      {/* Code */}
      <Controller
        name="code"
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
            <Label>Code</Label>
            <Input placeholder="e.g. FIN" />
            <FieldError>{fieldState.error?.message}</FieldError>
          </TextField>
        )}
      />

      {/* Name */}
      <Controller
        name="name"
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
            <Label>Name</Label>
            <Input placeholder="e.g. Financial" />
            <FieldError>{fieldState.error?.message}</FieldError>
          </TextField>
        )}
      />

      {/* Parent Aspect — indicator only */}
      {nodeType === 'INDICATOR' && (
        <Controller
          name="parentId"
          control={control}
          render={({ field, fieldState }) => (
            <Select
              className="w-full"
              selectedKey={field.value || ''}
              onSelectionChange={(key) => {
                setValue('parentId', (key ?? '') as string, { shouldValidate: true });
              }}
              isRequired
              isInvalid={fieldState.invalid}
              isDisabled={isSubmitting || (mode === 'CREATE_INDICATOR' && !!preselectedParentId)}
              variant="secondary"
              >
              <Label>Parent Aspect</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {aspectOptions.length === 0 && (
                    <ListBox.Item id="__empty" textValue="No aspects available">
                      No aspects available
                    </ListBox.Item>
                  )}
                  {aspectOptions.map((a) => (
                    <ListBox.Item key={a.id} id={a.id} textValue={`${a.code} — ${a.name}`}>
                      {a.code} — {a.name}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
              <FieldError>{fieldState.error?.message}</FieldError>
            </Select>
          )}
        />
      )}

      {/* Unit — indicator only */}
      {nodeType === 'INDICATOR' && (
        <Controller
          name="unit"
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
              <Label>Unit</Label>
              <Input placeholder="e.g. %" />
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
        />
      )}

      {/* Target Value — indicator only */}
      {nodeType === 'INDICATOR' && (
        <Controller
          name="targetValue"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              className="w-full"
              name={field.name}
              value={field.value != null ? String(field.value) : ''}
              onChange={(val) => field.onChange(val ? Number(val) : undefined)}
              onBlur={field.onBlur}
              ref={field.ref}
              isRequired
              isInvalid={fieldState.invalid}
              isDisabled={isSubmitting}
              validationBehavior="aria"
              variant="secondary"
              >
              <Label>Target Value</Label>
              <Input type="number" min={0} step="any" />
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
        />
      )}

      {/* Description — shared */}
      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <TextField
            className="w-full"
            name={field.name}
            value={field.value ?? ''}
            onChange={field.onChange}
            isDisabled={isSubmitting}
            variant="secondary"
          >
            <Label>Description</Label>
            <Input placeholder="Optional description" />
          </TextField>
        )}
      />

      {/* Year — read-only display */}
      <div className="text-sm text-muted-foreground">
        Year: {isEdit && node ? node.year : selectedYear}
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="secondary" onPress={onClose} isDisabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" isDisabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </Form>
  );
}

/* ── Main component ── */

export const KpiNodeFormModal: React.FC<KpiNodeFormModalProps> = ({
  mode,
  isOpen,
  onClose,
  onSubmit,
  preselectedParentId,
  node,
  aspects,
  selectedYear,
  isSubmitting,
}) => {
  const isEdit = mode === 'EDIT_ASPECT' || mode === 'EDIT_INDICATOR';
  const isIndicator = mode === 'CREATE_INDICATOR' || mode === 'EDIT_INDICATOR';

  const initial: AspectFormValues = {
    code: node?.code ?? '',
    name: node?.name ?? '',
    nodeType: isIndicator ? 'INDICATOR' : 'ASPECT',
    parentId: (mode === 'CREATE_INDICATOR' && preselectedParentId ? preselectedParentId : node?.parentId) ?? '',
    unit: node?.unit ?? '',
    targetValue: node?.targetValue ?? undefined,
    description: node?.description ?? '',
  };

  const formKey = `${mode}--${node?.id ?? 'new'}--${preselectedParentId ?? ''}--${isOpen}`;

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
              <Modal.Heading className="text-lg font-semibold">{MODE_TITLE[mode]}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4 py-5">
              <div key={formKey}>
                <FormBody
                  initial={initial}
                  isEdit={isEdit}
                  isIndicator={isIndicator}
                  mode={mode}
                  node={node}
                  aspects={aspects}
                  isSubmitting={isSubmitting}
                  selectedYear={selectedYear}
                  preselectedParentId={preselectedParentId}
                  onClose={onClose}
                  onSubmit={onSubmit}
                />
              </div>
            </Modal.Body>
            <Modal.CloseTrigger />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
