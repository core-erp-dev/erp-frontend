'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { House, ArrowLeft, FloppyDisk, Plus, Trash, Tray } from '@phosphor-icons/react';
import {
  Alert,
  Breadcrumbs,
  BreadcrumbsItem,
  Button,
  ComboBox,
  EmptyState,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  Radio,
  RadioGroup,
  Select,
  Separator,
  Spinner,
  Surface,
  Table,
  Tabs,
  Tag,
  TagGroup,
  TextArea,
  TextField,
  type Key,
} from '@heroui/react';

import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS, KPI_ROUTES } from '@/modules/kpi/constants';
import { useCorporateKpiData } from '../use-corporate-kpi-data';
import { corporateKpiApi } from '../corporate-kpi-api';
import { corporateKpiStructuresApi } from '../corporate-kpi-structures-api';
import { variablesApi } from '../variables/variables-api';
import type { Variable } from '../variables/variables.types';
import type {
  AssessmentRule,
  CorporateKpiNode,
  CorporateKpiStructure,
  CreateKpiRequest,
  UpdateKpiRequest,
  KpiNodeType,
} from '../corporate-kpi.types';
import {
  type FormulaToken,
  canAppend,
  serializeTokens,
  readableFormula,
  validateFormulaSyntax,
  validateTokenSequence,
  tokenizeGuidedFormula,
  isDecimalNumber,
  PERIOD_MONTH_COUNT,
  PERIOD_MONTH_COUNT_LABEL,
  OPERATOR_LABELS,
  nextTokenId,
} from './formula-builder';
import {
  type ScoreDirection,
  type ScoreRow,
  defaultScoreRows,
  validateScoreRows,
  buildAssessmentRules,
  rowCondition,
  simulateScore,
  applyRules,
  rulesToSimple,
  parseAssessmentRules,
  rulesToJson,
  nextRowId,
} from './score-builder';

/* ── Schema (mirrors the modal's contract + backend DTO validation) ── */

function buildSchema(isEdit: boolean) {
  return z
    .object({
      code: z.string().min(1, 'Kode wajib diisi').max(50, 'Kode maksimal 50 karakter'),
      name: z.string().min(1, 'Nama wajib diisi').max(255, 'Nama maksimal 255 karakter'),
      description: z.string().optional(),
      nodeType: isEdit ? z.string().optional() : z.enum(['ASPECT', 'INDICATOR']),
      // Create only: the node belongs to an existing yearly structure (year is derived).
      structureId: z.string().optional(),
      year: z.coerce.number().int().min(2000, 'Tahun minimal 2000').max(2100, 'Tahun maksimal 2100').optional(),
      displayOrder: z.coerce.number().int().min(0, 'Urutan tampil tidak boleh negatif').optional(),
      parentId: z.string().optional(),
      weight: z.string().optional(),
      targetScore: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.nodeType === 'INDICATOR' && !data.parentId) {
          ctx.addIssue({ code: 'custom', path: ['parentId'], message: 'Aspect induk wajib dipilih' });
      }
      if (!isEdit && !data.structureId && !data.year) {
        ctx.addIssue({ code: 'custom', path: ['year'], message: 'Tahun wajib diisi' });
      }
      if (data.weight != null && data.weight !== '') {
        const w = Number(data.weight);
        if (!Number.isFinite(w) || w <= 0) {
          ctx.addIssue({ code: 'custom', path: ['weight'], message: 'Bobot harus lebih besar dari 0' });
        } else if (w > 1) {
          ctx.addIssue({ code: 'custom', path: ['weight'], message: 'Bobot tidak boleh lebih dari 100%' });
        }
      }
      if (data.targetScore != null && data.targetScore !== '') {
        const t = Number(data.targetScore);
        if (!Number.isFinite(t) || t <= 0) {
          ctx.addIssue({ code: 'custom', path: ['targetScore'], message: 'Target Nilai harus lebih besar dari 0' });
        }
      }
    });
}

/** z.input matches the resolver's input contract (z.coerce widens to unknown). */
type FormValues = z.input<ReturnType<typeof buildSchema>>;

/* ── Component ── */

export interface CorporateKpiFormProps {
  mode: 'create' | 'edit';
  initialData?: CorporateKpiNode | null;
  /** Create only — preset from the Structure page's row action. */
  preselectedType?: KpiNodeType;
  preselectedParentId?: string;
  /** Create only — the yearly structure the node belongs to. */
  preselectedStructureId?: string;
  preselectedYear?: number;
  onSuccess: (node: CorporateKpiNode) => void;
}

interface FormulaState {
  mode: 'guided' | 'advanced';
  tokens: FormulaToken[];
  raw: string;
}

interface ScoreState {
  mode: 'simple' | 'advanced';
  direction: ScoreDirection;
  rows: ScoreRow[];
  json: string;
}

function initFormula(initialData: CorporateKpiNode | null | undefined): FormulaState {
  const formula = initialData?.formula ?? '';
  const tokens = tokenizeGuidedFormula(formula);
  if (tokens === null) {
    // Parenthesized / non-linear formula — Advanced mode preserves it verbatim.
    return { mode: 'advanced', tokens: [], raw: formula };
  }
  return { mode: 'guided', tokens, raw: serializeTokens(tokens) };
}

