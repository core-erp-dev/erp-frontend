'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { House, ArrowLeft, FloppyDisk } from '@phosphor-icons/react';
import {
  Button, Form, TextField, Input, Label, FieldError,
  Breadcrumbs, BreadcrumbsItem,
  Select, ListBox, TextArea,
  Alert, Spinner,
} from '@heroui/react';

import type { OrganizationUnitResponse, CreateOrganizationUnitRequest, UpdateOrganizationUnitRequest } from '../types';
import { OrganizationUnitType, UNIT_TYPE_LABEL } from '../types';
import { useOrgUnitFormData } from '../hooks/use-org-unit-form-data';

const formSchema = z.object({
  unitCode: z.string().min(1, 'Unit code is required').max(50, 'Unit code max 50 characters'),
  unitName: z.string().min(1, 'Unit name is required').max(150, 'Unit name max 150 characters'),
  unitType: z.string().min(1, 'Unit type is required'),
  parentId: z.string().nullable().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const UNIT_TYPE_OPTIONS = Object.values(OrganizationUnitType);

interface OrgUnitFormProps {
  mode: 'create' | 'edit';
  initialData?: OrganizationUnitResponse | null;
  onSuccess: () => void;
}

export function OrgUnitForm({ mode, initialData, onSuccess }: OrgUnitFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = mode === 'edit';

  const { treeUnits, isLoadingData, submitCreate, submitUpdate } = useOrgUnitFormData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Get parentId from query params (for "Add Subordinate")
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
        parentId: initialData.parentId,
        description: initialData.description ?? '',
      });
    }
  }, [initialData, form]);

  // Set parentId from query params on create mode
  useEffect(() => {
    if (!isEditMode && queryParentId && treeUnits.length > 0) {
      form.setValue('parentId', queryParentId);
    }
  }, [isEditMode, queryParentId, treeUnits, form]);

  const flatParents = useMemo(() => {
    const result: { id: string; label: string }[] = [];
    const walk = (nodes: OrganizationUnitResponse[], prefix = '') => {
      for (const n of nodes) {
        if (isEditMode && initialData && n.id === initialData.id) continue;
        result.push({ id: n.id, label: `${prefix}${n.unitName}` });
        if (n.children.length > 0) walk(n.children, `${prefix}${n.unitName} › `);
      }
    };
    walk(treeUnits);
    return result;
  }, [treeUnits, isEditMode, initialData]);

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);

    if (isEditMode && initialData) {
      const payload: UpdateOrganizationUnitRequest = {
        unitCode: values.unitCode,
        unitName: values.unitName,
        unitType: values.unitType as OrganizationUnitType,
        parentId: values.parentId,
        description: values.description || undefined,
      };
      const ok = await submitUpdate(initialData.id, payload);
      setIsSubmitting(false);
      if (ok) onSuccess();
      else setSubmitError('Failed to update organization unit');
    } else {
      const payload: CreateOrganizationUnitRequest = {
        unitCode: values.unitCode,
        unitName: values.unitName,
        unitType: values.unitType as OrganizationUnitType,
        parentId: values.parentId || undefined,
        description: values.description || undefined,
      };
      const newId = await submitCreate(payload);
      setIsSubmitting(false);
      if (newId) onSuccess();
      else setSubmitError('Failed to add organization unit');
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
        <BreadcrumbsItem>Organization</BreadcrumbsItem>
        <BreadcrumbsItem href="/organization/organization-units">Organization Units</BreadcrumbsItem>
        <BreadcrumbsItem>{isEditMode ? 'Edit' : 'Add'}</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center gap-3">
        <Button isIconOnly variant="tertiary" onPress={() => router.back()} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">
          {isEditMode ? 'Edit Organization Unit' : 'Add New Organization Unit'}
        </h1>
      </div>

      <Form
        validationBehavior="aria"
        onSubmit={(e) => {
          form.handleSubmit(
            handleSubmit,
            (errors) => console.log("FORM ERRORS", errors),
          )(e);
        }}
        className="flex flex-col gap-6"
      >

          {/* ── BASIC INFORMATION ── */}
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-foreground">Basic Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Controller
                control={form.control}
                name="unitCode"
                render={({ field, fieldState }) => (
                  <TextField isRequired validationBehavior="native" className="w-full"
                    name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref}
                    isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                    <Label>Unit Code</Label>
                    <Input placeholder="Example: DIR-HRD-001" />
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
                    <Label>Unit Name</Label>
                    <Input placeholder="Example: HR Division" />
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
                    placeholder="Select unit type"
                  >
                    <Label>Unit Type</Label>
                    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {UNIT_TYPE_OPTIONS.map((type) => (
                          <ListBox.Item key={type} id={type} textValue={UNIT_TYPE_LABEL[type]}>
                            {UNIT_TYPE_LABEL[type]}
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
                render={({ field }) => (
                  <Select
                    className="w-full"
                    selectedKey={field.value || null}
                    onSelectionChange={(k) => field.onChange(k ? String(k) : null)}
                    isDisabled={isSubmitting}
                    placeholder="No parent unit"
                  >
                    <Label>Parent Unit</Label>
                    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item key="" id="" textValue="No parent unit">No parent unit</ListBox.Item>
                        {flatParents.map((p) => (
                          <ListBox.Item key={p.id} id={p.id} textValue={p.label}>{p.label}</ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
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
                  <Label>Description</Label>
                  <TextArea placeholder="Brief organization unit description" rows={2} />
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
            <Button variant="secondary" onPress={() => router.back()} isDisabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isDisabled={isSubmitting} isPending={isSubmitting}>
              <FloppyDisk className="h-4 w-4" />
              Save
            </Button>
          </div>
        </Form>
    </div>
  );
}
