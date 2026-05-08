'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { CoreUser, UserCreateRequest, UserUpdateRequest, RoleResponse } from '../types';
import { employeeApi } from '../services/employee-api';

// Validation schema
const userFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(1, 'Full name is required'),
  nip: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  defaultRoleCode: z.string().min(1, 'Role is required'),
  isActive: z.boolean(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

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

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: '',
      fullName: '',
      nip: '',
      password: '',
      defaultRoleCode: '',
      isActive: true,
    },
  });

  // Fetch roles when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchRoles();
    }
  }, [isOpen]);

  const fetchRoles = async () => {
    setIsLoadingRoles(true);
    try {
      const fetchedRoles = await employeeApi.getRoles();
      setRoles(fetchedRoles);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    } finally {
      setIsLoadingRoles(false);
    }
  };

  useEffect(() => {
    if (user) {
      form.reset({
        email: user.email,
        fullName: user.fullName,
        nip: user.nip,
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit User' : 'Create New User'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the user details below. Password cannot be changed here.'
              : 'Add a new user to the system. They will be able to login with their email or NIP.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Email <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="john@example.com"
                      disabled={isSubmitting}
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Full Name */}
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Full Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John Doe"
                      disabled={isSubmitting}
                      autoComplete="name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* NIP */}
            <FormField
              control={form.control}
              name="nip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIP (Employee Number)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="EMP001"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password - Only for Create mode */}
            {!isEditMode && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Password <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        disabled={isSubmitting}
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Role */}
            <FormField
              control={form.control}
              name="defaultRoleCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Role <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    disabled={isSubmitting || isLoadingRoles}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        {isLoadingRoles ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Loading roles...</span>
                          </div>
                        ) : (
                          <SelectValue placeholder="Select a role" />
                        )}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.roleCode}>
                          {role.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Active Status - Only for Edit mode */}
            {isEditMode && (
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        User must be active to login
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : isEditMode ? (
                  'Update User'
                ) : (
                  'Create User'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
