'use client';

import React from 'react';
import { Table, Button, Badge } from '@heroui/react';
import { Tray, PencilSimple } from '@phosphor-icons/react';
import { KpiTaskResponse, KPI_TASK_STATUS_LABELS } from '../types';
import { formatTaskPeriod } from '../utils';

interface OwnTaskTableProps {
  tasks: KpiTaskResponse[];
  isLoading: boolean;
  canReport: boolean;
  onReport: (task: KpiTaskResponse) => void;
}

function formatPercent(value: number): string {
  if (value == null) return '-';
  return `${value.toFixed(2)}%`;
}

function formatNumber(value: number): string {
  if (value == null) return '-';
  return value.toLocaleString('id-ID');
}

export const OwnTaskTable: React.FC<OwnTaskTableProps> = ({ tasks, isLoading, canReport, onReport }) => {
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-3xl bg-surface-secondary p-12">
        <Tray className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Belum ada tugas yang ditugaskan.</p>
      </div>
    );
  }

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Tugas Saya" className="min-w-[800px]">
          <Table.Header>
            <Table.Column id="code" isRowHeader className="w-[90px]">Kode</Table.Column>
            <Table.Column id="task" className="w-[180px]">Nama Tugas</Table.Column>
            <Table.Column id="corporate" className="w-[120px]">KPI Korporat</Table.Column>
            <Table.Column id="period" className="w-[110px]">Periode</Table.Column>
            <Table.Column id="target" className="w-[80px] text-right">Target</Table.Column>
            <Table.Column id="realization" className="w-[90px] text-right">Realisasi Total</Table.Column>
            <Table.Column id="achievement" className="w-[70px] text-right">Capaian</Table.Column>
            <Table.Column id="status" className="w-[90px]">Status</Table.Column>
            <Table.Column id="actions" aria-label="Aksi" className="w-[50px] text-center">{''}</Table.Column>
          </Table.Header>
          <Table.Body>
            {tasks.map((t) => (
              <Table.Row key={t.id}>
                <Table.Cell><span className="font-medium text-foreground">{t.taskCode}</span></Table.Cell>
                <Table.Cell><span className="text-sm">{t.taskName}</span></Table.Cell>
                <Table.Cell><span className="text-xs text-muted-foreground">{t.corporateKpiName || '-'}</span></Table.Cell>
                <Table.Cell><span className="text-sm">{formatTaskPeriod(t.periodMonth, t.periodYear)}</span></Table.Cell>
                <Table.Cell className="text-right">{formatNumber(t.target)}</Table.Cell>
                <Table.Cell className="text-right">{formatNumber(t.totalRealization)}</Table.Cell>
                <Table.Cell className="text-right">{formatPercent(t.achievementPercentage)}</Table.Cell>
                <Table.Cell>
                  <Badge
                    variant={t.status === 'ACTIVE' ? 'primary' : t.status === 'COMPLETED' ? 'secondary' : 'soft'}
                    size="sm"
                  >
                    {KPI_TASK_STATUS_LABELS[t.status] ?? t.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  {t.status === 'ACTIVE' && canReport && (
                    <Button variant="ghost" size="sm" onPress={() => onReport(t)}>
                      <PencilSimple className="h-3.5 w-3.5 mr-1" />Lapor
                    </Button>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
};
