'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { toast, Button, Form, TextField, Input, Label, FieldError, Separator } from '@heroui/react';

import { logout } from '@/lib/auth';
import { extractErrorMessage } from '@/types/api';
import { profileApi } from '../services/profile-api';

const profilePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
    newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Konfirmasi password tidak sama',
  })
  .refine((values) => values.currentPassword !== values.newPassword, {
    path: ['newPassword'],
    message: 'Password baru harus berbeda dari password saat ini',
  });

type FormValues = z.infer<typeof profilePasswordSchema>;

export function ProfilePasswordForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(profilePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await profileApi.changePassword(values);
      toast.success('Password berhasil diubah', {
        description: 'Silakan login kembali dengan password baru Anda.',
      });
      logout();
      router.replace('/login');
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Gagal mengubah password'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      validationBehavior="aria"
      onSubmit={(event) => form.handleSubmit(handleSubmit)(event)}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-foreground">Ubah Password</h2>
        <p className="text-sm text-muted-foreground">
          Masukkan password saat ini, lalu tentukan password baru Anda.
        </p>
      </div>

      <Separator />

      <div className="flex max-w-xl flex-col gap-4">
        <Controller
          control={form.control}
          name="currentPassword"
          render={({ field, fieldState }) => (
            <TextField
              validationBehavior="aria"
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              isInvalid={fieldState.invalid}
              isDisabled={isSubmitting}
            >
              <Label>Password Saat Ini</Label>
              <Input type="password" autoComplete="current-password" placeholder="Masukkan password saat ini" />
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
        />

        <Controller
          control={form.control}
          name="newPassword"
          render={({ field, fieldState }) => (
            <TextField
              validationBehavior="aria"
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              isInvalid={fieldState.invalid}
              isDisabled={isSubmitting}
            >
              <Label>Password Baru</Label>
              <Input type="password" autoComplete="new-password" placeholder="Masukkan password baru" />
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
        />

        <Controller
          control={form.control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <TextField
              validationBehavior="aria"
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              isInvalid={fieldState.invalid}
              isDisabled={isSubmitting}
            >
              <Label>Konfirmasi Password Baru</Label>
              <Input type="password" autoComplete="new-password" placeholder="Ulangi password baru" />
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onPress={() => router.back()} isDisabled={isSubmitting}>
          Batal
        </Button>
        <Button type="submit" variant="primary" isPending={isSubmitting} isDisabled={isSubmitting}>
          Simpan Password
        </Button>
      </div>
    </Form>
  );
}
