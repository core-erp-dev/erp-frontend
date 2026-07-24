'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal, Button, Input, TextField, TextArea, Select, ListBox, Label, Spinner,
} from '@heroui/react';
import { X } from '@phosphor-icons/react';
import { useActivityData } from './use-activity-data';
import { corporateKpiApi } from '@/modules/hr/kpi/corporate/corporate-kpi-api';
import type { CorporateKpiNode } from '@/modules/hr/kpi/corporate/corporate-kpi.types';
import type {
  ActivityFormMode,
  KpiActivityResponse,
  CreateRootActivityPayload,
  CreateChildActivityPayload,
  UpdateKpiActivityPayload,
} from './activity.types';

interface ActivityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ActivityFormMode;
  /** Current activity data (for CREATE_CHILD parent, for UPDATE current state). */
  activity?: KpiActivityResponse | null;
}

export function ActivityFormModal({ isOpen, onClose, mode, activity }: ActivityFormModalProps) {
  const {
    assignablePositions, isLoadingAssignable, isSubmitting,
    fetchAssignableForRoot, fetchAssignableForChild,
    submitRootCreate, submitChildCreate, submitUpdate,
  } = useActivityData();

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear - 1; y <= currentYear + 3; y++) years.push(y);
    return years;
  }, [currentYear]);

  // ── Form state ──
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [corporateKpiTree, setCorporateKpiTree] = useState<CorporateKpiNode[]>([]);
  const [isLoadingCk, setIsLoadingCk] = useState(false);
  const [selectedCkId, setSelectedCkId] = useState<string>('');
  const [periodMonth, setPeriodMonth] = useState<number>(new Date().getMonth() + 1);
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [activityName, setActivityName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [targetValue, setTargetValue] = useState<string>('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Load CK tree when year changes (root create only) ──
  const fetchCkTree = useCallback(async (year: number) => {
    if (mode !== 'CREATE_ROOT') return;
    setIsLoadingCk(true);
    try {
      const tree = await corporateKpiApi.getTreeByYear(year);
      // Filter to ACTIVE INDICATOR nodes
      const indicators: CorporateKpiNode[] = [];
      const collect = (nodes: CorporateKpiNode[]) => {
        for (const node of nodes) {
          if (node.nodeType === 'INDICATOR' && node.status === 'ACTIVE') indicators.push(node);
          if (node.children.length > 0) collect(node.children);
        }
      };
      collect(tree);
      setCorporateKpiTree(indicators);
    } catch {
      setCorporateKpiTree([]);
    } finally {
      setIsLoadingCk(false);
    }
  }, [mode]);

  useEffect(() => {
    if (isOpen && mode === 'CREATE_ROOT') fetchCkTree(selectedYear);
  }, [isOpen, mode, selectedYear, fetchCkTree]);

  // ── Load assignable positions on open ──
  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'CREATE_ROOT') fetchAssignableForRoot();
    else if (mode === 'CREATE_CHILD' && activity?.id) fetchAssignableForChild(activity.id);
  }, [isOpen, mode, activity?.id, fetchAssignableForRoot, fetchAssignableForChild]);

  // ── Pre-fill for update mode ──
  useEffect(() => {
    if (isOpen && mode === 'UPDATE' && activity) {
      setActivityName(activity.activityName);
      setDescription(activity.description || '');
      setUnit(activity.unit);
      setTargetValue(String(activity.targetValue));
    }
  }, [isOpen, mode, activity]);

  // ── Reset on close ──
  const reset = useCallback(() => {
    setSelectedYear(currentYear);
    setCorporateKpiTree([]);
    setSelectedCkId('');
    setPeriodMonth(new Date().getMonth() + 1);
    setAssigneeId('');
    setActivityName('');
    setDescription('');
    setUnit('');
    setTargetValue('');
    setSubmitError(null);
    setErrors({});
  }, [currentYear]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // ── Validate ──
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};

    if (mode === 'CREATE_ROOT') {
      if (!selectedCkId) errs.ck = 'Corporate KPI is required.';
      if (!periodMonth || periodMonth < 1 || periodMonth > 12) errs.month = 'Month must be 1-12.';
    }
    if (mode !== 'UPDATE') {
      if (!assigneeId) errs.assignee = 'Assignee is required.';
    }
    if (!activityName.trim()) errs.name = 'Activity name is required.';
    else if (activityName.length > 255) errs.name = 'Activity name must not exceed 255 characters.';
    if (mode === 'CREATE_ROOT' || mode === 'CREATE_CHILD') {
      if (!unit.trim()) errs.unit = 'Unit is required.';
      else if (unit.length > 50) errs.unit = 'Unit must not exceed 50 characters.';
    } else if (mode === 'UPDATE') {
      if (!unit.trim()) errs.unit = 'Unit is required.';
      else if (unit.length > 50) errs.unit = 'Unit must not exceed 50 characters.';
    }
    const tv = parseFloat(targetValue);
    if (!targetValue || isNaN(tv) || tv <= 0) errs.target = 'Target value must be a positive number.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [mode, selectedCkId, periodMonth, assigneeId, activityName, unit, targetValue]);

  // ── Submit ──
  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    setSubmitError(null);

    let success = false;

    if (mode === 'CREATE_ROOT') {
      const payload: CreateRootActivityPayload = {
        corporateKpiId: selectedCkId,
        assignedToUserPositionId: assigneeId,
        activityName: activityName.trim(),
        unit: unit.trim(),
        targetValue: parseFloat(targetValue),
        periodYear: selectedYear,
        periodMonth,
      };
      if (description.trim()) payload.description = description.trim();
      success = await submitRootCreate(payload);
    } else if (mode === 'CREATE_CHILD') {
      if (!activity?.id) return;
      const payload: CreateChildActivityPayload = {
        parentActivityId: activity.id,
        assignedToUserPositionId: assigneeId,
        activityName: activityName.trim(),
        unit: unit.trim(),
        targetValue: parseFloat(targetValue),
      };
      if (description.trim()) payload.description = description.trim();
      success = await submitChildCreate(payload);
    } else if (mode === 'UPDATE') {
      if (!activity?.id) return;
      const payload: UpdateKpiActivityPayload = {
        activityId: activity.id,
        activityName: activityName.trim(),
        description: description === '' && (activity.description === null || activity.description === '') ? '' : (description || null),
        unit: unit.trim(),
        targetValue: parseFloat(targetValue),
      };
      success = await submitUpdate(payload);
    }

    if (success) handleClose();
  }, [mode, activity, validate, selectedCkId, assigneeId, activityName, description, unit, targetValue, selectedYear, periodMonth, submitRootCreate, submitChildCreate, submitUpdate, handleClose]);

  // ── Year change handler: clear CK selection ──
  const handleYearChange = useCallback((year: number) => {
    setSelectedYear(year);
    setSelectedCkId('');
  }, []);

  const title = mode === 'CREATE_ROOT' ? 'Create Root Activity'
    : mode === 'CREATE_CHILD' ? 'Create Child Activity'
    : 'Request Update';

  const isRootCreate = mode === 'CREATE_ROOT';
  const isChildCreate = mode === 'CREATE_CHILD';
  const isUpdate = mode === 'UPDATE';

  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <Modal.Backdrop isDismissable={false}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[600px]">
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body>
              {submitError && (
                <div className="mb-4 rounded-lg bg-danger-soft p-3 text-sm text-danger-soft-foreground">
                  {submitError}
                </div>
              )}

              <div className="flex flex-col gap-4">
                {/* ── Year (Root only) ── */}
                {isRootCreate && (
                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      variant="secondary"
                      selectedKey={String(selectedYear)}
                      onSelectionChange={(k) => handleYearChange(Number(k))}
                      isInvalid={!!errors.year}
                    >
                      <Label>Period Year</Label>
                      <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {yearOptions.map((y) => (
                            <ListBox.Item key={String(y)} id={String(y)} textValue={String(y)}>
                              {y}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>

                    <Select
                      variant="secondary"
                      selectedKey={String(periodMonth)}
                      onSelectionChange={(k) => setPeriodMonth(Number(k))}
                      isInvalid={!!errors.month}
                    >
                      <Label>Period Month</Label>
                      <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <ListBox.Item key={String(m)} id={String(m)} textValue={String(m).padStart(2, '0')}>
                              {String(m).padStart(2, '0')}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>
                )}

                {/* ── Corporate KPI selector (Root only) ── */}
                {isRootCreate && (
                  <div>
                    {isLoadingCk ? (
                      <div className="flex items-center justify-center py-4"><Spinner size="sm" /></div>
                    ) : (
                      <Select
                        variant="secondary"
                        selectedKey={selectedCkId || null}
                        onSelectionChange={(k) => setSelectedCkId(String(k || ''))}
                        isInvalid={!!errors.ck}
                        placeholder={corporateKpiTree.length === 0 ? 'No active indicators for this year' : 'Select Corporate KPI...'}
                      >
                        <Label>Corporate KPI Indicator</Label>
                        <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {corporateKpiTree.map((node) => (
                              <ListBox.Item key={node.id} id={node.id} textValue={`${node.code} - ${node.name}`}>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-foreground">{node.code}</span>
                                  <span className="text-xs text-muted-foreground">{node.name}</span>
                                </div>
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    )}
                    {errors.ck && <p className="mt-1 text-xs text-danger">{errors.ck}</p>}
                  </div>
                )}

                {/* ── Month (for Child/Update — read-only period or month picker) ── */}
                {isChildCreate && activity && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-sm">
                      <span className="font-medium text-muted-foreground">Corporate KPI: </span>
                      <span className="text-foreground">{activity.corporateKpiName}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-muted-foreground">Period: </span>
                      <span className="text-foreground">
                        {activity.periodYear}-{String(activity.periodMonth).padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                )}

                {isUpdate && activity && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium text-muted-foreground">Corporate KPI: </span><span className="text-foreground">{activity.corporateKpiName}</span></div>
                    <div><span className="font-medium text-muted-foreground">Period: </span><span className="text-foreground">{activity.periodYear}-{String(activity.periodMonth).padStart(2, '0')}</span></div>
                    <div><span className="font-medium text-muted-foreground">Assignee: </span><span className="text-foreground">{activity.assignedToUserName}</span></div>
                    <div><span className="font-medium text-muted-foreground">Parent: </span><span className="text-foreground">{activity.parentActivityName || '-'}</span></div>
                  </div>
                )}

                {/* ── Assignee (not for Update) ── */}
                {!isUpdate && (
                  <div>
                    {isLoadingAssignable ? (
                      <div className="flex items-center justify-center py-4"><Spinner size="sm" /></div>
                    ) : (
                      <Select
                        variant="secondary"
                        selectedKey={assigneeId || null}
                        onSelectionChange={(k) => setAssigneeId(String(k || ''))}
                        isInvalid={!!errors.assignee}
                        placeholder="Select assignee..."
                      >
                        <Label>Assignee</Label>
                        <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {assignablePositions.map((pos) => (
                              <ListBox.Item
                                key={pos.userPositionId}
                                id={pos.userPositionId}
                                textValue={`${pos.positionName} - ${pos.userFullName}`}
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm text-foreground">
                                    {pos.positionName}{' '}
                                    {pos.isSelf ? <span className="text-xs text-primary">(You)</span> : null}
                                  </span>
                                  <span className="text-xs text-muted-foreground">{pos.userFullName}</span>
                                </div>
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    )}
                    {errors.assignee && <p className="mt-1 text-xs text-danger">{errors.assignee}</p>}
                  </div>
                )}

                {/* ── Parent display (Child create) ── */}
                {isChildCreate && activity && (
                  <div className="text-sm">
                    <span className="font-medium text-muted-foreground">Parent Activity: </span>
                    <span className="text-foreground">{activity.activityName}</span>
                  </div>
                )}

                {/* ── Activity fields ── */}
                <TextField
                  isRequired
                  value={activityName}
                  onChange={(e) => setActivityName(e)}
                  isInvalid={!!errors.name}
                >
                  <Label>Activity Name</Label>
                  <Input variant="secondary" placeholder="Enter activity name..." />
                </TextField>
                {errors.name && <p className="-mt-3 text-xs text-danger">{errors.name}</p>}

                <TextField value={description} onChange={(e) => setDescription(e)}>
                  <Label>Description</Label>
                  <TextArea variant="secondary" placeholder="Optional description..." rows={2} />
                </TextField>

                <div className="grid grid-cols-2 gap-4">
                  <TextField
                    isRequired
                    value={unit}
                    onChange={(e) => setUnit(e)}
                    isInvalid={!!errors.unit}
                  >
                    <Label>Unit</Label>
                    <Input variant="secondary" placeholder="e.g. %, IDR, units" />
                  </TextField>

                  <TextField
                    isRequired
                    value={targetValue}
                    onChange={(e) => setTargetValue(e)}
                    isInvalid={!!errors.target}
                    type="number"
                  >
                    <Label>Target Value</Label>
                    <Input variant="secondary" placeholder="e.g. 100" />
                  </TextField>
                </div>
                {errors.target && <p className="-mt-3 text-xs text-danger">{errors.target}</p>}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={handleClose} isDisabled={isSubmitting}>
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button variant="primary" onPress={handleSubmit} isDisabled={isSubmitting} isPending={isSubmitting}>
                Submit
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
