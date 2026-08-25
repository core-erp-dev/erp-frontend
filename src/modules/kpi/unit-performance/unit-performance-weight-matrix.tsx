'use client';

import React, { useMemo } from 'react';
import { Button, Chip, FieldError, Input, Label, Spinner, Table, TextField } from '@heroui/react';
import { Tray } from '@phosphor-icons/react';
import type {
  UnitPerformanceWeightEntry,
  UnitPerformanceWeightMatrix as UnitPerformanceWeightMatrixData,
} from './unit-performance.types';

export type UnitPerformanceMatrixDraft = Record<string, Record<string, string>>;

interface UnitPerformanceWeightMatrixProps {
  matrix: UnitPerformanceWeightMatrixData;
  draft: UnitPerformanceMatrixDraft;
  canEdit: boolean;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onDraftChange: (indicatorId: string, unitId: string, value: string) => void;
}

const WEIGHT_PATTERN = /^\d{1,3}(\.\d{1,2})?$/;

export function toWeightCents(value: string): number | null {
  const trimmed = value.trim();
  if (!WEIGHT_PATTERN.test(trimmed)) return null;
  const cents = Math.round(Number(trimmed) * 100);
  return cents >= 0 && cents <= 10000 ? cents : null;
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2).replace(/\.00$/, '');
}

export function createMatrixDraft(matrix: UnitPerformanceWeightMatrixData): UnitPerformanceMatrixDraft {
  const draft: UnitPerformanceMatrixDraft = {};
  for (const weight of matrix.weights) {
    draft[weight.indicatorId] = {
      ...(draft[weight.indicatorId] ?? {}),
      [weight.unitPerformanceId]: String(weight.weight),
    };
  }
  return draft;
}

function serverCellValue(matrix: UnitPerformanceWeightMatrixData, indicatorId: string, unitId: string): string {
  const weight = matrix.weights.find((entry) => entry.indicatorId === indicatorId && entry.unitPerformanceId === unitId);
  return weight == null ? '' : String(weight.weight);
}

function cellValue(matrix: UnitPerformanceWeightMatrixData, draft: UnitPerformanceMatrixDraft, indicatorId: string, unitId: string): string {
  return draft[indicatorId]?.[unitId] ?? serverCellValue(matrix, indicatorId, unitId);
}

export function getMatrixValidation(matrix: UnitPerformanceWeightMatrixData, draft: UnitPerformanceMatrixDraft) {
  const perIndicator = new Map<string, { totalCents: number }>();
  for (const indicator of matrix.indicators) {
    let totalCents = 0;
    for (const unit of matrix.units) {
      const cents = toWeightCents(cellValue(matrix, draft, indicator.id, unit.id));
      if (cents == null) continue;
      totalCents += cents;
    }
    perIndicator.set(indicator.id, { totalCents });
  }
  const allValid = matrix.indicators.length > 0
    && matrix.units.length > 0
    && matrix.indicators.every((indicator) => {
      const result = perIndicator.get(indicator.id);
      return result?.totalCents === 10000;
    });
  return { perIndicator, allValid };
}

export function matrixDraftToEntries(matrix: UnitPerformanceWeightMatrixData, draft: UnitPerformanceMatrixDraft): UnitPerformanceWeightEntry[] {
  const entries: UnitPerformanceWeightEntry[] = [];
  for (const indicator of matrix.indicators) {
    for (const unit of matrix.units) {
      const cents = toWeightCents(cellValue(matrix, draft, indicator.id, unit.id));
      if (cents == null) continue;
      entries.push({
        indicatorId: indicator.id,
        unitPerformanceId: unit.id,
        weight: Number((cents / 100).toFixed(2)),
      });
    }
  }
  return entries;
}

export const UnitPerformanceWeightMatrix: React.FC<UnitPerformanceWeightMatrixProps> = ({
  matrix,
  draft,
  canEdit,
  isLoading,
  error,
  onRetry,
  onDraftChange,
}) => {
  const { perIndicator } = useMemo(() => getMatrixValidation(matrix, draft), [draft, matrix]);

  const renderEmptyState = () => {
    if (isLoading) {
      return <div className="flex h-24 items-center justify-center"><Spinner size="md" /></div>;
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
          <span className="text-sm text-danger">{error}</span>
          <Button variant="secondary" size="sm" onPress={onRetry}>Coba Lagi</Button>
        </div>
      );
    }
    const emptyLabel = matrix.units.length === 0
      ? 'Belum ada unit peserta. Gunakan Kelola Unit untuk memilih unit.'
      : matrix.indicators.length === 0
        ? 'Belum ada indikator KPI Perusahaan untuk tahun ini.'
        : 'Belum ada konfigurasi bobot pada periode yang dipilih.';
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <Tray className="h-8 w-8" />
        <span className="text-sm">{emptyLabel}</span>
      </div>
    );
  };

  return (
    <Table key={`unit-performance-matrix-${matrix.year}-${canEdit ? 'edit' : 'view'}`}>
      <Table.ScrollContainer>
        <Table.Content aria-label="Matriks Konfigurasi Performa Unit" className="min-w-[720px]">
          <Table.Header>
            <Table.Column id="code" isRowHeader>Kode</Table.Column>
            <Table.Column id="indicator">Indikator</Table.Column>
            {matrix.units.map((unit) => (
              <Table.Column key={unit.id} id={unit.id}>
                <span className="block truncate" title={unit.unitName}>{unit.unitCode}</span>
              </Table.Column>
            ))}
            <Table.Column id="total">Total</Table.Column>
          </Table.Header>
          <Table.Body renderEmptyState={renderEmptyState}>
            {(!isLoading && !error ? matrix.indicators : []).map((indicator) => {
              const result = perIndicator.get(indicator.id);
              const totalCents = result?.totalCents ?? 0;
              const complete = totalCents === 10000;
              return (
                <Table.Row key={indicator.id}>
                  <Table.Cell className="whitespace-nowrap font-medium text-foreground">{indicator.code}</Table.Cell>
                  <Table.Cell className="whitespace-nowrap text-foreground">{indicator.name}</Table.Cell>
                  {matrix.units.map((unit) => {
                    const value = cellValue(matrix, draft, indicator.id, unit.id);
                    const invalid = value.trim() !== '' && toWeightCents(value) == null;
                    return (
                      <Table.Cell key={unit.id}>
                        {canEdit ? (
                          <TextField
                            aria-label={`${indicator.code} ${indicator.name} - ${unit.unitName} Bobot`}
                            type="number"
                            value={value}
                            onChange={(next) => onDraftChange(indicator.id, unit.id, next)}
                            isInvalid={invalid}
                            validationBehavior="aria"
                            variant="secondary"
                            className="w-32"
                          >
                            <Label className="sr-only">Bobot</Label>
                            <Input step="0.01" min="0" max="100" placeholder="0" inputMode="decimal" />
                            <FieldError>{invalid ? 'Masukkan bobot 0 sampai 100' : ''}</FieldError>
                          </TextField>
                        ) : (
                          <span className="text-foreground">{value === '' ? '-' : `${value}%`}</span>
                        )}
                      </Table.Cell>
                    );
                  })}
                  <Table.Cell>
                    <Chip size="sm" variant="soft" color={complete ? 'success' : 'danger'} className="font-medium">
                      {formatCents(totalCents)}%
                    </Chip>
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
