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
import { PositionTree, PositionRequest, PositionUpdateRequest } from '../types';

interface PositionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PositionRequest | PositionUpdateRequest) => Promise<void>;
  position?: PositionTree | null;
  parentId?: number | null;
  allPositions: PositionTree[];
  isLoading?: boolean;
}

export const PositionFormModal: React.FC<PositionFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  position,
  parentId,
  allPositions,
  isLoading = false,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  // Calculate position level based on selected parent
  const calculatePositionLevel = (parentIdValue: number | null): number => {
    if (parentIdValue === null) return 1;
    const findPosition = (positions: PositionTree[], id: number): PositionTree | undefined => {
      for (const pos of positions) {
        if (pos.id === id) return pos;
        if (pos.children && pos.children.length > 0) {
          const found = findPosition(pos.children, id);
          if (found) return found;
        }
      }
      return undefined;
    };
    const parent = findPosition(allPositions, parentIdValue);
    return parent ? parent.positionLevel + 1 : 1;
  };

  const [formData, setFormData] = useState({
    positionCode: '',
    positionName: '',
    parentId: null as number | null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditMode = !!position;

  useEffect(() => {
    if (position) {
      setFormData({
        positionCode: position.positionCode,
        positionName: position.positionName,
        parentId: position.parentId,
      });
    } else {
      setFormData({
        positionCode: '',
        positionName: '',
        parentId: parentId ?? null,
      });
    }
    setErrors({});
  }, [position, parentId, isOpen]);

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

  const flatPositions = flattenPositions(allPositions);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.positionCode.trim()) {
      newErrors.positionCode = 'Position code is required';
    } else if (formData.positionCode.length > 50) {
      newErrors.positionCode = 'Position code must be 50 characters or less';
    }

    if (!formData.positionName.trim()) {
      newErrors.positionName = 'Position name is required';
    } else if (formData.positionName.length > 100) {
      newErrors.positionName = 'Position name must be 100 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Calculate position level based on parent selection
      const positionLevel = calculatePositionLevel(formData.parentId);

      // Prepare data with auto-calculated position level
      const submitData = {
        ...formData,
        positionLevel,
      };

      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('Failed to submit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSelectedParentName = () => {
    if (formData.parentId === null) return 'No Parent (Root Position)';
    const selected = allPositions.find((p) => p.id === formData.parentId);
    return selected ? selected.positionName : '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Position' : 'Create New Position'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the position details below.'
              : 'Add a new position to the organization hierarchy.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Position Code */}
          <div className="space-y-2">
            <Label htmlFor="positionCode">
              Position Code <span className="text-destructive">*</span>
            </Label>
            <Input
              id="positionCode"
              value={formData.positionCode}
              onChange={(e) =>
                setFormData({ ...formData, positionCode: e.target.value })
              }
              placeholder="e.g., MGR, SUP"
              disabled={isSubmitting}
              className={errors.positionCode ? 'border-destructive' : ''}
            />
            {errors.positionCode && (
              <p className="text-xs text-destructive">{errors.positionCode}</p>
            )}
          </div>

          {/* Position Name */}
          <div className="space-y-2">
            <Label htmlFor="positionName">
              Position Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="positionName"
              value={formData.positionName}
              onChange={(e) =>
                setFormData({ ...formData, positionName: e.target.value })
              }
              placeholder="e.g., Sales Manager"
              disabled={isSubmitting}
              className={errors.positionName ? 'border-destructive' : ''}
            />
            {errors.positionName && (
              <p className="text-xs text-destructive">{errors.positionName}</p>
            )}
          </div>

          {/* Parent Position (Searchable Combobox) */}
          {!isEditMode && (
            <div className="space-y-2">
              <Label>Parent Position</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                    disabled={isSubmitting}
                  >
                    {getSelectedParentName()}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Search position..." />
                    <CommandList>
                      <CommandEmpty>No position found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="no-parent"
                          onSelect={() => {
                            setFormData({ ...formData, parentId: null });
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              formData.parentId === null
                                ? 'opacity-100'
                                : 'opacity-0'
                            )}
                          />
                          No Parent (Root Position)
                        </CommandItem>
                        {flatPositions.map(({ position: pos, depth }) => (
                          <CommandItem
                            key={pos.id}
                            value={`${pos.id}-${pos.positionName}`}
                            onSelect={() => {
                              setFormData({ ...formData, parentId: pos.id });
                              setOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                formData.parentId === pos.id
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              )}
                            />
                            <span style={{ paddingLeft: `${depth * 16}px` }}>
                              {pos.positionName}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({pos.positionCode})
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Select the parent position for this new role. The position level will be calculated automatically based on the parent.
              </p>
            </div>
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
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {isSubmitting || isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : isEditMode ? (
                'Update Position'
              ) : (
                'Create Position'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
