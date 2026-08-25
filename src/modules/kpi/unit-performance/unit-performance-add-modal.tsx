'use client';

import React from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Modal,
  Button,
  Form,
  Input,
  Label,
  FieldError,
  ComboBox,
  ListBox,
  EmptyState,
  useFilter,
} from '@heroui/react';
import type { OrganizationUnitResponse } from '@/modules/organization/organization-units/types';
import type { CreateUnitPerformanceRequest } from './unit-performance.types';

export interface UnitPerformanceAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateUnitPerformanceRequest) => Promise<boolean>;
  /** Flattened active org units — already excluding configured ones by the page. */
  orgUnits: OrganizationUnitResponse[];
  isSubmitting: boolean;
}

interface UnitPerformanceAddFormValues {
  organizationUnitId: string;
}

const schema = z.object({
  organizationUnitId: z.string().min(1, 'Unit organisasi wajib dipilih'),
});

/** Add an existing organization unit to the performance matrix. */
export const UnitPerformanceAddModal: React.FC<UnitPerformanceAddModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  orgUnits,
  isSubmitting,
}) => {
  const { contains } = useFilter({ sensitivity: 'base' });
  const { control, handleSubmit } = useForm<UnitPerformanceAddFormValues>({
    resolver: zodResolver(schema) as Resolver<UnitPerformanceAddFormValues>,
    defaultValues: { organizationUnitId: '' },
  });

  const onFormSubmit = React.useCallback(
    async (data: UnitPerformanceAddFormValues) => {
      const ok = await onSubmit({ organizationUnitId: data.organizationUnitId });
      if (!ok) throw new Error('Submit failed');
    },
    [onSubmit],
  );

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        isDismissable={!isSubmitting}
        onOpenChange={(open: boolean) => { if (!open) onClose(); }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[480px]">
            <Modal.Header className="flex items-center justify-between">
              <Modal.Heading>Tambah Unit</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>

            <Modal.Body className="p-6">
              <Form
                id="unit-performance-add-form"
                validationBehavior="aria"
                onSubmit={handleSubmit(
                  onFormSubmit as (data: UnitPerformanceAddFormValues) => Promise<void>,
                  () => undefined,
                )}
                className="flex flex-col gap-4"
              >
                <Controller
                  name="organizationUnitId"
                  control={control}
                  render={({ field, fieldState }) => (
                    <ComboBox
                      className="w-full"
                      isRequired
                      selectedKey={field.value || null}
                      onSelectionChange={(key) => field.onChange(key ? String(key) : '')}
                      isInvalid={fieldState.invalid}
                      isDisabled={isSubmitting}
                      allowsEmptyCollection
                      defaultFilter={contains}
                    >
                      <Label>Unit Organisasi</Label>
                      <ComboBox.InputGroup>
                        <Input placeholder="Pilih unit organisasi" />
                        <ComboBox.Trigger />
                      </ComboBox.InputGroup>
                      <ComboBox.Popover>
                        <ListBox renderEmptyState={() => <EmptyState>Tidak ada unit tersedia</EmptyState>}>
                          {orgUnits.map((unit) => (
                            <ListBox.Item
                              key={unit.id}
                              id={unit.id}
                              textValue={`${unit.unitCode} - ${unit.unitName}`}
                            >
                              <span>{unit.unitCode} - {unit.unitName}</span>
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </ComboBox.Popover>
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </ComboBox>
                  )}
                />

              </Form>
            </Modal.Body>

            <Modal.Footer className="flex justify-end gap-2">
              <Button variant="secondary" onPress={onClose} isDisabled={isSubmitting}>
                Batal
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="unit-performance-add-form"
                isDisabled={isSubmitting}
                isPending={isSubmitting}
              >
                Tambah
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
