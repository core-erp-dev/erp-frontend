'use client';

import React from 'react';
import Link from 'next/link';
import {
  PencilSimple,
  Trash,
  CaretDown,
  DotsThreeVertical,
  CheckCircle,
  XCircle,
  Eye,
} from '@phosphor-icons/react';
import {
  Table,
  Dropdown,
  Skeleton,
  Button,
  Badge,
} from '@heroui/react';
import {
  KpiTask,
  KpiTaskStatus,
  KPI_TASK_STATUS_LABELS,
  KPI_TASK_STATUS_COLORS,
  PaginatedResponse,
} from '../types';

interface TaskDataTableProps {
  tasks: KpiTask[];
  isLoading?: boolean;
  searchQuery?: string;
  pagination: PaginatedResponse<KpiTask> | null;
  onPageChange: (page: number) => void;
  onEdit: (task: KpiTask) => void;
  onDelete: (task: KpiTask) => void;
  onApprove: (task: KpiTask) => void;
}

export const TaskDataTable: React.FC<TaskDataTableProps> = ({
  tasks,
  isLoading = false,
  searchQuery = '',
  pagination,
  onPageChange,
  onEdit,
  onDelete,
  onApprove,
}) => {
  const currentPage = pagination ? pagination.page : 1;
  const totalPages = pagination ? pagination.totalPages : 1;
  const totalItems = pagination ? pagination.totalElements : 0;
  const startItem = totalItems > 0 ? (currentPage - 1) * (pagination?.size ?? 10) + 1 : 0;
  const endItem = Math.min(currentPage * (pagination?.size ?? 10), totalItems);

  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  const renderStatusBadge = (status: KpiTaskStatus) => (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${KPI_TASK_STATUS_COLORS[status]}`}
    >
      {KPI_TASK_STATUS_LABELS[status]}
    </span>
  );

  const canEdit = (status: KpiTaskStatus) =>
    ['PENDING_TARGET', 'PENDING_ADMIN_APPROVAL', 'REJECTED_BY_ADMIN', 'ACTIVE'].includes(status);

  const canDelete = (status: KpiTaskStatus) =>
    ['PENDING_TARGET', 'PENDING_ADMIN_APPROVAL', 'REJECTED_BY_ADMIN', 'ACTIVE'].includes(status);

  const canApprove = (status: KpiTaskStatus) =>
    status === 'PENDING_ADMIN_APPROVAL';

  return (
    <div className="space-y-4">
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Data Tugas KPI" className="min-w-240">
            <Table.Header>
              <Table.Column id="no" isRowHeader className="w-36">No. Aktivitas</Table.Column>
              <Table.Column id="aktivitas">Aktivitas</Table.Column>
              <Table.Column id="jabatan" className="w-40">Jabatan</Table.Column>
              <Table.Column id="induk" className="w-36">KPI Induk</Table.Column>
              <Table.Column id="target" className="w-28 text-right">Target</Table.Column>
              <Table.Column id="realisasi" className="w-28 text-right">Realisasi</Table.Column>
              <Table.Column id="capaian" className="w-28 text-right">Capaian</Table.Column>
              <Table.Column id="status" className="w-40">Status</Table.Column>
              <Table.Column id="actions" aria-label="Aksi" className="w-16 text-center">{''}</Table.Column>
            </Table.Header>
            <Table.Body
              renderEmptyState={() =>
                isLoading ? (
                  <div className="space-y-2 p-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-4 w-16 rounded" />
                        <Skeleton className="h-4 flex-1 rounded" />
                        <Skeleton className="h-4 w-24 rounded" />
                        <Skeleton className="h-4 w-20 rounded" />
                        <Skeleton className="h-4 w-16 rounded" />
                        <Skeleton className="h-4 w-16 rounded" />
                        <Skeleton className="h-4 w-16 rounded" />
                        <Skeleton className="h-4 w-20 rounded" />
                        <Skeleton className="h-4 w-8 rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-24 flex-col items-center justify-center gap-2 text-muted-foreground">
                    <span className="text-sm">
                      {searchQuery
                        ? 'Tidak ada tugas KPI yang cocok dengan pencarian.'
                        : 'Tidak ada data tugas KPI.'}
                    </span>
                  </div>
                )
              }
            >
              {tasks.map((task) => (
                <Table.Row key={task.id} id={task.id}>
                  <Table.Cell className="font-medium text-foreground">
                    {task.taskCode}
                  </Table.Cell>
                  <Table.Cell>
                    <div>
                      <Link
                        href={`/hr/kpi/tasks/${task.id}`}
                        className="font-medium text-foreground hover:text-primary hover:underline transition-colors"
                      >
                        {task.taskName}
                      </Link>
                      {task.childTaskCount > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({task.childTaskCount} sub-tugas)
                        </span>
                      )}
                    </div>
                  </Table.Cell>
                  <Table.Cell className="text-muted-foreground">
                    {task.positionName}
                  </Table.Cell>
                  <Table.Cell className="text-muted-foreground">
                    {task.corporateKpiName}
                  </Table.Cell>
                  <Table.Cell className="text-right tabular-nums">
                    {task.annualTarget?.toLocaleString('id-ID') ?? '-'}
                    <span className="ml-1 text-xs text-muted-foreground">{task.unit}</span>
                  </Table.Cell>
                  <Table.Cell className="text-right tabular-nums">
                    {task.annualRealization?.toLocaleString('id-ID', { minimumFractionDigits: 2 }) ?? '0,00'}
                  </Table.Cell>
                  <Table.Cell className="text-right tabular-nums font-medium">
                    {task.achievementPercentage?.toFixed(2) ?? '0,00'}%
                  </Table.Cell>
                  <Table.Cell>{renderStatusBadge(task.status)}</Table.Cell>
                  <Table.Cell>
                    <div className="flex justify-end">
                      <Dropdown>
                        <Button
                          isIconOnly
                          variant="tertiary"
                          size="sm"
                          aria-label={`Aksi untuk ${task.taskName}`}
                        >
                          <DotsThreeVertical className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Dropdown.Popover placement="bottom right" className="min-w-48">
                          <Dropdown.Menu
                            aria-label={`Menu aksi untuk ${task.taskName}`}
                            onAction={(key) => {
                              if (key === 'approve') onApprove(task);
                              if (key === 'edit') onEdit(task);
                              if (key === 'delete') onDelete(task);
                            }}
                          >
                            <Dropdown.Item id="detail" textValue="Lihat Detail">
                              <Link
                                href={`/hr/kpi/tasks/${task.id}`}
                                className="flex items-center gap-2"
                              >
                                <Eye className="h-4 w-4 text-muted-foreground" />
                                <span>Lihat Detail</span>
                              </Link>
                            </Dropdown.Item>
                            {canApprove(task.status) && (
                              <Dropdown.Item id="approve" textValue="Setujui">
                                <div className="flex items-center gap-2 text-success">
                                  <CheckCircle className="h-4 w-4" />
                                  <span>Setujui / Tolak</span>
                                </div>
                              </Dropdown.Item>
                            )}
                            {canEdit(task.status) && (
                              <Dropdown.Item id="edit" textValue="Edit Tugas">
                                <div className="flex items-center gap-2">
                                  <PencilSimple className="h-4 w-4 text-muted-foreground" />
                                  <span>Edit Tugas</span>
                                </div>
                              </Dropdown.Item>
                            )}
                            {canDelete(task.status) && (
                              <Dropdown.Item id="delete" textValue="Hapus" variant="danger">
                                <div className="flex items-center gap-2 text-danger">
                                  <Trash className="h-4 w-4" />
                                  <span>Hapus</span>
                                </div>
                              </Dropdown.Item>
                            )}
                          </Dropdown.Menu>
                        </Dropdown.Popover>
                      </Dropdown>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>

      {!isLoading && totalItems > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Menampilkan {startItem}-{endItem} dari {totalItems} hasil
          </span>
          <div className="flex items-center gap-1">
            <Button
              isIconOnly
              variant="tertiary"
              size="sm"
              isDisabled={currentPage === 1}
              onPress={() => onPageChange(currentPage - 1)}
              aria-label="Halaman sebelumnya"
            >
              <CaretDown className="h-4 w-4 rotate-90" />
            </Button>
            {getPageNumbers().map((p, i) =>
              p === 'ellipsis' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-sm text-muted-foreground">...</span>
              ) : (
                <Button
                  key={p}
                  isIconOnly
                  variant={p === currentPage ? 'primary' : 'tertiary'}
                  size="sm"
                  onPress={() => onPageChange(p)}
                  className={p === currentPage ? 'font-semibold' : ''}
                >
                  {p}
                </Button>
              ),
            )}
            <Button
              isIconOnly
              variant="tertiary"
              size="sm"
              isDisabled={currentPage === totalPages}
              onPress={() => onPageChange(currentPage + 1)}
              aria-label="Halaman berikutnya"
            >
              <CaretDown className="h-4 w-4 -rotate-90" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
