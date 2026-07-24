'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { House, ArrowLeft, FloppyDisk, Briefcase, X, Plus } from '@phosphor-icons/react';
import {
  Button,
  TextField,
  Input,
  Label,
  FieldError,
  Breadcrumbs,
  BreadcrumbsItem,
  Select,
  ListBox,
  TextArea,
  Surface,
  Spinner,
  SearchField,
  toast,
} from '@heroui/react';

import { DateFieldPicker } from '@/components/shared/date-field-picker';
import { GENDER, GENDER_LABEL } from '@/constants/gender';
import type { CoreUser, UserCreateRequest, UserUpdateRequest, PositionOption, UserPositionResponse } from '../types';
import { useDebounce } from '@/hooks/use-debounce';
import { useEmployeeFormData } from '../hooks/use-employee-form-data';

const getFormSchema = (isEditMode: boolean) =>
  z.object({
    fullName: z.string().min(1, 'Full name is required'),
    birthDate: z.string().optional(),
    gender: z.string().optional(),
    phoneNumber: z.string().optional().refine((val) => !val || /^[0-9+\-\s()]*$/.test(val), {
      message: 'Phone number must only contain digits',
    }),
    email: z.string().email('Invalid email format'),
    address: z.string().optional(),
    nip: z.string().optional(),
    defaultPositionId: z.string().optional(),
    joinDate: isEditMode
      ? z.string().optional()
      : z.string().min(1, 'Join date is required'),
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
  const [isAssignExpanded, setIsAssignExpanded] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignResults, setAssignResults] = useState<PositionOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const debouncedAssignSearch = useDebounce(assignSearch, 400);

  // Debounced position search for inline assign
  useEffect(() => {
    if (!debouncedAssignSearch.trim()) { setAssignResults([]); return; }
    let cancelled = false;
    setIsSearching(true);
    const q = debouncedAssignSearch.toLowerCase();
    const filtered = positions.filter(p => p.positionName.toLowerCase().includes(q) || p.positionCode.toLowerCase().includes(q)).slice(0, 10);
    if (!cancelled) { setAssignResults(filtered); setIsSearching(false); }
    return () => { cancelled = true; };
  }, [debouncedAssignSearch, positions]);

  const handleAssignSecondary = async (positionId: string) => {
    if (!initialData) return;
    setIsAssigning(true);
    const ok = await assignSecondary(positionId, initialData.id);
    setIsAssigning(false);
    if (ok) {
      setIsAssignExpanded(false);
      setAssignSearch('');
      setAssignResults([]);
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
        <BreadcrumbsItem href="/hr">HR</BreadcrumbsItem>
        <BreadcrumbsItem href="/hr/organization/employees">Employees</BreadcrumbsItem>
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

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">

        {/* ── PERSONAL INFORMATION ── */}
        <Surface className="flex flex-col gap-4 rounded-3xl p-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Personal Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller control={form.control} name="fullName" render={({ field, fieldState }) => (
              <TextField isRequired validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} isInvalid={!!fieldState.error} isDisabled={isSubmitting}>
                <Label>Full Name</Label>
                <Input variant="secondary" placeholder="Enter full name" />
                {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
              </TextField>
            )} />
            <Controller control={form.control} name="gender" render={({ field }) => (
              <Select variant="secondary" className="w-full" selectedKey={field.value || null} onSelectionChange={(k) => field.onChange(String(k || ''))} isDisabled={isSubmitting} placeholder="Select gender">
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
              <TextField validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} isInvalid={!!fieldState.error} isDisabled={isSubmitting}>
                <Label>Phone Number</Label>
                <Input variant="secondary" placeholder="08xxxxxxxxxx" type="tel" />
                {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
              </TextField>
            )} />
          </div>
          <Controller control={form.control} name="email" render={({ field, fieldState }) => (
            <TextField isRequired validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} isInvalid={!!fieldState.error} isDisabled={isSubmitting}>
              <Label>Email</Label>
              <Input variant="secondary" placeholder="example@company.com" type="email" />
              {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
            </TextField>
          )} />
          <Controller control={form.control} name="address" render={({ field, fieldState }) => (
            <TextField validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} isInvalid={!!fieldState.error} isDisabled={isSubmitting}>
              <Label>Address</Label>
              <TextArea variant="secondary" placeholder="Enter address" rows={3} />
              {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
            </TextField>
          )} />
        </Surface>

        {/* ── EMPLOYMENT DATA ── */}
        <Surface className="flex flex-col gap-4 rounded-3xl p-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Employment Data</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller control={form.control} name="nip" render={({ field, fieldState }) => (
              <TextField validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} isInvalid={!!fieldState.error} isDisabled={isSubmitting}>
                <Label>NIP</Label>
                <Input variant="secondary" placeholder="Enter NIP" />
                {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
              </TextField>
            )} />
            <Controller control={form.control} name="defaultPositionId" render={({ field }) => {
              const selectedKey = field.value || NIL_UUID;
              const handleChange = (k: React.Key | null) => {
                field.onChange(k === NIL_UUID ? undefined : String(k));
              };
              return (
              <Select key={selectedKey} variant="secondary" className="w-full" selectedKey={selectedKey} onSelectionChange={handleChange} isDisabled={isSubmitting || isLoadingPositions} placeholder="Select position">
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
              <DateFieldPicker label="Join Date" value={field.value || ''} onChange={field.onChange} isDisabled={isSubmitting} isRequired={!isEditMode} isInvalid={!!fieldState.error} errorMessage={fieldState.error?.message} />
            )} />
            {!isEditMode && (
              <Controller control={form.control} name="password" render={({ field, fieldState }) => (
                <TextField isRequired validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} isInvalid={!!fieldState.error} isDisabled={isSubmitting}>
                  <Label>Password</Label>
                  <Input variant="secondary" placeholder="At least 6 characters" type="password" />
                  {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                </TextField>
              )} />
            )}
          </div>
        </Surface>

        {/* ── SECONDARY POSITIONS (edit mode only) ── */}
        {isEditMode && (
          <Surface className="flex flex-col gap-4 rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Secondary Positions</h2>
              <Button
                variant={isAssignExpanded ? 'secondary' : 'primary'}
                size="sm"
                onPress={() => { setIsAssignExpanded(!isAssignExpanded); setAssignSearch(''); setAssignResults([]); }}
                isDisabled={isSubmitting || isAssigning}
              >
                {isAssignExpanded ? <><X className="h-4 w-4" />Cancel</> : <><Plus className="h-4 w-4" />Add Secondary</>}
              </Button>
            </div>

            {/* Inline assign */}
            {isAssignExpanded && (
              <div className="space-y-2">
                <SearchField value={assignSearch} onChange={setAssignSearch} variant="secondary" autoFocus isDisabled={isAssigning}>
                  <SearchField.Group>
                    <SearchField.SearchIcon />
                    <SearchField.Input placeholder="Search positions..." />
                    <SearchField.ClearButton />
                  </SearchField.Group>
                </SearchField>
                {isSearching ? (
                  <div className="flex justify-center py-2"><Spinner size="sm" /></div>
                ) : assignResults.length > 0 ? (
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {assignResults
                      .filter(pos => !secondaryPositions.some(up => up.positionId === pos.id))
                      .map(pos => (
                        <Button
                          key={pos.id}
                          variant="ghost"
                          className="w-full justify-between rounded-xl bg-surface-secondary px-4 py-2.5 text-left text-sm h-auto"
                          isDisabled={isAssigning}
                          onPress={() => handleAssignSecondary(pos.id)}
                        >
                          <span>
                            <span className="font-medium text-foreground">{pos.positionName}</span>
                            <span className="ml-2 text-xs text-gray-400">{pos.positionCode}</span>
                          </span>
                          <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </Button>
                      ))}
                  </div>
                ) : assignSearch.trim() ? (
                  <p className="py-2 text-center text-sm text-gray-400">No results</p>
                ) : null}
              </div>
            )}

            {/* Existing secondary positions */}
            {(() => {
              const nonPrimary = secondaryPositions.filter(p => !p.isPrimary && p.isActive);
              if (nonPrimary.length === 0 && !isAssignExpanded) {
                return <p className="text-sm text-gray-400">No secondary positions</p>;
              }
              return (
                <div className="space-y-2">
                  {nonPrimary.map(up => (
                    <div key={up.id} className="flex items-center justify-between rounded-xl bg-surface-secondary px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Briefcase className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <span className="font-medium text-foreground">{up.positionName}</span>
                          <span className="ml-2 text-xs text-gray-400">{up.positionCode}</span>
                        </div>
                      </div>
                      <Button
                        isIconOnly
                        variant="danger-soft"
                        size="sm"
                        aria-label={`Remove ${up.positionName}`}
                        isDisabled={isSubmitting || isAssigning}
                        onPress={() => handleRemoveSecondary(up)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Surface>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onPress={() => router.back()} isDisabled={isSubmitting}>Cancel</Button>
          <Button type="submit" variant="primary" isDisabled={isSubmitting} isPending={isSubmitting}>
            <FloppyDisk className="h-4 w-4" />
            {isEditMode ? 'Save Changes' : 'Save'}
          </Button>
        </div>
      </form>
    </div>
  );
}
