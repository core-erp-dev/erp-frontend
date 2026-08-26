'use client';

import React from 'react';
import { Table, Chip, Button } from '@heroui/react';
import { Eye, Check, X } from '@phosphor-icons/react';
import { KpiTable } from '@/modules/kpi/shared/kpi-table';
import {
  REQUEST_TYPE_LABEL,
  type KpiActivityChangeRequestResponse,
  type KpiActivityRequestType,
} from './activity-v1.types';

/* ── Chip color maps ── */

const REQUEST_TYPE_CHIP_COLOR: Record<KpiActivityRequestType, 'accent' | 'default' | 'warning'> = {
  CREATE: 'accent',
  UPDATE: 'default',
  CANCEL: 'warning',
};

/* ── Props ── */

interface ApprovalTableProps {
  items: KpiActivityChangeRequestResponse[];
  isLoading: boolean;
  error: string | null;
  onViewDetail: (id: string) => void;
  onApprove: (request: KpiActivityChangeRequestResponse) => void;
  onReject: (request: KpiActivityChangeRequestResponse) => void;
  /**
   * Ids of requests the authenticated user created (scope=mine). These stay
   * visible in the company queue but are NOT actionable — the backend rejects
   * self-processing (CANNOT_APPROVE_OWN_REQUEST); the UI disables the buttons.
   */
  ownRequestIds: Set<string>;
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
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Centralized approval queue table — rendered ONLY on `/kpi/approvals`.
 * Every `kpi_activity:approve` holder sees the SAME company-wide PENDING
 * queue; there is no stored approver and no reassignment UI.
 */
export function ApprovalTable({ items, isLoading, error, onViewDetail, onApprove, onReject, ownRequestIds, onRetry, totalItems, currentPage, totalPages, onPageChange }: ApprovalTableProps) {
  return (
    <KpiTable
      ariaLabel="Data Persetujuan Aktivitas"
      contentAriaLabel="Persetujuan Aktivitas"
      minWidth="min-w-[900px]"
      header={<>
        <Table.Column isRowHeader id="requestType">Jenis</Table.Column>
        <Table.Column id="requester">Pengaju</Table.Column>
        <Table.Column id="activityName">Aktivitas</Table.Column>
        <Table.Column id="parent">Aktivitas Induk</Table.Column>
        <Table.Column id="assignee">Penanggung Jawab</Table.Column>
        <Table.Column id="corporateKpi">KPI Perusahaan</Table.Column>
        <Table.Column id="target">Target</Table.Column>
        <Table.Column id="created">Tanggal</Table.Column>
        <Table.Column id="actions" aria-label="Aksi">{''}</Table.Column>
      </>}
      isLoading={isLoading}
      error={error}
      emptyLabel="Tidak ada pengajuan yang menunggu persetujuan."
      onRetry={onRetry}
      totalItems={totalItems}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
    >
      {items.map((item) => {
              const isOwn = ownRequestIds.has(item.id);
              const indicators = item.corporateKpis ?? (item.corporateKpiId ? [{ id: item.corporateKpiId, code: '', name: item.corporateKpiName ?? '' }] : []);
              return (
                <Table.Row key={item.id} id={String(item.id)}>
                  <Table.Cell>
                    <Chip size="sm" color={REQUEST_TYPE_CHIP_COLOR[item.requestType]} variant="soft">
                      {REQUEST_TYPE_LABEL[item.requestType]}
                    </Chip>
                  </Table.Cell>
                  <Table.Cell className="text-muted-foreground">{item.requestedByUserName}</Table.Cell>
                  <Table.Cell className="font-medium text-foreground">{item.activityName || '-'}</Table.Cell>
                  <Table.Cell className="text-muted-foreground">{item.parentActivityName || '-'}</Table.Cell>
                  <Table.Cell className="text-muted-foreground">{item.assignedToUserName || '-'}</Table.Cell>
                  <Table.Cell className="text-muted-foreground">
                    {indicators.length > 0 ? `${indicators[0].code ? `${indicators[0].code} · ` : ''}${indicators[0].name}${indicators.length > 1 ? ` +${indicators.length - 1} lainnya` : ''}` : '-'}
                  </Table.Cell>
                  <Table.Cell className="text-muted-foreground">
                    {item.targetValue != null ? `${item.targetValue}${item.unit ? ` ${item.unit}` : ''}` : '-'}
                  </Table.Cell>
                  <Table.Cell className="text-muted-foreground">{formatDate(item.createdAt)}</Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center justify-end gap-1">
                      <Button isIconOnly variant="tertiary" size="sm" aria-label="Lihat detail pengajuan" onPress={() => onViewDetail(item.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!isOwn && <Button isIconOnly variant="primary" size="sm" aria-label="Setujui pengajuan" onPress={() => onApprove(item)}><Check className="h-4 w-4" /></Button>}
                      {!isOwn && <Button isIconOnly variant="danger-soft" size="sm" aria-label="Tolak pengajuan" onPress={() => onReject(item)}><X className="h-4 w-4" /></Button>}
                    </div>
                  </Table.Cell>
                </Table.Row>
              );
            })}
    </KpiTable>
  );
}
