'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Chip, Select, ListBox, Label, Spinner, Table } from '@heroui/react';
import { Play } from '@phosphor-icons/react';
import type { CorporateKpiResultResponse, IndicatorResultStatus } from './corporate-kpi.types';

interface Props {
  configId: string;
  isMutating: boolean;
  results: CorporateKpiResultResponse | null;
  isLoading: boolean;
  fetchResults: (window: { month?: number; fromMonth?: number; toMonth?: number }) => Promise<void>;
}

const STATUS_COLOR: Record<IndicatorResultStatus, 'success' | 'warning' | 'danger'> = {
  COMPLETE: 'success',
  INCOMPLETE: 'warning',
  CALCULATION_ERROR: 'danger',
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Results view: single month XOR from..to window; strict completeness semantics
 * (INCOMPLETE + missing months, totals suppressed, performance category).
 */
export function ResultsView({ configId, results, isLoading, fetchResults }: Props) {
  const [mode, setMode] = useState<'month' | 'range'>('month');
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [fromMonth, setFromMonth] = useState(1);
  const [toMonth, setToMonth] = useState(12);

  const run = useCallback(() => {
    const window = mode === 'month' ? { month } : { fromMonth, toMonth };
    void fetchResults(window);
  }, [mode, month, fromMonth, toMonth, fetchResults]);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configId]);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Select variant="secondary" selectedKey={mode} onSelectionChange={(k) => setMode(k as 'month' | 'range')}>
          <Label>Window</Label>
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="month" textValue="Single month">Single month</ListBox.Item>
              <ListBox.Item id="range" textValue="Month range">Month range</ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
        {mode === 'month' ? (
          <Select variant="secondary" selectedKey={String(month)} onSelectionChange={(k) => setMonth(Number(k))}>
            <Label>Month</Label>
            <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
            <Select.Popover>
              <ListBox>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <ListBox.Item key={String(m)} id={String(m)} textValue={MONTH_NAMES[m - 1]}>{m} — {MONTH_NAMES[m - 1]}</ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        ) : (
          <div className="flex items-end gap-2">
            <Select variant="secondary" selectedKey={String(fromMonth)} onSelectionChange={(k) => setFromMonth(Number(k))}>
              <Label>From</Label>
              <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <ListBox.Item key={String(m)} id={String(m)} textValue={String(m)}>{m}</ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <Select variant="secondary" selectedKey={String(toMonth)} onSelectionChange={(k) => setToMonth(Number(k))}>
              <Label>To</Label>
              <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <ListBox.Item key={String(m)} id={String(m)} textValue={String(m)}>{m}</ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
        )}
        <Button variant="primary" onPress={run} isPending={isLoading}>
          <Play className="h-4 w-4" /> Calculate
        </Button>
      </div>

      {isLoading && <div className="flex justify-center py-8"><Spinner aria-label="Calculating results" /></div>}

      {!isLoading && results && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Chip size="md" variant="soft" color={results.aggregateStatus === 'COMPLETE' ? 'success' : 'warning'}>
              {results.aggregateStatus ?? 'NO DATA'}
            </Chip>
            {results.actualTotal != null && (
              <Chip size="md" variant="soft" color="accent">Actual total: {results.actualTotal}</Chip>
            )}
            {results.targetTotal != null && (
              <Chip size="md" variant="soft" color="default">Target total: {results.targetTotal}</Chip>
            )}
            {results.overallCategory && (
              <Chip size="md" variant="soft" color="success">Category: {results.overallCategory}</Chip>
            )}
          </div>

          <Table aria-label="Indicator results">
            <Table.Header>
              <Table.Column>Code</Table.Column>
              <Table.Column>Name</Table.Column>
              <Table.Column>Status</Table.Column>
              <Table.Column>Formula result</Table.Column>
              <Table.Column>Score</Table.Column>
              <Table.Column>Weighted actual</Table.Column>
              <Table.Column>Weighted target</Table.Column>
              <Table.Column>Missing months</Table.Column>
            </Table.Header>
            <Table.Body>
              {results.indicators.map((indicator) => (
                <Table.Row key={indicator.indicatorId}>
                  <Table.Cell><span className="font-mono text-sm">{indicator.code}</span></Table.Cell>
                  <Table.Cell>{indicator.name}</Table.Cell>
                  <Table.Cell>
                    <Chip size="sm" variant="soft" color={STATUS_COLOR[indicator.status]}>
                      {indicator.status}
                    </Chip>
                  </Table.Cell>
                  <Table.Cell>{indicator.formulaResult ?? '—'}</Table.Cell>
                  <Table.Cell>{indicator.actualScore ?? '—'}</Table.Cell>
                  <Table.Cell>{indicator.weightedActual ?? '—'}</Table.Cell>
                  <Table.Cell>{indicator.weightedTarget ?? '—'}</Table.Cell>
                  <Table.Cell>
                    {indicator.missingMonths.length > 0
                      ? indicator.missingMonths.join(', ')
                      : indicator.errorMessage ?? '—'}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </>
      )}
      {!isLoading && !results && (
        <Alert status="warning">Select a window and press Calculate.</Alert>
      )}
    </div>
  );
}
