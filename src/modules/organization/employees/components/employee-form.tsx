'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { House, ArrowLeft, FloppyDisk, Briefcase, X, Plus, Trash } from '@phosphor-icons/react';
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
  Surface,
  ComboBox,
  Spinner,
  toast,
} from '@heroui/react';

import { DateFieldPicker } from '@/components/shared/date-field-picker';
import { GENDER, GENDER_LABEL } from '@/constants/gender';
import type { CoreUser, UserCreateRequest, UserUpdateRequest, PositionOption, UserPositionResponse } from '../types';
import { useEmployeeFormData } from '../hooks/use-employee-form-data';

const getFormSchema = (isEditMode: boolean) =>
  z.object({
    fullName: z.string().min(1, 'Full name is required'),
    birthDate: z.string().optional(),
    gender: z.string().optional(),
    phoneNumber: z.string().optional().refine((val) => !val || /^[0-9+\-\s()]*$/.test(val), {
      message: 'Phone number must only contain digits',
    }),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Invalid email format'),
    address: z.string().optional(),
    nip: z.string().optional(),
    defaultPositionId: z.string().optional(),
    joinDate: z.string().min(1, 'Join date is required'),
    password: isEditMode
      ? z.string().optional().or(z.literal(''))
      : z.string().min(6, 'Password must be at least 6 characters'),
  });

type FormValues = z.infer<ReturnType<typeof getFormSchema>>;

interface EmployeeFormProps {
  mode: 'create' | 'edit';
  initialData?: CoreUser | null;
  onSuccess: () => void;
}

function flattenPositions(tree: PositionOption[], prefix = ''): { id: string; label: string }[] {
  const result: { id: string; label: string }[] = [];
  for (const node of tree) {
    const indent = prefix ? `${prefix} › ` : '';
    result.push({ id: node.id, label: `${indent}${node.positionName}` });
    if (node.children?.length) result.push(...flattenPositions(node.children, `${indent}${node.positionName}`));
  }
  return result;
}

