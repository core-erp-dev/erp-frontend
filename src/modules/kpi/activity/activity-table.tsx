'use client';

import React from 'react';
import { Table, Chip, ProgressBar, Button, Spinner } from '@heroui/react';
import { Eye, Tray } from '@phosphor-icons/react';
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
}

/* ── Chip color map ── */

const ACTIVITY_STATUS_CHIP_COLOR: Record<KpiActivityStatus, 'default' | 'success'> = {
  ACTIVE: 'success',
  CANCELLED: 'default',
};

/**
 * Activity table — view-only. Mutation actions (create child / update / cancel)
 * are not rendered: they require an explicit acting Position that has no
 * frontend data source yet (plan §15.1).
 */
export function ActivityTable({
  items, isLoading, error, onViewDetail, showAssignee, onRetry,
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
            {items.map((item) => (
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
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
