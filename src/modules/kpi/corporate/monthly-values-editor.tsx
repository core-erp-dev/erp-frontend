'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Chip, Input, Select, ListBox, Label, Spinner } from '@heroui/react';
import { FloppyDisk } from '@phosphor-icons/react';
import type { CorporateConfigurationDefinition, VariableValueEntry } from './corporate-kpi.types';

interface Props {
  definition: CorporateConfigurationDefinition;
  isMutating: boolean;
  /** When true, the editor is read-only (e.g. user lacks corporate_kpi:manage). */
  isReadOnly?: boolean;
  onSave: (month: number, entries: VariableValueEntry[]) => Promise<unknown>;
  loadValues: (month: number) => Promise<VariableValueEntry[]>;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Monthly variable values editor: select any month, enter/clear values, return
 * to previous months. Save sends a per-month bulk upsert (null clears).
 */
export function MonthlyValuesEditor({ definition, isMutating, isReadOnly = false, onSave, loadValues }: Props) {
  const config = definition.configuration;
  const locked = config.recordingStatus === 'CLOSED' || isReadOnly;
  const variables = definition.variables;

  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [entries, setEntries] = useState<VariableValueEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchMonth = useCallback(async (targetMonth: number) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await loadValues(targetMonth);
      setEntries(data);
    } catch {
      setLoadError('Failed to load values for this month.');
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [loadValues]);

  useEffect(() => {
    void fetchMonth(month);
  }, [month, fetchMonth, definition.configuration.version]);

  const setValue = useCallback((variableCode: string, raw: string) => {
    const value = raw.trim() === '' ? null : Number(raw);
    setEntries((prev) => prev.map((e) => (e.variableCode === variableCode
      ? { ...e, value: Number.isFinite(value as number) ? (value as number) : null }
      : e)));
  }, []);

  const handleSave = useCallback(async () => {
    await onSave(month, entries);
  }, [month, entries, onSave]);

  return (
    <div className="flex w-full flex-col gap-4">
      {config.recordingStatus === 'CLOSED' && (
        <Alert status="warning">
          Recording is closed — monthly values are read-only until the year is reopened.
        </Alert>
      )}
      <div className="flex items-end gap-3">
        <Select
          variant="secondary"
          selectedKey={String(month)}
          onSelectionChange={(k) => setMonth(Number(k))}
        >
          <Label>Month</Label>
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              {MONTHS.map((m) => (
                <ListBox.Item key={String(m)} id={String(m)} textValue={`${m} - ${MONTH_NAMES[m - 1]}`}>
                  {m} — {MONTH_NAMES[m - 1]}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <Chip size="md" variant="soft" color="accent">
          v{config.version}
        </Chip>
        <Button
          variant="primary"
          onPress={handleSave}
          isPending={isMutating}
          isDisabled={locked || isMutating || variables.length === 0}
        >
          <FloppyDisk className="h-4 w-4" /> Save Month {month}
        </Button>
      </div>

      {loadError && <Alert status="danger">{loadError}</Alert>}
      {isLoading && <div className="flex justify-center py-8"><Spinner aria-label="Loading values" /></div>}
      {!isLoading && variables.length === 0 && (
        <p className="text-sm text-muted-foreground">No variables defined — add variables in the Definition tab first.</p>
      )}
      {!isLoading && variables.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[1fr_1fr_2fr] gap-2 px-3 text-xs font-medium text-muted-foreground">
            <span>Code</span><span>Name</span><span>Value (leave empty to clear)</span>
          </div>
          {variables.map((variable) => {
            const entry = entries.find((e) => e.variableCode === variable.code);
            return (
              <div key={variable.code} className="grid grid-cols-[1fr_1fr_2fr] items-center gap-2 rounded-md bg-content2/40 p-3">
                <span className="font-mono text-sm text-foreground">{variable.code}</span>
                <span className="text-sm text-foreground">{variable.name}</span>
                <Input
                  variant="secondary"
                  aria-label={`Value for ${variable.code}`}
                  placeholder={entry?.value != null ? String(entry.value) : 'empty'}
                  value={entry?.value != null ? String(entry.value) : ''}
                  onChange={(e) => setValue(variable.code, e.target.value)}
                  disabled={locked || isMutating}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
