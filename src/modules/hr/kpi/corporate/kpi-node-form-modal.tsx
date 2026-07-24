'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button } from '@heroui/react';
import type { CorporateKpiNode, CreateKpiRequest, UpdateKpiRequest, KpiNodeType } from './corporate-kpi.types';

export type FormMode =
  | 'CREATE_ASPECT'
  | 'CREATE_INDICATOR'
  | 'EDIT_ASPECT'
  | 'EDIT_INDICATOR';

export interface KpiNodeFormModalProps {
  mode: FormMode;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateKpiRequest | UpdateKpiRequest, id?: string) => Promise<boolean>;
  preselectedParentId?: string;
  node?: CorporateKpiNode;
  aspects: CorporateKpiNode[];
  selectedYear: number;
  isSubmitting: boolean;
}

const MODE_TITLE: Record<FormMode, string> = {
  CREATE_ASPECT: 'Create Aspect',
  CREATE_INDICATOR: 'Create Indicator',
  EDIT_ASPECT: 'Edit Aspect',
  EDIT_INDICATOR: 'Edit Indicator',
};

export const KpiNodeFormModal: React.FC<KpiNodeFormModalProps> = ({
  mode,
  isOpen,
  onClose,
  onSubmit,
  preselectedParentId,
  node,
  aspects,
  selectedYear,
  isSubmitting,
}) => {
  const isEdit = mode === 'EDIT_ASPECT' || mode === 'EDIT_INDICATOR';
  const isIndicator = mode === 'CREATE_INDICATOR' || mode === 'EDIT_INDICATOR';

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [unit, setUnit] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [description, setDescription] = useState('');

  interface Errors { code?: string; name?: string; parentId?: string; unit?: string; targetValue?: string; }
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (!isOpen) return;
    // Initialize form state from props when modal opens or mode/node changes
    if (isEdit && node) {
      setCode(node.code);
      setName(node.name);
      setParentId(node.parentId ?? '');
      setUnit(node.unit ?? '');
      setTargetValue(node.targetValue != null ? String(node.targetValue) : '');
      setDescription(node.description ?? '');
    } else {
      setCode('');
      setName('');
      setParentId(mode === 'CREATE_INDICATOR' && preselectedParentId ? preselectedParentId : '');
      setUnit('');
      setTargetValue('');
      setDescription('');
    }
    setErrors({});
  }, [isOpen, mode, node, preselectedParentId, isEdit]);

  const aspectOptions = useMemo(() => aspects.filter((a) => a.nodeType === 'ASPECT'), [aspects]);

  function validate(): Errors {
    const e: Errors = {};
    if (!code.trim()) e.code = 'Code is required.';
    else if (code.trim().length > 50) e.code = 'Code must be at most 50 characters.';
    if (!name.trim()) e.name = 'Name is required.';
    else if (name.trim().length > 255) e.name = 'Name must be at most 255 characters.';
    if (isIndicator) {
      if (!parentId) e.parentId = 'Parent Aspect is required.';
      if (!unit.trim()) e.unit = 'Unit is required.';
      else if (unit.trim().length > 50) e.unit = 'Unit must be at most 50 characters.';
      const tv = targetValue.trim();
      if (!tv) e.targetValue = 'Target value is required.';
      else {
        const num = Number(tv);
        if (isNaN(num)) e.targetValue = 'Target value is required.';
        else if (num <= 0) e.targetValue = 'Target value must be greater than zero.';
      }
    }
    return e;
  }

  const handleSubmit = async () => {
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    if (isIndicator) {
      const payload = isEdit
        ? ({
            code: code.trim(),
            name: name.trim(),
            parentId: parentId || null,
            unit: unit.trim(),
            targetValue: targetValue ? Number(targetValue) : null,
            description: description.trim() || null,
          } satisfies UpdateKpiRequest)
        : ({
            code: code.trim(),
            name: name.trim(),
            nodeType: 'INDICATOR' as KpiNodeType,
            year: selectedYear,
            parentId: parentId || null,
            unit: unit.trim(),
            targetValue: targetValue ? Number(targetValue) : null,
            description: description.trim() || null,
          } satisfies CreateKpiRequest);
      const ok = await onSubmit(payload, isEdit ? node?.id : undefined);
      if (ok) setErrors({});
    } else {
      const payload = isEdit
        ? ({
            code: code.trim(),
            name: name.trim(),
            parentId: null,
            unit: null,
            targetValue: null,
            description: description.trim() || null,
          } satisfies UpdateKpiRequest)
        : ({
            code: code.trim(),
            name: name.trim(),
            nodeType: 'ASPECT' as KpiNodeType,
            year: selectedYear,
            parentId: null,
            unit: null,
            targetValue: null,
            description: description.trim() || null,
          } satisfies CreateKpiRequest);
      const ok = await onSubmit(payload, isEdit ? node?.id : undefined);
      if (ok) setErrors({});
    }
  };

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        isDismissable={!isSubmitting}
        onOpenChange={(open: boolean) => { if (!open) onClose(); }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[480px]">
            <Modal.Header className="flex items-center justify-between border-b">
              <Modal.Heading className="text-lg font-semibold">{MODE_TITLE[mode]}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4 py-5">
              {/* Code */}
              <label className="text-sm font-medium">Code</label>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g. FIN"
              />
              {errors.code && <span className="text-xs text-danger">{errors.code}</span>}

              {/* Name */}
              <label className="text-sm font-medium">Name</label>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g. Financial"
              />
              {errors.name && <span className="text-xs text-danger">{errors.name}</span>}

              {/* Parent Aspect (Indicator only) */}
              {isIndicator && (
                <>
                  <label className="text-sm font-medium">Parent Aspect</label>
                  <select
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    disabled={isSubmitting || (mode === 'CREATE_INDICATOR' && !!preselectedParentId)}
                  >
                    <option value="">Select parent Aspect</option>
                    {aspectOptions.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                  </select>
                  {errors.parentId && <span className="text-xs text-danger">{errors.parentId}</span>}
                </>
              )}

              {/* Type + Year info */}
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Type: {isIndicator ? 'Indicator' : 'Aspect'}</span>
                <span>Year: {isEdit && node ? node.year : selectedYear}</span>
              </div>

              {/* Unit (Indicator only) */}
              {isIndicator && (
                <>
                  <label className="text-sm font-medium">Unit</label>
                  <input
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="e.g. %"
                  />
                  {errors.unit && <span className="text-xs text-danger">{errors.unit}</span>}
                </>
              )}

              {/* Target Value (Indicator only) */}
              {isIndicator && (
                <>
                  <label className="text-sm font-medium">Target Value</label>
                  <input
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="e.g. 10.5"
                    type="number"
                    min="0"
                    step="any"
                  />
                  {errors.targetValue && <span className="text-xs text-danger">{errors.targetValue}</span>}
                </>
              )}

              {/* Description */}
              <label className="text-sm font-medium">Description</label>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                placeholder="Optional description"
              />
            </Modal.Body>
            <Modal.Footer className="flex justify-end gap-2 border-t py-4">
              <Button
                variant="secondary"
                slot="close"
                onPress={onClose}
                isDisabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onPress={handleSubmit}
                isDisabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </Modal.Footer>
            <Modal.CloseTrigger />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
