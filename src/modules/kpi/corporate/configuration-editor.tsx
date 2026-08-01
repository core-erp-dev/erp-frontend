'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Button, Checkbox, Chip, Input, Select, ListBox, Label, Spinner, TextField,
} from '@heroui/react';
import { Plus, Trash } from '@phosphor-icons/react';
import type {
  CorporateConfigurationDefinition,
  DefinitionApplyRequest,
  DefinitionApplyResult,
  KpiAggregationMethod,
} from './corporate-kpi.types';

/* ── Draft shapes (id = persisted UUID, clientRef = new-entity marker) ── */

interface DraftIndicator {
  key: string;
  id: string | null;
  clientRef: string | null;
  code: string;
  name: string;
  unit: string | null;
  displayOrder: number | null;
  weight: string;
  targetScore: string;
  formulaExpression: string | null;
}

interface DraftAspect {
  key: string;
  id: string | null;
  clientRef: string | null;
  code: string;
  name: string;
  displayOrder: number | null;
  description: string | null;
  indicators: DraftIndicator[];
}

interface DraftVariable {
  key: string;
  id: string | null;
  code: string;
  name: string;
  unit: string | null;
  aggregationMethod: KpiAggregationMethod;
  displayOrder: number | null;
}

interface DraftScoreBand {
  key: string;
  id: string | null;
  /** Persisted indicator UUID or new-indicator clientRef. */
  indicatorRef: string;
  minValue: string;
  maxValue: string;
  minInclusive: boolean;
  maxInclusive: boolean;
  score: string;
  displayOrder: number | null;
}

interface DraftPerformanceBand {
  key: string;
  id: string | null;
  category: string;
  minValue: string;
  maxValue: string;
  minInclusive: boolean;
  maxInclusive: boolean;
  displayOrder: number | null;
}

interface EditorProps {
  definition: CorporateConfigurationDefinition;
  isLoading: boolean;
  error: string | null;
  isMutating: boolean;
  onSave: (payload: DefinitionApplyRequest) => Promise<DefinitionApplyResult | null>;
}

let uidCounter = 0;
const nextKey = (prefix: string) => `${prefix}-${++uidCounter}`;

function toNum(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Compact labelled field (HeroUI v3: TextField wraps Label + Input). */
function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isDisabled?: boolean;
}) {
  const { label, value, onChange, placeholder, isDisabled } = props;
  return (
    <TextField value={value} onChange={onChange} isDisabled={isDisabled}>
      <Label>{label}</Label>
      <Input placeholder={placeholder} />
    </TextField>
  );
}

