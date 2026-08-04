'use client';

import React, { useMemo } from 'react';
import { Table, Spinner, Button, TextField, Input, FieldError, Label } from '@heroui/react';
import { Tray } from '@phosphor-icons/react';
import type { VariableValueSheetRow, ValueDraft } from './values.types';

export interface ValuesSheetTableProps {
  sheet: VariableValueSheetRow[];
  draft: ValueDraft;
  onDraftChange: (variableId: string, value: string) => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  /** read-only users see values but cannot edit. */
  canEdit: boolean;
}

/** Validates a draft cell: empty = untouched/cleared; otherwise a finite number. */
export function isValidValueInput(raw: string): boolean {
  if (raw.trim() === '') return true;
  const num = Number(raw);
  return Number.isFinite(num);
}

/** Loaded value → draft string (0 renders as '0', null renders as ''). */
export function valueToDraft(value: number | null): string {
  return value == null ? '' : String(value);
}

export const ValuesSheetTable: React.FC<ValuesSheetTableProps> = ({
  sheet,
  draft,
  onDraftChange,
  isLoading,
  error,
  onRetry,
  canEdit,
}) => {
  const invalidRows = useMemo(() => {
    const bad = new Set<string>();
    for (const row of sheet) {
      const raw = draft[row.variableId] ?? valueToDraft(row.value);
      if (!isValidValueInput(raw)) bad.add(row.variableId);
    }
    return bad;
  }, [sheet, draft]);

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <div className="flex h-24 items-center justify-center">
          <Spinner size="md" />
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
          <span className="text-sm text-danger">{error}</span>
          <Button variant="secondary" size="sm" onPress={onRetry}>Retry</Button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <Tray className="h-8 w-8" />
        <span className="text-sm">Select a year and month, then press Load to view the monthly sheet.</span>
      </div>
    );
  };

  return (
    <Table key="monthly-values">
      <Table.ScrollContainer>
        <Table.Content aria-label="Monthly Variable Values" className="min-w-[640px]">
          <Table.Header>
            <Table.Column id="code" isRowHeader>Code</Table.Column>
            <Table.Column id="name">Name</Table.Column>
            <Table.Column id="unit">Unit</Table.Column>
            <Table.Column id="value">Value</Table.Column>
          </Table.Header>
          <Table.Body renderEmptyState={renderEmptyState}>
            {sheet.map((row) => {
              const raw = draft[row.variableId] ?? valueToDraft(row.value);
              const invalid = invalidRows.has(row.variableId);
              return (
                <Table.Row key={row.variableId}>
                  <Table.Cell>
                    <span className="font-medium text-foreground">{row.variableCode}</span>
                  </Table.Cell>
                  <Table.Cell className="text-foreground">{row.name}</Table.Cell>
                  <Table.Cell className="text-muted-foreground">{row.unit || '–'}</Table.Cell>
                  <Table.Cell>
                    {canEdit ? (
                      <TextField
                        aria-label={`Value for ${row.variableCode}`}
                        type="number"
                        value={raw}
                        onChange={(val) => onDraftChange(row.variableId, val)}
                        isInvalid={invalid}
                        validationBehavior="aria"
                        className="w-40"
                        variant="secondary"
                      >
                        <Label className="sr-only">Value</Label>
                        <Input
                          step="any"
                          placeholder={row.value == null ? 'No value' : ''}
                          className="text-sm"
                        />
                        <FieldError>{invalid ? 'Enter a valid number' : ''}</FieldError>
                      </TextField>
                    ) : (
                      <span className="text-muted-foreground">
                        {row.value == null ? '–' : row.value}
                      </span>
                    )}
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
};
