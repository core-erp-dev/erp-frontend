'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Modal,
  Button,
  TextField,
  Input,
  Label,
  FieldError,
  Autocomplete,
  SearchField,
  ListBox,
  EmptyState,
  useFilter,
} from '@heroui/react';
import { CoreUser, UserCreateRequest, UserUpdateRequest, RoleResponse } from '../types';
import { employeeApi } from '../services/employee-api';

/** Dynamic Zod schema based on edit/create mode. */
const getUserFormSchema = (isEditMode: boolean) =>
  z.object({
    email: z.string().email('Format email tidak valid'),
    fullName: z.string().min(1, 'Nama lengkap wajib diisi'),
    nip: z.string().optional(),
    // Password required on create, optional on edit
    password: isEditMode
      ? z.string().optional().or(z.literal(''))
      : z.string().min(6, 'Kata sandi minimal 6 karakter wajib diisi'),
    defaultRoleCode: z.string().min(1, 'Role wajib dipilih'),
    isActive: z.boolean(),
  });

type UserFormValues = z.infer<ReturnType<typeof getUserFormSchema>>;

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserCreateRequest | UserUpdateRequest) => Promise<void>;
  user?: CoreUser | null;
  isSubmitting?: boolean;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  user,
  isSubmitting = false,
}) => {
  const isEditMode = !!user;
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const { contains } = useFilter({ sensitivity: 'base' });

  const form = useForm<UserFormValues>({
    resolver: zodResolver(getUserFormSchema(isEditMode)),
    defaultValues: {
      email: '',
      fullName: '',
      nip: '',
      password: '',
      defaultRoleCode: '',
      isActive: true,
    },
  });

  const fetchRoles = useCallback(async () => {
    setIsLoadingRoles(true);
    try {
      const fetchedRoles = await employeeApi.getRoles();
      setRoles(fetchedRoles);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    } finally {
      setIsLoadingRoles(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
    }
  }, [isOpen, fetchRoles]);

  useEffect(() => {
    if (user) {
      form.reset({
        email: user.email,
        fullName: user.fullName,
        nip: user.nip || '',
        password: '',
        defaultRoleCode: user.roles?.[0]?.roleCode || '',
        isActive: user.isActive,
      });
    } else {
      form.reset({
        email: '',
        fullName: '',
        nip: '',
        password: '',
        defaultRoleCode: '',
        isActive: true,
      });
    }
  }, [user, isOpen, form]);

  const handleSubmit = async (values: UserFormValues) => {
    const submitData = isEditMode
      ? {
          email: values.email,
          fullName: values.fullName,
          nip: values.nip,
          isActive: values.isActive,
          defaultRoleCode: values.defaultRoleCode,
        }
      : {
          email: values.email,
          fullName: values.fullName,
          nip: values.nip,
          password: values.password,
          defaultRoleCode: values.defaultRoleCode,
        };

    await onSubmit(submitData);
  };

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />

            <Modal.Header>
              <Modal.Heading className="px-2">
                {isEditMode ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}
              </Modal.Heading>
            </Modal.Header>

            <Modal.Body className="p-2">
              <form id="user-form" onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">

                {/* Email */}
                <Controller
                  control={form.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <TextField
                      isRequired
                      validationBehavior="aria"
                      className="w-full"
                      name={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      isInvalid={!!fieldState.error}
                      isDisabled={isSubmitting}
                    >
                      <Label>Email</Label>
                      <Input placeholder="contoh@perusahaan.com" type="email" autoComplete="email" />
                      {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                    </TextField>
                  )}
                />

                {/* Nama Lengkap */}
                <Controller
                  control={form.control}
                  name="fullName"
                  render={({ field, fieldState }) => (
                    <TextField
                      isRequired
                      validationBehavior="aria"
                      className="w-full"
                      name={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      isInvalid={!!fieldState.error}
                      isDisabled={isSubmitting}
                    >
                      <Label>Nama Lengkap</Label>
                      <Input placeholder="Masukkan nama lengkap" autoComplete="name" />
                      {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                    </TextField>
                  )}
                />

                {/* NIP */}
                <Controller
                  control={form.control}
                  name="nip"
                  render={({ field, fieldState }) => (
                    <TextField
                      validationBehavior="aria"
                      className="w-full"
                      name={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      isInvalid={!!fieldState.error}
                      isDisabled={isSubmitting}
                    >
                      <Label>NIP (Nomor Induk Pegawai)</Label>
                      <Input placeholder="Masukkan NIP" />
                      {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                    </TextField>
                  )}
                />

                {/* Password - Only shown and required when creating a new employee */}
                {!isEditMode && (
                  <Controller
                    control={form.control}
                    name="password"
                    render={({ field, fieldState }) => (
                      <TextField
                        isRequired
                        validationBehavior="aria"
                        className="w-full"
                        name={field.name}
                        value={field.value}
                        onChange={field.onChange}
                        isInvalid={!!fieldState.error}
                        isDisabled={isSubmitting}
                      >
                        <Label>Kata Sandi</Label>
                        <Input placeholder="Masukkan kata sandi" type="password" autoComplete="new-password" />
                        {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                      </TextField>
                    )}
                  />
                )}

                {/* Role Autocomplete */}
                <Controller
                  control={form.control}
                  name="defaultRoleCode"
                  render={({ field, fieldState }) => (
                    <Autocomplete
                      isRequired
                      validationBehavior="aria"
                      className="w-full"
                      placeholder={isLoadingRoles ? "Memuat role..." : "Cari dan pilih role..."}
                      selectionMode="single"
                      selectedKey={field.value || null}
                      onSelectionChange={(key) => field.onChange(key ? key.toString() : '')}
                      isInvalid={!!fieldState.error}
                      isDisabled={isSubmitting || isLoadingRoles}
                    >
                      <Label>Role (Peran)</Label>
                      <Autocomplete.Trigger>
                        <Autocomplete.Value />
                        <Autocomplete.ClearButton />
                        <Autocomplete.Indicator />
                      </Autocomplete.Trigger>
                      <Autocomplete.Popover>
                        <Autocomplete.Filter filter={contains}>
                          <SearchField autoFocus name="search" variant="secondary">
                            <SearchField.Group>
                              <SearchField.SearchIcon />
                              <SearchField.Input placeholder="Cari role..." />
                              <SearchField.ClearButton />
                            </SearchField.Group>
                          </SearchField>
                          <ListBox renderEmptyState={() => <EmptyState>Role tidak ditemukan</EmptyState>}>
                            {roles.map((role) => (
                              <ListBox.Item
                                key={role.roleCode}
                                id={role.roleCode}
                                textValue={role.description}
                              >
                                {role.description}
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Autocomplete.Filter>
                      </Autocomplete.Popover>
                      {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                    </Autocomplete>
                  )}
                />
              </form>
            </Modal.Body>

            <Modal.Footer>
              <Button
                variant="secondary"
                onPress={onClose}
                isDisabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                form="user-form"
                variant="primary"
                isDisabled={isSubmitting}
                isPending={isSubmitting}
              >
                {isEditMode ? 'Simpan Perubahan' : 'Buat Karyawan'}
              </Button>
            </Modal.Footer>

          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
