'use client';

import React from 'react';
import { Table, Badge, Button } from '@heroui/react';
import { Eye, Tray } from '@phosphor-icons/react';
import {
  REPORT_STATUS_LABEL,
  REPORT_STATUS_VARIANT,
  type KpiReportResponse,
} from './report.types';

type TableMode = 'MY' | 'TO_REVIEW';

interface ReportTableProps {
  items: KpiReportResponse[];
  isLoading: boolean;
  error: string | null;
  mode: TableMode;
  onViewDetail: (id: string) => void;
}

export function ReportTable({
  items, isLoading, error, mode, onViewDetail,
}: ReportTableProps) {
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
        <span className="text-sm text-muted-foreground">Loading reports...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <Tray className="h-8 w-8" />
        <span className="text-sm">
          {mode === 'MY' ? 'No reports yet.' : 'No reports to review.'}
        </span>
      </div>
    );
  }

  const showReviewer = mode === 'MY';

  return (
    <Table aria-label="KPI Reports">
      <Table.ScrollContainer>
        <Table.Content aria-label="Reports" className="min-w-[750px]">
          <Table.Header>
            <Table.Column isRowHeader id="activityName">Activity</Table.Column>
            <Table.Column id="reportDate">Report Date</Table.Column>
            <Table.Column id="realizedValue">Realized Value</Table.Column>
            {mode === 'TO_REVIEW' && <Table.Column id="submittedBy">Submitted By</Table.Column>}
            {showReviewer && <Table.Column id="reviewer">Reviewer</Table.Column>}
            <Table.Column id="status">Status</Table.Column>
            <Table.Column id="createdAt">Submitted</Table.Column>
            <Table.Column id="actions" aria-label="Detail">{''}</Table.Column>
          </Table.Header>
          <Table.Body>
            {items.map((item) => (
              <Table.Row key={item.id} id={item.id}>
                <Table.Cell className="font-medium text-foreground">{item.activityName}</Table.Cell>
                <Table.Cell>{item.reportDate}</Table.Cell>
                <Table.Cell>{item.realizedValue} {item.unit}</Table.Cell>
                {mode === 'TO_REVIEW' && (
                  <Table.Cell>{item.submittedByUserName}</Table.Cell>
                )}
                {showReviewer && (
                  <Table.Cell>{item.reviewerUserName}</Table.Cell>
                )}
                <Table.Cell>
                  <Badge variant={REPORT_STATUS_VARIANT[item.status]} size="sm">
                    {REPORT_STATUS_LABEL[item.status]}
                  </Badge>
                </Table.Cell>
                <Table.Cell className="text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center justify-end">
                    <Button isIconOnly variant="tertiary" size="sm" aria-label="View detail" onPress={() => onViewDetail(item.id)}>
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
