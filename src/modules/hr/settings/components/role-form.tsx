'use client';

import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { House, FloppyDisk, X } from '@phosphor-icons/react';
import {
  Button,
  TextField,
  Input,
  Label,
  FieldError,
  Breadcrumbs,
  BreadcrumbsItem,
  TextArea,
  Surface,
  Spinner,
  Switch,
} from '@heroui/react';

import { useRoleFormData } from '../hooks/use-role-form-data';
import type { CreateRoleRequest, UpdateRoleRequest, Role } from '../types';

const getFormSchema = (isEditMode: boolean) =>
  z.object({
    roleCode: z.string().min(1, 'Role code is required'),
    roleName: z.string().min(1, 'Role name is required'),
    description: z.string().optional(),
    permissionIds: z.array(z.number()).optional(),
  });

type FormValues = z.infer<ReturnType<typeof getFormSchema>>;

interface RoleFormProps {
  mode: 'create' | 'edit';
  initialData?: Role | null;
  roleId?: number;
  onSuccess: () => void;
}

const moduleLabels: Record<string, string> = {
  position: 'Position',
  user: 'User',
  role: 'Role & Permission',
  permission: 'Permission',
};

export function RoleForm({ mode, initialData, roleId, onSuccess }: RoleFormProps) {
  const router = useRouter();
  const isEditMode = mode === 'edit';

  const {
    permissionsByModule,
    modules,
    isLoadingPermissions,
    submitCreate,
    submitUpdate,
  } = useRoleFormData();

  const { control, handleSubmit, reset, watch } = useForm<FormValues>({
    resolver: zodResolver(getFormSchema(isEditMode)),
    defaultValues: {
      roleCode: '',
      roleName: '',
      description: '',
      permissionIds: [],
    },
  });

  // Stable string representation of permissionsByModule for dependency comparison
  const permissionsByModuleKey = useMemo(
    () => JSON.stringify(Object.keys(permissionsByModule)),
    [permissionsByModule],
  );

  // Stable key for initialData
  const initialDataKey = useMemo(
    () => JSON.stringify(initialData),
    [initialData],
  );

  useEffect(() => {
    if (isEditMode && initialData) {
      const permIds = Object.values(permissionsByModule)
        .flat()
        .filter((p) => initialData.permissions.includes(p.permissionCode))
        .map((p) => p.id);
      reset({
        roleCode: initialData.roleCode,
        roleName: initialData.roleName,
        description: initialData.description || '',
        permissionIds: permIds,
      });
    }
  }, [isEditMode, initialDataKey, permissionsByModuleKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedPermIds = watch('permissionIds') || [];

  const handleSave = async () => {
    const result = await handleSubmit(async (data) => {
      if (isEditMode && roleId) {
        const ok = await submitUpdate(roleId, data as UpdateRoleRequest);
        if (ok) onSuccess();
      } else {
        const ok = await submitCreate(data as CreateRoleRequest);
        if (ok) onSuccess();
      }
    })();
  };

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
        <BreadcrumbsItem href="/">
          <House className="h-4 w-4" />
        </BreadcrumbsItem>
        <BreadcrumbsItem href="/hr">HR</BreadcrumbsItem>
        <BreadcrumbsItem href="/hr/settings/roles">Access Control & Roles</BreadcrumbsItem>
        <BreadcrumbsItem>{isEditMode ? 'Edit Role' : 'Create Role'}</BreadcrumbsItem>
      </Breadcrumbs>

      <Surface className="rounded-3xl p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
          Role Information
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <Controller
            name="roleCode"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <TextField isRequired isInvalid={!!error}>
                <Label>Role Code</Label>
                <Input variant="secondary" placeholder="ROLE_MANAGER" {...field} />
                <FieldError />
              </TextField>
            )}
          />

          <Controller
            name="roleName"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <TextField isRequired isInvalid={!!error}>
                <Label>Role Name</Label>
                <Input variant="secondary" placeholder="Manager" {...field} />
                <FieldError />
              </TextField>
            )}
          />

          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField>
                <Label>Description</Label>
                <TextArea variant="secondary" placeholder="Role description..." rows={3} {...field} />
              </TextField>
            )}
          />
        </div>
      </Surface>

      <Surface className="rounded-3xl p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
          Permissions
        </h2>
        <div className="space-y-6">
          {modules.map((module) => {
            const modulePerms = permissionsByModule[module] || [];
            if (modulePerms.length === 0) return null;
            return (
              <div key={module}>
                <h3 className="mb-3 font-medium text-foreground">
                  {moduleLabels[module] || module}
                </h3>
                <div className="grid gap-3 sm:grid-cols-1">
                  {modulePerms.map((perm) => {
                    const isSelected = selectedPermIds.includes(perm.id);
                    return (
                      <Controller
                        key={perm.id}
                        name="permissionIds"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            isSelected={isSelected}
                            onChange={(checked) => {
                              const current = field.value || [];
                              if (checked) {
                                field.onChange([...current, perm.id]);
                              } else {
                                field.onChange(current.filter((id) => id !== perm.id));
                              }
                            }}
                          >
                            <Switch.Content>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium text-sm text-foreground">{perm.description}</span>
                                <span className="text-xs text-gray-400">{perm.permissionCode}</span>
                              </div>
                            </Switch.Content>
                            <Switch.Control><Switch.Thumb /></Switch.Control>
                          </Switch>
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Surface>

      <div className="flex items-center gap-3 justify-end">
        <Button variant="secondary" onPress={() => router.back()}>
          <X className="h-4 w-4" />
          Cancel
        </Button>
        <Button variant="primary" onPress={handleSave}>
          <FloppyDisk className="h-4 w-4" />
          Save
        </Button>
      </div>
    </div>
  );
}