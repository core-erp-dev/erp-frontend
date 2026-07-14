'use client';

import React from 'react';
import { Table, Button, Badge, Dropdown } from '@heroui/react';
import { DotsThreeVertical, PencilSimple, Tray, Plus } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KpiTaskResponse, KPI_TASK_STATUS_LABELS } from '../types';
import { formatTaskPeriod } from '../utils';

interface SubordinateTaskTableProps {
  tasks: KpiTaskResponse[];
  isLoading: boolean;
  onRequestCreate: () => void;
  onRequestUpdate: (task: KpiTaskResponse) => void;
  onRequestDelete: (task: KpiTaskResponse) => void;
}

function formatPercent(value: number): string {
  if (value == null) return '-';
  return `${value.toFixed(2)}%`;
}

function formatNumber(value: number): string {
  if (value == null) return '-';
  return value.toLocaleString('id-ID');
}

export const SubordinateTaskTable: React.FC<SubordinateTaskTableProps> = ({
  tasks,
  isLoading,
  onRequestCreate,
  onRequestUpdate,
  onRequestDelete,
}) => {
  const { hasPerm } = usePermission();

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
        <p className="text-sm text-muted-foreground">Belum ada tugas bawahan.</p>
        {hasPerm(PERM.KPI_TASK_REQUEST_CREATE) && (
          <Button variant="primary" onPress={onRequestCreate} className="mt-2">
            <Plus className="h-4 w-4" />Ajukan Tugas
          </Button>
        )}
      </div>
    );
  }

  const canUpdate = hasPerm(PERM.KPI_TASK_REQUEST_UPDATE);
  const canDelete = hasPerm(PERM.KPI_TASK_REQUEST_DELETE);

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Tugas Bawahan" className="min-w-[1000px]">
          <Table.Header>
            <Table.Column id="code" isRowHeader className="w-[100px]">Kode</Table.Column>
            <Table.Column id="task" className="w-[180px]">Nama Tugas</Table.Column>
            <Table.Column id="employee" className="w-[120px]">Pegawai</Table.Column>
            <Table.Column id="position" className="w-[100px]">Jabatan</Table.Column>
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
                <Table.Cell>
                  <span className="font-medium text-foreground">{t.taskCode}</span>
                </Table.Cell>
                <Table.Cell>
                  <span className="text-sm">{t.taskName}</span>
                </Table.Cell>
                <Table.Cell>
                  <span className="text-sm">{t.assignedUserName || '-'}</span>
                </Table.Cell>
                <Table.Cell>
                  <span className="text-xs text-muted-foreground">{t.assignedPositionName || '-'}</span>
                </Table.Cell>
                <Table.Cell>
                  <span className="text-xs text-muted-foreground">{t.corporateKpiName || '-'}</span>
                </Table.Cell>
                <Table.Cell>
                  <span className="text-sm">{formatTaskPeriod(t.periodMonth, t.periodYear)}</span>
                </Table.Cell>
                <Table.Cell className="text-right">
                  {formatNumber(t.target)}
                </Table.Cell>
                <Table.Cell className="text-right">
                  {formatNumber(t.totalRealization)}
                </Table.Cell>
                <Table.Cell className="text-right">
                  {formatPercent(t.achievementPercentage)}
                </Table.Cell>
                <Table.Cell>
                  <Badge
                    variant={
                      t.status === 'ACTIVE' ? 'primary' :
                      t.status === 'COMPLETED' ? 'secondary' : 'soft'
                    }
                    size="sm"
                  >
                    {KPI_TASK_STATUS_LABELS[t.status] ?? t.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  {t.status === 'ACTIVE' && (canUpdate || canDelete) && (
                    <Dropdown>
                      <Button
                        isIconOnly
                        variant="tertiary"
                        size="sm"
                        aria-label={`Aksi ${t.taskCode}`}
                      >
                        <DotsThreeVertical className="h-4 w-4" />
                      </Button>
                      <Dropdown.Popover placement="top">
                        <Dropdown.Menu onAction={(key) => {
                          switch (key) {
                            case 'update': onRequestUpdate(t); break;
                            case 'delete': onRequestDelete(t); break;
                          }
                        }}>
                          {canUpdate && (
                            <Dropdown.Item id="update" textValue="Ajukan Perubahan">
                              <span className="flex items-center gap-2">
                                <PencilSimple className="h-4 w-4" />
                                Ajukan Perubahan
                              </span>
                            </Dropdown.Item>
                          )}
                          {canDelete && (
                            <Dropdown.Item id="delete" textValue="Ajukan Pembatalan">
                              <span className="flex items-center gap-2">
                                <Tray className="h-4 w-4" />
                                Ajukan Pembatalan
                              </span>
                            </Dropdown.Item>
                          )}
                        </Dropdown.Menu>
                      </Dropdown.Popover>
                    </Dropdown>
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