export function EmployeeForm({ mode, initialData, onSuccess }: EmployeeFormProps) {
  const router = useRouter();
  const isEditMode = mode === 'edit';

  const {
    positions,
    isLoadingPositions,
    secondaryPositions,
    isLoadingSecondary,
    assignSecondary,
    removeSecondary,
    submitCreate,
    submitUpdate,
  } = useEmployeeFormData(isEditMode, initialData);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(getFormSchema(isEditMode)),
    defaultValues: {
      fullName: '', birthDate: '', gender: '', phoneNumber: '',
      email: '', address: '', nip: '',
      defaultPositionId: undefined,
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
        defaultPositionId: initialData.primaryPosition?.positionId,
        joinDate: initialData.joinDate || '',
        password: '',
      });
    }
  }, [initialData, form]);

  const NIL_UUID = '00000000-0000-0000-0000-000000000000';
  const flatPositions = useMemo(() => flattenPositions(positions), [positions]);

  // ── Multi-position: secondary positions (edit mode only) ──
  const [assignSearch, setAssignSearch] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const flatPositionOptions = useMemo(() => {
    const excludeIds = new Set(secondaryPositions.map(up => up.positionId));
    const result: PositionOption[] = [];
    const walk = (nodes: PositionOption[]) => {
      for (const node of nodes) {
        if (!excludeIds.has(node.id)) result.push(node);
        if (node.children?.length) walk(node.children);
      }
    };
    walk(positions);
    return result;
  }, [positions, secondaryPositions]);

  const handleAssignSecondary = async (positionId: string) => {
    if (!initialData) return;
    setIsAssigning(true);
    const ok = await assignSecondary(positionId, initialData.id);
    setIsAssigning(false);
    if (ok) {
      setAssignSearch('');
    }
  };

  const handleRemoveSecondary = async (up: UserPositionResponse) => {
    await removeSecondary(up);
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    const base = {
      email: values.email, fullName: values.fullName,
      nip: values.nip || undefined, defaultPositionId: values.defaultPositionId || null,
      joinDate: values.joinDate, phoneNumber: values.phoneNumber || undefined,
      gender: values.gender || undefined, birthDate: values.birthDate || undefined,
      address: values.address || undefined,
    };
    let ok: boolean;
    if (isEditMode && initialData) {
      ok = await submitUpdate(initialData.id, base as UserUpdateRequest);
    } else {
      ok = await submitCreate({ ...base, password: values.password } as UserCreateRequest & { password: string });
    }
    setIsSubmitting(false);
    if (ok) onSuccess();
  };
  if (isLoadingPositions) {
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
        <BreadcrumbsItem href="/organization/employees">Employees</BreadcrumbsItem>
        <BreadcrumbsItem>{isEditMode ? 'Edit' : 'Add'}</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center gap-3">
        <Button isIconOnly variant="tertiary" onPress={() => router.back()} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">
          {isEditMode ? 'Edit Employee' : 'Add New Employee'}
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

        {/* ── PERSONAL INFORMATION ── */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">Personal Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller control={form.control} name="fullName" render={({ field, fieldState }) => (
              <TextField isRequired validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                <Label>Full Name</Label>
                <Input placeholder="Enter full name" />
                <FieldError>{fieldState.error?.message}</FieldError>
              </TextField>
            )} />
            <Controller control={form.control} name="gender" render={({ field }) => (
              <Select className="w-full" selectedKey={field.value || null} onSelectionChange={(k) => field.onChange(String(k || ''))} isDisabled={isSubmitting} placeholder="Select gender">
                <Label>Gender</Label>
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
              <DateFieldPicker label="Date of Birth" value={field.value || ''} onChange={field.onChange} isDisabled={isSubmitting} />
            )} />
            <Controller control={form.control} name="phoneNumber" render={({ field, fieldState }) => (
              <TextField validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                <Label>Phone Number</Label>
                <Input placeholder="08xxxxxxxxxx" type="tel" />
                <FieldError>{fieldState.error?.message}</FieldError>
              </TextField>
            )} />
          </div>
          <Controller control={form.control} name="email" render={({ field, fieldState }) => (
            <TextField isRequired validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
              <Label>Email</Label>
              <Input placeholder="example@company.com" type="email" />
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )} />
          <Controller control={form.control} name="address" render={({ field, fieldState }) => (
            <TextField validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
              <Label>Address</Label>
              <TextArea placeholder="Enter address" rows={3} />
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )} />
        </div>

        <Separator />

        {/* ── EMPLOYMENT DATA ── */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">Employment Data</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller control={form.control} name="nip" render={({ field, fieldState }) => (
              <TextField validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                <Label>NIP</Label>
                <Input placeholder="Enter NIP" />
                <FieldError>{fieldState.error?.message}</FieldError>
              </TextField>
            )} />
            <Controller control={form.control} name="defaultPositionId" render={({ field }) => {
              const selectedKey = field.value || NIL_UUID;
              const handleChange = (k: React.Key | null) => {
                field.onChange(k === NIL_UUID ? undefined : String(k));
              };
              return (
              <Select key={selectedKey} className="w-full" selectedKey={selectedKey} onSelectionChange={handleChange} isDisabled={isSubmitting || isLoadingPositions} placeholder="Select position">
                <Label>Position</Label>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item key={NIL_UUID} id={NIL_UUID} textValue="No Position">No Position</ListBox.Item>
                    {flatPositions.map((p) => <ListBox.Item key={p.id} id={String(p.id)} textValue={p.label}>{p.label}</ListBox.Item>)}
                  </ListBox>
                </Select.Popover>
              </Select>
              );
            }} />
            <Controller control={form.control} name="joinDate" render={({ field, fieldState }) => (
              <DateFieldPicker label="Join Date" value={field.value || ''} onChange={field.onChange} isDisabled={isSubmitting} isRequired isInvalid={fieldState.invalid} errorMessage={fieldState.error?.message} />
            )} />
            {!isEditMode && (
              <Controller control={form.control} name="password" render={({ field, fieldState }) => (
                <TextField isRequired validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                  <Label>Password</Label>
                  <Input placeholder="At least 6 characters" type="password" />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )} />
            )}
          </div>
        </div>
        {/* ── SECONDARY POSITIONS (edit mode only) ── */}
        {isEditMode && (
          <>
            <h2 className="text-sm font-semibold text-foreground">Secondary Positions</h2>
            <Surface className="flex flex-col gap-4 rounded-3xl p-6" variant="secondary">

            {/* ComboBox for assigning one position */}
            <ComboBox
              className="w-full"
              inputValue={assignSearch}
              onInputChange={setAssignSearch}
              onSelectionChange={(key) => {
                if (key) {
                  handleAssignSecondary(String(key));
                  setAssignSearch('');
                }
              }}
              selectedKey={null}
              isDisabled={isSubmitting || isAssigning}
              menuTrigger="input"
            >
              <Label>Assign Position</Label>
              <ComboBox.InputGroup>
                <Input placeholder="Search positions..." />
                <ComboBox.Trigger />
              </ComboBox.InputGroup>
              <ComboBox.Popover>
                <ListBox>
                  {flatPositionOptions.map((pos) => (
                    <ListBox.Item key={pos.id} id={pos.id} textValue={`${pos.positionName} (${pos.positionCode})`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{pos.positionName}</span>
                        <span className="ml-2 text-xs text-gray-400">{pos.positionCode}</span>
                      </div>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </ComboBox.Popover>
            </ComboBox>

            <h3 className="text-sm font-semibold text-foreground">Assigned Positions</h3>
            {(() => {
              const nonPrimary = secondaryPositions.filter(p => !p.isPrimary && p.isActive);
              if (nonPrimary.length === 0) {
                return <p className="text-sm text-gray-400">No secondary positions</p>;
              }
              return (
                <div className="space-y-2">
                  {nonPrimary.map(up => (
                    <div key={up.id} className="flex items-center gap-2">
                      <TextField className="flex-1" isReadOnly>
                        <Input value={`${up.positionName} (${up.positionCode})`} readOnly />
                      </TextField>
                      <Button
                        isIconOnly
                        variant="danger-soft"
                        size="sm"
                        aria-label={`Remove ${up.positionName}`}
                        isDisabled={isSubmitting || isAssigning}
                        onPress={() => handleRemoveSecondary(up)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Surface>
          </>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onPress={() => router.back()} isDisabled={isSubmitting}>Cancel</Button>
          <Button type="submit" variant="primary" isDisabled={isSubmitting} isPending={isSubmitting}>
            <FloppyDisk className="h-4 w-4" />
            {isEditMode ? 'Save Changes' : 'Save'}
          </Button>
        </div>
      </Form>
    </div>
  );
}
