'use client';

import React, { useEffect, useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CoreUser } from '../types';
import { PositionTree } from '@/modules/hr/hierarchy/types';

interface AssignUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: {
    userId: string;
    positionId: number;
    startDate: string;
    isPrimary: boolean;
  }) => void;
  userId?: string | null;
  positionId?: number | null;
  users: CoreUser[];
  positions: PositionTree[];
  isSubmitting?: boolean;
}

interface FormData {
  userId: string | null;
  positionId: number | null;
  startDate: string;
  isPrimary: boolean;
}

export const AssignUserModal: React.FC<AssignUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userId,
  positionId,
  users,
  positions,
  isSubmitting = false,
}) => {
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  const [positionPopoverOpen, setPositionPopoverOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<FormData>({
    userId: null,
    positionId: null,
    startDate: new Date().toISOString().split('T')[0],
    isPrimary: true,
  });

  // Pre-fill when props change
  useEffect(() => {
    if (isOpen) {
      setFormData({
        userId: userId ?? null,
        positionId: positionId ?? null,
        startDate: new Date().toISOString().split('T')[0],
        isPrimary: true,
      });
      setErrors({});
    }
  }, [isOpen, userId, positionId]);

  // Flatten positions for the hierarchical combobox
  const flattenPositions = (
    positions: PositionTree[],
    depth = 0
  ): { position: PositionTree; depth: number }[] => {
    const result: { position: PositionTree; depth: number }[] = [];
    positions.forEach((pos) => {
      result.push({ position: pos, depth });
      if (pos.children && pos.children.length > 0) {
        result.push(...flattenPositions(pos.children, depth + 1));
      }
    });
    return result;
  };

  const flatPositions = flattenPositions(positions);

  // Filter only active users for assignment
  const activeUsers = users.filter((u) => u.isActive);

  const getSelectedUserName = () => {
    if (!formData.userId) return 'Select a user...';
    const user = activeUsers.find((u) => u.id === formData.userId);
    return user ? `${user.fullName} (${user.nip || 'No NIP'})` : 'Select a user...';
  };

  const getSelectedPositionName = () => {
    if (!formData.positionId) return 'Select a position...';
    const pos = flatPositions.find(
      ({ position }) => position.id === formData.positionId
    );
    return pos ? pos.position.positionName : 'Select a position...';
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.userId) {
      newErrors.userId = 'Please select a user';
    }

    if (!formData.positionId) {
      newErrors.positionId = 'Please select a position';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await onSuccess({
        userId: formData.userId!,
        positionId: formData.positionId!,
        startDate: formData.startDate,
        isPrimary: formData.isPrimary,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = isSubmitting || submitting;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Assign User to Position</DialogTitle>
          <DialogDescription>
            Assign an employee to a position. Multiple employees can occupy the
            same position. If marked as primary, the users previous primary
            position will be closed automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User Selection Combobox */}
          <div className="space-y-2">
            <Label>
              Employee <span className="text-destructive">*</span>
            </Label>
            <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={userPopoverOpen}
                  className="w-full justify-between"
                  disabled={isLoading || !!userId}
                >
                  <span className="truncate">{getSelectedUserName()}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[460px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search by name or NIP..." />
                  <CommandList>
                    <CommandEmpty>No employee found.</CommandEmpty>
                    <CommandGroup>
                      {activeUsers.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={`${user.fullName} ${user.nip}`}
                          onSelect={() => {
                            setFormData({ ...formData, userId: user.id });
                            setUserPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              formData.userId === user.id
                                ? 'opacity-100'
                                : 'opacity-0'
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{user.fullName}</span>
                            <span className="text-xs text-muted-foreground">
                              {user.nip && `${user.nip} • `}
                              {user.email}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {errors.userId && (
              <p className="text-xs text-destructive">{errors.userId}</p>
            )}
          </div>

          {/* Position Selection Combobox (Hierarchical) */}
          <div className="space-y-2">
            <Label>
              Position <span className="text-destructive">*</span>
            </Label>
            <Popover
              open={positionPopoverOpen}
              onOpenChange={setPositionPopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={positionPopoverOpen}
                  className="w-full justify-between"
                  disabled={isLoading || !!positionId}
                >
                  <span className="truncate">{getSelectedPositionName()}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[460px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search position..." />
                  <CommandList>
                    <CommandEmpty>No position found.</CommandEmpty>
                    <CommandGroup>
                      {flatPositions.map(({ position: pos, depth }) => (
                        <CommandItem
                          key={pos.id}
                          value={`${pos.id}-${pos.positionName}-${pos.positionCode}`}
                          onSelect={() => {
                            setFormData({ ...formData, positionId: pos.id });
                            setPositionPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4 shrink-0',
                              formData.positionId === pos.id
                                ? 'opacity-100'
                                : 'opacity-0'
                            )}
                          />
                          <span
                            style={{ paddingLeft: `${depth * 16}px` }}
                            className="truncate"
                          >
                            {pos.positionName}
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground shrink-0">
                            ({pos.positionCode})
                          </span>
                          {pos.assignedUsers && pos.assignedUsers.length > 0 && (
                            <span className="ml-auto text-xs text-blue-600 shrink-0">
                              • {pos.assignedUsers.length} staff
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {errors.positionId && (
              <p className="text-xs text-destructive">{errors.positionId}</p>
            )}
            {formData.positionId && (() => {
              const pos = flatPositions.find(({ position }) => position.id === formData.positionId);
              if (pos?.position.assignedUsers && pos.position.assignedUsers.length > 0) {
                return (
                  <p className="text-xs text-blue-600">
                    ℹ This position currently has {pos.position.assignedUsers.length}{' '}
                    staff{pos.position.assignedUsers.length > 1 ? 's' : ''} assigned.
                    Multiple occupants are allowed.
                  </p>
                );
              }
              return null;
            })()}
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="startDate">
              Start Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) =>
                setFormData({ ...formData, startDate: e.target.value })
              }
              disabled={isLoading}
              className={errors.startDate ? 'border-destructive' : ''}
            />
            {errors.startDate && (
              <p className="text-xs text-destructive">{errors.startDate}</p>
            )}
          </div>

          {/* Is Primary Toggle */}
          <div className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Primary Position</Label>
              <p className="text-sm text-muted-foreground">
                Only one primary position per user. Previous primary will be
                closed automatically.
              </p>
            </div>
            <Switch
              checked={formData.isPrimary}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isPrimary: checked })
              }
              disabled={isLoading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign User'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
