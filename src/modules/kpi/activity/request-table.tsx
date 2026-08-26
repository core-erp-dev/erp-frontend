'use client';

import React from 'react';
import { Table, Chip, Button } from '@heroui/react';
import { Eye } from '@phosphor-icons/react';
import { KpiTable } from '@/modules/kpi/shared/kpi-table';
import {
  REQUEST_TYPE_LABEL,
  REQUEST_STATUS_LABEL,
  type KpiActivityChangeRequestResponse,
  type KpiActivityRequestType,
  type KpiActivityRequestStatus,
} from './activity-v1.types';

/* ── Chip color maps ── */

const REQUEST_TYPE_CHIP_COLOR: Record<KpiActivityRequestType, 'accent' | 'default' | 'warning'> = {
  CREATE: 'accent',
  UPDATE: 'default',
  CANCEL: 'warning',
};

const REQUEST_STATUS_CHIP_COLOR: Record<KpiActivityRequestStatus, 'success' | 'danger' | 'warning'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

/* ── Props ── */

interface RequestTableProps {
  items: KpiActivityChangeRequestResponse[];
  isLoading: boolean;
  error: string | null;
  onViewDetail: (id: string) => void;
  onRetry?: () => void;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/* ── Helpers ── */

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/* ── Component ── */

export function RequestTable({ items, isLoading, error, onViewDetail, onRetry, totalItems, currentPage, totalPages, onPageChange }: RequestTableProps) {
  return (
    <KpiTable
      ariaLabel="Data Pengajuan Aktivitas"
      contentAriaLabel="Pengajuan Aktivitas"
      minWidth="min-w-[900px]"
      header={<>
        <Table.Column isRowHeader id="requestType">Jenis Pengajuan</Table.Column>
        <Table.Column id="activityName">Nama Aktivitas</Table.Column>
        <Table.Column id="status">Status</Table.Column>
        <Table.Column id="created">Dibuat</Table.Column>
        <Table.Column id="reviewed">Ditinjau</Table.Column>
        <Table.Column id="rejectionReason">Alasan Penolakan</Table.Column>
        <Table.Column id="actions" aria-label="Aksi">{''}</Table.Column>
      </>}
      isLoading={isLoading}
      error={error}
      emptyLabel="Belum ada pengajuan aktivitas."
      onRetry={onRetry}
      totalItems={totalItems}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
    >
      {items.map((item) => (
              <Table.Row key={item.id} id={String(item.id)}>
                <Table.Cell>
                  <Chip size="sm" color={REQUEST_TYPE_CHIP_COLOR[item.requestType]} variant="soft">
                    {REQUEST_TYPE_LABEL[item.requestType]}
                  </Chip>
                </Table.Cell>
                <Table.Cell className="text-muted-foreground">
                  {item.activityName || '-'}
                </Table.Cell>
                <Table.Cell className="text-muted-foreground">
                  <Chip size="sm" color={REQUEST_STATUS_CHIP_COLOR[item.status]} variant="soft">
                    {REQUEST_STATUS_LABEL[item.status]}
                  </Chip>
                </Table.Cell>
                <Table.Cell className="text-muted-foreground">
                  {formatDate(item.createdAt)}
                </Table.Cell>
                <Table.Cell className="text-muted-foreground">
                  {formatDate(item.reviewedAt)}
                </Table.Cell>
                <Table.Cell className="text-muted-foreground">
                  {item.rejectionReason || '-'}
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      isIconOnly
                      variant="tertiary"
                      size="sm"
                      aria-label="Lihat detail pengajuan"
                      onPress={() => onViewDetail(item.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
      ))}
    </KpiTable>
  );
}
