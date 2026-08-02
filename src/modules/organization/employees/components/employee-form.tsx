'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { House, ArrowLeft, FloppyDisk, Trash, Tray } from '@phosphor-icons/react';
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
  ComboBox,
  Collection,
  EmptyState,
  Chip,
  Table,
  Spinner,
} from '@heroui/react';

import { DateFieldPicker } from '@/components/shared/date-field-picker';
import { GENDER, GENDER_LABEL } from '@/constants/gender';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import type { CoreUser, UserCreateRequest, UserUpdateRequest, PositionOption, UserPositionInput } from '../types';
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

/** A position in the pending assignment list (local until form submit). */
interface PendingPosition {
  positionId: string;
  positionName: string;
  positionCode: string;
  isPrimary: boolean;
  startDate: string;
}

export function EmployeeForm({ mode, initialData, onSuccess }: EmployeeFormProps) {
  const router = useRouter();
  const isEditMode = mode === 'edit';
  const { hasPerm, hasAnyPerm } = usePermission();
  // Correction #3: position fields appear only with user:manage AND
  // (position:read OR position:manage). Omitted from the payload otherwise —
  // backend leaves existing assignments untouched (update) / creates a
  // positionless user (create).
  const canAssignPositions = hasPerm(PERM.USER_MANAGE)
    && hasAnyPerm(PERM.POSITION_READ, PERM.POSITION_MANAGE);

  const {
    positions,
    isLoadingPositions,
    submitCreate,
    submitUpdate,
  } = useEmployeeFormData(isEditMode, initialData);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Pending position assignments (local until submit) ──
  const [pendingPositions, setPendingPositions] = useState<PendingPosition[]>([]);
  const [assignSearch, setAssignSearch] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<PositionOption | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(getFormSchema(isEditMode)),
    defaultValues: {
      fullName: '', birthDate: '', gender: '', phoneNumber: '',
      email: '', address: '', nip: '',
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
        joinDate: initialData.joinDate || '',
        password: '',
      });
    }
  }, [initialData, form]);

  // Prefill pending positions with the employee's current active assignments (edit mode)
  useEffect(() => {
    if (isEditMode && initialData) {
      const active = (initialData.positions ?? []).filter((p) => p.isActive);
      setPendingPositions(active.map((up) => ({
        positionId: up.positionId,
        positionName: up.positionName,
        positionCode: up.positionCode,
        isPrimary: up.isPrimary,
        startDate: up.startDate,
      })));
    }
  }, [isEditMode, initialData]);

  // ── Position selector helpers ──
  const flatPositionOptions = useMemo(() => {
    const result: PositionOption[] = [];
    const walk = (nodes: PositionOption[]) => {
      for (const node of nodes) {
        result.push(node);
        if (node.children?.length) walk(node.children);
      }
    };
    walk(positions);
    return result;
  }, [positions]);

  const departmentByPositionId = useMemo(() => {
    const map = new Map<string, string>();
    const walk = (nodes: PositionOption[]) => {
      for (const node of nodes) {
        if (node.organizationUnit?.unitName) map.set(node.id, node.organizationUnit.unitName);
        if (node.children?.length) walk(node.children);
      }
    };
    walk(positions);
    return map;
  }, [positions]);

  const selectedPositionIds = useMemo(
    () => new Set(pendingPositions.map((p) => p.positionId)),
    [pendingPositions],
  );

  // Add the selected position to the pending list (first added becomes primary)
  const handleAddPosition = useCallback(() => {
    if (!selectedPosition) return;
    setPendingPositions((prev) => {
      if (prev.some((p) => p.positionId === selectedPosition.id)) return prev;
      return [...prev, {
        positionId: selectedPosition.id,
        positionName: selectedPosition.positionName,
        positionCode: selectedPosition.positionCode,
        isPrimary: prev.length === 0,
        startDate: new Date().toISOString().split('T')[0],
      }];
    });
    setSelectedPosition(null);
    setAssignSearch('');
  }, [selectedPosition]);

  // Remove a position from the pending list; promote the first remaining if the primary was removed
  const handleRemovePosition = useCallback((positionId: string) => {
    setPendingPositions((prev) => {
      const next = prev.filter((p) => p.positionId !== positionId);
      if (next.length > 0 && !next.some((p) => p.isPrimary)) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return next;
    });
  }, []);

  // Set a position as the new primary, replacing the previous primary selection
  const handleSetPrimary = useCallback((positionId: string) => {
    setPendingPositions((prev) =>
      prev.map((p) => ({ ...p, isPrimary: p.positionId === positionId })),
    );
  }, []);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    const base: UserUpdateRequest = {
      email: values.email, fullName: values.fullName,
      nip: values.nip || undefined,
      joinDate: values.joinDate, phoneNumber: values.phoneNumber || undefined,
      gender: values.gender || undefined, birthDate: values.birthDate || undefined,
      address: values.address || undefined,
    };

    // Complete position-assignment set goes through the create/update contract.
    // Omitted entirely when the user lacks position:assign_user (backend leaves positions untouched).
    if (canAssignPositions) {
      const positionInputs: UserPositionInput[] = pendingPositions.map((p) => ({
        positionId: p.positionId,
        isPrimary: p.isPrimary,
        startDate: p.startDate,
      }));
      base.positions = positionInputs;
    }

    let ok: boolean;
    if (isEditMode && initialData) {
      ok = await submitUpdate(initialData.id, base);
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

        {/* ── POSITIONS (bulk assignment) ── */}
        {canAssignPositions && (
          <>
            <Separator />
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-foreground">Positions</h2>

              {/* Position selector — HeroUI ComboBox + inline Submit (Position Detail pattern) */}
              <div className="flex items-start gap-2">
                <ComboBox
                  aria-label="Search position"
                  className="flex-1"
                  inputValue={assignSearch}
                  onInputChange={setAssignSearch}
                  onSelectionChange={(key) => {
                    const pos = flatPositionOptions.find((p) => p.id === key);
                    setSelectedPosition(pos ?? null);
                  }}
                  disabledKeys={[...selectedPositionIds]}
                  isDisabled={isSubmitting}
                  allowsEmptyCollection
                  defaultFilter={() => true}
                  menuTrigger="input"
                >
                  <ComboBox.InputGroup>
                    <Input placeholder="Search position..." />
                    <ComboBox.Trigger />
                  </ComboBox.InputGroup>
                  <ComboBox.Popover>
                    <ListBox
                      renderEmptyState={() => (
                        <EmptyState>No positions found</EmptyState>
                      )}
                    >
                      <Collection items={flatPositionOptions}>
                        {(pos) => (
                          <ListBox.Item key={pos.id} id={pos.id} textValue={pos.positionName}>
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{pos.positionName}</span>
                              <span className="text-xs text-muted-foreground">{pos.positionCode}</span>
                            </div>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        )}
                      </Collection>
                    </ListBox>
                  </ComboBox.Popover>
                </ComboBox>
                <Button
                  variant="primary"
                  onPress={handleAddPosition}
                  isDisabled={!selectedPosition || isSubmitting}
                >
                  Submit
                </Button>
              </div>

              {/* Selected positions table */}
              <Table>
                <Table.ScrollContainer>
                  <Table.Content aria-label="Selected Positions" className="min-w-[500px]">
                    <Table.Header>
                      <Table.Column id="name" isRowHeader>Position Name</Table.Column>
                      <Table.Column id="code">Code</Table.Column>
                      <Table.Column id="department">Department</Table.Column>
                      <Table.Column id="primary">Primary</Table.Column>
                      <Table.Column id="actions" aria-label="Actions" className="text-center">{''}</Table.Column>
                    </Table.Header>
                    <Table.Body
                      renderEmptyState={() =>
                        pendingPositions.length === 0 ? (
                          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                            <Tray className="h-8 w-8" />
                            <span className="text-sm">No positions assigned</span>
                          </div>
                        ) : null
                      }
                    >
                      {pendingPositions.map((p) => (
                        <Table.Row key={p.positionId} id={p.positionId}>
                          <Table.Cell className="font-medium text-foreground">
                            {p.positionName}
                          </Table.Cell>
                          <Table.Cell className="text-muted-foreground">
                            {p.positionCode}
                          </Table.Cell>
                          <Table.Cell className="text-muted-foreground">
                            {departmentByPositionId.get(p.positionId) || '-'}
                          </Table.Cell>
                          <Table.Cell>
                            {p.isPrimary ? (
                              <Chip size="sm" variant="soft" color="accent">Primary</Chip>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="tertiary"
                                size="sm"
                                isDisabled={p.isPrimary || isSubmitting}
                                onPress={() => handleSetPrimary(p.positionId)}
                              >
                                Set Primary
                              </Button>
                              <Button
                                isIconOnly
                                variant="danger-soft"
                                size="sm"
                                aria-label={`Remove ${p.positionName}`}
                                isDisabled={isSubmitting}
                                onPress={() => handleRemovePosition(p.positionId)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            </div>
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
