'use client';

import React from 'react';
import { Table, Spinner, Chip, Button } from '@heroui/react';
import { Eye, Check, X, Tray } from '@phosphor-icons/react';
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
export function ApprovalTable({ items, isLoading, error, onViewDetail, onApprove, onReject, ownRequestIds, onRetry }: ApprovalTableProps) {
  return (
    <Table key="approval-table">
      <Table.ScrollContainer>
        <Table.Content aria-label="Pending Approval Requests" className="min-w-[900px]">
          <Table.Header>
            <Table.Column isRowHeader id="requestType">Type</Table.Column>
            <Table.Column id="requester">Requester</Table.Column>
            <Table.Column id="activityName">Activity</Table.Column>
            <Table.Column id="parent">Parent</Table.Column>
            <Table.Column id="assignee">Assignee</Table.Column>
            <Table.Column id="corporateKpi">Corporate KPI</Table.Column>
            <Table.Column id="target">Target</Table.Column>
            <Table.Column id="created">Date</Table.Column>
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
                  <span className="text-sm">No pending requests in the company queue.</span>
                </div>
              );
            }}
          >
            {items.map((item) => {
              const isOwn = ownRequestIds.has(item.id);
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
                  <Table.Cell className="text-muted-foreground">{item.corporateKpiName || '-'}</Table.Cell>
                  <Table.Cell className="text-muted-foreground">
                    {item.targetValue != null ? `${item.targetValue}${item.unit ? ` ${item.unit}` : ''}` : '-'}
                  </Table.Cell>
                  <Table.Cell className="text-muted-foreground">{formatDate(item.createdAt)}</Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center justify-end gap-1">
                      <Button isIconOnly variant="tertiary" size="sm" aria-label="View detail" onPress={() => onViewDetail(item.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        isIconOnly
                        variant="primary"
                        size="sm"
                        aria-label={isOwn ? 'You cannot approve your own request' : 'Approve'}
                        isDisabled={isOwn}
                        onPress={() => onApprove(item)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        isIconOnly
                        variant="danger-soft"
                        size="sm"
                        aria-label={isOwn ? 'You cannot reject your own request' : 'Reject'}
                        isDisabled={isOwn}
                        onPress={() => onReject(item)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
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
