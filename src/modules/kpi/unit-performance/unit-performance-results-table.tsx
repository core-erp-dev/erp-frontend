'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Spinner, Table, Tooltip } from '@heroui/react';
import { Check, Copy, Eye, Tray } from '@phosphor-icons/react';
import { UNIT_PERFORMANCE_DETAIL_ORIGIN_KEY } from '@/modules/kpi/constants';
import type { UnitPerformanceRow } from './unit-performance.types';

interface UnitPerformanceResultsTableProps {
  rows: UnitPerformanceRow[];
  isLoading: boolean;
  error: string | null;
  isTransitioning: boolean;
  searchQuery: string;
  onRetry: () => void;
  getDetailHref: (rowId: string) => string;
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
  getDetailHref,
}) => {
  const router = useRouter();
  const markDetailOrigin = useCallback((rowId: string) => {
    try {
      sessionStorage.setItem(UNIT_PERFORMANCE_DETAIL_ORIGIN_KEY, rowId);
    } catch {
      // Navigation still works if storage is unavailable; detail will use fallback.
    }
  }, []);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopyCode = useCallback((rowId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(rowId);
    setTimeout(() => setCopiedId(null), 3000);
  }, []);

  return <Table>
    <Table.ScrollContainer>
      <Table.Content aria-label="Hasil Performa Unit" className="min-w-[760px]">
        <Table.Header>
          <Table.Column id="unit" isRowHeader>Unit</Table.Column>
          <Table.Column id="code">Kode</Table.Column>
          <Table.Column id="weight">Bobot</Table.Column>
          <Table.Column id="result">Hasil</Table.Column>
          <Table.Column id="actions" aria-label="Aksi" className="text-center">{''}</Table.Column>
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
              <Table.Cell className="font-medium text-foreground">
                <Link
                  href={getDetailHref(row.id)}
                  onClick={() => markDetailOrigin(row.id)}
                  className="rounded-sm text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {row.unitName}
                </Link>
              </Table.Cell>
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
              <Table.Cell className="text-muted-foreground">{formatPercent(row.performance)}</Table.Cell>
              <Table.Cell>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    isIconOnly
                    variant="tertiary"
                    size="sm"
                    aria-label={`Lihat ${row.unitName}`}
                    onPress={() => {
                      markDetailOrigin(row.id);
                      router.push(getDetailHref(row.id));
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Content>
    </Table.ScrollContainer>
  </Table>;
};
