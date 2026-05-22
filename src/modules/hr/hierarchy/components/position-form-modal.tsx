'use client';

import React, { useEffect, useState } from 'react';
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
import { PositionTree, PositionRequest, PositionUpdateRequest } from '../types';
import { flattenPositionsByDepth, findPositionInTree } from '../../shared/utils';

const positionFormSchema = z.object({
  positionCode: z.string().min(1, 'Kode jabatan wajib diisi').max(50, 'Kode jabatan maksimal 50 karakter'),
  positionName: z.string().min(1, 'Nama jabatan wajib diisi').max(100, 'Nama jabatan maksimal 100 karakter'),
  parentId: z.number().nullable().optional(),
});

type PositionFormValues = z.infer<typeof positionFormSchema>;

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
  isOpen, onClose, onSubmit, position, parentId: initialParentId, allPositions, isLoading = false,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { contains } = useFilter({ sensitivity: 'base' });
  const isEditMode = !!position;

  const form = useForm<PositionFormValues>({
    resolver: zodResolver(positionFormSchema),
    defaultValues: { positionCode: '', positionName: '', parentId: null },
  });

  const flatPositions = flattenPositionsByDepth(allPositions);

  const calculatePositionLevel = (parentIdValue: number | null): number => {
    if (parentIdValue === null) return 1;
    const parent = findPositionInTree(allPositions, parentIdValue);
    return parent ? parent.positionLevel + 1 : 1;
  };

  useEffect(() => {
    if (position) {
      form.reset({ positionCode: position.positionCode, positionName: position.positionName, parentId: position.parentId });
    } else {
      form.reset({ positionCode: '', positionName: '', parentId: initialParentId ?? null });
    }
  }, [position, initialParentId, isOpen, form]);

  const handleSubmit = async (values: PositionFormValues) => {
    setIsSubmitting(true);
    try {
      const positionLevel = calculatePositionLevel(values.parentId ?? null);
      await onSubmit({ positionCode: values.positionCode, positionName: values.positionName, parentId: values.parentId, positionLevel });
      onClose();
    } catch {
      // Error handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading className="px-2">
                {isEditMode ? 'Edit Jabatan' : 'Tambah Jabatan Baru'}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2">
              <form id="position-form" onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
                <Controller control={form.control} name="positionCode" render={({ field, fieldState }) => (
                  <TextField isRequired validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} isInvalid={!!fieldState.error} isDisabled={isSubmitting}>
                    <Label>Kode Jabatan</Label>
                    <Input placeholder="contoh: MGR, SUP" />
                    {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                  </TextField>
                )} />
                <Controller control={form.control} name="positionName" render={({ field, fieldState }) => (
                  <TextField isRequired validationBehavior="aria" className="w-full" name={field.name} value={field.value} onChange={field.onChange} isInvalid={!!fieldState.error} isDisabled={isSubmitting}>
                    <Label>Nama Jabatan</Label>
                    <Input placeholder="contoh: Manajer Sales" />
                    {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                  </TextField>
                )} />
                {!isEditMode && (
                  <Controller control={form.control} name="parentId" render={({ field, fieldState }) => (
                    <Autocomplete validationBehavior="aria" className="w-full" placeholder="Pilih jabatan induk..." selectionMode="single"
                      selectedKey={field.value === null ? 'none' : field.value != null ? String(field.value) : null}
                      onSelectionChange={(key) => { field.onChange(key === 'none' || key === null ? null : Number(key)); }}
                      isInvalid={!!fieldState.error} isDisabled={isSubmitting}>
                      <Label>Jabatan Induk</Label>
                      <Autocomplete.Trigger><Autocomplete.Value /><Autocomplete.ClearButton /><Autocomplete.Indicator /></Autocomplete.Trigger>
                      <Autocomplete.Popover>
                        <Autocomplete.Filter filter={contains}>
                          <SearchField autoFocus name="search" variant="secondary">
                            <SearchField.Group><SearchField.SearchIcon /><SearchField.Input placeholder="Cari jabatan..." /><SearchField.ClearButton /></SearchField.Group>
                          </SearchField>
                          <ListBox renderEmptyState={() => <EmptyState>Jabatan tidak ditemukan</EmptyState>}>
                            <ListBox.Item key="none" id="none" textValue="Tanpa Jabatan Induk"><span>Tanpa Jabatan Induk</span></ListBox.Item>
                            {flatPositions.map(({ position: pos, depth }) => (
                              <ListBox.Item key={String(pos.id)} id={String(pos.id)} textValue={pos.positionName}>
                                <span style={{ paddingLeft: `${depth * 16}px` }}>{pos.positionName}</span>
                                <span className="ml-2 text-xs text-muted-foreground">({pos.positionCode})</span>
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Autocomplete.Filter>
                      </Autocomplete.Popover>
                      {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                    </Autocomplete>
                  )} />
                )}
              </form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose} isDisabled={isSubmitting}>Batal</Button>
              <Button type="submit" form="position-form" variant="primary" isDisabled={isSubmitting || isLoading} isPending={isSubmitting}>
                {isEditMode ? 'Simpan Perubahan' : 'Buat Jabatan'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
