'use client';

import { useEffect, useState, useMemo, useCallback, Fragment } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { House, ArrowLeft, FloppyDisk } from '@phosphor-icons/react';
import {
  Button, Form, TextField, Input, Label, FieldError,
  Breadcrumbs, BreadcrumbsItem, TextArea, Switch, Separator,
  Alert, Spinner,
} from '@heroui/react';

import { useRoleFormData } from '../hooks/use-role-form-data';
import type { CreateRoleRequest, UpdateRoleRequest, Role, Permission } from '../types';

const getFormSchema = (isEditMode: boolean) =>
  z.object({
    roleCode: z.string().min(1, 'Role code is required').max(255, 'Role code max 255 characters'),
    roleName: z.string().min(1, 'Role name is required').max(255, 'Role name max 255 characters'),
    description: z.string().max(500, 'Description max 500 characters').optional(),
    permissionIds: z.array(z.number()).optional(),
  });

type FormValues = z.infer<ReturnType<typeof getFormSchema>>;

interface RoleFormProps {
  mode: 'create' | 'edit';
  initialData?: Role | null;
  onSuccess: () => void;
}

const moduleLabels: Record<string, string> = {
  organization_unit: 'Organization Unit',
  position: 'Position',
  user: 'User',
  role: 'Role & Permission',
  permission: 'Permission',
};

function PermissionRow({ perm, isSelected, onToggle, isDisabled }: {
  perm: Permission;
  isSelected: boolean;
  onToggle: (checked: boolean) => void;
  isDisabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-foreground">{perm.description}</span>
        <span className="text-xs text-gray-400">{perm.permissionCode}</span>
      </div>
      <Switch
        isSelected={isSelected}
        onChange={onToggle}
        isDisabled={isDisabled}
        aria-label={`Toggle ${perm.permissionCode}`}
      >
        <Switch.Control><Switch.Thumb /></Switch.Control>
      </Switch>
    </div>
  );
}

export function RoleForm({ mode, initialData, onSuccess }: RoleFormProps) {
  const router = useRouter();
  const isEditMode = mode === 'edit';

  const {
    permissions,
    modules,
    permissionsByModule,
    isLoadingPermissions,
    submitCreate,
    submitUpdate,
  } = useRoleFormData();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(getFormSchema(isEditMode)),
    defaultValues: {
      roleCode: '',
      roleName: '',
      description: '',
      permissionIds: [],
    },
  });

  // Prefill on edit: map the role's permission codes to permission IDs
  useEffect(() => {
    if (isEditMode && initialData && permissions.length > 0) {
      const permIds = permissions
        .filter((p) => initialData.permissions.includes(p.permissionCode))
        .map((p) => p.id);
      form.reset({
        roleCode: initialData.roleCode,
        roleName: initialData.roleName,
        description: initialData.description ?? '',
        permissionIds: permIds,
      });
    }
  }, [isEditMode, initialData, permissions, form]);

  const selectedPermIds = form.watch('permissionIds') || [];

  const handleTogglePermission = useCallback((permId: number, checked: boolean) => {
    const current = form.getValues('permissionIds') || [];
    form.setValue('permissionIds', checked
      ? (current.includes(permId) ? current : [...current, permId])
      : current.filter((id) => id !== permId),
      { shouldDirty: true });
  }, [form]);

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);

    const base = {
      roleCode: values.roleCode,
      roleName: values.roleName,
      description: values.description || undefined,
      permissionIds: values.permissionIds || [],
    };

    if (isEditMode && initialData) {
      const ok = await submitUpdate(initialData.id, base as UpdateRoleRequest);
      setIsSubmitting(false);
      if (ok) onSuccess();
      else setSubmitError('Failed to update role');
    } else {
      const ok = await submitCreate(base as CreateRoleRequest);
      setIsSubmitting(false);
      if (ok) onSuccess();
      else setSubmitError('Failed to add role');
    }
  };

  // Modules that actually have permissions (for separator placement between rendered groups)
  const groupedModules = useMemo(
    () => modules.filter((m) => (permissionsByModule[m] || []).length > 0),
    [modules, permissionsByModule],
  );

  if (isLoadingPermissions) {
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
        <BreadcrumbsItem>Settings</BreadcrumbsItem>
        <BreadcrumbsItem href="/settings/roles">Access Control & Roles</BreadcrumbsItem>
        <BreadcrumbsItem>{isEditMode ? 'Edit' : 'Add'}</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center gap-3">
        <Button isIconOnly variant="tertiary" onPress={() => router.back()} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">
          {isEditMode ? 'Edit Role' : 'Add New Role'}
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

        {/* ── ROLE INFORMATION ── */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">Role Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="roleCode"
              render={({ field, fieldState }) => (
                <TextField isRequired validationBehavior="native" className="w-full"
                  name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref}
                  isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                  <Label>Role Code</Label>
                  <Input placeholder="Example: ROLE_MANAGER" />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )}
            />
            <Controller
              control={form.control}
              name="roleName"
              render={({ field, fieldState }) => (
                <TextField isRequired validationBehavior="native" className="w-full"
                  name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref}
                  isInvalid={fieldState.invalid} isDisabled={isSubmitting}>
                  <Label>Role Name</Label>
                  <Input placeholder="Example: Manager" />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
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
                <TextArea placeholder="Brief role description" rows={2} />
                <FieldError>{fieldState.error?.message}</FieldError>
              </TextField>
            )}
          />
        </div>

        <Separator />

        {/* ── PERMISSIONS ── */}
        <div className="relative flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">Permissions</h2>
          {groupedModules.length === 0 ? (
            <p className="text-sm text-gray-400">No permissions available</p>
          ) : (
            groupedModules.map((module, idx) => {
              const modulePerms = permissionsByModule[module] || [];
              const leftCount = Math.ceil(modulePerms.length / 2);
              const leftPerms = modulePerms.slice(0, leftCount);
              const rightPerms = modulePerms.slice(leftCount);
              return (
                <Fragment key={module}>
                  {idx > 0 && <Separator className="w-full" />}
                  <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      {moduleLabels[module] || module}
                    </h3>
                    <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                      <div className="flex flex-col gap-1">
                        {leftPerms.map((perm) => (
                          <PermissionRow
                            key={perm.id}
                            perm={perm}
                            isSelected={selectedPermIds.includes(perm.id)}
                            onToggle={(checked) => handleTogglePermission(perm.id, checked)}
                            isDisabled={isSubmitting}
                          />
                        ))}
                      </div>
                      <div className="flex flex-col gap-1">
                        {rightPerms.map((perm) => (
                          <PermissionRow
                            key={perm.id}
                            perm={perm}
                            isSelected={selectedPermIds.includes(perm.id)}
                            onToggle={(checked) => handleTogglePermission(perm.id, checked)}
                            isDisabled={isSubmitting}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </Fragment>
              );
            })
          )}
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
