'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, Breadcrumbs, BreadcrumbsItem, Chip, Tabs, Dropdown, SearchField, Label } from '@heroui/react';
import type { Selection } from '@heroui/react';
import { House, CaretDown, FloppyDisk, PencilSimple, ArrowsClockwise, FunnelSimple, Check, X } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS, KPI_ROUTES } from '@/modules/kpi/constants';
import { useVariableValuesData } from '@/modules/kpi/corporate/values/use-variable-values-data';
import { ValuesSheetTable, isValidValueInput, valueToDraft } from '@/modules/kpi/corporate/values/values-sheet-table';
import type { BatchVariableValueItem, ValueDraft, SheetPeriod } from '@/modules/kpi/corporate/values/values.types';
import { MONTH_NAMES_ID } from '@/modules/kpi/corporate/period-label';
import { corporateKpiStructuresApi } from '@/modules/kpi/corporate/corporate-kpi-structures-api';
import { getCorporateKpiDefaultYear, getCorporateKpiYearOptions } from '@/modules/kpi/corporate/corporate-kpi-year-options';
import { extractErrorMessage } from '@/types/api';
import type { VariableSortDirection, VariableSortField } from '@/modules/kpi/corporate/variables/variables.types';

type PeriodMode = 'monthly' | 'annual';
const SORT_OPTIONS: { field: VariableSortField; direction: VariableSortDirection; label: string }[] = [
  { field: 'name', direction: 'asc', label: 'Nama (A-Z)' },
  { field: 'name', direction: 'desc', label: 'Nama (Z-A)' },
  { field: 'code', direction: 'asc', label: 'Kode (A-Z)' },
  { field: 'code', direction: 'desc', label: 'Kode (Z-A)' },
];

function validMonth(value: string | null, fallback: number) {
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : fallback;
}

export default function KpiCorporateVariableValuesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPerm } = usePermission();
  const canRead = hasPerm(PERM.CORPORATE_KPI_READ);
  const canManage = hasPerm(PERM.CORPORATE_KPI_MANAGE);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const periodMode: PeriodMode = searchParams.get('period') === 'annual' ? 'annual' : 'monthly';
  const urlYear = Number(searchParams.get('year'));
  const urlMonth = validMonth(searchParams.get('month'), currentMonth);
  const urlSearch = searchParams.get('search') ?? '';
  const sortBy: VariableSortField = searchParams.get('sortBy') === 'code' ? 'code' : 'name';
  const sortDirection: VariableSortDirection = searchParams.get('sortDirection') === 'desc' ? 'desc' : 'asc';
  const sortSelectionKeys = useMemo(() => {
    const index = SORT_OPTIONS.findIndex((option) => option.field === sortBy && option.direction === sortDirection);
    return new Set([String(index >= 0 ? index : 0)]);
  }, [sortBy, sortDirection]);
  const isDefaultSort = sortBy === 'name' && sortDirection === 'asc';

  const [structures, setStructures] = useState<Array<{ year: number }>>([]);
  const [isLoadingStructures, setIsLoadingStructures] = useState(true);
  const [structuresError, setStructuresError] = useState<string | null>(null);
  const structureRequestRef = useRef(0);
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [isSearchTransitioning, setIsSearchTransitioning] = useState(false);
  const years = useMemo(() => getCorporateKpiYearOptions(structures, currentYear), [structures, currentYear]);
  const defaultYear = useMemo(() => getCorporateKpiDefaultYear(years, currentYear), [years, currentYear]);
  const selectedYear = years.includes(urlYear) ? urlYear : defaultYear;
  const selectedMonth = urlMonth;

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ValueDraft>({});
  const { sheet, isLoading, error, isSaving, fetchSheet, saveBatch, deleteAnnual, deleteMonthly } = useVariableValuesData();

  const updateUrl = useCallback((patch: Partial<{ period: PeriodMode; year: number; month: number; search: string; sortBy: VariableSortField; sortDirection: VariableSortDirection }>) => {
    const next = { period: periodMode, year: selectedYear, month: selectedMonth, search: urlSearch, sortBy, sortDirection, ...patch };
    const params = new URLSearchParams();
    if (next.period !== 'monthly') params.set('period', next.period);
    if (next.year !== currentYear) params.set('year', String(next.year));
    if (next.period === 'monthly' && next.month !== currentMonth) params.set('month', String(next.month));
    if (next.search) params.set('search', next.search);
    if (next.sortBy !== 'name' || next.sortDirection !== 'asc') {
      params.set('sortBy', next.sortBy);
      params.set('sortDirection', next.sortDirection);
    }
    const query = params.toString();
    router.replace(query ? `${KPI_ROUTES.corporateVariableValues}?${query}` : KPI_ROUTES.corporateVariableValues, { scroll: false });
  }, [currentMonth, currentYear, periodMode, router, selectedMonth, selectedYear, sortBy, sortDirection, urlSearch]);

  const loadStructures = useCallback(async () => {
    const requestId = ++structureRequestRef.current;
    setIsLoadingStructures(true);
    setStructuresError(null);
    try {
      const data = await corporateKpiStructuresApi.list();
      if (requestId === structureRequestRef.current) setStructures(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      if (requestId === structureRequestRef.current) setStructuresError(extractErrorMessage(err, 'Gagal memuat pilihan tahun.'));
    } finally {
      if (requestId === structureRequestRef.current) setIsLoadingStructures(false);
    }
  }, []);

  useEffect(() => { if (canRead) void loadStructures(); }, [canRead, loadStructures]);
  useEffect(() => {
    setSearchInput(urlSearch);
    if (!isLoadingStructures && (urlYear !== selectedYear || (periodMode === 'monthly' && urlMonth !== selectedMonth))) updateUrl({ year: selectedYear, month: selectedMonth });
  }, [isLoadingStructures, periodMode, selectedMonth, selectedYear, updateUrl, urlMonth, urlSearch, urlYear]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput !== urlSearch) updateUrl({ search: searchInput });
      setIsSearchTransitioning(false);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput, updateUrl, urlSearch]);
  useEffect(() => {
    if (canRead && !isLoadingStructures && !structuresError) {
      const period: SheetPeriod = { year: selectedYear, sortBy, sortDirection };
      if (periodMode === 'monthly') period.month = selectedMonth;
      void fetchSheet(period);
    }
  }, [canRead, fetchSheet, isLoadingStructures, periodMode, selectedMonth, selectedYear, sortBy, sortDirection, structuresError]);
  useEffect(() => { setIsEditing(false); setDraft({}); }, [periodMode, selectedMonth, selectedYear, sortBy, sortDirection]);

  const handleRetry = useCallback(() => {
    if (structuresError || isLoadingStructures) void loadStructures();
    const period: SheetPeriod = { year: selectedYear, sortBy, sortDirection };
    if (periodMode === 'monthly') period.month = selectedMonth;
    void fetchSheet(period);
  }, [fetchSheet, isLoadingStructures, loadStructures, periodMode, selectedMonth, selectedYear, sortBy, sortDirection, structuresError]);
  const handleSortSelectionChange = useCallback((selection: Selection) => {
    const selected = selection instanceof Set ? selection : new Set<string>();
    const first = Array.from(selected)[0];
    const option = SORT_OPTIONS[Number(first)];
    if (option) updateUrl({ sortBy: option.field, sortDirection: option.direction });
  }, [updateUrl]);
  const handleSearchChange = useCallback((value: string) => { setSearchInput(value); setIsSearchTransitioning(true); }, []);
  const handleModeChange = useCallback((mode: PeriodMode) => updateUrl({ period: mode }), [updateUrl]);
  const handleYearChange = useCallback((year: number) => updateUrl({ year }), [updateUrl]);
  const handleMonthChange = useCallback((month: number) => updateUrl({ month }), [updateUrl]);
  const handleDraftChange = useCallback((variableId: string, value: string) => setDraft((prev) => ({ ...prev, [variableId]: value })), []);
  const startEditing = useCallback(() => { setDraft(Object.fromEntries(sheet.map((row) => [row.variableId, valueToDraft(row.value)]))); setIsEditing(true); }, [sheet]);
  const cancelEditing = useCallback(() => { setDraft({}); setIsEditing(false); }, []);
  const hasInvalidDraft = useMemo(() => Object.values(draft).some((value) => !isValidValueInput(value)), [draft]);

  const handleSave = useCallback(async () => {
    const items: BatchVariableValueItem[] = [];
    const clearings: { variableId: string; month: number | null }[] = [];
    for (const row of sheet) {
      const raw = draft[row.variableId] ?? valueToDraft(row.value);
      if (!isValidValueInput(raw) || raw === valueToDraft(row.value)) continue;
      const month = periodMode === 'monthly' ? selectedMonth : null;
      if (raw.trim() === '') clearings.push({ variableId: row.variableId, month });
      else items.push({ variableId: row.variableId, year: selectedYear, month, value: Number(raw) });
    }
    let ok = true;
    for (const clearing of clearings) ok = (clearing.month == null ? await deleteAnnual(clearing.variableId, selectedYear) : await deleteMonthly(clearing.variableId, selectedYear, clearing.month)) && ok;
    if (ok && items.length > 0) ok = await saveBatch(items);
    if (ok) cancelEditing();
  }, [cancelEditing, deleteAnnual, deleteMonthly, draft, periodMode, saveBatch, selectedMonth, selectedYear, sheet]);

  const filteredRows = useMemo(() => {
    const query = urlSearch.trim().toLowerCase();
    return query ? sheet.filter((row) => row.variableCode.toLowerCase().includes(query) || row.name.toLowerCase().includes(query)) : sheet;
  }, [sheet, urlSearch]);
  const selectedMonthName = MONTH_NAMES_ID[selectedMonth - 1] ?? String(selectedMonth);
  const emptyLabel = urlSearch.trim() ? `Tidak ada nilai yang cocok dengan "${urlSearch.trim()}".` : periodMode === 'annual' ? 'Tidak ada variabel yang memerlukan nilai tahunan untuk tahun ini.' : 'Belum ada nilai variabel pada periode yang dipilih.';
  const tableLoading = isLoadingStructures || isLoading || isSearchTransitioning;

  if (!canRead) {
    return <div className="flex w-full flex-col gap-6"><Breadcrumbs><BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem><BreadcrumbsItem>KPI</BreadcrumbsItem><BreadcrumbsItem>{KPI_LABELS.corporate}</BreadcrumbsItem><BreadcrumbsItem>{KPI_LABELS.corporateVariableValues}</BreadcrumbsItem></Breadcrumbs><h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.corporateVariableValues}</h1><Alert status="danger">Akses Ditolak</Alert></div>;
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs><BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem><BreadcrumbsItem>KPI</BreadcrumbsItem><BreadcrumbsItem href={KPI_ROUTES.corporate}>{KPI_LABELS.corporate}</BreadcrumbsItem><BreadcrumbsItem>{KPI_LABELS.corporateVariableValues}</BreadcrumbsItem></Breadcrumbs>
      <div className="flex items-center justify-between"><div className="flex items-center gap-3"><h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.corporateVariableValues}</h1><Chip size="md" className="pointer-events-none" aria-label={`Total ${sheet.length} nilai`}>{sheet.length}</Chip></div><div className="flex items-center gap-2"><Button isIconOnly variant="tertiary" onPress={handleRetry} isDisabled={tableLoading || isSaving} aria-label="Muat ulang nilai variabel"><ArrowsClockwise className={`h-4 w-4 ${tableLoading ? 'animate-spin' : ''}`} /></Button>{canManage && (isEditing ? <><Button variant="secondary" onPress={cancelEditing} isDisabled={isSaving}>Batal</Button><Button variant="primary" onPress={handleSave} isPending={isSaving} isDisabled={isSaving || hasInvalidDraft}><FloppyDisk className="h-4 w-4" />Simpan</Button></> : <Button variant="primary" onPress={startEditing} isDisabled={tableLoading}><PencilSimple className="h-4 w-4" />Input Nilai</Button>)}</div></div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tabs selectedKey={periodMode} onSelectionChange={(key) => handleModeChange(key as PeriodMode)}><Tabs.ListContainer><Tabs.List aria-label="Periode"><Tabs.Tab id="monthly">Bulan<Tabs.Indicator /></Tabs.Tab><Tabs.Tab id="annual">Tahun<Tabs.Indicator /></Tabs.Tab></Tabs.List></Tabs.ListContainer></Tabs>
          <Dropdown><Button variant="tertiary" aria-label="Pilih tahun">{selectedYear}<CaretDown className="h-4 w-4" /></Button><Dropdown.Popover><Dropdown.Menu onAction={(key) => handleYearChange(Number(key))}>{years.map((year) => <Dropdown.Item key={year} id={String(year)} textValue={String(year)}>{year}</Dropdown.Item>)}</Dropdown.Menu></Dropdown.Popover></Dropdown>
          {periodMode === 'monthly' && <Dropdown><Button variant="tertiary" aria-label="Pilih bulan">{selectedMonthName}<CaretDown className="h-4 w-4" /></Button><Dropdown.Popover><Dropdown.Menu onAction={(key) => handleMonthChange(Number(key))}>{MONTH_NAMES_ID.map((name, index) => <Dropdown.Item key={name} id={String(index + 1)} textValue={name}>{name}</Dropdown.Item>)}</Dropdown.Menu></Dropdown.Popover></Dropdown>}
          <Dropdown><Button variant="tertiary" aria-label="Urutkan"><FunnelSimple className="h-4 w-4" />Urutkan{!isDefaultSort && <><span className="mx-0.5 h-4 w-px bg-border" /><Check className="h-4 w-4" /></>}</Button><Dropdown.Popover><Dropdown.Menu selectedKeys={sortSelectionKeys} selectionMode="single" onSelectionChange={handleSortSelectionChange}>{SORT_OPTIONS.map((option, index) => <Dropdown.Item key={index} id={String(index)} textValue={option.label}><Dropdown.ItemIndicator /><Label>{option.label}</Label></Dropdown.Item>)}</Dropdown.Menu></Dropdown.Popover></Dropdown>
          {!isDefaultSort && <Button isIconOnly variant="tertiary" aria-label="Reset pengurutan" onPress={() => updateUrl({ sortBy: 'name', sortDirection: 'asc' })}><X className="h-4 w-4" /></Button>}
        </div>
        <SearchField aria-label="Cari nilai variabel" value={searchInput} onChange={handleSearchChange} className="w-72"><SearchField.Group><SearchField.SearchIcon /><SearchField.Input placeholder="Cari" /><SearchField.ClearButton aria-label="Hapus pencarian" /></SearchField.Group></SearchField>
      </div>
      <ValuesSheetTable sheet={filteredRows} draft={draft} onDraftChange={handleDraftChange} isLoading={tableLoading} error={structuresError ?? error} onRetry={handleRetry} canEdit={isEditing && canManage} tableKey={`kpi-values-${periodMode}-${selectedYear}-${selectedMonth}-${sortBy}-${sortDirection}`} emptyLabel={emptyLabel} />
    </div>
  );
}
