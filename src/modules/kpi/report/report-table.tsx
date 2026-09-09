'use client';

import React from 'react';
import Link from 'next/link';
import { Table, Chip, Button } from '@heroui/react';
import { Eye, ArrowsClockwise } from '@phosphor-icons/react';
import { KpiTable } from '@/modules/kpi/shared/kpi-table';
import {
  REPORT_STATUS_LABEL,
  REPORT_STATUS_CHIP_COLOR,
  type KpiReportResponse,
} from './report-v1.types';

export type TableMode = 'MY' | 'TO_REVIEW' | 'ALL';

interface ReportTableProps {
  items: KpiReportResponse[];
  isLoading: boolean;
  error: string | null;
  mode: TableMode;
  getDetailHref?: (item: KpiReportResponse) => string;
  onViewDetail?: (item: KpiReportResponse) => void;
  /** T18 — administrative reviewer reassignment; only used in `ALL` mode. */
  onReassignReviewer?: (report: KpiReportResponse) => void;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function ReportTable({
  items, isLoading, error, mode, getDetailHref = (item) => `/kpi/reports/${item.id}?from=${mode === 'MY' ? 'mine' : mode === 'ALL' ? 'all' : 'review'}`, onViewDetail, onReassignReviewer, totalItems, currentPage, totalPages, onPageChange,
}: ReportTableProps) {
  const showReviewer = mode === 'MY' || mode === 'ALL';
  const showSubmitter = mode === 'TO_REVIEW' || mode === 'ALL';

  return (
    <KpiTable
      ariaLabel="Data Laporan KPI"
      contentAriaLabel="Laporan KPI"
      minWidth="min-w-[750px]"
      header={<>
        <Table.Column isRowHeader id="activityName">Aktivitas</Table.Column>
        <Table.Column id="reportDate">Tanggal Laporan</Table.Column>
        <Table.Column id="realizedValue">Nilai Realisasi</Table.Column>
        {showSubmitter && <Table.Column id="submittedBy">Diajukan Oleh</Table.Column>}
        {showReviewer && <Table.Column id="reviewer">Peninjau</Table.Column>}
        <Table.Column id="status">Status</Table.Column>
        <Table.Column id="createdAt">Diajukan</Table.Column>
        <Table.Column id="actions" aria-label="Aksi">{''}</Table.Column>
      </>}
      isLoading={isLoading}
      error={error}
      emptyLabel={mode === 'MY' ? 'Belum ada laporan yang diajukan.' : mode === 'ALL' ? 'Belum ada laporan.' : 'Tidak ada laporan untuk ditinjau.'}
      totalItems={totalItems}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
    >
      {items.map((item) => (
              <Table.Row key={item.id} id={item.id}>
                <Table.Cell><Link href={getDetailHref(item)} className="font-medium text-foreground hover:underline">{item.activityName}</Link></Table.Cell>
                <Table.Cell>{item.reportDate}</Table.Cell>
                <Table.Cell>{item.realizedValue} {item.unit}</Table.Cell>
                {showSubmitter && (
                  <Table.Cell>{item.submittedByUserName}</Table.Cell>
                )}
                {showReviewer && (
                  <Table.Cell>{item.reviewerUserName ?? 'Antrean perusahaan'}</Table.Cell>
                )}
                <Table.Cell>
                  <Chip size="sm" color={REPORT_STATUS_CHIP_COLOR[item.status]} variant="soft">
                    {REPORT_STATUS_LABEL[item.status]}
                  </Chip>
                </Table.Cell>
                <Table.Cell className="text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString('id-ID', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center justify-end gap-1">
                    <Button isIconOnly variant="tertiary" size="sm" aria-label="Lihat detail laporan" onPress={() => onViewDetail?.(item)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {/* T18 reassignment applies to hierarchy-assigned reports only —
                        top-level root reports live in the permission-based company
                        queue and must not be silently pulled out of it. */}
                    {mode === 'ALL' && onReassignReviewer && item.status === 'PENDING' && item.reviewerUserId && (
                      <Button isIconOnly variant="tertiary" size="sm" aria-label="Alihkan peninjau" onPress={() => onReassignReviewer(item)}>
                        <ArrowsClockwise className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Table.Cell>
              </Table.Row>
      ))}
    </KpiTable>
  );
}
