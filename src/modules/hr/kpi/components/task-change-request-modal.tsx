'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal, Button, Surface, TextField, Input, Select, ListBox, Label, FieldError,
  TextArea, SearchField, Spinner,
} from '@heroui/react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  KpiTaskResponse, CorporateKpiResponse,
  CreateTaskChangeRequest, UpdateTaskChangeRequest, DeleteTaskChangeRequest,
  AssignableUserPosition,
} from '../types';
import { kpiAssignableApi } from '../services/kpi-v1-api';
import { useDebounce } from '@/hooks/use-debounce';

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

type RequestMode = 'create' | 'update' | 'delete';

const createSchema = z.object({
  assignedToUserPositionId: z.string().min(1, 'Pilih pegawai dan jabatan'),
  corporateKpiId: z.string().min(1, 'Pilih indikator KPI Korporat'),
  taskName: z.string().min(1, 'Nama tugas wajib diisi'),
  unit: z.string().optional(),
  annualTarget: z.number().min(0, 'Target minimal 0'),
  periodYear: z.number().min(2020, 'Tahun minimal 2020'),
});

const updateSchema = z.object({
  taskName: z.string().min(1, 'Nama tugas wajib diisi'),
  unit: z.string().optional(),
  annualTarget: z.number().min(0, 'Target minimal 0'),
  corporateKpiId: z.string().optional(),
});

const deleteSchema = z.object({
  reason: z.string().min(1, 'Alasan pembatalan wajib diisi'),
});

type CreateFormValues = z.infer<typeof createSchema>;
type UpdateFormValues = z.infer<typeof updateSchema>;
type DeleteFormValues = z.infer<typeof deleteSchema>;

interface TaskChangeRequestModalProps {
  isOpen: boolean;
  mode: RequestMode;
  task: KpiTaskResponse | null;
  isSubmitting: boolean;
  corporateKpis: CorporateKpiResponse[];
  onClose: () => void;
  onSubmitCreate: (data: CreateTaskChangeRequest) => void;
  onSubmitUpdate: (id: string, data: UpdateTaskChangeRequest) => void;
  onSubmitDelete: (id: string, data: DeleteTaskChangeRequest) => void;
}

export const TaskChangeRequestModal: React.FC<TaskChangeRequestModalProps> = ({
  isOpen, mode, task, isSubmitting,
  corporateKpis, onClose,
  onSubmitCreate, onSubmitUpdate, onSubmitDelete,
}) => {
  // P0A: single-step assignable position search
  const [positionSearch, setPositionSearch] = useState('');
  const debouncedSearch = useDebounce(positionSearch, 400);
  const [positionResults, setPositionResults] = useState<AssignableUserPosition[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<AssignableUserPosition | null>(null);

  // Search assignable positions
  useEffect(() => {
    if (!isOpen || mode !== 'create') return;
    if (!debouncedSearch.trim()) { setPositionResults([]); return; }
    let cancelled = false;
    setIsSearching(true);
    kpiAssignableApi.getAssignableUserPositions(debouncedSearch)
      .then((r) => {
        if (!cancelled) setPositionResults(r);
      })
      .catch(() => { if (!cancelled) setPositionResults([]); })
      .finally(() => { if (!cancelled) setIsSearching(false); });
    return () => { cancelled = true; };
  }, [debouncedSearch, isOpen, mode]);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setPositionSearch('');
      setPositionResults([]);
      setSelectedPosition(null);
    }
  }, [isOpen]);

  const getModalTitle = () => {
    switch (mode) {
      case 'create': return 'Ajukan Tugas';
      case 'update': return 'Ajukan Perubahan Tugas';
      case 'delete': return 'Ajukan Pembatalan Tugas';
    }
  };

  const leafKpis = corporateKpis.filter((k) => k.leaf);

  if (mode === 'delete') {
    return (
      <DeleteForm
        isOpen={isOpen} task={task} isSubmitting={isSubmitting}
        onClose={onClose}
        onSubmit={(data) => task && onSubmitDelete(task.id, data)}
      />
    );
  }

  if (mode === 'update') {
    return (
      <UpdateForm
        isOpen={isOpen} task={task} isSubmitting={isSubmitting}
        leafKpis={leafKpis} onClose={onClose}
        onSubmit={(data) => task && onSubmitUpdate(task.id, data)}
      />
    );
  }

  return (
    <CreateForm
      isOpen={isOpen} isSubmitting={isSubmitting} leafKpis={leafKpis}
      positionSearch={positionSearch} setPositionSearch={setPositionSearch}
      positionResults={positionResults} isSearching={isSearching}
      selectedPosition={selectedPosition} setSelectedPosition={setSelectedPosition}
      onClose={onClose} onSubmit={onSubmitCreate}
    />
  );
};