function initScore(initialData: CorporateKpiNode | null | undefined): ScoreState {
  const rules = initialData?.assessmentRules ?? null;
  if (!rules || rules.length === 0) {
    return {
      mode: 'simple',
      direction: 'higher',
      rows: defaultScoreRows(),
      json: '',
    };
  }
  const simple = rulesToSimple(rules);
  if (simple) {
    return { mode: 'simple', direction: simple.direction, rows: simple.rows, json: rulesToJson(rules) };
  }
  // Non-representable — preserve exactly, open the Advanced editor.
  return {
    mode: 'advanced',
    direction: 'higher',
    rows: defaultScoreRows(),
    json: rulesToJson(rules),
  };
}

/**
 * Shared control row for the formula builder fields (Variable, Constant,
 * Built-in values). The HeroUI <Label> and any error/description live in the
 * field root ABOVE/BELOW this row, so the row contains only the control and
 * its Add button. Both use the standard 36px control height, so items-center
 * here aligns the button exactly with the input control — the label can never
 * push the button out of alignment again.
 */
function BuilderControlRow({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2">{children}</div>;
}

export function CorporateKpiForm({
  mode,
  initialData,
  preselectedType,
  preselectedParentId,
  preselectedStructureId,
  preselectedYear,
  onSuccess,
}: CorporateKpiFormProps) {
  const router = useRouter();
  const isEditMode = mode === 'edit';
  const { hasPerm } = usePermission();
  const canManage = hasPerm(PERM.CORPORATE_KPI_MANAGE);

  const { tree, fetchTree, createNode, updateNode, isMutating } = useCorporateKpiData();

  // ── Reference data ──
  const [variables, setVariables] = useState<Variable[]>([]);
  const [variablesError, setVariablesError] = useState<string | null>(null);
  const [structures, setStructures] = useState<CorporateKpiStructure[]>([]);
  const [structuresError, setStructuresError] = useState<string | null>(null);
  // The form depends on structures + variables — keep it behind a spinner until
  // both reference fetches settle (same pattern as the Add Employee form).
  const [isLoadingReference, setIsLoadingReference] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([
      variablesApi
        .list()
        .then((list) => {
          if (!cancelled) setVariables(list);
        })
        .catch(() => {
           if (!cancelled) setVariablesError('Gagal memuat variabel untuk penyusun formula.');
        }),
      corporateKpiStructuresApi
        .list()
        .then((list) => {
          if (!cancelled) setStructures(list);
        })
        .catch(() => {
           if (!cancelled) setStructuresError('Gagal memuat struktur KPI Perusahaan.');
        }),
    ]).then(() => {
      if (!cancelled) setIsLoadingReference(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── RHF form ──
  const form = useForm<FormValues>({
    resolver: zodResolver(buildSchema(isEditMode)),
    defaultValues: {
      code: initialData?.code ?? '',
      name: initialData?.name ?? '',
      description: initialData?.description ?? '',
      nodeType: (initialData?.nodeType ?? preselectedType ?? 'ASPECT') as FormValues['nodeType'],
      structureId: initialData?.structureId ?? preselectedStructureId ?? '',
      year: preselectedYear,
      displayOrder: initialData?.displayOrder ?? 0,
      parentId: initialData?.parentId ?? preselectedParentId ?? '',
      weight: initialData?.weight != null ? String(initialData.weight) : '',
      targetScore: initialData?.targetScore != null ? String(initialData.targetScore) : '',
    },
  });

  const nodeType = useWatch({ control: form.control, name: 'nodeType' });
  const structureId = useWatch({ control: form.control, name: 'structureId' });
  const isIndicator = nodeType === 'INDICATOR';
  const creatingWithoutStructure = !isEditMode && !preselectedStructureId && preselectedYear != null;

  const selectedStructure = useMemo(
    () => structures.find((s) => s.id === (structureId ?? '')) ?? null,
    [structures, structureId],
  );

  // Aspects for the parent selector come from the tree of the selected structure's year.
  useEffect(() => {
    if (selectedStructure != null && canManage) {
      void fetchTree(selectedStructure.year);
    }
  }, [selectedStructure, canManage, fetchTree]);

  const aspectOptions = useMemo(
    () => tree.filter((node) => node.nodeType === 'ASPECT'),
    [tree],
  );

  // Edit mode: the owning structure's status drives the configuration lock.
  const [editLocked, setEditLocked] = useState(false);
  useEffect(() => {
    if (!isEditMode || !initialData?.structureId) return;
    let cancelled = false;
    corporateKpiStructuresApi
      .getById(initialData.structureId)
      .then((s) => { if (!cancelled) setEditLocked(s.status === 'ACTIVE'); })
      .catch(() => { /* backend remains authoritative */ });
    return () => { cancelled = true; };
  }, [isEditMode, initialData?.structureId]);

  // ── Formula builder state ──
  const [formulaState, setFormulaState] = useState<FormulaState>(() => initFormula(initialData));
  const [formulaNotice, setFormulaNotice] = useState<string | null>(null);
  const [variableCode, setVariableCode] = useState<string | null>(null);
  const [builtInCode, setBuiltInCode] = useState<string | null>(null);
  const [constantInput, setConstantInput] = useState('');

  const variableNameByCode = useMemo(() => {
    const map: Record<string, string> = {};
    for (const v of variables) map[v.code] = v.name;
    return map;
  }, [variables]);

  const appendToken = useCallback((kind: FormulaToken['kind'], value: string) => {
    setFormulaState((prev) => {
      if (!canAppend(prev.tokens, kind, value)) return prev;
      return { ...prev, tokens: [...prev.tokens, { id: nextTokenId(), kind, value }] };
    });
  }, []);

  const handleAddVariable = useCallback(() => {
    if (!variableCode) return;
    appendToken('variable', variableCode);
    setVariableCode(null);
  }, [variableCode, appendToken]);

  const handleAddConstant = useCallback(() => {
    const value = constantInput.trim();
    if (!isDecimalNumber(value)) return;
    appendToken('number', value);
    setConstantInput('');
  }, [constantInput, appendToken]);

  const handleAddBuiltIn = useCallback(() => {
    if (!builtInCode) return;
    appendToken('symbol', builtInCode);
    setBuiltInCode(null);
  }, [builtInCode, appendToken]);

  const handleRemoveTokens = useCallback((keys: Set<Key>) => {
    setFormulaState((prev) => ({
      ...prev,
      tokens: prev.tokens.filter((t) => !keys.has(t.id)),
    }));
  }, []);

  const formulaValidation = useMemo(
    () => validateTokenSequence(formulaState.tokens),
    [formulaState.tokens],
  );

  /** Human-readable label for one formula token (canvas chip). */
  const tokenLabel = useCallback(
    (token: FormulaToken): string => {
      if (token.kind === 'variable') return variableNameByCode[token.value] ?? token.value;
      if (token.kind === 'symbol') return PERIOD_MONTH_COUNT_LABEL;
      if (token.kind === 'paren') return token.value;
      if (token.kind === 'operator') return OPERATOR_LABELS[token.value] ?? token.value;
      return token.value; // constant
    },
    [variableNameByCode],
  );

  const clearTokens = useCallback(() => {
    setFormulaState((prev) => ({ ...prev, tokens: [] }));
  }, []);

  const handleFormulaModeChange = useCallback((next: 'guided' | 'advanced') => {
    setFormulaNotice(null);
    setFormulaState((prev) => {
      if (next === 'advanced') {
        return { ...prev, mode: 'advanced', raw: serializeTokens(prev.tokens) };
      }
      const parsed = tokenizeGuidedFormula(prev.raw);
      if (parsed === null) {
        setFormulaNotice(
          'Formula ini memiliki sintaks yang tidak dapat ditampilkan dalam mode Terpandu (kode huruf kecil atau karakter yang tidak didukung). Ubah di mode Lanjutan.',
        );
        return prev;
      }
      return { ...prev, mode: 'guided', tokens: parsed };
    });
  }, []);

  // ── Score builder state ──
  const [scoreState, setScoreState] = useState<ScoreState>(() => initScore(initialData));
  const [scoreNotice, setScoreNotice] = useState<string | null>(null);
  const [sampleValue, setSampleValue] = useState('');

  const setScoreDirection = useCallback(
    (direction: ScoreDirection) => {
      setScoreNotice(null);
      if (direction === scoreState.direction) return;
      const hasThresholds = scoreState.rows.some((r) => r.threshold.trim() !== '');
      if (hasThresholds) {
        // Never silently retain thresholds with a different meaning — clear them
        // so they are re-entered for the new direction.
        setScoreNotice(
          'Arah penilaian berubah — batas dikosongkan. Masukkan batas untuk arah baru.',
        );
      }
      setScoreState((prev) => ({
        ...prev,
        direction,
        rows: hasThresholds ? prev.rows.map((r) => ({ ...r, threshold: '' })) : prev.rows,
      }));
    },
    [scoreState.direction, scoreState.rows],
  );

  const updateScoreRow = useCallback((id: string, patch: Partial<ScoreRow>) => {
    setScoreState((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }, []);

  const addScoreRow = useCallback(() => {
    setScoreState((prev) => ({ ...prev, rows: [...prev.rows, { id: nextRowId(), score: '', threshold: '' }] }));
  }, []);

  const removeScoreRow = useCallback((id: string) => {
    setScoreState((prev) =>
      prev.rows.length > 1 ? { ...prev, rows: prev.rows.filter((r) => r.id !== id) } : prev,
    );
  }, []);

  const handleScoreModeChange = useCallback((next: 'simple' | 'advanced') => {
    setScoreNotice(null);
    setScoreState((prev) => {
      if (next === 'advanced') {
        const built = buildAssessmentRules(prev.direction, prev.rows);
        return { ...prev, mode: 'advanced', json: built ? rulesToJson(built) : prev.json };
      }
      try {
        const parsed = parseAssessmentRules(prev.json);
        if (parsed && parsed.length > 0) {
          // Compatibility is decided from the actual rule semantics, not UI state.
          const simple = rulesToSimple(parsed);
          if (!simple) {
            setScoreNotice('Aturan penilaian ini tidak dapat diubah dalam mode sederhana.');
            return prev;
          }
          return { ...prev, mode: 'simple', direction: simple.direction, rows: simple.rows };
        }
        // No advanced content (e.g. an incomplete simple table) — return to the
        // table exactly as it was.
        return { ...prev, mode: 'simple' };
      } catch {
        setScoreNotice('JSON aturan penilaian tidak valid.');
        return prev;
      }
    });
  }, []);

  const scoreValidationError = useMemo(
    () => validateScoreRows(scoreState.direction, scoreState.rows),
    [scoreState.direction, scoreState.rows],
  );

  const simulatedScore = useMemo(() => {
    if (sampleValue.trim() === '' || !Number.isFinite(Number(sampleValue))) return null;
    const value = Number(sampleValue);
    if (scoreState.mode === 'simple') {
      return simulateScore(scoreState.direction, scoreState.rows, value);
    }
    try {
      const rules = parseAssessmentRules(scoreState.json);
      return rules ? applyRules(rules, value) : null;
    } catch {
      return null;
    }
  }, [scoreState, sampleValue]);

  // ── Submit ──
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * Variable codes referenced by a serialized formula, in first-appearance
   * order. The built-in PERIOD_MONTH_COUNT token is a 'symbol', never a
   * 'variable' — it is excluded here and never bound.
   */
  const referencedVariableCodes = useCallback((formula: string | null): string[] => {
    if (!formula) return [];
    const tokens = tokenizeGuidedFormula(formula);
    if (!tokens) return [];
    const seen = new Set<string>();
    const codes: string[] = [];
    for (const token of tokens) {
      if (token.kind === 'variable' && !seen.has(token.value)) {
        seen.add(token.value);
        codes.push(token.value);
      }
    }
    return codes;
  }, []);

  /**
   * Sync the indicator's variable bindings to its formula: create every
   * missing binding (displayOrder = first-appearance index) and, when
   * `unlinkRemoved` is set, delete bindings whose variable left the formula.
   *
   * Ordering matters for edit mode: creating BEFORE the PUT lets the backend
   * unbound-variable check pass for the new formula; unlinking AFTER the PUT
   * is safe because the stored formula is then the new one (the backend
   * rejects unlinking variables still referenced by the formula).
   */
  const syncBindings = useCallback(
    async (indicatorId: string, codes: string[], unlinkRemoved: boolean): Promise<void> => {
      const existing = await corporateKpiApi.listBindings(indicatorId);
      const existingByCode = new Map(existing.map((binding) => [binding.variableCode, binding]));
      for (const code of codes) {
        if (existingByCode.has(code)) continue;
        const variable = variables.find((v) => v.code === code);
        if (!variable) continue; // unknown code — the backend reports it
        await corporateKpiApi.createBinding({
          indicatorId,
          variableId: variable.id,
          displayOrder: codes.indexOf(code),
        });
      }
      if (unlinkRemoved) {
        for (const binding of existing) {
          if (!codes.includes(binding.variableCode)) {
            await corporateKpiApi.deleteBinding(binding.id);
          }
        }
      }
    },
    [variables],
  );

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);

    let formula: string | null = null;
    let rules: AssessmentRule[] | null = null;

    if (isIndicator) {
      if (formulaState.mode === 'guided') {
        if (formulaState.tokens.length > 0) {
          if (formulaValidation) {
            setSubmitError(formulaValidation);
            return;
          }
          formula = serializeTokens(formulaState.tokens);
        }
      } else {
        const raw = formulaState.raw.trim();
        if (raw) {
          const err = validateFormulaSyntax(raw);
          if (err) {
            setSubmitError(err);
            return;
          }
          formula = raw;
        }
      }

      if (scoreState.mode === 'simple') {
        if (scoreValidationError) {
          setSubmitError(scoreValidationError);
          return;
        }
        rules = buildAssessmentRules(scoreState.direction, scoreState.rows);
      } else {
        try {
          rules = parseAssessmentRules(scoreState.json);
        } catch {
          setSubmitError('JSON aturan penilaian tidak valid.');
          return;
        }
      }
    }

    const common = {
      code: values.code,
      name: values.name,
      parentId: values.parentId || null,
      description: values.description || null,
      displayOrder: values.displayOrder ?? 0,
      formula: isIndicator ? formula : null,
      assessmentRules: isIndicator ? rules : null,
      weight: isIndicator && values.weight ? Number(values.weight) : null,
      targetScore: isIndicator && values.targetScore ? Number(values.targetScore) : null,
    };

    const codes = isIndicator ? referencedVariableCodes(formula) : [];

    let ok = false;
    let nodeSaved = false;
    let savedNode: CorporateKpiNode | null = null;
    try {
      if (isEditMode && initialData) {
        if (isIndicator) {
          // Bind the new formula's variables first so the PUT's
          // unbound-variable check passes.
          await syncBindings(initialData.id, codes, false);
        }
        savedNode = await updateNode(initialData.id, common as UpdateKpiRequest);
        ok = savedNode != null;
        nodeSaved = ok;
        if (ok && isIndicator) {
          // Stored formula is now the new one — unlink variables that left it.
          await syncBindings(initialData.id, codes, true);
        }
      } else {
        const created = await createNode({
           ...common,
           nodeType: (values.nodeType || 'ASPECT') as KpiNodeType,
           structureId: values.structureId || undefined,
           year: values.structureId ? undefined : Number(values.year),
         } as CreateKpiRequest);
        ok = created != null;
        savedNode = created;
        nodeSaved = ok;
        if (ok && isIndicator && created) {
          await syncBindings(created.id, codes, true);
        }
      }
    } catch {
      setSubmitError(
        nodeSaved
           ? 'Indikator tersimpan, tetapi pengikatan variabel gagal. Buka kembali indikator dan simpan lagi untuk mencoba ulang.'
           : 'Indikator tidak dapat disimpan karena pengikatan variabel gagal.',
      );
      return;
    }
    if (ok) {
      if (savedNode) onSuccess(savedNode);
    }
  };

  /* ── Render ── */

  const handleSubmit = (e: React.FormEvent) => {
    void form.handleSubmit(onSubmit)(e);
  };

  const handleCancel = useCallback(() => {
    router.push(isEditMode && initialData ? KPI_ROUTES.corporateDetailRoute(initialData.id) : KPI_ROUTES.corporate);
  }, [initialData, isEditMode, router]);

  // Reference data not loaded yet — same spinner gate as the Add Employee form.
  if (isLoadingReference) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem>KPI</BreadcrumbsItem>
        <BreadcrumbsItem href={KPI_ROUTES.corporate}>{KPI_LABELS.corporate}</BreadcrumbsItem>
        <BreadcrumbsItem>{isEditMode ? 'Ubah' : 'Tambah'}</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center gap-3">
        <Button isIconOnly variant="tertiary" onPress={handleCancel} aria-label="Kembali">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">
            {isEditMode ? 'Ubah KPI Perusahaan' : 'Tambah KPI Perusahaan'}
        </h1>
      </div>

      <Form
        validationBehavior="aria"
        onSubmit={handleSubmit}
        className="flex flex-col gap-6"
      >
        {/* ── 1. BASIC INFORMATION ── */}
          <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">Informasi Dasar</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {!isEditMode && (
              <Controller
                control={form.control}
                name="nodeType"
                render={({ field, fieldState }) => (
                  <Select
                    className="w-full"
                    selectedKey={field.value || null}
                    onSelectionChange={(key) => field.onChange(key === 'INDICATOR' ? 'INDICATOR' : 'ASPECT')}
                    isRequired
                    isInvalid={fieldState.invalid}
                    aria-label="Tipe"
                    placeholder="Pilih tipe"
                  >
                    <Label>Tipe</Label>
                    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                         <ListBox.Item id="ASPECT" textValue="Aspect">Aspect<ListBox.ItemIndicator /></ListBox.Item>
                         <ListBox.Item id="INDICATOR" textValue="Indicator">Indicator<ListBox.ItemIndicator /></ListBox.Item>
                      </ListBox>
                    </Select.Popover>
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </Select>
                )}
              />
            )}

            <Controller
              control={form.control}
              name="code"
              render={({ field, fieldState }) => (
                <TextField
                  isRequired
                  validationBehavior="aria"
                  className="w-full"
                  name={field.name}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  isInvalid={fieldState.invalid}
                  isDisabled={isMutating}
                >
                  <Label>Kode</Label>
                  <Input placeholder="mis. I" />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )}
            />

            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <TextField
                  isRequired
                  validationBehavior="aria"
                  className="w-full"
                  name={field.name}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  isInvalid={fieldState.invalid}
                  isDisabled={isMutating}
                >
                  <Label>Nama</Label>
                  <Input placeholder="mis. Keuangan" />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )}
            />

            {isIndicator && (
              <Controller
                control={form.control}
                name="parentId"
                render={({ field, fieldState }) => (
                  <ComboBox
                    className="w-full"
                    fullWidth
                    allowsEmptyCollection
                    selectedKey={field.value || null}
                    onSelectionChange={(key) => form.setValue('parentId', key ? String(key) : '', { shouldValidate: true })}
                    isRequired
                    isInvalid={fieldState.invalid}
                    isDisabled={isMutating || (!isEditMode && !!preselectedParentId)}
                    aria-label="Aspect induk"
                    menuTrigger="input"
                    defaultFilter={(text, inputValue) => {
                      if (!inputValue) return true;
                      const option = aspectOptions.find((aspect) => `${aspect.name} • ${aspect.code}` === text);
                      return (option ? `${option.name} ${option.code}` : text).toLowerCase().includes(inputValue.toLowerCase());
                    }}
                  >
                    <Label>Aspect induk</Label>
                    <ComboBox.InputGroup>
                       <Input placeholder="Cari Aspect..." />
                      <ComboBox.Trigger />
                    </ComboBox.InputGroup>
                    <ComboBox.Popover>
                       <ListBox renderEmptyState={() => <EmptyState>Aspect tidak ditemukan</EmptyState>}>
                         {aspectOptions.map((a) => (
                           <ListBox.Item key={a.id} id={a.id} textValue={`${a.name} • ${a.code}`}>
                            {a.name} • {a.code}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </ComboBox.Popover>
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </ComboBox>
                )}
              />
            )}

            {isEditMode ? (
              <div className="flex items-center gap-2 py-1">
                <Label className="text-sm text-muted-foreground">Tahun</Label>
                <span className="text-sm font-medium text-foreground">
                  {String(initialData?.year ?? (selectedStructure?.year ?? ''))}
                </span>
              </div>
            ) : creatingWithoutStructure ? (
              <div className="flex items-center gap-2 py-1">
                <Label className="text-sm text-muted-foreground">Tahun</Label>
                <span className="text-sm font-medium text-foreground">{preselectedYear}</span>
              </div>
            ) : (
              <Controller
                control={form.control}
                name="structureId"
                render={({ field, fieldState }) => (
                  <Select
                    className="w-full"
                    selectedKey={field.value || null}
                    onSelectionChange={(key) => field.onChange(key ? String(key) : '')}
                    isRequired
                    isInvalid={fieldState.invalid}
                    isDisabled={isMutating || !!preselectedStructureId}
                    aria-label="Struktur"
                    placeholder="Pilih struktur"
                  >
                    <Label>Struktur (Tahun)</Label>
                    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                    <Select.Popover>
                      <ListBox
                        renderEmptyState={() => (
                          <EmptyState>{structuresError ? structuresError : 'Belum ada struktur'}</EmptyState>
                        )}
                      >
                        {structures.map((s) => (
                          <ListBox.Item key={s.id} id={s.id} textValue={`${s.year} · ${s.status}`}>
                            {`${s.year} · ${s.status}`}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </Select>
                )}
              />
            )}

            <Controller
              control={form.control}
              name="displayOrder"
              render={({ field, fieldState }) => (
                <TextField
                  validationBehavior="aria"
                  className="w-full"
                  name={field.name}
                  value={field.value != null ? String(field.value) : ''}
                  onChange={(val) => field.onChange(val === '' ? undefined : Number(val))}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  isInvalid={fieldState.invalid}
                  isDisabled={isMutating}
                >
                  <Label>Urutan Tampil</Label>
                  <Input type="number" min={0} step={1} placeholder="mis. 1" />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="description"
            render={({ field, fieldState }) => (
              <TextField
                validationBehavior="aria"
                className="w-full"
                name={field.name}
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                isInvalid={fieldState.invalid}
                isDisabled={isMutating}
              >
                <Label>Deskripsi</Label>
                <TextArea placeholder="Deskripsi opsional" rows={3} />
                <FieldError>{fieldState.error?.message}</FieldError>
              </TextField>
            )}
          />

          {isIndicator && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="weight"
                render={({ field, fieldState }) => (
                  <TextField
                    validationBehavior="aria"
                    className="w-full"
                    name={field.name}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    isInvalid={fieldState.invalid}
                    isDisabled={isMutating}
                  >
                    <Label>Bobot</Label>
                    <Input type="number" step="any" placeholder="mis. 0.25 (25%)" />
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </TextField>
                )}
              />
              <Controller
                control={form.control}
                name="targetScore"
                render={({ field, fieldState }) => (
                  <TextField
                    validationBehavior="aria"
                    className="w-full"
                    name={field.name}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    isInvalid={fieldState.invalid}
                    isDisabled={isMutating}
                  >
                    <Label>Target Nilai</Label>
                    <Input type="number" step="any" placeholder="mis. 80" />
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </TextField>
                )}
              />
            </div>
          )}
        </div>

        {isIndicator && (
          <>
            <Separator />

            {/* ── 2. FORMULA CONFIGURATION ── */}
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-foreground">Konfigurasi Formula</h2>

              <Tabs
                selectedKey={formulaState.mode}
                onSelectionChange={(key) => handleFormulaModeChange(String(key) as 'guided' | 'advanced')}
              >
                <Tabs.ListContainer>
                  <Tabs.List aria-label="Mode formula">
                    <Tabs.Tab id="guided">Terpandu<Tabs.Indicator /></Tabs.Tab>
                    <Tabs.Tab id="advanced">Lanjutan<Tabs.Indicator /></Tabs.Tab>
                  </Tabs.List>
                </Tabs.ListContainer>
              </Tabs>

              {formulaState.mode === 'guided' ? (
                <div className="flex flex-col gap-4">
                  {/* Variable — label from the HeroUI <Label>; Add button aligned with the input control */}
                  <ComboBox
                    className="w-full"
                    allowsEmptyCollection
                    aria-label="Variabel formula"
                    selectedKey={variableCode}
                    onSelectionChange={(key) => setVariableCode(key ? String(key) : null)}
                    isDisabled={isMutating}
                    defaultFilter={(text, inputValue) => {
                      if (!inputValue) return true;
                      return text.toLowerCase().includes(inputValue.toLowerCase());
                    }}
                  >
                    <Label>Variabel</Label>
                    <BuilderControlRow>
                      <ComboBox.InputGroup className="flex-1">
                        <Input placeholder="Cari dan pilih variabel" />
                        <ComboBox.Trigger />
                      </ComboBox.InputGroup>
                      <Button
                        variant="tertiary"
                        // slot={null}: opt out of the RAC slotted ButtonContext (the
                        // ComboBox trigger context would merge its own handlers)
                        slot={null}
                        aria-label="Tambah variabel"
                        onPress={handleAddVariable}
                        isDisabled={!variableCode || !canAppend(formulaState.tokens, 'variable') || isMutating}
                      >
                        Tambah
                      </Button>
                    </BuilderControlRow>
                    <ComboBox.Popover>
                      <ListBox
                        renderEmptyState={() => (
                          <EmptyState>{variablesError || 'Belum ada variabel'}</EmptyState>
                        )}
                      >
                        {variables.map((v) => (
                          <ListBox.Item key={v.code} id={v.code} textValue={`${v.name} • ${v.code}`}>
                            {v.name} • {v.code}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </ComboBox.Popover>
                  </ComboBox>

                  {/* Constant — same HeroUI label + control-row pattern as the other fields.
                      TextField instead of NumberField: RAC's NumberField commits via
                      flushSync on blur/Enter, which React 19 rejects while the score
                      table re-renders on each keystroke (flushSync lifecycle error). */}
                  <TextField
                    className="w-full"
                    aria-label="Konstanta formula"
                    value={constantInput}
                    onChange={setConstantInput}
                    isDisabled={isMutating}
                  >
                    <Label>Konstanta</Label>
                    <BuilderControlRow>
                      <Input
                        className="flex-1"
                        type="number"
                        min={0}
                        step="any"
                        placeholder="Masukkan angka"
                      />
                      <Button
                        variant="tertiary"
                        // slot={null}: opt out of the RAC slotted ButtonContext so the
                        // button stays standalone inside the field root (the field
                        // context only knows its own slots)
                        slot={null}
                         aria-label="Tambah konstanta"
                        onPress={handleAddConstant}
                        isDisabled={!isDecimalNumber(constantInput) || !canAppend(formulaState.tokens, 'number') || isMutating}
                      >
                         Tambah
                      </Button>
                    </BuilderControlRow>
                  </TextField>

                  {/* Built-in values — label from the HeroUI <Label>; Add button aligned with the input control */}
                  <ComboBox
                    className="w-full"
                    aria-label="Nilai bawaan"
                    selectedKey={builtInCode}
                    onSelectionChange={(key) => setBuiltInCode(key ? String(key) : null)}
                    isDisabled={isMutating}
                  >
                    <Label>Nilai bawaan</Label>
                    <BuilderControlRow>
                      <ComboBox.InputGroup className="flex-1">
                        <Input placeholder="Cari nilai bawaan" />
                        <ComboBox.Trigger />
                      </ComboBox.InputGroup>
                      <Button
                        variant="tertiary"
                        // slot={null}: opt out of the RAC slotted ButtonContext (the
                        // ComboBox trigger context would merge its own handlers)
                        slot={null}
                        aria-label="Tambah nilai bawaan"
                        onPress={handleAddBuiltIn}
                        isDisabled={!builtInCode || !canAppend(formulaState.tokens, 'symbol') || isMutating}
                      >
                        Tambah
                      </Button>
                    </BuilderControlRow>
                    <ComboBox.Popover>
                      <ListBox>
                        <ListBox.Item id={PERIOD_MONTH_COUNT} textValue={`Jumlah bulan dalam periode • ${PERIOD_MONTH_COUNT}`}>
                          Jumlah bulan dalam periode • {PERIOD_MONTH_COUNT}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      </ListBox>
                    </ComboBox.Popover>
                  </ComboBox>

                  {/* Operators */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-foreground">Operator</span>
                    <div className="flex flex-wrap gap-2">
                      {(['+', '-', '*', '/', '(', ')'] as const).map((op) => {
                        const kind = op === '(' || op === ')' ? 'paren' : 'operator';
                        return (
                          <Button
                            key={op}
                            variant="tertiary"
                            className="flex-1"
                            aria-label={`Tambah ${OPERATOR_LABELS[op] ?? op}`}
                            onPress={() => appendToken(kind, op)}
                            isDisabled={!canAppend(formulaState.tokens, kind, op) || isMutating}
                          >
                            {OPERATOR_LABELS[op] ?? op}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Formula surface */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Formula</span>
                      <Button
                        variant="tertiary"
                        size="sm"
                        aria-label="Hapus formula"
                        onPress={clearTokens}
                        isDisabled={formulaState.tokens.length === 0 || isMutating}
                      >
                        Hapus
                      </Button>
                    </div>
                    <Surface className="rounded-xl p-3">
                      {formulaState.tokens.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Tambahkan variabel, konstanta, nilai bawaan, atau operator untuk membuat formula.
                        </p>
                      ) : (
                        <TagGroup
                          aria-label="Token formula"
                          size="sm"
                          onRemove={handleRemoveTokens}
                        >
                          <TagGroup.List className="gap-1.5">
                            {formulaState.tokens.map((token) => (
                              <Tag key={token.id} id={token.id} textValue={tokenLabel(token)}>
                                {tokenLabel(token)}
                              </Tag>
                            ))}
                          </TagGroup.List>
                        </TagGroup>
                      )}
                    </Surface>
                    {formulaState.tokens.length > 0 && formulaValidation && (
                      <Alert status="danger">
                        <Alert.Indicator />
                        <Alert.Content>
                          <Alert.Title>{formulaValidation}</Alert.Title>
                        </Alert.Content>
                      </Alert>
                    )}
                  </div>

                  {/* Readable formula */}
                  <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium text-foreground">Formula terbaca</span>
                    <Surface className="rounded-xl p-3">
                      <p className="text-sm text-foreground">
                        {formulaState.tokens.length > 0 ? readableFormula(formulaState.tokens, variableNameByCode) : '—'}
                      </p>
                    </Surface>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <TextArea
                    className="w-full font-mono"
                    aria-label="Formula mentah"
                    value={formulaState.raw}
                    onChange={(e) => setFormulaState((prev) => ({ ...prev, raw: e.target.value }))}
                    disabled={isMutating}
                    placeholder="e.g. NET_PROFIT_AFTER_TAX / TOTAL_EQUITY"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Editor formula mentah lanjutan. Sintaks: angka, kode huruf besar, serta operator + − × ÷ dengan tanda kurung.
                    <br />
                    Simbol bawaan yang didukung: <span className="font-mono">{PERIOD_MONTH_COUNT}</span> ({PERIOD_MONTH_COUNT_LABEL}).
                  </p>
                </div>
              )}

              {formulaNotice && <p className="text-sm text-danger">{formulaNotice}</p>}
            </div>

            <Separator />

            {/* ── 3. SCORE CONFIGURATION ── */}
            {/* relative: contains the sr-only Score/Threshold labels — without a
                positioned ancestor their absolute containing block is <body>, which
                extends the viewport scroll (double scrollbar, same fix as Role form). */}
            <div className="relative flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-foreground">Konfigurasi Nilai</h2>

              <Tabs
                selectedKey={scoreState.mode}
                onSelectionChange={(key) => handleScoreModeChange(String(key) as 'simple' | 'advanced')}
              >
                <Tabs.ListContainer>
                  <Tabs.List aria-label="Mode nilai">
                    <Tabs.Tab id="simple">Sederhana<Tabs.Indicator /></Tabs.Tab>
                    <Tabs.Tab id="advanced">Lanjutan<Tabs.Indicator /></Tabs.Tab>
                  </Tabs.List>
                </Tabs.ListContainer>
              </Tabs>

              {scoreNotice && (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>{scoreNotice}</Alert.Title>
                  </Alert.Content>
                </Alert>
              )}

              {scoreState.mode === 'simple' ? (
                <div className="flex flex-col gap-3">
                  {/* Scoring direction */}
                  <RadioGroup
                    value={scoreState.direction}
                    onChange={(value) => setScoreDirection(value as ScoreDirection)}
                    isDisabled={isMutating}
                  >
                    <Label>Arah penilaian</Label>
                    <Radio value="higher">
                      {/* flex-row: the v3 default .radio__content stacks control + label
                          vertically; the row keeps the label beside the indicator */}
                      <Radio.Content className="flex-row items-center gap-2">
                        <Radio.Control>
                          <Radio.Indicator />
                        </Radio.Control>
                        Hasil lebih tinggi mendapat nilai lebih tinggi
                      </Radio.Content>
                    </Radio>
                    <Radio value="lower">
                      <Radio.Content className="flex-row items-center gap-2">
                        <Radio.Control>
                          <Radio.Indicator />
                        </Radio.Control>
                        Hasil lebih rendah mendapat nilai lebih tinggi
                      </Radio.Content>
                    </Radio>
                  </RadioGroup>

                  {/* Score levels — table structure and styling copied from the
                      Add Employee Positions section (employee-form.tsx). */}
                  <Table>
                    <Table.ScrollContainer>
                      <Table.Content aria-label="Tingkat nilai" className="min-w-[480px]">
                        <Table.Header>
                          <Table.Column id="score" isRowHeader>Nilai</Table.Column>
                          <Table.Column id="boundary">
                            {scoreState.direction === 'higher' ? 'Hasil minimum' : 'Hasil maksimum'}
                          </Table.Column>
                          <Table.Column id="condition">Kondisi</Table.Column>
                          <Table.Column id="actions" aria-label="Aksi" className="text-center">{''}</Table.Column>
                        </Table.Header>
                        <Table.Body
                          renderEmptyState={() => (
                            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                              <Tray className="h-8 w-8" />
                              <span className="text-sm">Belum ada tingkat nilai</span>
                            </div>
                          )}
                        >
                          {scoreState.rows.map((row, index) => {
                            const isLast = index === scoreState.rows.length - 1;
                            return (
                              <Table.Row key={row.id} id={row.id}>
                                <Table.Cell>
                                  <TextField
                                      aria-label={`Nilai tingkat ${index + 1}`}
                                    value={row.score}
                                    onChange={(val) => updateScoreRow(row.id, { score: val })}
                                    isDisabled={isMutating}
                                    variant="secondary"
                                  >
                                    <Label className="sr-only">Nilai</Label>
                                    <Input type="number" step="any" placeholder="Nilai" />
                                  </TextField>
                                </Table.Cell>
                                <Table.Cell>
                                  {isLast ? (
                                    <span className="text-muted-foreground">—</span>
                                  ) : (
                                    <TextField
                                      aria-label={`Batas untuk nilai ${row.score || index + 1}`}
                                      value={row.threshold}
                                      onChange={(val) => updateScoreRow(row.id, { threshold: val })}
                                      isDisabled={isMutating}
                                      variant="secondary"
                                    >
                                      <Label className="sr-only">Batas</Label>
                                      <Input type="number" step="any" placeholder="Batas" />
                                    </TextField>
                                  )}
                                </Table.Cell>
                                <Table.Cell className="text-muted-foreground">
                                  {rowCondition(scoreState.direction, scoreState.rows, index)}
                                </Table.Cell>
                                <Table.Cell>
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      isIconOnly
                                      variant="danger-soft"
                                      size="sm"
                                      aria-label={`Hapus tingkat nilai ${index + 1}`}
                                      isDisabled={scoreState.rows.length <= 1 || isMutating}
                                      onPress={() => removeScoreRow(row.id)}
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </Table.Cell>
                              </Table.Row>
                            );
                          })}
                        </Table.Body>
                      </Table.Content>
                    </Table.ScrollContainer>
                  </Table>

                  {scoreValidationError && (
                    <Alert status="danger">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Title>{scoreValidationError}</Alert.Title>
                      </Alert.Content>
                    </Alert>
                  )}

                  <div className="flex items-center gap-2">
                    <Button variant="tertiary" size="sm" onPress={addScoreRow} isDisabled={isMutating}>
                      <Plus className="h-4 w-4" />
                      Tambah tingkat nilai
                    </Button>
                  </div>

                  {/* Simulation — no Surface/card wrapper. The label lives in the
                      field root; the control and Resulting score share one
                      control row so they stay aligned with the input control. */}
                  <TextField
                    aria-label="Contoh hasil"
                    value={sampleValue}
                    onChange={setSampleValue}
                    isDisabled={isMutating}
                  >
                    <Label>Contoh hasil</Label>
                    <BuilderControlRow>
                      <Input type="number" step="any" className="w-40" placeholder="mis. 85" />
                      <span className="text-sm text-muted-foreground">
                        Nilai hasil:{' '}
                        <span className="font-semibold text-foreground">
                          {simulatedScore != null ? simulatedScore : '—'}
                        </span>
                      </span>
                    </BuilderControlRow>
                  </TextField>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <TextArea
                    className="w-full font-mono"
                    aria-label="JSON aturan penilaian"
                    value={scoreState.json}
                    onChange={(e) => setScoreState((prev) => ({ ...prev, json: e.target.value }))}
                    disabled={isMutating}
                    placeholder='[{"lowerBound":null,"lowerInclusive":true,"upperBound":60,"upperInclusive":false,"score":1}]'
                    rows={5}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {submitError && <Alert status="danger">{submitError}</Alert>}

        {isEditMode && editLocked && (
          <Alert status="default">
            KPI Perusahaan ini berada pada struktur ACTIVE sehingga konfigurasinya terkunci.
            Nonaktifkan struktur sebelum mengubahnya.
          </Alert>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onPress={handleCancel} isDisabled={isMutating}>
            Batal
          </Button>
          <Button type="submit" variant="primary" isDisabled={isMutating || editLocked} isPending={isMutating}>
            <FloppyDisk className="h-4 w-4" />
            {isEditMode ? 'Simpan Perubahan' : 'Simpan'}
          </Button>
        </div>
      </Form>
    </div>
  );
}
