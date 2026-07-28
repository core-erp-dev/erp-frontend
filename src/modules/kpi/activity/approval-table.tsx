'use client';

import React from 'react';
import { Table, Badge, Button } from '@heroui/react';
import { Eye, Check, X } from '@phosphor-icons/react';
import {
  REQUEST_TYPE_LABEL,
  REQUEST_TYPE_VARIANT,
  type KpiActivityChangeRequestResponse,
} from './activity.types';

interface ApprovalTableProps {
  items: KpiActivityChangeRequestResponse[];
  isLoading: boolean;
  error: string | null;
  onViewDetail: (id: string) => void;
  onApprove: (request: KpiActivityChangeRequestResponse) => void;
  onReject: (request: KpiActivityChangeRequestResponse) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function ApprovalTable({ items, isLoading, error, onViewDetail, onApprove, onReject }: ApprovalTableProps) {
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
        <span className="text-sm text-muted-foreground">Loading pending requests...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <Check className="h-8 w-8" />
        <span className="text-sm">No pending requests.</span>
      </div>
    );
  }

  return (
    <Table aria-label="Pending Approval Requests">
      <Table.ScrollContainer>
        <Table.Content aria-label="Pending" className="min-w-[900px]">
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
          <Table.Body>
            {items.map((item) => (
              <Table.Row key={item.id} id={String(item.id)}>
                <Table.Cell>
                  <Badge variant={REQUEST_TYPE_VARIANT[item.requestType]} size="sm">
                    {REQUEST_TYPE_LABEL[item.requestType]}
                  </Badge>
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
                    <Button isIconOnly variant="primary" size="sm" aria-label="Approve" onPress={() => onApprove(item)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button isIconOnly variant="danger-soft" size="sm" aria-label="Reject" onPress={() => onReject(item)}>
                      <X className="h-4 w-4" />
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
