'use client';

import React from 'react';
import { Chip, Button, Dropdown, Table } from '@heroui/react';
import { DotsThreeVertical, Eye, PencilLine, PencilSimple, Plus, Prohibit } from '@phosphor-icons/react';
import { KpiTable } from '@/modules/kpi/shared/kpi-table';
import {
  ACTIVITY_STATUS_LABEL,
  type KpiActivityResponse,
  type KpiActivityStatus,
} from './activity-v1.types';

interface ActivityTableProps {
  items: KpiActivityResponse[];
  isLoading: boolean;
  error: string | null;
  onViewDetail: (id: string) => void;
  onRetry?: () => void;
  emptyLabel?: React.ReactNode;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  ownAssignmentUserPositionId?: string | null;
  onAddChild?: (item: KpiActivityResponse) => void;
  onRequestChange?: (item: KpiActivityResponse, mode: 'update' | 'cancel') => void;
  canAdminEdit?: boolean;
  onAdminEdit?: (item: KpiActivityResponse) => void;
}

const ACTIVITY_STATUS_CHIP_COLOR: Record<KpiActivityStatus, 'default' | 'success'> = {
  ACTIVE: 'success',
  CANCELLED: 'default',
};

function isOwned(item: KpiActivityResponse, ownAssignmentUserPositionId: string | null | undefined): boolean {
  return Boolean(ownAssignmentUserPositionId)
    && item.assignedToUserPositionId === ownAssignmentUserPositionId;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(value);
}

function formatPeriod(year: number, month: number): string {
  return new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

/** Activity table using the shared Pegawai-style table shell and row actions. */
export function ActivityTable({
  items, isLoading, error, onViewDetail, onRetry, emptyLabel = 'Tidak ada aktivitas.',
  totalItems, currentPage, totalPages, onPageChange,
  ownAssignmentUserPositionId, onAddChild, onRequestChange, canAdminEdit, onAdminEdit,
}: ActivityTableProps) {
  return (
    <KpiTable
      ariaLabel="Data Aktivitas"
      contentAriaLabel="Aktivitas"
      minWidth="min-w-[900px]"
      header={(
        <>
          <Table.Column isRowHeader id="activityName">Aktivitas</Table.Column>
          <Table.Column id="corporateKpi">KPI Perusahaan</Table.Column>
          <Table.Column id="assignee">Penanggung Jawab</Table.Column>
          <Table.Column id="period">Periode</Table.Column>
          <Table.Column id="targetRealized">Target &amp; Realisasi</Table.Column>
          <Table.Column id="status">Status</Table.Column>
          <Table.Column id="actions" aria-label="Aksi">{''}</Table.Column>
        </>
      )}
      isLoading={isLoading}
      error={error}
      emptyLabel={emptyLabel}
      onRetry={onRetry}
      totalItems={totalItems}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
    >
      {items.map((item) => {
        const owned = isOwned(item, ownAssignmentUserPositionId);
        const canChange = owned && item.status === 'ACTIVE' && Boolean(onRequestChange);
        const canManage = Boolean(canAdminEdit && onAdminEdit && item.version != null);

        return (
          <Table.Row key={item.id} id={item.id}>
            <Table.Cell className="font-medium text-foreground">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span>{item.activityName}</span>
                {item.parentActivityName && (
                  <span className="text-xs font-normal text-muted-foreground">{item.parentActivityName}</span>
                )}
              </div>
            </Table.Cell>
            <Table.Cell>
              <span className="text-foreground">{item.corporateKpiCode} · {item.corporateKpiName}</span>
            </Table.Cell>
            <Table.Cell>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-foreground">{item.assignedToUserName}</span>
                <span className="text-xs text-muted-foreground">{item.assignedToPositionName}</span>
              </div>
            </Table.Cell>
            <Table.Cell className="text-muted-foreground">
              {formatPeriod(item.periodYear, item.periodMonth)}
            </Table.Cell>
            <Table.Cell className="text-muted-foreground">
              {formatNumber(item.realizedValue)} / {formatNumber(item.targetValue)} {item.unit}
            </Table.Cell>
            <Table.Cell>
              <Chip size="sm" color={ACTIVITY_STATUS_CHIP_COLOR[item.status]} variant="soft">
                {ACTIVITY_STATUS_LABEL[item.status]}
              </Chip>
            </Table.Cell>
            <Table.Cell>
              <div className="flex items-center justify-end">
                <Dropdown>
                  <Button isIconOnly variant="tertiary" size="sm" aria-label={`Aksi lainnya untuk ${item.activityName}`}>
                    <DotsThreeVertical className="h-4 w-4" />
                  </Button>
                  <Dropdown.Popover placement="top">
                    <Dropdown.Menu onAction={(key) => {
                      if (key === 'view') onViewDetail(item.id);
                      if (key === 'add-child') onAddChild?.(item);
                      if (key === 'update') onRequestChange?.(item, 'update');
                      if (key === 'cancel') onRequestChange?.(item, 'cancel');
                      if (key === 'manage') onAdminEdit?.(item);
                    }}>
                      <Dropdown.Item id="view" textValue="Lihat detail">
                        <div className="flex items-center gap-2"><Eye className="h-4 w-4 text-muted-foreground" /><span>Lihat detail</span></div>
                      </Dropdown.Item>
                      {canChange && onAddChild && (
                        <Dropdown.Item id="add-child" textValue="Tambah aktivitas turunan">
                          <div className="flex items-center gap-2"><Plus className="h-4 w-4 text-muted-foreground" /><span>Tambah aktivitas turunan</span></div>
                        </Dropdown.Item>
                      )}
                      {canChange && onRequestChange && (
                        <>
                          <Dropdown.Item id="update" textValue="Ajukan perubahan">
                            <div className="flex items-center gap-2"><PencilLine className="h-4 w-4 text-muted-foreground" /><span>Ajukan perubahan</span></div>
                          </Dropdown.Item>
                          <Dropdown.Item id="cancel" textValue="Ajukan pembatalan" variant="danger">
                            <div className="flex items-center gap-2 text-danger"><Prohibit className="h-4 w-4" /><span>Ajukan pembatalan</span></div>
                          </Dropdown.Item>
                        </>
                      )}
                      {canManage && (
                        <Dropdown.Item id="manage" textValue="Kelola aktivitas">
                          <div className="flex items-center gap-2"><PencilSimple className="h-4 w-4 text-muted-foreground" /><span>Kelola aktivitas</span></div>
                        </Dropdown.Item>
                      )}
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown>
              </div>
            </Table.Cell>
          </Table.Row>
        );
      })}
    </KpiTable>
  );
}
