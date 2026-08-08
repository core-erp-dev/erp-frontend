'use client';

import React from 'react';
import { Table, Chip, Button, Dropdown, Spinner } from '@heroui/react';
import { DotsThreeVertical, PencilSimple, Trash, Tray } from '@phosphor-icons/react';
import type { UnitPerformanceRow } from './unit-performance.types';

export interface UnitPerformanceTableProps {
  rows: UnitPerformanceRow[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  /* ── action callbacks (manage-gated by the page) ── */
  onEdit?: (row: UnitPerformanceRow) => void;
  onDelete?: (row: UnitPerformanceRow) => void;
}

/** Percentage-points value → "30%" label; null → "–" (NO_KPI_DATA, never 0). */
function percent(value: number | null): string {
  return value == null ? '–' : `${value}%`;
}

/** Computed realization/performance — plain number, null → "–". */
function valueOrDash(value: number | null): string | number {
  return value == null ? '–' : value;
}

export const UnitPerformanceTable: React.FC<UnitPerformanceTableProps> = ({
  rows,
  isLoading,
  error,
  onRetry,
  onEdit,
  onDelete,
}) => {
  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0);
  const totalComplete = Math.abs(totalWeight - 100) < 1e-9;
  const totalExceeds = totalWeight > 100 + 1e-9;
  const remaining = Math.round((100 - totalWeight) * 100) / 100;

  return (
    <div className="flex w-full flex-col gap-3">
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Unit Performance" className="min-w-[700px]">
            <Table.Header>
              <Table.Column id="unit-code" isRowHeader>Unit Code</Table.Column>
              <Table.Column id="unit-name">Unit Name</Table.Column>
              <Table.Column id="weight">Weight</Table.Column>
              <Table.Column id="realization">Realization</Table.Column>
              <Table.Column id="performance">Performance</Table.Column>
              {(onEdit || onDelete) && <Table.Column id="actions" className="text-center">{''}</Table.Column>}
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
                  <Button variant="secondary" size="sm" onPress={onRetry}>
                    Retry
                  </Button>
                </div>
              );
            }
            return (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                <Tray className="h-8 w-8" />
                <span className="text-sm">No units configured yet. Add a unit to distribute the corporate KPI target.</span>
              </div>
            );
          }}
        >
          {rows.map((row) => (
            <Table.Row key={row.id}>
              <Table.Cell>
                <span className="font-medium text-foreground">{row.unitCode}</span>
              </Table.Cell>
              <Table.Cell>{row.unitName}</Table.Cell>
              <Table.Cell className="text-muted-foreground">{percent(row.weight)}</Table.Cell>
              <Table.Cell className="text-muted-foreground">{valueOrDash(row.realization)}</Table.Cell>
              <Table.Cell className="text-muted-foreground">{percent(row.performance)}</Table.Cell>
              {(onEdit || onDelete) && (
                <Table.Cell className="text-center">
                  <Dropdown>
                    <Button isIconOnly variant="tertiary" size="sm" aria-label={`Actions for ${row.unitName}`}>
                      <DotsThreeVertical className="h-4 w-4" />
                    </Button>
                    <Dropdown.Popover placement="top">
                      <Dropdown.Menu onAction={(key) => {
                        if (key === 'edit') onEdit?.(row);
                        if (key === 'delete') onDelete?.(row);
                      }}>
                        {onEdit && (
                          <Dropdown.Item id="edit" textValue="Edit">
                            <div className="flex items-center gap-2">
                              <PencilSimple className="h-4 w-4 text-muted-foreground" />
                              <span>Edit</span>
                            </div>
                          </Dropdown.Item>
                        )}
                        {onDelete && (
                          <Dropdown.Item id="delete" textValue="Delete">
                            <div className="flex items-center gap-2">
                              <Trash className="h-4 w-4 text-muted-foreground" />
                              <span>Delete</span>
                            </div>
                          </Dropdown.Item>
                        )}
                      </Dropdown.Menu>
                    </Dropdown.Popover>
                  </Dropdown>
                </Table.Cell>
              )}
            </Table.Row>
          ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>

      {/* Total Weight summary — complete (100%) / incomplete (<100%) / defensive danger */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-sm font-medium text-foreground">Total Weight:</span>
        <Chip
          size="md"
          variant="soft"
          color={totalExceeds ? 'danger' : totalComplete ? 'success' : 'warning'}
        >
          {totalWeight}%
        </Chip>
        {totalComplete ? (
          <span className="text-xs text-success">complete</span>
        ) : totalExceeds ? (
          <span className="text-xs text-danger">exceeds 100%</span>
        ) : (
          <span className="text-xs text-warning">incomplete — remaining {remaining}%</span>
        )}
      </div>
    </div>
  );
};
