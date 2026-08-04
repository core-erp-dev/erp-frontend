'use client';

import React, { useCallback } from 'react';
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
  TextArea,
} from '@heroui/react';
import type { Variable, CreateVariableRequest, UpdateVariableRequest } from './variables.types';

export type VariableFormMode = 'CREATE' | 'EDIT';

export interface VariableFormModalProps {
  mode: VariableFormMode;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateVariableRequest | UpdateVariableRequest, id?: string) => Promise<boolean>;
  variable?: Variable;
  isSubmitting: boolean;
}

const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

function buildSchema(isEdit: boolean) {
  const base = {
    name: z.string().min(1, 'Name is required').max(255, 'Name must be at most 255 characters'),
    unit: z.string().max(50, 'Unit must be at most 50 characters').optional(),
    description: z.string().optional(),
  };
  if (isEdit) {
    // Code is immutable — the edit schema has NO code field at all.
    return z.object(base);
  }
  return z.object({
    ...base,
    code: z
      .string()
      .min(1, 'Code is required')
      .max(50, 'Code must be at most 50 characters')
      .regex(CODE_PATTERN, 'Code must start with an uppercase letter and contain only uppercase letters, digits, and underscores'),
  });
}

type VariableFormValues = {
  /** Present only in create mode — immutable and absent on edit. */
  code?: string;
  name: string;
  unit?: string;
  description?: string;
};

export const VariableFormModal: React.FC<VariableFormModalProps> = ({
  mode,
  isOpen,
  onClose,
  onSubmit,
  variable,
  isSubmitting,
}) => {
  const isEdit = mode === 'EDIT';
  const schema = buildSchema(isEdit);

  const initial: VariableFormValues = {
    name: variable?.name ?? '',
    unit: variable?.unit ?? '',
    description: variable?.description ?? '',
  };

  const { control, handleSubmit } = useForm<VariableFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial,
  });

  const formKey = `${mode}--${variable?.id ?? 'new'}--${isOpen}`;

  const onFormSubmit = useCallback(
    async (data: VariableFormValues) => {
      const payload: CreateVariableRequest | UpdateVariableRequest = isEdit
        ? {
            name: data.name,
            unit: data.unit || null,
            description: data.description || null,
          }
        : {
            code: data.code ?? '',
            name: data.name,
            unit: data.unit || null,
            description: data.description || null,
          };
      const ok = await onSubmit(payload, isEdit ? variable?.id : undefined);
      if (!ok) throw new Error('Submit failed');
    },
    [isEdit, variable?.id, onSubmit],
  );

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
              <Modal.Heading>{isEdit ? 'Edit Variable' : 'Add Variable'}</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>

            <Modal.Body className="p-6">
              <Form
                key={formKey}
                id="variable-form"
                validationBehavior="aria"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit(
                    onFormSubmit as (data: VariableFormValues) => Promise<void>,
                    (formErrors) => console.log('FORM ERRORS', formErrors),
                  )();
                }}
                className="flex flex-col gap-4"
              >
                {/* Code — create only; immutable and absent on edit (backend contract) */}
                {!isEdit && (
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
                        <Input placeholder="e.g. ROI" />
                        <FieldError>{fieldState.error?.message}</FieldError>
                      </TextField>
                    )}
                  />
                )}

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
                      <Input placeholder="e.g. Return on Investment" />
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </TextField>
                  )}
                />

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
              </Form>
            </Modal.Body>

            <Modal.Footer className="flex justify-end gap-2">
              <Button variant="secondary" onPress={onClose} isDisabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="variable-form"
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
