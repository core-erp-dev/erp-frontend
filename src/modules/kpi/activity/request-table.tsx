'use client';

import React from 'react';
import { Table, Spinner, Chip, Button } from '@heroui/react';
import { Eye, Tray } from '@phosphor-icons/react';
import {
  REQUEST_TYPE_LABEL,
  REQUEST_STATUS_LABEL,
  type KpiActivityChangeRequestResponse,
  type KpiActivityRequestType,
  type KpiActivityRequestStatus,
} from './activity.types';

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

export function RequestTable({ items, isLoading, error, onViewDetail, onRetry }: RequestTableProps) {
  return (
    <Table key="request-table">
      <Table.ScrollContainer>
        <Table.Content aria-label="Activity Requests" className="min-w-[800px]">
          <Table.Header>
            <Table.Column isRowHeader id="requestType">Request Type</Table.Column>
            <Table.Column id="activityName">Activity Name</Table.Column>
            <Table.Column id="status">Status</Table.Column>
            <Table.Column id="created">Created</Table.Column>
            <Table.Column id="reviewed">Reviewed</Table.Column>
            <Table.Column id="rejectionReason">Rejection Reason</Table.Column>
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
                  <span className="text-sm">No data available</span>
                </div>
              );
            }}
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
                <Table.Cell>
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
                      aria-label="View request detail"
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
