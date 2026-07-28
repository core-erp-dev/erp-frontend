'use client';

import React from 'react';
import { Table, Badge, Button } from '@heroui/react';
import { Eye, Tray } from '@phosphor-icons/react';
import {
  REQUEST_TYPE_LABEL,
  REQUEST_TYPE_VARIANT,
  REQUEST_STATUS_LABEL,
  REQUEST_STATUS_VARIANT,
  type KpiActivityChangeRequestResponse,
} from './activity.types';

interface RequestTableProps {
  items: KpiActivityChangeRequestResponse[];
  isLoading: boolean;
  error: string | null;
  onViewDetail: (id: string) => void;
}

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

export function RequestTable({ items, isLoading, error, onViewDetail }: RequestTableProps) {
  if (error) {
    return (
      <div className="flex items-center justify-center rounded-3xl bg-surface-secondary p-12 text-sm text-danger">
        {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading requests...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <Tray className="h-8 w-8" />
        <span className="text-sm">No requests found.</span>
      </div>
    );
  }

  return (
    <Table aria-label="Activity Requests">
      <Table.ScrollContainer>
        <Table.Content aria-label="Requests" className="min-w-[800px]">
          <Table.Header>
            <Table.Column isRowHeader id="requestType">Request Type</Table.Column>
            <Table.Column id="activityName">Activity Name</Table.Column>
            <Table.Column id="status">Status</Table.Column>
            <Table.Column id="created">Created</Table.Column>
            <Table.Column id="reviewed">Reviewed</Table.Column>
            <Table.Column id="rejectionReason">Rejection Reason</Table.Column>
            <Table.Column id="actions" aria-label="Actions">{''}</Table.Column>
          </Table.Header>
          <Table.Body>
            {items.map((item) => (
              <Table.Row key={item.id} id={String(item.id)}>
                <Table.Cell>
                  <Badge variant={REQUEST_TYPE_VARIANT[item.requestType]} size="sm">
                    {REQUEST_TYPE_LABEL[item.requestType]}
                  </Badge>
                </Table.Cell>
                <Table.Cell className="text-muted-foreground">
                  {item.activityName || '-'}
                </Table.Cell>
                <Table.Cell>
                  <Badge variant={REQUEST_STATUS_VARIANT[item.status]} size="sm">
                    {REQUEST_STATUS_LABEL[item.status]}
                  </Badge>
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
                      aria-label={`View request detail`}
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
