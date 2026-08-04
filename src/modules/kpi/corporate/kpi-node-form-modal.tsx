'use client';

import React, { useMemo, useCallback } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
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
  TextArea,
} from '@heroui/react';
import type { AssessmentRule, CorporateKpiNode, CreateKpiRequest, UpdateKpiRequest, KpiNodeType } from './corporate-kpi.types';

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

function buildSchema(isEdit: boolean, isIndicator: boolean) {
  const base = {
    code: z.string().min(1, 'Code is required').max(50, 'Code must be at most 50 characters'),
    name: z.string().min(1, 'Name is required').max(255, 'Name must be at most 255 characters'),
    description: z.string().optional(),
    nodeType: isEdit ? z.enum(['ASPECT', 'INDICATOR']) : z.string().min(1, 'Type is required'),
    year: z.coerce.number().int().min(2000).max(2100),
    displayOrder: z.coerce.number().int().min(0, 'Display order must be non-negative').optional(),
    // Scoring fields — raw strings so empty stays distinct; ranges refined below
    formula: z.string().optional(),
    assessmentRulesJson: z.string().optional(),
    weight: z.string().optional(),
    targetScore: z.string().optional(),
  };

  const refineScoring = (data: Record<string, unknown>, ctx: z.RefinementCtx) => {
    if (data.nodeType === 'INDICATOR' && isIndicator) {
      if (data.weight != null && data.weight !== '') {
        const w = Number(data.weight);
        if (!Number.isFinite(w) || w <= 0) {
          ctx.addIssue({ code: 'custom', path: ['weight'], message: 'Weight must be greater than 0' });
        } else if (w > 1) {
          ctx.addIssue({ code: 'custom', path: ['weight'], message: 'Weight must not exceed 100%' });
        }
      }
      if (data.targetScore != null && data.targetScore !== '') {
        const t = Number(data.targetScore);
        if (!Number.isFinite(t) || t <= 0) {
          ctx.addIssue({ code: 'custom', path: ['targetScore'], message: 'Target score must be greater than zero' });
        }
      }
    }
  };

  if (isEdit) {
    return z.object({
      ...base,
      parentId: isIndicator
        ? z.string().min(1, 'Parent Aspect is required')
        : z.string().optional(),
    }).superRefine(refineScoring);
  }

  // Create mode — parent required conditionally for INDICATOR
  return z.object({
    ...base,
    parentId: z.string().optional(),
  }).superRefine((data, ctx) => {
    if (data.nodeType === 'INDICATOR' && !data.parentId) {
      ctx.addIssue({ code: 'custom', path: ['parentId'], message: 'Parent Aspect is required' });
    }
    refineScoring(data, ctx);
  });
}

type NodeFormValues = z.input<ReturnType<typeof buildSchema>>;

/* ── Helpers ── */

/** Parse the assessment-rules JSON textarea; returns rules or throws. */
function parseAssessmentRules(json: string | undefined): AssessmentRule[] | null {
  if (!json || !json.trim()) return null;
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    throw new Error('Assessment rules must be a JSON array.');
  }
  return parsed as AssessmentRule[];
}

/** assessmentRules → pretty JSON for the textarea. */
function rulesToJson(rules: AssessmentRule[] | null | undefined): string {
  if (!rules || rules.length === 0) return '';
  return JSON.stringify(rules, null, 2);
}

/* ── Inner form component ── */

