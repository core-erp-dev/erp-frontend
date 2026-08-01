'use client';

import React from 'react';
import { Alert, Chip, Spinner, Table } from '@heroui/react';
import type { CorporateKpiHistoryEntry } from './corporate-kpi.types';

interface Props {
  history: CorporateKpiHistoryEntry[];
  isLoading: boolean;
}

const ACTION_COLOR: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'accent'> = {
  CREATE: 'success',
  UPDATE: 'accent',
  DELETE: 'danger',
  RESTORE: 'success',
  ACTIVATE: 'success',
  CLOSE: 'warning',
  REOPEN: 'accent',
  VALUE_UPSERT: 'default',
};

function formatValue(value: unknown): string {
  if (value == null) return '—';
  try {
    return typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function HistoryView({ history, isLoading }: Props) {
  if (isLoading) {
    return <div className="flex justify-center py-8"><Spinner aria-label="Loading history" /></div>;
  }
  if (history.length === 0) {
    return <Alert status="accent">No history recorded yet.</Alert>;
  }
  return (
    <Table aria-label="Configuration history">
      <Table.Header>
        <Table.Column>Action</Table.Column>
        <Table.Column>Entity</Table.Column>
        <Table.Column>Reason</Table.Column>
        <Table.Column>Old value</Table.Column>
        <Table.Column>New value</Table.Column>
        <Table.Column>At</Table.Column>
      </Table.Header>
      <Table.Body>
        {history.map((entry) => (
          <Table.Row key={entry.id}>
            <Table.Cell>
              <Chip size="sm" variant="soft" color={ACTION_COLOR[entry.action] ?? 'default'}>
                {entry.action}
              </Chip>
            </Table.Cell>
            <Table.Cell><span className="text-sm">{entry.entityType}</span></Table.Cell>
            <Table.Cell>{entry.reason ?? '—'}</Table.Cell>
            <Table.Cell><span className="max-w-64 truncate font-mono text-xs">{formatValue(entry.oldValue)}</span></Table.Cell>
            <Table.Cell><span className="max-w-64 truncate font-mono text-xs">{formatValue(entry.newValue)}</span></Table.Cell>
            <Table.Cell><span className="text-xs">{new Date(entry.occurredAt).toLocaleString()}</span></Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
