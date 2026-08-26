'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, TextField, TextArea, Select, ListBox, Label, Spinner } from '@heroui/react';
import { X, ArrowsClockwise } from '@phosphor-icons/react';
import { toast } from '@heroui/react';
import { employeeApi } from '@/modules/organization/employees/services/employee-api';
import type { CoreUser } from '@/modules/organization/employees/types';
import { kpiAdminV1Api } from './kpi-admin-v1-api';
import type { KpiReportResponse } from '@/modules/kpi/report/report-v1.types';

interface ReassignReviewerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  report: KpiReportResponse;
  /** Called after successful reassignment (refetch to-review). */
  onSuccess: () => void;
}

/**
 * T18 — administrative Report reviewer reassignment (stuck-report recovery).
 * Action-level guard: the caller must hold `kpi_report:manage` (enforced at
 * the trigger site AND by the backend @PreAuthorize). The submitter can never
 * become the reviewer (backend-enforced).
 */
export function ReassignReviewerDialog({ isOpen, onClose, report, onSuccess }: ReassignReviewerDialogProps) {
  const [users, setUsers] = useState<CoreUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const page = await employeeApi.getUsers({ size: 100 });
      setUsers(page.content);
    } catch {
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setSelectedUserId('');
      setReason('');
      setValidationError(null);
    }
  }, [isOpen, loadUsers]);

  const handleConfirm = useCallback(async () => {
    setValidationError(null);
    if (!selectedUserId) {
      setValidationError('Pilih peninjau baru.');
      return;
    }
    if (!reason.trim()) {
      setValidationError('Alasan administratif wajib diisi.');
      return;
    }
    if (reason.length > 1000) {
      setValidationError('Alasan maksimal 1.000 karakter.');
      return;
    }
    setIsSubmitting(true);
    try {
      await kpiAdminV1Api.adminReassignReportReviewer(report.id, {
        newReviewerUserId: selectedUserId,
        reason: reason.trim(),
      });
      toast.success('Peninjau berhasil dialihkan.');
      onSuccess();
      onClose();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Gagal mengalihkan peninjau.');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedUserId, reason, report.id, onSuccess, onClose]);

  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Backdrop isDismissable={false}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[480px]">
            <Modal.Header>
              <Modal.Heading>Alihkan Peninjau</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Alihkan peninjauan untuk{' '}
                  <strong className="text-foreground">{report.activityName}</strong>{' '}
                  (saat ini ditugaskan kepada{' '}
                  <strong className="text-foreground">{report.reviewerUserName ?? 'peninjau saat ini'}</strong>).
                </p>

                <div>
                  {isLoadingUsers ? (
                    <div className="flex items-center justify-center py-4"><Spinner size="sm" /></div>
                  ) : (
                    <Select
                      variant="secondary"
                      selectedKey={selectedUserId || null}
                      onSelectionChange={(k) => setSelectedUserId(String(k || ''))}
                      isInvalid={!!validationError && !selectedUserId}
                      placeholder="Pilih peninjau baru..."
                    >
                      <Label>Peninjau Baru</Label>
                      <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {users.map((u) => (
                            <ListBox.Item key={u.id} id={u.id} textValue={u.fullName}>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-foreground">{u.fullName}</span>
                                <span className="text-xs text-muted-foreground">{u.email}</span>
                              </div>
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  )}
                </div>

                <TextField value={reason} onChange={(e) => { setReason(e); setValidationError(null); }} isInvalid={!!validationError && !!reason}>
                  <Label>Alasan</Label>
                  <TextArea variant="secondary" placeholder="Alasan audit administratif (wajib)..." rows={3} />
                </TextField>
                {validationError && <p className="-mt-2 text-xs text-danger">{validationError}</p>}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose} isDisabled={isSubmitting}>
                <X className="h-4 w-4" />
                Batal
              </Button>
              <Button variant="primary" onPress={handleConfirm} isDisabled={isSubmitting} isPending={isSubmitting}>
                <ArrowsClockwise className="h-4 w-4" />
                Alihkan
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
