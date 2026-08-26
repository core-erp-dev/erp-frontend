'use client';

import React from 'react';
import { Chip, ProgressBar, Button, Table } from '@heroui/react';
import { Eye, PencilLine, Plus, Prohibit, PencilSimple } from '@phosphor-icons/react';
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
  /** Show the exact assignee identity column (used by the All Activities view). */
  showAssignee?: boolean;
  onRetry?: () => void;
  emptyLabel?: React.ReactNode;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;

  /* ── Position-dependent actions (only rendered when provided) ── */
  /**
   * The selected acting Position's assignment id (`core_user_positions.id`).
   * Update/Cancel/Add-Child render only for items whose assignee is EXACTLY
   * this assignment — a same-Position coworker is never the owner.
   */
  ownAssignmentUserPositionId?: string | null;
  /** Child-create trigger for owned ACTIVE activities. */
  onAddChild?: (item: KpiActivityResponse) => void;
  /** UPDATE/CANCEL change-request trigger for owned ACTIVE activities. */
  onRequestChange?: (item: KpiActivityResponse, mode: 'update' | 'cancel') => void;
  /** T11 administrative edit trigger (`kpi_activity:manage`). */
  canAdminEdit?: boolean;
  onAdminEdit?: (item: KpiActivityResponse) => void;
}

/* ── Chip color map ── */

const ACTIVITY_STATUS_CHIP_COLOR: Record<KpiActivityStatus, 'default' | 'success'> = {
  ACTIVE: 'success',
  CANCELLED: 'default',
};

function isOwned(item: KpiActivityResponse, ownAssignmentUserPositionId: string | null | undefined): boolean {
  return Boolean(ownAssignmentUserPositionId)
    && item.assignedToUserPositionId === ownAssignmentUserPositionId;
}

/**
 * Activity table — view-only unless Position-dependent action handlers are
 * provided. Ownership is exact-assignment: `assignedToUserPositionId` must
 * equal the selected acting Position's `userPositionId` (never the Position
 * id, never a coworker's assignment).
 */
export function ActivityTable({
  items, isLoading, error, onViewDetail, showAssignee, onRetry, emptyLabel = 'Tidak ada aktivitas.',
  totalItems, currentPage, totalPages, onPageChange,
  ownAssignmentUserPositionId, onAddChild, onRequestChange, canAdminEdit, onAdminEdit,
}: ActivityTableProps) {
  return (
    <KpiTable
      ariaLabel="Data Aktivitas"
      contentAriaLabel="Aktivitas"
      minWidth="min-w-[800px]"
      header={
        <>
          <Table.Column isRowHeader id="activityName">Nama Aktivitas</Table.Column>
          <Table.Column id="parentActivity">Aktivitas Induk</Table.Column>
          <Table.Column id="corporateKpi">KPI Perusahaan</Table.Column>
          {showAssignee && <Table.Column id="assignee">Penanggung Jawab</Table.Column>}
          <Table.Column id="period">Periode</Table.Column>
          <Table.Column id="target">Target</Table.Column>
          <Table.Column id="realized">Realisasi</Table.Column>
          <Table.Column id="progress">Kemajuan</Table.Column>
          <Table.Column id="status">Status</Table.Column>
          <Table.Column id="actions" aria-label="Aksi">{''}</Table.Column>
        </>
      }
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
              const canChange = owned && item.status === 'ACTIVE' && onRequestChange;
              return (
                <Table.Row key={item.id} id={String(item.id)}>
                  <Table.Cell className="font-medium text-foreground">
                    {item.activityName}
                  </Table.Cell>
                  <Table.Cell className="text-muted-foreground">
                    {item.parentActivityName || '-'}
                  </Table.Cell>
                  <Table.Cell className="text-muted-foreground">
                    {item.corporateKpiName}
                  </Table.Cell>
                  {showAssignee && (
                    <Table.Cell className="text-muted-foreground">
                      {item.assignedToUserName}
                    </Table.Cell>
                  )}
                  <Table.Cell className="text-muted-foreground">
                    {`${item.periodYear}-${String(item.periodMonth).padStart(2, '0')}`}
                  </Table.Cell>
                  <Table.Cell className="text-muted-foreground">
                    {`${item.targetValue} ${item.unit}`}
                  </Table.Cell>
                  <Table.Cell className="text-muted-foreground">
                    {`${item.realizedValue} ${item.unit}`}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-2">
                      <ProgressBar
                        aria-label="Progress"
                        value={item.progressPercent}
                        className="w-20"
                        size="sm"
                      />
                      <span className="text-xs text-muted-foreground">
                        {Math.round(item.progressPercent)}%
                      </span>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Chip size="sm" color={ACTIVITY_STATUS_CHIP_COLOR[item.status]} variant="soft">
                      {ACTIVITY_STATUS_LABEL[item.status]}
                    </Chip>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        isIconOnly
                        variant="tertiary"
                        size="sm"
                        aria-label={`Lihat detail ${item.activityName}`}
                        onPress={() => onViewDetail(item.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canChange && onAddChild && (
                        <Button
                          isIconOnly
                          variant="tertiary"
                          size="sm"
                          aria-label={`Tambah aktivitas turunan dari ${item.activityName}`}
                          onPress={() => onAddChild(item)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                      {canChange && (
                        <Button
                          isIconOnly
                          variant="tertiary"
                          size="sm"
                          aria-label={`Ajukan perubahan ${item.activityName}`}
                          onPress={() => onRequestChange(item, 'update')}
                        >
                          <PencilLine className="h-4 w-4" />
                        </Button>
                      )}
                      {canChange && (
                        <Button
                          isIconOnly
                          variant="tertiary"
                          size="sm"
                          aria-label={`Ajukan pembatalan ${item.activityName}`}
                          onPress={() => onRequestChange(item, 'cancel')}
                        >
                          <Prohibit className="h-4 w-4" />
                        </Button>
                      )}
                      {canAdminEdit && onAdminEdit && item.version != null && (
                        <Button
                          isIconOnly
                          variant="tertiary"
                          size="sm"
                          aria-label={`Edit ${item.activityName}`}
                          onPress={() => onAdminEdit(item)}
                        >
                          <PencilSimple className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              );
        })}
    </KpiTable>
  );
}
