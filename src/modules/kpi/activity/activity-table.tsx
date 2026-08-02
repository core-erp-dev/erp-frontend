'use client';

import React from 'react';
import { Table, Chip, ProgressBar, Button, Spinner } from '@heroui/react';
import { Eye, PencilLine, Plus, Prohibit, Tray, Wrench } from '@phosphor-icons/react';
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
  items, isLoading, error, onViewDetail, showAssignee, onRetry,
  ownAssignmentUserPositionId, onAddChild, onRequestChange, canAdminEdit, onAdminEdit,
}: ActivityTableProps) {
  return (
    <Table key="kpi-activity-table" aria-label="KPI Activities">
      <Table.ScrollContainer>
        <Table.Content aria-label="Activities" className="min-w-[800px]">
          <Table.Header>
            <Table.Column isRowHeader id="activityName">Activity Name</Table.Column>
            <Table.Column id="parentActivity">Parent Activity</Table.Column>
            <Table.Column id="corporateKpi">Corporate KPI</Table.Column>
            {showAssignee && <Table.Column id="assignee">Assignee</Table.Column>}
            <Table.Column id="period">Period</Table.Column>
            <Table.Column id="target">Target</Table.Column>
            <Table.Column id="realized">Realized</Table.Column>
            <Table.Column id="progress">Progress</Table.Column>
            <Table.Column id="status">Status</Table.Column>
            <Table.Column id="actions" aria-label="Actions">{''}</Table.Column>
          </Table.Header>
          <Table.Body
            renderEmptyState={() => {
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
                    {onRetry && (
                      <Button variant="secondary" size="sm" onPress={onRetry}>
                        Retry
                      </Button>
                    )}
                  </div>
                );
              }
              return (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                  <Tray className="h-8 w-8" />
                  <span className="text-sm">No activities found.</span>
                </div>
              );
            }}
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
                        aria-label={`View detail for ${item.activityName}`}
                        onPress={() => onViewDetail(item.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canChange && onAddChild && (
                        <Button
                          isIconOnly
                          variant="tertiary"
                          size="sm"
                          aria-label={`Add child to ${item.activityName}`}
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
                          aria-label={`Request update for ${item.activityName}`}
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
                          aria-label={`Request cancellation for ${item.activityName}`}
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
                          aria-label={`Admin edit ${item.activityName}`}
                          onPress={() => onAdminEdit(item)}
                        >
                          <Wrench className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
