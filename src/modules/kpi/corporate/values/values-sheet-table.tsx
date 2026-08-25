'use client';

import React, { useMemo } from 'react';
import { Table, Spinner, Button, TextField, Input, FieldError, Label, Chip } from '@heroui/react';
import { Tray, Trash } from '@phosphor-icons/react';
import { aggregationModeLabel } from '../variables/aggregation-mode';
import type { VariableValueSheetRow, ValueDraft } from './values.types';

export interface ValuesSheetTableProps {
  sheet: VariableValueSheetRow[];
  /** Draft inputs — only used when canEdit is true; read-only pages omit it. */
  draft?: ValueDraft;
  onDraftChange?: (variableId: string, value: string) => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  /** read-only users see values but cannot edit. */
  canEdit: boolean;
  /** Distinct table key per scope — monthly and annual sheets never share a table instance. */
  tableKey: string;
  /** Empty-state text shown after a successful load with no rows (annual scope). */
  emptyLabel?: string;
  /** When provided (annual scope), renders a per-row delete action for stored values. */
  onDeleteAnnual?: (row: VariableValueSheetRow) => void;
  deletingId?: string | null;
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
  draft = {},
  onDraftChange,
  isLoading,
  error,
  onRetry,
  canEdit,
  tableKey,
  emptyLabel = 'Belum ada nilai variabel pada periode yang dipilih.',
  onDeleteAnnual,
  deletingId,
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
          <Button variant="secondary" size="sm" onPress={onRetry}>Coba Lagi</Button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <Tray className="h-8 w-8" />
        <span className="text-sm">{emptyLabel}</span>
      </div>
    );
  };

  return (
    <Table key={tableKey}>
      <Table.ScrollContainer>
        <Table.Content aria-label="Nilai Variabel KPI" className="min-w-[720px]">
          <Table.Header>
            <Table.Column id="name" isRowHeader>Nama</Table.Column>
            <Table.Column id="code">Kode</Table.Column>
            <Table.Column id="unit">Satuan</Table.Column>
            <Table.Column id="mode">Mode Agregasi</Table.Column>
            <Table.Column id="value">Nilai</Table.Column>
            {onDeleteAnnual && <Table.Column id="actions" className="text-center">{''}</Table.Column>}
          </Table.Header>
          <Table.Body renderEmptyState={renderEmptyState}>
            {sheet.map((row) => {
              const raw = draft[row.variableId] ?? valueToDraft(row.value);
              const invalid = invalidRows.has(row.variableId);
              return (
                <Table.Row key={row.variableId}>
                  <Table.Cell className="text-foreground">{row.name}</Table.Cell>
                  <Table.Cell><span className="font-medium text-foreground">{row.variableCode}</span></Table.Cell>
                  <Table.Cell className="text-muted-foreground">{row.unit || '-'}</Table.Cell>
                  <Table.Cell>
                    <Chip size="sm" className="pointer-events-none" variant="soft">
                      {aggregationModeLabel(row.aggregationMode)}
                    </Chip>
                  </Table.Cell>
                  <Table.Cell>
                    {canEdit ? (
                      <div className="flex items-center gap-2">
                        <TextField
                          aria-label={`Nilai untuk ${row.name}`}
                          type="number"
                          value={raw}
                          onChange={(val) => onDraftChange?.(row.variableId, val)}
                          isInvalid={invalid}
                          validationBehavior="aria"
                          className="w-40"
                          variant="secondary"
                        >
                          <Label className="sr-only">Nilai</Label>
                          <Input
                            step="any"
                            placeholder={row.value == null ? 'Masukkan Nilai' : ''}
                            className="text-sm"
                          />
                          <FieldError>{invalid ? 'Masukkan angka yang valid' : ''}</FieldError>
                        </TextField>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        {row.value == null ? '-' : row.value}
                      </span>
                    )}
                  </Table.Cell>
                  {onDeleteAnnual && (
                    <Table.Cell>
                      {row.value != null && (
                        <Button
                          isIconOnly
                          variant="tertiary"
                          size="sm"
                          aria-label={`Hapus nilai tahunan ${row.name}`}
                          isDisabled={deletingId != null}
                          isPending={deletingId === row.variableId}
                          onPress={() => onDeleteAnnual(row)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      )}
                    </Table.Cell>
                  )}
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
};