// ===== CREATE FORM (P0A: single-step assignable positions) =====
function CreateForm({
  isOpen, isSubmitting, leafKpis,
  positionSearch, setPositionSearch, positionResults, isSearching,
  selectedPosition, setSelectedPosition,
  onClose, onSubmit,
}: {
  isOpen: boolean; isSubmitting: boolean; leafKpis: CorporateKpiResponse[];
  positionSearch: string; setPositionSearch: (v: string) => void;
  positionResults: AssignableUserPosition[]; isSearching: boolean;
  selectedPosition: AssignableUserPosition | null;
  setSelectedPosition: (pos: AssignableUserPosition | null) => void;
  onClose: () => void;
  onSubmit: (data: CreateTaskChangeRequest) => void;
}) {
  const { register, handleSubmit, control, reset, setValue, formState: { errors } } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { assignedToUserPositionId: '', corporateKpiId: '', taskName: '', unit: '', annualTarget: 0, periodYear: new Date().getFullYear() },
  });

  useEffect(() => { if (isOpen) reset(); }, [isOpen, reset]);

  // Clear selected position when search changes
  useEffect(() => {
    if (positionSearch !== '' && selectedPosition) {
      // Only clear if selected position no longer matches search
      const nameMatches = selectedPosition.userName.toLowerCase().includes(positionSearch.toLowerCase()) ||
        selectedPosition.positionName.toLowerCase().includes(positionSearch.toLowerCase());
      if (!nameMatches) {
        setSelectedPosition(null);
        setValue('assignedToUserPositionId', '');
      }
    }
  }, [positionSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectPosition = useCallback((pos: AssignableUserPosition) => {
    setSelectedPosition(pos);
    setValue('assignedToUserPositionId', pos.userPositionId);
  }, [setValue]);

  const handleSave = useCallback(() => {
    handleSubmit((v) => onSubmit({
      assignedToUserPositionId: v.assignedToUserPositionId,
      corporateKpiId: v.corporateKpiId,
      taskName: v.taskName,
      unit: v.unit || undefined,
      annualTarget: v.annualTarget,
      periodYear: v.periodYear,
    }))();
  }, [handleSubmit, onSubmit]);

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} isDismissable={false} onOpenChange={(o) => { if (!o) onClose(); }}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[560px]">
            <Modal.Header className="items-center text-center"><Modal.Heading>Ajukan Tugas</Modal.Heading></Modal.Header>
            <Modal.Body>
              <Surface className="flex flex-col gap-4 rounded-3xl p-6">
                {/* P0A: Single-step assignable position search */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Cari Pegawai</Label>
                  <SearchField value={positionSearch} onChange={setPositionSearch} variant="secondary">
                    <SearchField.Group>
                      <SearchField.SearchIcon />
                      <SearchField.Input placeholder="Cari nama atau jabatan..." />
                      <SearchField.ClearButton />
                    </SearchField.Group>
                  </SearchField>
                  {isSearching && (
                    <div className="flex justify-center py-2"><Spinner size="sm" /></div>
                  )}
                  {!isSearching && positionResults.length > 0 && (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {positionResults.map((pos) => (
                        <Button
                          key={pos.userPositionId} variant="ghost"
                          className={`w-full justify-start rounded-xl px-3 py-2 h-auto ${
                            selectedPosition?.userPositionId === pos.userPositionId
                              ? 'bg-primary/10' : 'bg-surface-secondary'
                          }`}
                          onPress={() => {
                            if (selectedPosition?.userPositionId === pos.userPositionId) {
                              setSelectedPosition(null);
                              setValue('assignedToUserPositionId', '');
                            } else {
                              handleSelectPosition(pos);
                            }
                          }}
                        >
                          <div className="flex flex-col items-start text-left">
                            <span className="text-sm font-medium">{pos.userName}</span>
                            <span className="text-xs text-gray-400">{pos.positionName}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                  {!isSearching && positionSearch.trim() && positionResults.length === 0 && (
                    <p className="text-xs text-muted-foreground">Pegawai tidak ditemukan.</p>
                  )}
                </div>

                {/* Selected position indicator */}
                {selectedPosition && (
                  <input type="hidden" {...register('assignedToUserPositionId')} />
                )}

                {/* KPI selector */}
                <Controller
                  name="corporateKpiId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      key={field.value || NIL_UUID}
                      variant="secondary"
                      isRequired
                      selectedKey={field.value || NIL_UUID}
                      onSelectionChange={(k: React.Key | null) => field.onChange(k === NIL_UUID ? '' : String(k))}
                      aria-label="Indikator KPI Korporat"
                    >
                      <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {leafKpis.length === 0 && (
                            <ListBox.Item key={NIL_UUID} id={NIL_UUID} textValue="Tidak ada indikator leaf">Tidak ada indikator leaf tersedia</ListBox.Item>
                          )}
                          {leafKpis.map((kpi) => (
                            <ListBox.Item key={kpi.id} id={kpi.id} textValue={kpi.indicatorName}>
                              {kpi.indicatorCode} — {kpi.indicatorName}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  )}
                />

                <TextField isRequired isInvalid={!!errors.taskName}>
                  <Label>Nama Tugas</Label>
                  <Input variant="secondary" placeholder="Masukkan nama tugas" {...register('taskName')} />
                  <FieldError />
                </TextField>
                <TextField isInvalid={!!errors.unit}>
                  <Label>Satuan</Label>
                  <Input variant="secondary" placeholder="Cth: Persen" {...register('unit')} />
                  <FieldError />
                </TextField>
                <TextField isInvalid={!!errors.annualTarget}>
                  <Label>Target Tahunan</Label>
                  <Input variant="secondary" type="number" placeholder="0" {...register('annualTarget', { valueAsNumber: true })} />
                  <FieldError />
                </TextField>
                <TextField isRequired isInvalid={!!errors.periodYear}>
                  <Label>Tahun Periode</Label>
                  <Input variant="secondary" type="number" {...register('periodYear', { valueAsNumber: true })} />
                  <FieldError />
                </TextField>
              </Surface>
            </Modal.Body>
            <Modal.Footer className="flex-col-reverse">
              <Button className="w-full" variant="primary" onPress={handleSave} isDisabled={isSubmitting} isPending={isSubmitting}>
                {isSubmitting ? 'Mengirim...' : 'Ajukan'}
              </Button>
              <Button className="w-full" variant="secondary" slot="close" onPress={onClose} isDisabled={isSubmitting}>Batal</Button>
            </Modal.Footer>
            <Modal.CloseTrigger />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

// ===== UPDATE FORM =====
function UpdateForm({
  isOpen, task, isSubmitting, leafKpis, onClose,
  onSubmit,
}: {
  isOpen: boolean; task: KpiTaskResponse | null; isSubmitting: boolean;
  leafKpis: CorporateKpiResponse[]; onClose: () => void;
  onSubmit: (data: UpdateTaskChangeRequest) => void;
}) {
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: { taskName: '', unit: '', annualTarget: 0, corporateKpiId: '' },
  });

  useEffect(() => {
    if (isOpen && task) {
      reset({
        taskName: task.taskName,
        unit: task.unit ?? '',
        annualTarget: task.annualTarget,
        corporateKpiId: task.corporateKpiId ?? '',
      });
    }
  }, [isOpen, task, reset]);

  const handleSubmitForm = useCallback((v: UpdateFormValues) => {
    onSubmit({
      taskName: v.taskName,
      unit: v.unit || undefined,
      annualTarget: v.annualTarget,
      corporateKpiId: v.corporateKpiId || undefined,
    });
  }, [onSubmit]);

  const handleUpdateSave = useCallback(() => {
    handleSubmit(handleSubmitForm)();
  }, [handleSubmit, handleSubmitForm]);

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} isDismissable={false} onOpenChange={(o) => { if (!o) onClose(); }}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[520px]">
            <Modal.Header className="items-center text-center"><Modal.Heading>Ajukan Perubahan Tugas</Modal.Heading></Modal.Header>
            <Modal.Body>
              <Surface className="flex flex-col gap-4 rounded-3xl p-6">
                <TextField isRequired isInvalid={!!errors.taskName}>
                  <Label>Nama Tugas</Label>
                  <Input variant="secondary" placeholder="Masukkan nama tugas" {...register('taskName')} />
                  <FieldError />
                </TextField>
                <TextField isInvalid={!!errors.unit}>
                  <Label>Satuan</Label>
                  <Input variant="secondary" placeholder="Cth: Persen" {...register('unit')} />
                  <FieldError />
                </TextField>
                <TextField isInvalid={!!errors.annualTarget}>
                  <Label>Target Tahunan</Label>
                  <Input variant="secondary" type="number" placeholder="0" {...register('annualTarget', { valueAsNumber: true })} />
                  <FieldError />
                </TextField>
                {leafKpis.length > 0 && (
                  <Controller
                    name="corporateKpiId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        key={field.value || NIL_UUID}
                        variant="secondary"
                        selectedKey={field.value || NIL_UUID}
                        onSelectionChange={(k: React.Key | null) => field.onChange(k === NIL_UUID ? '' : String(k))}
                        aria-label="Indikator KPI Korporat"
                      >
                        <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            <ListBox.Item key={NIL_UUID} id={NIL_UUID} textValue="Tidak Diubah">Tidak Diubah</ListBox.Item>
                            {leafKpis.map((kpi) => (
                              <ListBox.Item key={kpi.id} id={kpi.id} textValue={kpi.indicatorName}>
                                {kpi.indicatorCode} — {kpi.indicatorName}
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    )}
                  />
                )}
              </Surface>
            </Modal.Body>
            <Modal.Footer className="flex-col-reverse">
              <Button className="w-full" variant="primary" onPress={handleUpdateSave} isDisabled={isSubmitting} isPending={isSubmitting}>
                {isSubmitting ? 'Mengirim...' : 'Ajukan Perubahan'}
              </Button>
              <Button className="w-full" variant="secondary" slot="close" onPress={onClose} isDisabled={isSubmitting}>Batal</Button>
            </Modal.Footer>
            <Modal.CloseTrigger />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

// ===== DELETE FORM =====
function DeleteForm({
  isOpen, task, isSubmitting, onClose,
  onSubmit,
}: {
  isOpen: boolean; task: KpiTaskResponse | null; isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: DeleteTaskChangeRequest) => void;
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<DeleteFormValues>({
    resolver: zodResolver(deleteSchema),
    defaultValues: { reason: '' },
  });

  useEffect(() => { if (isOpen) reset(); }, [isOpen, reset]);

  const handleDeleteSave = useCallback(() => {
    handleSubmit(onSubmit)();
  }, [handleSubmit, onSubmit]);

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} isDismissable={false} onOpenChange={(o) => { if (!o) onClose(); }}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[420px]">
            <Modal.Header className="items-center text-center">
              <Modal.Heading>Ajukan Pembatalan Tugas</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Surface className="flex flex-col gap-4 rounded-3xl p-6">
                {task && (
                  <p className="text-sm text-muted-foreground">
                    Tugas <strong className="text-foreground">{task.taskName}</strong> ({task.taskCode}) akan dibatalkan setelah disetujui Admin KPI. Laporan yang sudah ada tetap tersimpan.
                  </p>
                )}
                <TextField isRequired isInvalid={!!errors.reason}>
                  <Label>Alasan Pembatalan</Label>
                  <TextArea variant="secondary" placeholder="Jelaskan alasan pembatalan..." rows={3} {...register('reason')} />
                  <FieldError />
                </TextField>
              </Surface>
            </Modal.Body>
            <Modal.Footer className="flex-col-reverse">
              <Button className="w-full" variant="primary" onPress={handleDeleteSave} isDisabled={isSubmitting} isPending={isSubmitting}>
                {isSubmitting ? 'Mengirim...' : 'Ajukan Pembatalan'}
              </Button>
              <Button className="w-full" variant="secondary" slot="close" onPress={onClose} isDisabled={isSubmitting}>Batal</Button>
            </Modal.Footer>
            <Modal.CloseTrigger />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
