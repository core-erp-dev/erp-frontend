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
      onClose={onClose} onSubmit={onSubmitCreate}
    />
  );
};

// ===== CREATE FORM =====
function CreateForm({
  isOpen, isSubmitting, leafKpis,
  onClose, onSubmit,
}: {
  isOpen: boolean; isSubmitting: boolean; leafKpis: CorporateKpiResponse[];
  onClose: () => void;
  onSubmit: (data: CreateTaskChangeRequest) => void;
}) {
  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      assignedToUserPositionId: '', corporateKpiId: '', taskName: '',
      unit: '', annualTarget: 0, periodYear: new Date().getFullYear(),
    },
  });

  // Position search state
  const [positionSearch, setPositionSearch] = useState('');
  const debouncedSearch = useDebounce(positionSearch, 400);
  const [positionResults, setPositionResults] = useState<AssignableUserPosition[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<AssignableUserPosition | null>(null);

  // Reset form + search on open
  useEffect(() => {
    if (isOpen) {
      form.reset();
      setPositionSearch('');
      setPositionResults([]);
      setSelectedPosition(null);
    }
  }, [isOpen, form]);

  // Search assignable positions
  useEffect(() => {
    if (!isOpen) return;
    if (!debouncedSearch.trim()) { setPositionResults([]); return; }
    let cancelled = false;
    setIsSearching(true);
    kpiAssignableApi.getAssignableUserPositions(debouncedSearch)
      .then((r) => { if (!cancelled) setPositionResults(r); })
      .catch(() => { if (!cancelled) setPositionResults([]); })
      .finally(() => { if (!cancelled) setIsSearching(false); });
    return () => { cancelled = true; };
  }, [debouncedSearch, isOpen]);

  // Clear selected position when search changes and no longer matches
  useEffect(() => {
    if (positionSearch !== '' && selectedPosition) {
      const q = positionSearch.toLowerCase();
      const nameMatches = selectedPosition.userName.toLowerCase().includes(q) ||
        selectedPosition.positionName.toLowerCase().includes(q);
      if (!nameMatches) {
        setSelectedPosition(null);
        form.setValue('assignedToUserPositionId', '', { shouldValidate: true });
      }
    }
  }, [positionSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectPosition = useCallback((pos: AssignableUserPosition | null) => {
    setSelectedPosition(pos);
    form.setValue('assignedToUserPositionId', pos ? pos.userPositionId : '', { shouldValidate: true });
    // Close results after selection
    if (pos) setPositionResults([]);
  }, [form]);

  const handleSubmitForm = useCallback((v: CreateFormValues) => {
    onSubmit({
      assignedToUserPositionId: v.assignedToUserPositionId,
      corporateKpiId: v.corporateKpiId,
      taskName: v.taskName,
      unit: v.unit || undefined,
      annualTarget: v.annualTarget,
      periodYear: v.periodYear,
    });
  }, [onSubmit]);

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} isDismissable={false} onOpenChange={(o) => { if (!o) onClose(); }}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[560px]">
            <Modal.Header className="items-center text-center"><Modal.Heading>Ajukan Tugas</Modal.Heading></Modal.Header>
            <Modal.Body>
              <form id="create-task-form" onSubmit={form.handleSubmit(handleSubmitForm)}>
                <Surface className="flex flex-col gap-4 rounded-3xl p-6">
                  {/* Assignable position selector — matches employee-form Controller pattern */}
                  <Controller
                    control={form.control}
                    name="assignedToUserPositionId"
                    render={({ fieldState }) => (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Cari Pegawai</Label>
                        <SearchField
                          value={positionSearch}
                          onChange={setPositionSearch}
                          variant="secondary"
                          isDisabled={isSubmitting}
                        >
                          <SearchField.Group>
                            <SearchField.SearchIcon />
                            <SearchField.Input placeholder="Cari nama atau jabatan..." />
                            <SearchField.ClearButton />
                          </SearchField.Group>
                        </SearchField>

                        {/* Loading */}
                        {isSearching && (
                          <div className="flex justify-center py-2"><Spinner size="sm" /></div>
                        )}

                        {/* Results */}
                        {!isSearching && positionResults.length > 0 && (
                          <div className="max-h-44 space-y-1 overflow-y-auto">
                            {positionResults.map((pos) => (
                              <Button
                                key={pos.userPositionId}
                                variant="ghost"
                                className={`w-full justify-start rounded-xl px-4 py-2.5 text-left h-auto ${
                                  selectedPosition?.userPositionId === pos.userPositionId
                                    ? 'bg-primary/10' : 'bg-surface-secondary'
                                }`}
                                isDisabled={isSubmitting}
                                onPress={() => handleSelectPosition(
                                  selectedPosition?.userPositionId === pos.userPositionId ? null : pos
                                )}
                              >
                                <span>
                                  <span className="font-medium text-foreground">{pos.userName}</span>
                                  <span className="ml-2 text-xs text-gray-400">{pos.positionName}</span>
                                </span>
                              </Button>
                            ))}
                          </div>
                        )}

                        {/* Empty state */}
                        {!isSearching && positionSearch.trim() && positionResults.length === 0 && (
                          <p className="text-xs text-muted-foreground">Pegawai tidak ditemukan.</p>
                        )}

                        {/* Validation error */}
                        {fieldState.error && (
                          <FieldError>{fieldState.error.message}</FieldError>
                        )}
                      </div>
                    )}
                  />

                  {/* KPI selector */}
                  <Controller
                    control={form.control}
                    name="corporateKpiId"
                    render={({ field, fieldState }) => (
                      <Select
                        key={field.value || NIL_UUID}
                        variant="secondary"
                        isRequired
                        isDisabled={isSubmitting}
                        isInvalid={!!fieldState.error}
                        selectedKey={field.value || NIL_UUID}
                        onSelectionChange={(k: React.Key | null) =>
                          field.onChange(k === NIL_UUID ? '' : String(k))
                        }
                        aria-label="Indikator KPI Korporat"
                        placeholder="Pilih indikator"
                      >
                        <Label>Indikator KPI Korporat</Label>
                        <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {leafKpis.length === 0 && (
                              <ListBox.Item key={NIL_UUID} id={NIL_UUID} textValue="Tidak ada indikator leaf">
                                Tidak ada indikator leaf tersedia
                              </ListBox.Item>
                            )}
                            {leafKpis.map((kpi) => (
                              <ListBox.Item key={kpi.id} id={kpi.id} textValue={kpi.indicatorName}>
                                {kpi.indicatorCode} — {kpi.indicatorName}
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                        {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                      </Select>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="taskName"
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
                        <Label>Nama Tugas</Label>
                        <Input variant="secondary" placeholder="Masukkan nama tugas" />
                        {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                      </TextField>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="unit"
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
                        <Label>Satuan</Label>
                        <Input variant="secondary" placeholder="Cth: Persen" />
                        {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                      </TextField>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="annualTarget"
                    render={({ field, fieldState }) => (
                      <TextField
                        validationBehavior="aria"
                        className="w-full"
                        name={field.name}
                        value={field.value === 0 ? '' : String(field.value)}
                        onChange={(v) => field.onChange(v === '' ? 0 : Number(v))}
                        isInvalid={!!fieldState.error}
                        isDisabled={isSubmitting}
                      >
                        <Label>Target Tahunan</Label>
                        <Input variant="secondary" type="number" placeholder="0" />
                        {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                      </TextField>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="periodYear"
                    render={({ field, fieldState }) => (
                      <TextField
                        isRequired
                        validationBehavior="aria"
                        className="w-full"
                        name={field.name}
                        value={field.value === 0 ? '' : String(field.value)}
                        onChange={(v) => field.onChange(v === '' ? 0 : Number(v))}
                        isInvalid={!!fieldState.error}
                        isDisabled={isSubmitting}
                      >
                        <Label>Tahun Periode</Label>
                        <Input variant="secondary" type="number" />
                        {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                      </TextField>
                    )}
                  />

                  {/* Info: Kode Tugas dibuat otomatis oleh sistem */}
                  <p className="text-xs text-muted-foreground">
                    Kode tugas dibuat otomatis oleh sistem saat disetujui.
                  </p>
                </Surface>
              </form>
            </Modal.Body>
            <Modal.Footer className="flex-col-reverse">
              <Button
                className="w-full"
                variant="primary"
                type="submit"
                form="create-task-form"
                isDisabled={isSubmitting}
                isPending={isSubmitting}
              >
                {isSubmitting ? 'Mengirim...' : 'Ajukan'}
              </Button>
              <Button className="w-full" variant="secondary" slot="close" onPress={onClose} isDisabled={isSubmitting}>
                Batal
              </Button>
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
  const form = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: { taskName: '', unit: '', annualTarget: 0, corporateKpiId: '' },
  });

  useEffect(() => {
    if (isOpen && task) {
      form.reset({
        taskName: task.taskName,
        unit: task.unit ?? '',
        annualTarget: task.annualTarget,
        corporateKpiId: task.corporateKpiId ?? '',
      });
    }
  }, [isOpen, task, form]);

  const handleSubmitForm = useCallback((v: UpdateFormValues) => {
    onSubmit({
      taskName: v.taskName,
      unit: v.unit || undefined,
      annualTarget: v.annualTarget,
      corporateKpiId: v.corporateKpiId || undefined,
    });
  }, [onSubmit]);

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} isDismissable={false} onOpenChange={(o) => { if (!o) onClose(); }}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[520px]">
            <Modal.Header className="items-center text-center"><Modal.Heading>Ajukan Perubahan Tugas</Modal.Heading></Modal.Header>
            <Modal.Body>
              <form id="update-task-form" onSubmit={form.handleSubmit(handleSubmitForm)}>
                <Surface className="flex flex-col gap-4 rounded-3xl p-6">
                  <Controller
                    control={form.control}
                    name="taskName"
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
                        <Label>Nama Tugas</Label>
                        <Input variant="secondary" placeholder="Masukkan nama tugas" />
                        {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                      </TextField>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="unit"
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
                        <Label>Satuan</Label>
                        <Input variant="secondary" placeholder="Cth: Persen" />
                        {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                      </TextField>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="annualTarget"
                    render={({ field, fieldState }) => (
                      <TextField
                        validationBehavior="aria"
                        className="w-full"
                        name={field.name}
                        value={field.value === 0 ? '' : String(field.value)}
                        onChange={(v) => field.onChange(v === '' ? 0 : Number(v))}
                        isInvalid={!!fieldState.error}
                        isDisabled={isSubmitting}
                      >
                        <Label>Target Tahunan</Label>
                        <Input variant="secondary" type="number" placeholder="0" />
                        {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                      </TextField>
                    )}
                  />
                  {leafKpis.length > 0 && (
                    <Controller
                      control={form.control}
                      name="corporateKpiId"
                      render={({ field, fieldState }) => (
                        <Select
                          key={field.value || NIL_UUID}
                          variant="secondary"
                          isDisabled={isSubmitting}
                          isInvalid={!!fieldState.error}
                          selectedKey={field.value || NIL_UUID}
                          onSelectionChange={(k: React.Key | null) =>
                            field.onChange(k === NIL_UUID ? '' : String(k))
                          }
                          aria-label="Indikator KPI Korporat"
                          placeholder="Tidak Diubah"
                        >
                          <Label>Indikator KPI Korporat</Label>
                          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              <ListBox.Item key={NIL_UUID} id={NIL_UUID} textValue="Tidak Diubah">
                                Tidak Diubah
                              </ListBox.Item>
                              {leafKpis.map((kpi) => (
                                <ListBox.Item key={kpi.id} id={kpi.id} textValue={kpi.indicatorName}>
                                  {kpi.indicatorCode} — {kpi.indicatorName}
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                          {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                        </Select>
                      )}
                    />
                  )}
                </Surface>
              </form>
            </Modal.Body>
            <Modal.Footer className="flex-col-reverse">
              <Button
                className="w-full"
                variant="primary"
                type="submit"
                form="update-task-form"
                isDisabled={isSubmitting}
                isPending={isSubmitting}
              >
                {isSubmitting ? 'Mengirim...' : 'Ajukan Perubahan'}
              </Button>
              <Button className="w-full" variant="secondary" slot="close" onPress={onClose} isDisabled={isSubmitting}>
                Batal
              </Button>
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
  const form = useForm<DeleteFormValues>({
    resolver: zodResolver(deleteSchema),
    defaultValues: { reason: '' },
  });

  useEffect(() => { if (isOpen) form.reset(); }, [isOpen, form]);

  const handleSubmitForm = useCallback((v: DeleteFormValues) => {
    onSubmit(v);
  }, [onSubmit]);

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} isDismissable={false} onOpenChange={(o) => { if (!o) onClose(); }}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[420px]">
            <Modal.Header className="items-center text-center">
              <Modal.Heading>Ajukan Pembatalan Tugas</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <form id="delete-task-form" onSubmit={form.handleSubmit(handleSubmitForm)}>
                <Surface className="flex flex-col gap-4 rounded-3xl p-6">
                  {task && (
                    <p className="text-sm text-muted-foreground">
                      Tugas <strong className="text-foreground">{task.taskName}</strong> ({task.taskCode}) akan dibatalkan setelah disetujui Admin KPI. Laporan yang sudah ada tetap tersimpan.
                    </p>
                  )}
                  <Controller
                    control={form.control}
                    name="reason"
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
                        <Label>Alasan Pembatalan</Label>
                        <TextArea variant="secondary" placeholder="Jelaskan alasan pembatalan..." rows={3} />
                        {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                      </TextField>
                    )}
                  />
                </Surface>
              </form>
            </Modal.Body>
            <Modal.Footer className="flex-col-reverse">
              <Button
                className="w-full"
                variant="primary"
                type="submit"
                form="delete-task-form"
                isDisabled={isSubmitting}
                isPending={isSubmitting}
              >
                {isSubmitting ? 'Mengirim...' : 'Ajukan Pembatalan'}
              </Button>
              <Button className="w-full" variant="secondary" slot="close" onPress={onClose} isDisabled={isSubmitting}>
                Batal
              </Button>
            </Modal.Footer>
            <Modal.CloseTrigger />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