interface FormBodyProps {
  initial: NodeFormValues;
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
  onSubmit,
}: FormBodyProps) {
  const schema = buildSchema(isEdit, isIndicator);
  const {
    control,
    handleSubmit,
    setValue,
  } = useForm<NodeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial,
  });

  const nodeType = useWatch({ control, name: 'nodeType' });
  const isInd = nodeType === 'INDICATOR';
  const aspectOptions = useMemo(() => aspects.filter((a) => a.nodeType === 'ASPECT'), [aspects]);

  const onFormSubmit = useCallback(
    async (data: Record<string, unknown>) => {
      // Parse assessment rules first — invalid JSON aborts the submit
      let rules: AssessmentRule[] | null = null;
      try {
        rules = parseAssessmentRules(data.assessmentRulesJson as string | undefined);
      } catch (err: unknown) {
        console.log('FORM ERRORS', err);
        return;
      }

      const common = {
        code: data.code as string,
        name: data.name as string,
        parentId: (data.parentId as string) || null,
        description: (data.description as string) || null,
        displayOrder: (data.displayOrder as number) ?? 0,
      };

      const scoring = {
        formula: (data.formula as string) || null,
        assessmentRules: rules,
        weight: data.weight ? Number(data.weight) : null,
        targetScore: data.targetScore ? Number(data.targetScore) : null,
      };

      const payload: CreateKpiRequest | UpdateKpiRequest = isEdit
        ? { ...common, ...scoring }
        : {
            ...common,
            ...scoring,
            nodeType: (isInd ? 'INDICATOR' : 'ASPECT') as KpiNodeType,
            year: data.year as number,
          };

      const ok = await onSubmit(payload, isEdit ? node?.id : undefined);
      if (!ok) throw new Error('Submit failed');
    },
    [isEdit, isInd, node?.id, onSubmit],
  );

  const handleTypeChange = useCallback(
    (key: React.Key | null) => {
      if (!key) return;
      setValue('nodeType', key as KpiNodeType, { shouldValidate: true });
      if (key === 'ASPECT') {
        setValue('parentId', '', { shouldDirty: true });
      }
    },
    [setValue],
  );

  return (
    <Form
      id="corporate-kpi-node-form"
      validationBehavior="aria"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(
          onFormSubmit as (data: NodeFormValues) => Promise<void>,
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
              selectedKey={field.value || null}
              onSelectionChange={(key) => handleTypeChange(key)}
              isRequired
              isInvalid={fieldState.invalid}
              variant="secondary"
              placeholder="Select type"
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

      {/* Display order */}
      <Controller
        name="displayOrder"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            className="w-full"
            name={field.name}
            value={field.value != null ? String(field.value) : ''}
            onChange={(val) => field.onChange(val ? Number(val) : undefined)}
            onBlur={field.onBlur}
            ref={field.ref}
            isInvalid={fieldState.invalid}
            isDisabled={isSubmitting}
            validationBehavior="aria"
            variant="secondary"
          >
            <Label>Display Order</Label>
            <Input type="number" min={0} step={1} placeholder="e.g. 1" />
            <FieldError>{fieldState.error?.message}</FieldError>
          </TextField>
        )}
      />

      {/* Parent Aspect — indicator only */}
      {isInd && (
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

      {/* Scoring fields — indicator only, optional (staged DRAFT configuration) */}
      {isInd && (
        <>
          <Controller
            name="formula"
            control={control}
            render={({ field }) => (
              <TextField
                className="w-full"
                name={field.name}
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                isDisabled={isSubmitting}
                validationBehavior="aria"
                variant="secondary"
              >
                <Label>Formula</Label>
                <Input placeholder="e.g. ROI + NPM" />
                <FieldError />
              </TextField>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="weight"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  className="w-full"
                  name={field.name}
                  value={field.value != null ? String(field.value) : ''}
                  onChange={(val) => field.onChange(val)}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  isInvalid={fieldState.invalid}
                  isDisabled={isSubmitting}
                  validationBehavior="aria"
                  variant="secondary"
                >
                  <Label>Weight (ratio)</Label>
                  <Input type="number" step="any" placeholder="e.g. 0.25" />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )}
            />
            <Controller
              name="targetScore"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  className="w-full"
                  name={field.name}
                  value={field.value != null ? String(field.value) : ''}
                  onChange={(val) => field.onChange(val)}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  isInvalid={fieldState.invalid}
                  isDisabled={isSubmitting}
                  validationBehavior="aria"
                  variant="secondary"
                >
                  <Label>Target Score</Label>
                  <Input type="number" step="any" placeholder="e.g. 80" />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )}
            />
          </div>

          <Controller
            name="assessmentRulesJson"
            control={control}
            render={({ field }) => (
              <TextArea
                className="w-full"
                name={field.name}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value)}
                disabled={isSubmitting}
                variant="secondary"
                placeholder={'Assessment rules JSON — e.g. [{"lowerBound":null,"lowerInclusive":true,"upperBound":50,"upperInclusive":false,"score":0}]'}
                rows={4}
              />
            )}
          />
        </>
      )}

      {/* Description — shared */}
      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <TextArea
            className="w-full"
            name={field.name}
            value={field.value ?? ''}
            onChange={(e) => field.onChange(e.target.value)}
            disabled={isSubmitting}
            variant="secondary"
            placeholder="Optional description"
            rows={3}
          />
        )}
      />

      {/* Year — selectable on create, read-only on edit */}
      <Controller
        name="year"
        control={control}
        render={({ field, fieldState }) => {
          const currentYear = new Date().getFullYear();
          const years = Array.from({ length: 7 }, (_, i) => currentYear + i - 3);
          if (isEdit) {
            return <div className="text-sm text-muted-foreground">Year: {node?.year ?? selectedYear}</div>;
          }
          return (
            <Select
              className="w-full"
              selectedKey={field.value != null ? String(field.value) : String(selectedYear)}
              onSelectionChange={(key) => field.onChange(Number(key))}
              isRequired
              isInvalid={fieldState.invalid}
              variant="secondary"
            >
              <Label>Year</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {years.map((y) => (
                    <ListBox.Item key={String(y)} id={String(y)} textValue={String(y)}>
                      {String(y)}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
              <FieldError>{fieldState.error?.message}</FieldError>
            </Select>
          );
        }}
      />

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

  const initial: NodeFormValues = {
    code: node?.code ?? '',
    name: node?.name ?? '',
    nodeType: isIndicator ? 'INDICATOR' : 'ASPECT',
    year: node?.year ?? selectedYear,
    parentId: (mode === 'CREATE_INDICATOR' && preselectedParentId ? preselectedParentId : node?.parentId) ?? '',
    description: node?.description ?? '',
    displayOrder: node?.displayOrder ?? 0,
    formula: node?.formula ?? '',
    assessmentRulesJson: rulesToJson(node?.assessmentRules ?? null),
    weight: node?.weight != null ? String(node.weight) : '',
    targetScore: node?.targetScore != null ? String(node.targetScore) : '',
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
          <Modal.Dialog className="sm:max-w-[560px]">
            <Modal.Header className="flex items-center justify-between">
              <Modal.Heading>{MODE_TITLE[mode]}</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>

            <Modal.Body className="p-6">
              <FormBody
                key={formKey}
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
            </Modal.Body>

            <Modal.Footer className="flex justify-end gap-2">
              <Button variant="secondary" onPress={onClose} isDisabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="corporate-kpi-node-form"
                isDisabled={isSubmitting}
                isPending={isSubmitting}
              >
                {isEdit ? 'Save Changes' : 'Create'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
