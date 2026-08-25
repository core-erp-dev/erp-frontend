'use client';

import React from 'react';
import { Button, Chip, Spinner, Table } from '@heroui/react';
import { Buildings, Tray } from '@phosphor-icons/react';
import type { UnitPerformanceRow } from './unit-performance.types';

interface UnitPerformanceResultsTableProps {
  rows: UnitPerformanceRow[];
  isLoading: boolean;
  error: string | null;
  isTransitioning: boolean;
  searchQuery: string;
  onRetry: () => void;
}

function formatNumber(value: number | null): string {
  return value == null ? '—' : new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(value);
}

function formatPercent(value: number | null): string {
  return value == null ? '—' : `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value)}%`;
}

function statusLabel(status: UnitPerformanceRow['status']): string {
  if (status === 'OK') return 'Siap';
  if (status === 'MATRIX_INCOMPLETE') return 'Bobot belum lengkap';
  if (status === 'NO_KPI_DATA') return 'Belum ada data KPI';
  return '—';
}

export const UnitPerformanceResultsTable: React.FC<UnitPerformanceResultsTableProps> = ({
  rows,
  isLoading,
  error,
  isTransitioning,
  searchQuery,
  onRetry,
}) => (
  <Table>
    <Table.ScrollContainer>
      <Table.Content aria-label="Hasil Performa Unit" className="min-w-[920px]">
        <Table.Header>
          <Table.Column id="unit" isRowHeader>Unit</Table.Column>
          <Table.Column id="weight">Bobot</Table.Column>
          <Table.Column id="score">Nilai</Table.Column>
          <Table.Column id="result">Hasil</Table.Column>
          <Table.Column id="target-score">Target Nilai Renbis</Table.Column>
          <Table.Column id="status">Status</Table.Column>
        </Table.Header>
        <Table.Body
          renderEmptyState={() => {
            if (isLoading || isTransitioning) return <div className="flex h-24 items-center justify-center"><Spinner size="md" /></div>;
            if (error) return <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground"><span className="text-sm text-danger">{error}</span><Button variant="secondary" size="sm" onPress={onRetry}>Coba Lagi</Button></div>;
            return <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground"><Tray className="h-8 w-8" /><span className="text-sm">{searchQuery.trim() ? `Tidak ada Performa Unit yang cocok dengan "${searchQuery.trim()}".` : 'Belum ada hasil Performa Unit untuk periode yang dipilih.'}</span></div>;
          }}
        >
          {!isLoading && !isTransitioning && !error && rows.map((row) => (
            <Table.Row key={row.id}>
              <Table.Cell><div className="flex items-center gap-3"><Buildings className="h-5 w-5 text-muted-foreground" /><div><div className="font-medium text-foreground">{row.unitName}</div><div className="text-xs text-muted-foreground">{row.unitCode}</div></div></div></Table.Cell>
              <Table.Cell className="text-muted-foreground">{row.weight == null ? '—' : formatPercent(row.weight)}</Table.Cell>
              <Table.Cell className="font-medium text-foreground">{formatPercent(row.performance)}</Table.Cell>
              <Table.Cell className="text-muted-foreground">{formatNumber(row.realization)}</Table.Cell>
              <Table.Cell className="text-muted-foreground">—</Table.Cell>
              <Table.Cell><Chip size="sm" variant="soft" color={row.status === 'OK' ? 'success' : row.status ? 'warning' : 'default'}>{statusLabel(row.status)}</Chip></Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Content>
    </Table.ScrollContainer>
  </Table>
);
