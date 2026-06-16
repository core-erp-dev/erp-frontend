'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { House, ArrowLeft, Check } from '@phosphor-icons/react';
import {
  Button, TextField, Input, Label, FieldError,
  Breadcrumbs, BreadcrumbsItem, Spinner,
} from '@heroui/react';

import { organizationApi } from '@/modules/hr/hierarchy/services/organization-api';
import { roleApi } from '@/modules/hr/settings/services/role-api';
import type { PositionTree, PositionRequest, PositionUpdateRequest } from '@/modules/hr/hierarchy/types';
import type { RoleResponse } from '@/modules/hr/employees/types';
import { extractErrorMessage } from '@/types/api';

const formSchema = z.object({
  positionCode: z.string().min(1, 'Kode jabatan wajib diisi'),
  positionName: z.string().min(1, 'Nama jabatan wajib diisi'),
  description: z.string().optional(),
  parentId: z.string().nullable().optional(),
  roleIds: z.array(z.number()).min(1, 'Pilih minimal 1 role'),
});

type FormValues = z.infer<typeof formSchema>;

interface PositionFormProps {
  mode: 'create' | 'edit';
  initialData?: PositionTree | null;
  onSuccess: () => void;
}

export function PositionForm({ mode, initialData, onSuccess }: PositionFormProps) {
  const router = useRouter();
  const isEditMode = mode === 'edit';

  const [allPositions, setAllPositions] = useState<PositionTree[]>([]);
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      positionCode: '',
      positionName: '',
      description: '',
      parentId: null,
      roleIds: [],
    },
  });

  // Fetch positions tree + roles on mount
  useEffect(() => {
    (async () => {
      try {
        const [tree, rolesList] = await Promise.all([
          organizationApi.fetchPositionTree(),
          roleApi.getRoles(),
        ]);
        setAllPositions(tree);
        setRoles(rolesList);
      } catch {
        // fail silently
      } finally {
        setIsLoadingData(false);
      }
    })();
  }, []);

  // Populate form in edit mode
  useEffect(() => {
    if (initialData && roles.length > 0) {
      // Load current role assignments for this position
      organizationApi.getPositionRoles(initialData.id).then((posRoles) => {
        form.reset({
          positionCode: initialData.positionCode,
          positionName: initialData.positionName,
          description: initialData.description ?? '',
          parentId: initialData.parentId,
          roleIds: posRoles.map((r) => r.id),
        });
      });
    }
  }, [initialData, roles, form]);

  // Flatten positions for parent dropdown (exclude self in edit mode)
  const flatParents = useMemo(() => {
    const result: { id: string; label: string }[] = [];
    const walk = (nodes: PositionTree[], prefix = '') => {
      for (const n of nodes) {
        if (isEditMode && initialData && n.id === initialData.id) continue;
        result.push({ id: n.id, label: `${prefix}${n.positionName}` });
        if (n.children.length > 0) walk(n.children, `${prefix}${n.positionName} › `);
      }
    };
    walk(allPositions);
    return result;
  }, [allPositions, isEditMode, initialData]);

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (isEditMode && initialData) {
        const payload: PositionUpdateRequest = {
          positionCode: values.positionCode,
          positionName: values.positionName,
          description: values.description || undefined,
          parentId: values.parentId,
        };
        await organizationApi.updatePosition(initialData.id, payload);

        // Sync roles: get current, diff, add/remove
        const currentRoles = await organizationApi.getPositionRoles(initialData.id);
        const currentIds = currentRoles.map((r) => r.id);
        const toAdd = values.roleIds.filter((id) => !currentIds.includes(id));
        const toRemove = currentIds.filter((id) => !values.roleIds.includes(id));

        for (const roleId of toAdd) {
          await organizationApi.assignRoleToPosition(initialData.id, roleId);
        }
        for (const roleId of toRemove) {
          await organizationApi.removeRoleFromPosition(initialData.id, roleId);
        }
      } else {
        const payload: PositionRequest = {
          positionCode: values.positionCode,
          positionName: values.positionName,
          description: values.description || undefined,
          parentId: values.parentId || undefined,
        };
        const newPos = await organizationApi.createPosition(payload);

        // Assign roles to newly created position
        for (const roleId of values.roleIds) {
          await organizationApi.assignRoleToPosition(newPos.id, roleId);
        }
      }
      onSuccess();
    } catch (err) {
      setSubmitError(extractErrorMessage(err, 'Terjadi kesalahan'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem href="/hr">HR</BreadcrumbsItem>
        <BreadcrumbsItem href="/hr/positions">Jabatan</BreadcrumbsItem>
        <BreadcrumbsItem>{isEditMode ? 'Edit' : 'Tambah'}</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center gap-3">
        <Button isIconOnly variant="tertiary" onPress={() => router.push('/hr/positions')} aria-label="Kembali">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">
          {isEditMode ? 'Edit Jabatan' : 'Tambah Jabatan Baru'}
        </h1>
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-5">
        {/* Kode Jabatan */}
        <Controller
          control={form.control}
          name="positionCode"
          render={({ field, fieldState }) => (
            <TextField isRequired validationBehavior="aria" className="w-full"
              name={field.name} value={field.value} onChange={field.onChange}
              isInvalid={!!fieldState.error} isDisabled={isSubmitting}>
              <Label>Kode Jabatan</Label>
              <Input placeholder="Contoh: MGR-HRD-001" />
              {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
            </TextField>
          )}
        />

        {/* Nama Jabatan */}
        <Controller
          control={form.control}
          name="positionName"
          render={({ field, fieldState }) => (
            <TextField isRequired validationBehavior="aria" className="w-full"
              name={field.name} value={field.value} onChange={field.onChange}
              isInvalid={!!fieldState.error} isDisabled={isSubmitting}>
              <Label>Nama Jabatan</Label>
              <Input placeholder="Contoh: Manager HRD" />
              {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
            </TextField>
          )}
        />

        {/* Deskripsi */}
        <Controller
          control={form.control}
          name="description"
          render={({ field, fieldState }) => (
            <TextField validationBehavior="aria" className="w-full"
              name={field.name} value={field.value ?? ''} onChange={field.onChange}
              isInvalid={!!fieldState.error} isDisabled={isSubmitting}>
              <Label>Deskripsi (Opsional)</Label>
              <Input placeholder="Deskripsi singkat jabatan" />
              {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
            </TextField>
          )}
        />

        {/* Atasan (Parent) */}
        <Controller
          control={form.control}
          name="parentId"
          render={({ field }) => (
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground">Lapor Ke (Opsional)</Label>
              <select
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value || null)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-gray-200 bg-background px-3 py-2.5 text-sm outline-none focus:border-[#006FEE]"
              >
                <option value="">— Tidak ada atasan (Root) —</option>
                {flatParents.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
          )}
        />

        {/* Role Multi-select */}
        <Controller
          control={form.control}
          name="roleIds"
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground">
                Role <span className="text-red-500">*</span>
              </Label>
              <div className="space-y-2 rounded-xl border border-gray-200 p-3">
                {roles.map((role) => (
                  <label key={role.id} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(field.value ?? []).includes(role.id)}
                      onChange={(e) => {
                        const current = field.value ?? [];
                        if (e.target.checked) {
                          field.onChange([...current, role.id]);
                        } else {
                          field.onChange(current.filter((id) => id !== role.id));
                        }
                      }}
                      disabled={isSubmitting}
                      className="h-4 w-4 rounded border-gray-300 text-[#006FEE] focus:ring-[#006FEE]"
                    />
                    <span className="text-sm">{role.roleCode}</span>
                    <span className="text-xs text-gray-400">— {role.description}</span>
                  </label>
                ))}
              </div>
              {fieldState.error && (
                <span className="text-xs text-red-500">{fieldState.error.message}</span>
              )}
            </div>
          )}
        />

        {/* Error */}
        {submitError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="secondary" onPress={() => router.push('/hr/positions')} isDisabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" variant="primary" isDisabled={isSubmitting} isPending={isSubmitting}>
            <Check className="h-4 w-4" />
            {isEditMode ? 'Simpan Perubahan' : 'Tambah Jabatan'}
          </Button>
        </div>
      </form>
    </div>
  );
}