/** Definition editor — atomic diff with clientRefs for new entities. */
export function ConfigurationEditor({ definition, isLoading, error, isMutating, onSave }: EditorProps) {
  const config = definition.configuration;
  const locked = config.recordingStatus === 'CLOSED';

  const [aspects, setAspects] = useState<DraftAspect[]>([]);
  const [variables, setVariables] = useState<DraftVariable[]>([]);
  const [scoreBands, setScoreBands] = useState<DraftScoreBand[]>([]);
  const [performanceBands, setPerformanceBands] = useState<DraftPerformanceBand[]>([]);
  const [removedEntityIds, setRemovedEntityIds] = useState<string[]>([]);

  // Re-initialize the draft whenever the server definition changes.
  useEffect(() => {
    setAspects(definition.aspects.map((a) => ({
      key: a.id ?? nextKey('aspect'),
      id: a.id,
      clientRef: a.id == null ? null : null,
      code: a.code,
      name: a.name,
      displayOrder: a.displayOrder,
      description: a.description,
      indicators: a.indicators.map((i) => ({
        key: i.id ?? nextKey('ind'),
        id: i.id,
        clientRef: null,
        code: i.code,
        name: i.name,
        unit: i.unit,
        displayOrder: i.displayOrder,
        weight: i.weight != null ? String(i.weight) : '',
        targetScore: i.targetScore != null ? String(i.targetScore) : '',
        formulaExpression: i.formulaExpression,
      })),
    })));
    setVariables(definition.variables.map((v) => ({
      key: v.id ?? nextKey('var'),
      id: v.id,
      code: v.code,
      name: v.name,
      unit: v.unit,
      aggregationMethod: v.aggregationMethod,
      displayOrder: v.displayOrder,
    })));
    setScoreBands(definition.scoreBands.map((b) => ({
      key: b.id ?? nextKey('band'),
      id: b.id,
      indicatorRef: b.indicatorId,
      minValue: b.minValue != null ? String(b.minValue) : '',
      maxValue: b.maxValue != null ? String(b.maxValue) : '',
      minInclusive: b.minInclusive,
      maxInclusive: b.maxInclusive,
      score: String(b.score),
      displayOrder: b.displayOrder,
    })));
    setPerformanceBands(definition.performanceBands.map((b) => ({
      key: b.id ?? nextKey('perfband'),
      id: b.id,
      category: b.category,
      minValue: b.minValue != null ? String(b.minValue) : '',
      maxValue: b.maxValue != null ? String(b.maxValue) : '',
      minInclusive: b.minInclusive,
      maxInclusive: b.maxInclusive,
      displayOrder: b.displayOrder,
    })));
    setRemovedEntityIds([]);
  }, [definition]);

  // Indicator options for band binding: existing ids and new clientRefs.
  const indicatorOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    for (const aspect of aspects) {
      for (const indicator of aspect.indicators) {
        options.push({
          value: indicator.id ?? indicator.clientRef ?? indicator.key,
          label: indicator.code || indicator.name || indicator.key,
        });
      }
    }
    return options;
  }, [aspects]);

  // ── Adders ──

  const addAspect = useCallback(() => {
    setAspects((prev) => [...prev, {
      key: nextKey('aspect'), id: null, clientRef: `aspect-${prev.length + 1}`,
      code: '', name: '', displayOrder: null, description: null, indicators: [],
    }]);
  }, []);

  const addIndicator = useCallback((aspectKey: string) => {
    setAspects((prev) => prev.map((a) => {
      if (a.key !== aspectKey) return a;
      const indicators = [...a.indicators, {
        key: nextKey('ind'), id: null, clientRef: `ind-${a.indicators.length + 1}`,
        code: '', name: '', unit: null, displayOrder: null, weight: '', targetScore: '',
        formulaExpression: null,
      }];
      return { ...a, indicators };
    }));
  }, []);

  const addVariable = useCallback(() => {
    setVariables((prev) => [...prev, {
      key: nextKey('var'), id: null, code: '', name: '', unit: null,
      aggregationMethod: 'SUM', displayOrder: null,
    }]);
  }, []);

  const addScoreBand = useCallback(() => {
    setScoreBands((prev) => [...prev, {
      key: nextKey('band'), id: null,
      indicatorRef: indicatorOptions[0]?.value ?? '',
      minValue: '', maxValue: '', minInclusive: true, maxInclusive: false,
      score: '', displayOrder: null,
    }]);
  }, [indicatorOptions]);

  const addPerformanceBand = useCallback(() => {
    setPerformanceBands((prev) => [...prev, {
      key: nextKey('perfband'), id: null, category: '',
      minValue: '', maxValue: '', minInclusive: true, maxInclusive: false,
      displayOrder: null,
    }]);
  }, []);

  // ── Removers (existing -> removedEntityIds, new -> drop) ──

  const removeAspect = useCallback((key: string) => {
    setAspects((prev) => {
      const target = prev.find((a) => a.key === key);
      if (target?.id) setRemovedEntityIds((r) => [...r, target.id as string]);
      return prev.filter((a) => a.key !== key);
    });
  }, []);

  const removeIndicator = useCallback((aspectKey: string, indicatorKey: string) => {
    setAspects((prev) => prev.map((a) => {
      if (a.key !== aspectKey) return a;
      const target = a.indicators.find((i) => i.key === indicatorKey);
      if (target?.id) setRemovedEntityIds((r) => [...r, target.id as string]);
      return { ...a, indicators: a.indicators.filter((i) => i.key !== indicatorKey) };
    }));
  }, []);

  const removeVariable = useCallback((key: string) => {
    setVariables((prev) => {
      const target = prev.find((v) => v.key === key);
      if (target?.id) setRemovedEntityIds((r) => [...r, target.id as string]);
      return prev.filter((v) => v.key !== key);
    });
  }, []);

  const removeScoreBand = useCallback((key: string) => {
    setScoreBands((prev) => {
      const target = prev.find((b) => b.key === key);
      if (target?.id) setRemovedEntityIds((r) => [...r, target.id as string]);
      return prev.filter((b) => b.key !== key);
    });
  }, []);

  const removePerformanceBand = useCallback((key: string) => {
    setPerformanceBands((prev) => {
      const target = prev.find((b) => b.key === key);
      if (target?.id) setRemovedEntityIds((r) => [...r, target.id as string]);
      return prev.filter((b) => b.key !== key);
    });
  }, []);

  // ── Payload ──

  const buildPayload = useCallback((): DefinitionApplyRequest => ({
    version: config.version,
    aspects: aspects.map((a) => ({
      id: a.id,
      clientRef: a.clientRef,
      code: a.code,
      name: a.name,
      displayOrder: a.displayOrder,
      description: a.description,
      indicators: a.indicators.map((i) => ({
        id: i.id,
        clientRef: i.clientRef,
        code: i.code,
        name: i.name,
        unit: i.unit,
        displayOrder: i.displayOrder,
        weight: toNum(i.weight),
        targetScore: toNum(i.targetScore),
        formulaExpression: i.formulaExpression,
      })),
    })),
    variables: variables.map((v) => ({
      id: v.id,
      code: v.code,
      name: v.name,
      unit: v.unit,
      aggregationMethod: v.aggregationMethod,
      displayOrder: v.displayOrder,
    })),
    scoreBands: scoreBands.map((b) => ({
      id: b.id,
      indicatorRef: b.indicatorRef,
      minValue: toNum(b.minValue),
      maxValue: toNum(b.maxValue),
      minInclusive: b.minInclusive,
      maxInclusive: b.maxInclusive,
      score: toNum(b.score) ?? 0,
      displayOrder: b.displayOrder,
    })),
    performanceBands: performanceBands.map((b) => ({
      id: b.id,
      category: b.category,
      minValue: toNum(b.minValue),
      maxValue: toNum(b.maxValue),
      minInclusive: b.minInclusive,
      maxInclusive: b.maxInclusive,
      displayOrder: b.displayOrder,
    })),
    removedEntityIds,
  }), [aspects, variables, scoreBands, performanceBands, removedEntityIds, config.version]);

  const handleSave = useCallback(async () => {
    await onSave(buildPayload());
  }, [buildPayload, onSave]);

  if (isLoading && aspects.length === 0) {
    return <div className="flex justify-center py-10"><Spinner aria-label="Loading definition" /></div>;
  }
  if (error) {
    return <Alert status="danger">{error}</Alert>;
  }

  const disabled = locked || isMutating;

  return (
    <div className="flex w-full flex-col gap-6">
      {locked && (
        <Alert status="warning">
          Recording is closed for {config.year}. Configuration and monthly values are locked until reopened.
        </Alert>
      )}

      {/* ── Aspects & indicators ── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Aspects &amp; Indicators</h2>
          <Button variant="secondary" size="sm" onPress={addAspect} isDisabled={disabled}>
            <Plus className="h-4 w-4" /> Add Aspect
          </Button>
        </div>
        {aspects.map((aspect) => (
          <div key={aspect.key} className="rounded-lg border border-divider p-4">
            <div className="flex items-end gap-3">
              <Field
                label="Code" value={aspect.code} isDisabled={disabled}
                onChange={(v) => setAspects((prev) => prev.map((a) => a.key === aspect.key ? { ...a, code: v } : a))}
              />
              <Field
                label="Name" value={aspect.name} isDisabled={disabled}
                onChange={(v) => setAspects((prev) => prev.map((a) => a.key === aspect.key ? { ...a, name: v } : a))}
              />
              <Field
                label="Order" value={aspect.displayOrder != null ? String(aspect.displayOrder) : ''} isDisabled={disabled}
                onChange={(v) => setAspects((prev) => prev.map((a) => a.key === aspect.key ? { ...a, displayOrder: toNum(v) } : a))}
              />
              <Button variant="danger" isIconOnly aria-label={`Remove aspect ${aspect.code || 'new'}`} onPress={() => removeAspect(aspect.key)} isDisabled={disabled}>
                <Trash className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Indicators</span>
                <Button variant="secondary" size="sm" onPress={() => addIndicator(aspect.key)} isDisabled={disabled}>
                  <Plus className="h-4 w-4" /> Add Indicator
                </Button>
              </div>
              {aspect.indicators.map((indicator) => (
                <div key={indicator.key} className="flex flex-wrap items-end gap-2 rounded-md bg-content2/40 p-3">
                  <Field label="Code" value={indicator.code} isDisabled={disabled}
                    onChange={(v) => setAspects((prev) => prev.map((a) => a.key === aspect.key
                      ? { ...a, indicators: a.indicators.map((i) => i.key === indicator.key ? { ...i, code: v } : i) } : a))} />
                  <Field label="Name" value={indicator.name} isDisabled={disabled}
                    onChange={(v) => setAspects((prev) => prev.map((a) => a.key === aspect.key
                      ? { ...a, indicators: a.indicators.map((i) => i.key === indicator.key ? { ...i, name: v } : i) } : a))} />
                  <Field label="Unit" value={indicator.unit ?? ''} isDisabled={disabled}
                    onChange={(v) => setAspects((prev) => prev.map((a) => a.key === aspect.key
                      ? { ...a, indicators: a.indicators.map((i) => i.key === indicator.key ? { ...i, unit: v || null } : i) } : a))} />
                  <Field label="Weight" value={indicator.weight} isDisabled={disabled} placeholder="0.055"
                    onChange={(v) => setAspects((prev) => prev.map((a) => a.key === aspect.key
                      ? { ...a, indicators: a.indicators.map((i) => i.key === indicator.key ? { ...i, weight: v } : i) } : a))} />
                  <Field label="Target score" value={indicator.targetScore} isDisabled={disabled} placeholder="2"
                    onChange={(v) => setAspects((prev) => prev.map((a) => a.key === aspect.key
                      ? { ...a, indicators: a.indicators.map((i) => i.key === indicator.key ? { ...i, targetScore: v } : i) } : a))} />
                  <Field label="Formula" value={indicator.formulaExpression ?? ''} isDisabled={disabled} placeholder="(NET_INCOME / EQUITY) * 100"
                    onChange={(v) => setAspects((prev) => prev.map((a) => a.key === aspect.key
                      ? { ...a, indicators: a.indicators.map((i) => i.key === indicator.key ? { ...i, formulaExpression: v || null } : i) } : a))} />
                  <Button variant="danger" isIconOnly aria-label={`Remove indicator ${indicator.code || 'new'}`}
                    onPress={() => removeIndicator(aspect.key, indicator.key)} isDisabled={disabled}>
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {aspects.length === 0 && <p className="text-sm text-muted-foreground">No aspects yet — add one to start the annual configuration.</p>}
      </section>

      {/* ── Variables ── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Variables</h2>
          <Button variant="secondary" size="sm" onPress={addVariable} isDisabled={disabled}>
            <Plus className="h-4 w-4" /> Add Variable
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {variables.map((variable) => (
            <div key={variable.key} className="flex flex-wrap items-end gap-2 rounded-md bg-content2/40 p-3">
              <Field label="Code" value={variable.code} isDisabled={disabled}
                onChange={(v) => setVariables((prev) => prev.map((x) => x.key === variable.key ? { ...x, code: v } : x))} />
              <Field label="Name" value={variable.name} isDisabled={disabled}
                onChange={(v) => setVariables((prev) => prev.map((x) => x.key === variable.key ? { ...x, name: v } : x))} />
              <Field label="Unit" value={variable.unit ?? ''} isDisabled={disabled}
                onChange={(v) => setVariables((prev) => prev.map((x) => x.key === variable.key ? { ...x, unit: v || null } : x))} />
              <Select
                variant="secondary"
                selectedKey={variable.aggregationMethod}
                onSelectionChange={(k) => setVariables((prev) => prev.map((x) => x.key === variable.key
                  ? { ...x, aggregationMethod: (k as KpiAggregationMethod) ?? 'SUM' } : x))}
                isDisabled={disabled}
              >
                <Label>Aggregation</Label>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {['SUM', 'END_OF_PERIOD', 'AVERAGE'].map((m) => (
                      <ListBox.Item key={m} id={m} textValue={m}>{m}</ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <Field label="Order" value={variable.displayOrder != null ? String(variable.displayOrder) : ''} isDisabled={disabled}
                onChange={(v) => setVariables((prev) => prev.map((x) => x.key === variable.key ? { ...x, displayOrder: toNum(v) } : x))} />
              <Button variant="danger" isIconOnly aria-label={`Remove variable ${variable.code || 'new'}`}
                onPress={() => removeVariable(variable.key)} isDisabled={disabled}>
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Score bands ── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Score Bands</h2>
          <Button variant="secondary" size="sm" onPress={addScoreBand} isDisabled={disabled}>
            <Plus className="h-4 w-4" /> Add Band
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {scoreBands.map((band) => (
            <div key={band.key} className="flex flex-wrap items-end gap-2 rounded-md bg-content2/40 p-3">
              <Select
                variant="secondary"
                selectedKey={band.indicatorRef}
                onSelectionChange={(k) => setScoreBands((prev) => prev.map((b) => b.key === band.key
                  ? { ...b, indicatorRef: String(k ?? '') } : b))}
                isDisabled={disabled}
              >
                <Label>Indicator</Label>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {indicatorOptions.map((opt) => (
                      <ListBox.Item key={opt.value} id={opt.value} textValue={opt.label}>{opt.label}</ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <Field label="Min" value={band.minValue} isDisabled={disabled}
                onChange={(v) => setScoreBands((prev) => prev.map((b) => b.key === band.key ? { ...b, minValue: v } : b))} />
              <Field label="Max" value={band.maxValue} isDisabled={disabled}
                onChange={(v) => setScoreBands((prev) => prev.map((b) => b.key === band.key ? { ...b, maxValue: v } : b))} />
              <Field label="Score" value={band.score} isDisabled={disabled}
                onChange={(v) => setScoreBands((prev) => prev.map((b) => b.key === band.key ? { ...b, score: v } : b))} />
              <Field label="Order" value={band.displayOrder != null ? String(band.displayOrder) : ''} isDisabled={disabled}
                onChange={(v) => setScoreBands((prev) => prev.map((b) => b.key === band.key ? { ...b, displayOrder: toNum(v) } : b))} />
              <Checkbox isSelected={band.minInclusive} isDisabled={disabled}
                onChange={(v) => setScoreBands((prev) => prev.map((b) => b.key === band.key ? { ...b, minInclusive: v } : b))}>
                Min inclusive
              </Checkbox>
              <Checkbox isSelected={band.maxInclusive} isDisabled={disabled}
                onChange={(v) => setScoreBands((prev) => prev.map((b) => b.key === band.key ? { ...b, maxInclusive: v } : b))}>
                Max inclusive
              </Checkbox>
              <Button variant="danger" isIconOnly aria-label="Remove band" onPress={() => removeScoreBand(band.key)} isDisabled={disabled}>
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Performance bands ── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Performance Categories</h2>
          <Button variant="secondary" size="sm" onPress={addPerformanceBand} isDisabled={disabled}>
            <Plus className="h-4 w-4" /> Add Category
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {performanceBands.map((band) => (
            <div key={band.key} className="flex flex-wrap items-end gap-2 rounded-md bg-content2/40 p-3">
              <Field label="Category" value={band.category} isDisabled={disabled}
                onChange={(v) => setPerformanceBands((prev) => prev.map((b) => b.key === band.key ? { ...b, category: v } : b))} />
              <Field label="Min" value={band.minValue} isDisabled={disabled}
                onChange={(v) => setPerformanceBands((prev) => prev.map((b) => b.key === band.key ? { ...b, minValue: v } : b))} />
              <Field label="Max" value={band.maxValue} isDisabled={disabled}
                onChange={(v) => setPerformanceBands((prev) => prev.map((b) => b.key === band.key ? { ...b, maxValue: v } : b))} />
              <Checkbox isSelected={band.minInclusive} isDisabled={disabled}
                onChange={(v) => setPerformanceBands((prev) => prev.map((b) => b.key === band.key ? { ...b, minInclusive: v } : b))}>
                Min inclusive
              </Checkbox>
              <Checkbox isSelected={band.maxInclusive} isDisabled={disabled}
                onChange={(v) => setPerformanceBands((prev) => prev.map((b) => b.key === band.key ? { ...b, maxInclusive: v } : b))}>
                Max inclusive
              </Checkbox>
              <Button variant="danger" isIconOnly aria-label="Remove category" onPress={() => removePerformanceBand(band.key)} isDisabled={disabled}>
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between border-t border-divider pt-4">
        <p className="text-xs text-muted-foreground">
          Omission never deletes — use the remove buttons; deletions are explicit.
        </p>
        <div className="flex items-center gap-2">
          <Chip size="sm" variant="soft" color={locked ? 'warning' : 'accent'}>
            v{config.version}
          </Chip>
          <Button variant="primary" onPress={handleSave} isPending={isMutating} isDisabled={disabled || isLoading}>
            Save Definition
          </Button>
        </div>
      </div>
    </div>
  );
}
