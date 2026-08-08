'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Alert, Button, Breadcrumbs, BreadcrumbsItem, Chip, Tabs, Dropdown, SearchField } from '@heroui/react';
import { House, CaretDown, FloppyDisk, PencilSimple } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS, KPI_ROUTES } from '@/modules/kpi/constants';
import { useVariableValuesData } from '@/modules/kpi/corporate/values/use-variable-values-data';
import { ValuesSheetTable, isValidValueInput, valueToDraft } from '@/modules/kpi/corporate/values/values-sheet-table';
import type { BatchVariableValueItem, ValueDraft } from '@/modules/kpi/corporate/values/values.types';
import { MONTH_NAMES_EN } from '@/modules/kpi/corporate/period-label';

type PeriodMode = 'monthly' | 'annual';

export default function KpiCorporateVariableValuesPage() {
  const { hasPerm } = usePermission();
  const canRead = hasPerm(PERM.CORPORATE_KPI_READ);
  const canManage = hasPerm(PERM.CORPORATE_KPI_MANAGE);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const years = useMemo(
    () => Array.from({ length: 7 }, (_, i) => currentYear + i - 3),
    [currentYear],
  );

  // ── Page-local UI state ──
  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Inline edit state ──
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ValueDraft>({});

  // ── Server data ──
  const { sheet, isLoading, error, isSaving, fetchSheet, saveBatch, deleteAnnual, deleteMonthly } = useVariableValuesData();

  // Auto-fetch on mount and when the period changes.
  // Monthly: year + month. Annual: year only — the month parameter is omitted.
  useEffect(() => {
    if (canRead) {
      fetchSheet({ year: selectedYear, ...(periodMode === 'monthly' ? { month: selectedMonth } : {}) });
    }
  }, [canRead, selectedYear, periodMode, selectedMonth, fetchSheet]);

  // Leave edit mode and drop drafts when the period changes (sheet identity changes).
  useEffect(() => {
    setIsEditing(false);
    setDraft({});
  }, [selectedYear, periodMode, selectedMonth]);

  // ── Handlers ──

  const handleModeChange = useCallback((mode: PeriodMode) => {
    setPeriodMode(mode);
    // Annual scope omits the month entirely; keep the month selection for the Month tab.
    if (mode === 'annual') setSelectedMonth(currentMonth);
  }, [currentMonth]);

  const handleYearChange = useCallback((year: number) => setSelectedYear(year), []);
  const handleMonthChange = useCallback((month: number) => setSelectedMonth(month), []);
  const handleRetry = useCallback(() => {
    fetchSheet({ year: selectedYear, ...(periodMode === 'monthly' ? { month: selectedMonth } : {}) });
  }, [fetchSheet, selectedYear, periodMode, selectedMonth]);

  const handleDraftChange = useCallback((variableId: string, value: string) => {
    setDraft((prev) => ({ ...prev, [variableId]: value }));
  }, []);

  /** Prefill every row from the loaded sheet, then flip the value column into inputs. */
  const startEditing = useCallback(() => {
    setDraft(Object.fromEntries(sheet.map((row) => [row.variableId, valueToDraft(row.value)])));
    setIsEditing(true);
  }, [sheet]);

  const cancelEditing = useCallback(() => {
    setDraft({});
    setIsEditing(false);
  }, []);

  /** Any draft cell that is not empty and not a finite number blocks Save. */
  const hasInvalidDraft = useMemo(
    () => Object.values(draft).some((v) => !isValidValueInput(v)),
    [draft],
  );

  /**
   * Save the sheet: upsert changed non-empty cells via the atomic batch, and
   * DELETE the rows for cells the user cleared (backend stores "empty" as no
   * row — a null value cannot be upserted).
   */
  const handleSave = useCallback(async () => {
    const items: BatchVariableValueItem[] = [];
    const clearings: { variableId: string; month: number | null }[] = [];

    for (const row of sheet) {
      const raw = draft[row.variableId] ?? valueToDraft(row.value);
      if (!isValidValueInput(raw)) continue; // invalid cells are flagged in the table
      if (raw === valueToDraft(row.value)) continue; // unchanged

      const month = periodMode === 'monthly' ? selectedMonth : null;
      if (raw.trim() === '') {
        clearings.push({ variableId: row.variableId, month });
      } else {
        items.push({ variableId: row.variableId, year: selectedYear, month, value: Number(raw) });
      }
    }

    let ok = true;
    for (const c of clearings) {
      if (c.month == null) {
        ok = (await deleteAnnual(c.variableId, selectedYear)) && ok;
      } else {
        ok = (await deleteMonthly(c.variableId, selectedYear, c.month)) && ok;
      }
    }
    if (ok && items.length > 0) {
      ok = await saveBatch(items);
    }
    if (ok) {
      setIsEditing(false);
      setDraft({});
    }
  }, [sheet, draft, periodMode, selectedMonth, selectedYear, deleteAnnual, deleteMonthly, saveBatch]);

  // Client-side search over code/name — same pattern as the Corporate KPI list page.
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sheet;
    return sheet.filter(
      (row) =>
        row.variableCode.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q),
    );
  }, [sheet, searchQuery]);

  const selectedMonthName = MONTH_NAMES_EN[selectedMonth - 1] ?? String(selectedMonth);

  const emptyLabel = searchQuery.trim()
    ? `No values match "${searchQuery.trim()}".`
    : periodMode === 'annual'
      ? 'No variables require an annual value for this year.'
      : 'No variable values found for the selected period.';

  // ── Permission guard ──

  if (!canRead) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Breadcrumbs>
          <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
          <BreadcrumbsItem>KPI</BreadcrumbsItem>
          <BreadcrumbsItem>{KPI_LABELS.corporate}</BreadcrumbsItem>
          <BreadcrumbsItem>{KPI_LABELS.corporateVariableValues}</BreadcrumbsItem>
        </Breadcrumbs>
        <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.corporateVariableValues}</h1>
        <Alert status="danger">Access Denied</Alert>
      </div>
    );
  }

  // ── Rendered page ──

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem>KPI</BreadcrumbsItem>
        <BreadcrumbsItem href={KPI_ROUTES.corporate}>{KPI_LABELS.corporate}</BreadcrumbsItem>
        <BreadcrumbsItem>{KPI_LABELS.corporateVariableValues}</BreadcrumbsItem>
      </Breadcrumbs>

      {/* Row 1: Title + Chip counter | Input / Save + Cancel */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.corporateVariableValues}</h1>
          <Chip
            size="md"
            className="pointer-events-none"
            aria-label={`Total ${sheet.length} variable values`}
          >
            {sheet.length}
          </Chip>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="secondary" onPress={cancelEditing} isDisabled={isSaving}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onPress={handleSave}
                  isPending={isSaving}
                  isDisabled={isSaving || hasInvalidDraft}
                >
                  <FloppyDisk className="h-4 w-4" />
                  Save
                </Button>
              </>
            ) : (
              <Button variant="primary" onPress={startEditing} isDisabled={isLoading}>
                <PencilSimple className="h-4 w-4" />
                Input
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Row 2: Period tabs + Year/Month dropdowns | Search */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Period mode — Month | Year */}
          <Tabs
            selectedKey={periodMode}
            onSelectionChange={(key) => handleModeChange(key as PeriodMode)}
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label="Period">
                <Tabs.Tab id="monthly">Month<Tabs.Indicator /></Tabs.Tab>
                <Tabs.Tab id="annual">Year<Tabs.Indicator /></Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>

          {/* Year — HeroUI Dropdown */}
          <Dropdown>
            <Button variant="tertiary" aria-label="Select year">
              {selectedYear}
              <CaretDown className="h-4 w-4" />
            </Button>
            <Dropdown.Popover>
              <Dropdown.Menu onAction={(key) => handleYearChange(Number(key))}>
                {years.map((y) => (
                  <Dropdown.Item key={y} id={String(y)} textValue={String(y)}>
                    {String(y)}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>

          {/* Month — relevant only to the Month tab */}
          {periodMode === 'monthly' && (
            <Dropdown>
              <Button variant="tertiary" aria-label="Select month">
                {selectedMonthName}
                <CaretDown className="h-4 w-4" />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu onAction={(key) => handleMonthChange(Number(key))}>
                  {MONTH_NAMES_EN.map((name, i) => (
                    <Dropdown.Item key={name} id={String(i + 1)} textValue={name}>
                      {name}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          )}
        </div>

        {/* Search — right side */}
        <SearchField aria-label="Search KPI values" value={searchQuery} onChange={setSearchQuery} className="w-72">
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search" />
            <SearchField.ClearButton aria-label="Clear search" />
          </SearchField.Group>
        </SearchField>
      </div>

      {/* Values sheet — value column becomes inputs in edit mode (manage only) */}
      <ValuesSheetTable
        sheet={filteredRows}
        draft={draft}
        onDraftChange={handleDraftChange}
        isLoading={isLoading}
        error={error}
        onRetry={handleRetry}
        canEdit={isEditing && canManage}
        tableKey={`kpi-values-${periodMode}`}
        emptyLabel={emptyLabel}
      />
    </div>
  );
}
