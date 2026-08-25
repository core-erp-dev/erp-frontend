'use client';

import React, { useCallback, useState } from 'react';
import { Button, Pagination, Spinner, Table, Tooltip } from '@heroui/react';
import { Check, Copy, Tray } from '@phosphor-icons/react';
import type { UnitPerformanceRow } from './unit-performance.types';

interface UnitPerformanceResultsTableProps {
  rows: UnitPerformanceRow[];
  isLoading: boolean;
  error: string | null;
  isTransitioning: boolean;
  searchQuery: string;
  onRetry: () => void;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function formatNumber(value: number | null): string {
  return value == null ? '-' : new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(value);
}

function formatPercent(value: number | null): string {
  return value == null ? '-' : `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value)}%`;
}

export const UnitPerformanceResultsTable: React.FC<UnitPerformanceResultsTableProps> = ({
  rows,
  isLoading,
  error,
  isTransitioning,
  searchQuery,
  onRetry,
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopyCode = useCallback((rowId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(rowId);
    setTimeout(() => setCopiedId(null), 3000);
  }, []);

  return <Table>
    <Table.ScrollContainer>
      <Table.Content aria-label="Hasil Performa Unit" className="min-w-[700px]">
        <Table.Header>
          <Table.Column id="unit" isRowHeader>Unit</Table.Column>
          <Table.Column id="code">Kode</Table.Column>
          <Table.Column id="weight">Bobot</Table.Column>
          <Table.Column id="result">Hasil</Table.Column>
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
              <Table.Cell className="font-medium text-foreground">{row.unitName}</Table.Cell>
              <Table.Cell className="font-medium text-foreground">
                <div className="flex items-center gap-1">
                  {row.unitCode || '-'}
                  {row.unitCode && (
                    <Tooltip delay={0}>
                      <Tooltip.Trigger aria-label={`Salin kode unit ${row.unitCode}`}>
                        <Button
                          isIconOnly
                          variant="ghost"
                          size="sm"
                          aria-label={`Salin kode unit ${row.unitCode}`}
                          onPress={() => handleCopyCode(row.id, row.unitCode)}
                        >
                          {copiedId === row.id ? <Check className="h-3.5 w-3.5 text-muted-foreground" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                        </Button>
                      </Tooltip.Trigger>
                      <Tooltip.Content placement="top">{copiedId === row.id ? 'Kode disalin' : 'Salin kode'}</Tooltip.Content>
                    </Tooltip>
                  )}
                </div>
              </Table.Cell>
              <Table.Cell className="text-muted-foreground">{formatPercent(row.weight)}</Table.Cell>
              <Table.Cell className="text-muted-foreground">{formatNumber(row.realization)}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Content>
    </Table.ScrollContainer>
    {!isLoading && !isTransitioning && !error && totalItems > 0 && (
      <Table.Footer>
        <Pagination size="sm">
          <Pagination.Summary>
            {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalItems)} dari {totalItems} data
          </Pagination.Summary>
          <Pagination.Content>
            <Pagination.Item>
              <Pagination.Previous isDisabled={currentPage === 1} onPress={() => onPageChange(currentPage - 1)}>
                <Pagination.PreviousIcon />
                Sebelumnya
              </Pagination.Previous>
            </Pagination.Item>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <Pagination.Item key={page}>
                <Pagination.Link isActive={page === currentPage} onPress={() => onPageChange(page)}>{page}</Pagination.Link>
              </Pagination.Item>
            ))}
            <Pagination.Item>
              <Pagination.Next isDisabled={currentPage === totalPages} onPress={() => onPageChange(currentPage + 1)}>
                Berikutnya
                <Pagination.NextIcon />
              </Pagination.Next>
            </Pagination.Item>
          </Pagination.Content>
        </Pagination>
      </Table.Footer>
    )}
  </Table>;
};
