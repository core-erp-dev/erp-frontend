'use client';

import React, { useMemo, useState } from 'react';
import { Button, Label, ListBox, Modal, Select } from '@heroui/react';
import type { CorporateKpiStructure } from './corporate-kpi.types';

type CreateMode = 'new' | 'copy';

export interface CorporateKpiCreateDialogProps {
  isOpen: boolean;
  targetYear: number;
  structures: CorporateKpiStructure[];
  isPending: boolean;
  onClose: () => void;
  onCreateNew: () => void;
  onCopy: (sourceYear: number) => Promise<void>;
}

export const CorporateKpiCreateDialog: React.FC<CorporateKpiCreateDialogProps> = ({
  isOpen,
  targetYear,
  structures,
  isPending,
  onClose,
  onCreateNew,
  onCopy,
}) => {
  const [mode, setMode] = useState<CreateMode>('new');
  const [sourceYear, setSourceYear] = useState<string>('');
  const sourceStructures = useMemo(
    () => structures.filter((structure) => structure.year < targetYear),
    [structures, targetYear],
  );
  const canCopy = sourceYear !== '' && sourceStructures.some((structure) => String(structure.year) === sourceYear);

  const handleContinue = () => {
    if (mode === 'new') {
      onCreateNew();
      return;
    }
    const year = Number(sourceYear);
    if (canCopy && Number.isInteger(year)) void onCopy(year);
  };

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        isDismissable={!isPending}
        onOpenChange={(open: boolean) => { if (!open) onClose(); }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[480px]">
            <Modal.Header className="flex items-center justify-between">
              <Modal.Heading>Tambah KPI Perusahaan</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>

            <Modal.Body className="flex flex-col gap-4 p-6">
              <Select
                aria-label="Pilih cara membuat KPI Perusahaan"
                selectedKey={mode}
                onSelectionChange={(key) => setMode(String(key) as CreateMode)}
                isDisabled={isPending}
                variant="secondary"
              >
                <Label>Cara membuat KPI</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="copy" textValue="Salin dari Tahun Sebelumnya">
                      Salin dari Tahun Sebelumnya
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="new" textValue="Buat Baru">
                      Buat Baru
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>

              {mode === 'copy' && (
                <Select
                  aria-label="Pilih tahun sumber"
                  selectedKey={sourceYear || null}
                  onSelectionChange={(key) => setSourceYear(key == null ? '' : String(key))}
                  isDisabled={isPending || sourceStructures.length === 0}
                  isInvalid={sourceStructures.length > 0 && sourceYear !== '' && !canCopy}
                  variant="secondary"
                >
                  <Label>Tahun sumber</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {sourceStructures.map((structure) => (
                        <ListBox.Item key={structure.id} id={String(structure.year)} textValue={String(structure.year)}>
                          {structure.year}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              )}

              {mode === 'copy' && sourceStructures.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Belum ada struktur KPI Perusahaan lain yang dapat disalin.
                </p>
              )}
            </Modal.Body>

            <Modal.Footer className="flex justify-end gap-2">
              <Button variant="secondary" onPress={onClose} isDisabled={isPending}>
                Batal
              </Button>
              <Button
                variant="primary"
                onPress={handleContinue}
                isDisabled={isPending || (mode === 'copy' && !canCopy)}
                isPending={isPending}
              >
                Lanjutkan
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
