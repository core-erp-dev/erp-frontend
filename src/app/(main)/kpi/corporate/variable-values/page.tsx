'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Alert, Button, Breadcrumbs, BreadcrumbsItem, Select, ListBox, Label, FieldError } from '@heroui/react';
import { House } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS, KPI_ROUTES } from '@/modules/kpi/constants';
import { useVariableValuesData } from '@/modules/kpi/corporate/values/use-variable-values-data';
import { ValuesSheetTable, valueToDraft, isValidValueInput } from '@/modules/kpi/corporate/values/values-sheet-table';
import type { ValueDraft, BatchVariableValueItem } from '@/modules/kpi/corporate/values/values.types';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function KpiCorporateVariableValuesPage() {
  const { hasPerm } = usePermission();
  const canRead = hasPerm(PERM.CORPORATE_KPI_READ);
  const canManage = hasPerm(PERM.CORPORATE_KPI_MANAGE);

  // Explicit period selection — no silent default month.
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [draft, setDraft] = useState<ValueDraft>({});

  const {
    sheet, isLoading, error, isSaving, saveError, loadedKey, fetchSheet, saveBatch,
  } = useVariableValuesData();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear + i - 3);

  const periodSelected = selectedYear != null && selectedMonth != null;
  const loadedMatchesSelection =
    loadedKey != null && selectedYear != null && selectedMonth != null &&
    loadedKey === `${selectedYear}-${selectedMonth}`;

  const handleLoad = useCallback(() => {
    if (selectedYear == null || selectedMonth == null) return;
    setDraft({});
    void fetchSheet(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, fetchSheet]);

  const handleDraftChange = useCallback((variableId: string, value: string) => {
    setDraft((prev) => ({ ...prev, [variableId]: value }));
  }, []);

  // Dirty detection: compare draft string against the loaded value string.
  const hasChanges = useMemo(() => {
    if (!loadedMatchesSelection) return false;
    return sheet.some((row) => {
      const raw = draft[row.variableId] ?? valueToDraft(row.value);
      return raw !== valueToDraft(row.value);
    });
  }, [draft, sheet, loadedMatchesSelection]);

  // Invalid inputs block saving.
  const hasInvalid = useMemo(() => {
    return sheet.some((row) => {
      const raw = draft[row.variableId] ?? valueToDraft(row.value);
      return !isValidValueInput(raw);
    });
  }, [draft, sheet]);

  const canSave = canManage && loadedMatchesSelection && hasChanges && !hasInvalid && !isLoading && !isSaving;

  const handleSave = useCallback(async () => {
    if (selectedYear == null || selectedMonth == null) return;
    // Batch payload: only CHANGED rows with a non-empty, valid value.
    // Natural key (variableId, year, month) is unique by construction —
    // each row maps to one item, so no duplicate keys can occur.
    const items: BatchVariableValueItem[] = [];
    const seen = new Set<string>();
    for (const row of sheet) {
      const raw = draft[row.variableId] ?? valueToDraft(row.value);
      if (raw === valueToDraft(row.value)) continue; // unchanged — skip
      if (!isValidValueInput(raw) || raw.trim() === '') continue; // empty/cleared — not supported by batch upsert (value is required)
      const num = Number(raw);
      const key = `${row.variableId}|${selectedYear}|${selectedMonth}`;
      if (seen.has(key)) continue; // defensive duplicate guard
      seen.add(key);
      items.push({ variableId: row.variableId, year: selectedYear, month: selectedMonth, value: num });
    }
    if (items.length === 0) return;
    const ok = await saveBatch(items);
    if (ok) {
      // Preserve saved inputs as the new baseline; refetch happened in the hook.
      setDraft({});
    }
    // On failure the draft is kept untouched — unsaved inputs survive.
  }, [sheet, draft, selectedYear, selectedMonth, saveBatch]);

  if (!canRead) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Breadcrumbs>
          <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
          <BreadcrumbsItem>KPI</BreadcrumbsItem>
          <BreadcrumbsItem>Corporate KPI</BreadcrumbsItem>
          <BreadcrumbsItem>Monthly Variable Values</BreadcrumbsItem>
        </Breadcrumbs>
        <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.corporateVariableValues}</h1>
        <Alert status="danger">Access Denied</Alert>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem>KPI</BreadcrumbsItem>
        <BreadcrumbsItem href={KPI_ROUTES.corporate}>Corporate KPI</BreadcrumbsItem>
        <BreadcrumbsItem>Monthly Variable Values</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.corporateVariableValues}</h1>
        {canManage && (
          <Button variant="primary" onPress={handleSave} isDisabled={!canSave} isPending={isSaving}>
            Save
          </Button>
        )}
      </div>

      {/* Period selector row — explicit year + month + Load */}
      <div className="flex items-center gap-3">
        <Select
          className="w-40"
          selectedKey={selectedYear != null ? String(selectedYear) : null}
          onSelectionChange={(key) => setSelectedYear(key != null ? Number(key) : null)}
          isRequired
          variant="secondary"
          aria-label="Select year"
        >
          <Label>Year</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {years.map((y) => (
                <ListBox.Item key={String(y)} id={String(y)} textValue={String(y)}>
                  {String(y)}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
          <FieldError />
        </Select>

        <Select
          className="w-44"
          selectedKey={selectedMonth != null ? String(selectedMonth) : null}
          onSelectionChange={(key) => setSelectedMonth(key != null ? Number(key) : null)}
          isRequired
          variant="secondary"
          aria-label="Select month"
        >
          <Label>Month</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {MONTHS.map((m) => (
                <ListBox.Item key={String(m)} id={String(m)} textValue={String(m)}>
                  {String(m)}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
          <FieldError />
        </Select>

        <Button variant="tertiary" onPress={handleLoad} isDisabled={!periodSelected || isLoading}>
          {isLoading ? 'Loading…' : 'Load'}
        </Button>
      </div>

      {saveError && <Alert status="danger">{saveError}</Alert>}

      <ValuesSheetTable
        sheet={sheet}
        draft={draft}
        onDraftChange={handleDraftChange}
        isLoading={isLoading}
        error={error}
        onRetry={handleLoad}
        canEdit={canManage}
      />
    </div>
  );
}
