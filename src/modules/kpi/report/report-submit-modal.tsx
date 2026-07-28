'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal, Button, Input, TextField, TextArea, Select, ListBox, Label, Spinner,
} from '@heroui/react';
import { X } from '@phosphor-icons/react';
import { useReportData } from './use-report-data';
import { activityApi } from '@/modules/kpi/activity/activity-api';
import type { KpiActivityResponse } from '@/modules/kpi/activity/activity.types';

interface ReportSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;  // Called after successful submit (refreshes My Reports if permitted)
  canReadMyReports: boolean;
}

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function ReportSubmitModal({ isOpen, onClose, onSuccess, canReadMyReports }: ReportSubmitModalProps) {
  const { submitReport, isSubmitting } = useReportData();

  /* ── Eligible activities ── */
  const [activities, setActivities] = useState<KpiActivityResponse[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  /* ── Form fields ── */
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [executionDescription, setExecutionDescription] = useState('');
  const [realizedValue, setRealizedValue] = useState('');
  const [note, setNote] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const evidencePreviewRef = useRef<string | null>(null);

  /* ── Validation errors ── */
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ── Load eligible activities on open ── */
  const loadActivities = useCallback(async () => {
    setIsLoadingActivities(true);
    try {
      const all = await activityApi.getMyActivities();
      // Filter to ACTIVE only; CANCELLED omitted
      setActivities(all.filter((a) => a.status === 'ACTIVE'));
    } catch {
      setActivities([]);
    } finally {
      setIsLoadingActivities(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadActivities();
      // Default report date to today if it's reasonable
      setReportDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, loadActivities]);

  /* ── Evidence preview ── */
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    // Revoke previous preview URL via ref
    if (evidencePreviewRef.current) {
      URL.revokeObjectURL(evidencePreviewRef.current);
      evidencePreviewRef.current = null;
    }

    setEvidenceFile(file);

    if (file && ALLOWED_MIME.includes(file.type) && file.size <= MAX_FILE_SIZE) {
      const url = URL.createObjectURL(file);
      evidencePreviewRef.current = url;
      setEvidencePreview(url);
    } else {
      setEvidencePreview(null);
    }
  }, []);

  // Revoke object URL on unmount
  useEffect(() => {
    return () => {
      if (evidencePreviewRef.current) URL.revokeObjectURL(evidencePreviewRef.current);
    };
  }, []);

  /* ── Selected activity for context display ── */
  const selectedActivity = activities.find((a) => a.id === selectedActivityId);

  /* ── Validate ── */
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};

    if (!selectedActivityId) errs.activity = 'Please select an activity.';
    if (!reportDate) errs.date = 'Report date is required.';
    if (!executionDescription.trim()) {
      errs.description = 'Execution description is required.';
    } else if (executionDescription.length > 2000) {
      errs.description = 'Execution description must not exceed 2,000 characters.';
    }
    const rv = parseFloat(realizedValue);
    if (!realizedValue || isNaN(rv) || rv <= 0) errs.value = 'Realized value must be a positive number.';
    if (note.length > 1000) errs.note = 'Note must not exceed 1,000 characters.';
    if (!evidenceFile) {
      errs.evidence = 'Photo evidence is required.';
    } else if (!ALLOWED_MIME.includes(evidenceFile.type)) {
      errs.evidence = 'Evidence must be a JPEG, PNG, or WebP image.';
    } else if (evidenceFile.size > MAX_FILE_SIZE) {
      errs.evidence = 'File size must not exceed 5 MB.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [selectedActivityId, reportDate, executionDescription, realizedValue, note, evidenceFile]);

  /* ── Submit ── */
  const handleSubmit = useCallback(async () => {
    if (!validate() || !evidenceFile) return;

    const success = await submitReport(
      {
        activityId: selectedActivityId,
        reportDate,
        executionDescription: executionDescription.trim(),
        realizedValue: parseFloat(realizedValue),
        note: note.trim() || undefined,
      },
      evidenceFile,
    );

    if (success) {
      // Close modal; parent decides whether to refresh My Reports
      if (canReadMyReports) onSuccess();
      handleClose();
    }
  }, [validate, evidenceFile, submitReport, selectedActivityId, reportDate, executionDescription, realizedValue, note, canReadMyReports, onSuccess]);

  /* ── Reset ── */
  const reset = useCallback(() => {
    setSelectedActivityId('');
    setReportDate('');
    setExecutionDescription('');
    setRealizedValue('');
    setNote('');
    setEvidenceFile(null);
    if (evidencePreviewRef.current) {
      URL.revokeObjectURL(evidencePreviewRef.current);
      evidencePreviewRef.current = null;
    }
    setEvidencePreview(null);
    setErrors({});
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <Modal.Backdrop isDismissable={false}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[600px]">
            <Modal.Header>
              <Modal.Heading>Submit Report</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col gap-4">
                {/* ── Activity Selector ── */}
                <div>
                  {isLoadingActivities ? (
                    <div className="flex items-center justify-center py-4"><Spinner size="sm" /></div>
                  ) : activities.length === 0 ? (
                    <div className="rounded-3xl bg-surface-secondary p-4 text-center text-sm text-muted-foreground">
                      No eligible activities. You must be assigned to an active activity to submit a report.
                    </div>
                  ) : (
                    <Select
                      variant="secondary"
                      selectedKey={selectedActivityId || null}
                      onSelectionChange={(k) => setSelectedActivityId(String(k || ''))}
                      isInvalid={!!errors.activity}
                      placeholder="Select activity..."
                    >
                      <Label>Activity</Label>
                      <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {activities.map((a) => (
                            <ListBox.Item key={a.id} id={a.id} textValue={a.activityName}>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-foreground">{a.activityName}</span>
                                <span className="text-xs text-muted-foreground">
                                  Target: {a.targetValue} {a.unit} &middot; Period: {a.periodYear}/{String(a.periodMonth).padStart(2, '0')}
                                </span>
                              </div>
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  )}
                  {errors.activity && <p className="mt-1 text-xs text-danger">{errors.activity}</p>}
                </div>

                {/* ── Selected activity context ── */}
                {selectedActivity && (
                  <div className="rounded-xl bg-surface-secondary p-3 text-sm">
                    <span className="font-medium text-foreground">{selectedActivity.activityName}</span>
                    <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Target: {selectedActivity.targetValue} {selectedActivity.unit}</span>
                      <span>Period: {selectedActivity.periodYear}/{String(selectedActivity.periodMonth).padStart(2, '0')}</span>
                      <span>Progress: {selectedActivity.progressPercent}%</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Realized value is incremental — enter the value achieved this period.
                    </p>
                  </div>
                )}

                {/* ── Report Date ── */}
                <TextField
                  isRequired
                  value={reportDate}
                  onChange={(e) => setReportDate(e)}
                  isInvalid={!!errors.date}
                >
                  <Label>Report Date</Label>
                  <Input variant="secondary" type="date" />
                </TextField>
                {errors.date && <p className="-mt-3 text-xs text-danger">{errors.date}</p>}

                {/* ── Execution Description ── */}
                <TextField
                  isRequired
                  value={executionDescription}
                  onChange={(e) => setExecutionDescription(e)}
                  isInvalid={!!errors.description}
                >
                  <Label>Execution Description</Label>
                  <TextArea variant="secondary" placeholder="Describe the work completed..." rows={3} />
                </TextField>
                {errors.description && <p className="-mt-3 text-xs text-danger">{errors.description}</p>}
                <p className="-mt-3 text-xs text-muted-foreground">{executionDescription.length}/2000</p>

                {/* ── Realized Value ── */}
                <TextField
                  isRequired
                  value={realizedValue}
                  onChange={(e) => setRealizedValue(e)}
                  isInvalid={!!errors.value}
                >
                  <Label>Realized Value {selectedActivity ? `(${selectedActivity.unit})` : ''}</Label>
                  <Input variant="secondary" type="number" step="any" placeholder="Incremental value for this period..." />
                </TextField>
                {errors.value && <p className="-mt-3 text-xs text-danger">{errors.value}</p>}
                <p className="-mt-3 text-xs text-muted-foreground">
                  Enter the value achieved during this reporting period. Approved values are summed automatically.
                </p>

                {/* ── Note ── */}
                <TextField
                  value={note}
                  onChange={(e) => setNote(e)}
                  isInvalid={!!errors.note}
                >
                  <Label>Note</Label>
                  <TextArea variant="secondary" placeholder="Optional note..." rows={2} />
                </TextField>
                {errors.note && <p className="-mt-3 text-xs text-danger">{errors.note}</p>}

                {/* ── Evidence File ── */}
                <div>
                  <Label className="mb-1 block text-sm">Photo Evidence (JPEG, PNG, or WebP, max 5 MB)</Label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary"
                  />
                  {errors.evidence && <p className="mt-1 text-xs text-danger">{errors.evidence}</p>}
                  {evidencePreview && (
                    <div className="mt-2">
                      <img src={evidencePreview} alt="Evidence preview" className="max-h-48 rounded-lg object-contain" />
                      {evidenceFile && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {evidenceFile.name} ({(evidenceFile.size / 1024).toFixed(1)} KB)
                        </p>
                      )}
                    </div>
                  )}
                  {evidenceFile && !errors.evidence && !evidencePreview && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {evidenceFile.name} ({(evidenceFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={handleClose} isDisabled={isSubmitting}>
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button variant="primary" onPress={handleSubmit} isDisabled={isSubmitting} isPending={isSubmitting}>
                Submit Report
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
