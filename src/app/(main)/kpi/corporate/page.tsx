'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Breadcrumbs, BreadcrumbsItem, Button, Chip, Input, Label, Modal, Spinner, Tabs, TextArea, TextField,
} from '@heroui/react';
import { House, Plus, Play, ArrowsClockwise, Copy, X } from '@phosphor-icons/react';
import { usePermission } from '@/hooks/use-permission';
import { PERM } from '@/constants/permissions';
import { KPI_LABELS } from '@/modules/kpi/constants';
import { useConfigurationWorkspace } from '@/modules/kpi/corporate/use-corporate-kpi-data';
import { ConfigurationEditor } from '@/modules/kpi/corporate/configuration-editor';
import { MonthlyValuesEditor } from '@/modules/kpi/corporate/monthly-values-editor';
import { ResultsView } from '@/modules/kpi/corporate/results-view';
import { HistoryView } from '@/modules/kpi/corporate/history-view';
import { DeletedNodesView } from '@/modules/kpi/corporate/deleted-nodes-view';
import type { CorporateConfigurationSummary } from '@/modules/kpi/corporate/corporate-kpi.types';

export default function KpiCorporatePage() {
  const { hasPerm } = usePermission();
  const canRead = hasPerm(PERM.CORPORATE_KPI_READ);
  const canManage = hasPerm(PERM.CORPORATE_KPI_MANAGE);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [activeTab, setActiveTab] = useState('definition');
  const [createOpen, setCreateOpen] = useState(false);
  const [createYear, setCreateYear] = useState(String(currentYear));
  const [cloneFromYear, setCloneFromYear] = useState('');
  const [reasonDialog, setReasonDialog] = useState<null | 'close' | 'reopen'>(null);
  const [reason, setReason] = useState('');

  const workspace = useConfigurationWorkspace();
  const {
    configurations, isLoadingConfigs, configsError, fetchConfigurations,
    selectedConfigId, selectConfiguration,
    definition, isLoadingDefinition, definitionError,
    isMutating, conflictMessage, clearConflict,
    saveDefinition, activate, close, reopen, deleteNode, restoreNode, saveValues,
    getValuesForMonth,
    results, isLoadingResults, fetchResults,
    history, isLoadingHistory, fetchHistory,
    deletedList, isLoadingDeleted, fetchDeleted,
  } = workspace;

  useEffect(() => {
    if (canRead) void fetchConfigurations(selectedYear);
  }, [canRead, selectedYear, fetchConfigurations]);

  // keep the selected config in sync when the year changes
  const selectedConfig = useMemo(
    () => configurations.find((c) => c.id === selectedConfigId) ?? null,
    [configurations, selectedConfigId],
  );

  const handleCreate = useCallback(async () => {
    const year = Number(createYear);
    const clone = cloneFromYear.trim() === '' ? null : Number(cloneFromYear);
    try {
      const { corporateKpiApi } = await import('@/modules/kpi/corporate/corporate-kpi-api');
      const created = await corporateKpiApi.createConfiguration({ year, cloneFromYear: clone });
      setCreateOpen(false);
      setCloneFromYear('');
      await fetchConfigurations(year);
      selectConfiguration(created.id);
      setSelectedYear(year);
    } catch {
      // error surfaced by the API wrapper's interceptor toast
    }
  }, [createYear, cloneFromYear, fetchConfigurations, selectConfiguration]);

  const confirmLifecycle = useCallback(async () => {
    if (reasonDialog === 'close') {
      const ok = await close(reason);
      if (ok) { setReasonDialog(null); setReason(''); }
    } else if (reasonDialog === 'reopen') {
      const ok = await reopen(reason);
      if (ok) { setReasonDialog(null); setReason(''); }
    }
  }, [reasonDialog, reason, close, reopen]);

  if (!canRead) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Breadcrumbs>
          <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
          <BreadcrumbsItem>KPI</BreadcrumbsItem>
          <BreadcrumbsItem>{KPI_LABELS.corporate}</BreadcrumbsItem>
        </Breadcrumbs>
        <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.corporate}</h1>
        <Alert status="danger">Access Denied</Alert>
      </div>
    );
  }

  const config = definition?.configuration ?? selectedConfig;
  const isDraft = config?.configurationStatus === 'DRAFT';
  const isOpen = config?.recordingStatus === 'OPEN';

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/"><House className="h-4 w-4" /></BreadcrumbsItem>
        <BreadcrumbsItem>KPI</BreadcrumbsItem>
        <BreadcrumbsItem>{KPI_LABELS.corporate}</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">{KPI_LABELS.corporate}</h1>
          <Chip size="md" className="pointer-events-none" aria-label={`${configurations.length} configurations for ${selectedYear}`}>
            {configurations.length}
          </Chip>
        </div>
        <div className="flex items-center gap-2">
          <Button
            isIconOnly variant="tertiary" aria-label="Refresh configurations"
            onPress={() => fetchConfigurations(selectedYear)} isDisabled={isLoadingConfigs}
          >
            <ArrowsClockwise className={`h-4 w-4 ${isLoadingConfigs ? 'animate-spin' : ''}`} />
          </Button>
          {canManage && (
            <Button variant="primary" onPress={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New Configuration
            </Button>
          )}
        </div>
      </div>

      {/* Year + configuration list */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          variant="secondary" aria-label="Year" type="number"
          value={String(selectedYear)}
          onChange={(e) => { const y = Number(e.target.value); if (Number.isInteger(y) && y > 2000 && y < 2100) setSelectedYear(y); }}
          className="w-32"
        />
        {configsError && <Alert status="danger">{configsError}</Alert>}
      </div>

      {isLoadingConfigs && configurations.length === 0 && (
        <div className="flex justify-center py-10"><Spinner aria-label="Loading configurations" /></div>
      )}

      {!isLoadingConfigs && configurations.length === 0 && (
        <Alert status="accent">
          No configuration for {selectedYear} yet. Create one to define aspects, indicators, variables, and score bands.
        </Alert>
      )}

      {configurations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {configurations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectConfiguration(c.id)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
                selectedConfigId === c.id
                  ? 'border-primary bg-primary-soft text-foreground'
                  : 'border-divider bg-content2/40 text-foreground hover:bg-content2'
              }`}
            >
              <span className="font-medium">{c.year}</span>
              <Chip size="sm" variant="soft" color={c.configurationStatus === 'ACTIVE' ? 'success' : 'default'}>
                {c.configurationStatus}
              </Chip>
              <Chip size="sm" variant="soft" color={c.recordingStatus === 'OPEN' ? 'accent' : 'warning'}>
                {c.recordingStatus}
              </Chip>
              <span className="text-xs text-muted-foreground">v{c.version}</span>
            </button>
          ))}
        </div>
      )}

      {/* Workspace */}
      {selectedConfigId && config && (
        <div className="flex w-full flex-col gap-4">
          {conflictMessage && (
            <div className="flex items-start gap-2">
              <div className="flex-1"><Alert status="warning">{conflictMessage}</Alert></div>
              <Button variant="tertiary" isIconOnly aria-label="Dismiss" onPress={clearConflict}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">Configuration {config.year}</h2>
              <Chip size="sm" variant="soft" color={isDraft ? 'default' : 'success'}>{config.configurationStatus}</Chip>
              <Chip size="sm" variant="soft" color={isOpen ? 'accent' : 'warning'}>{config.recordingStatus}</Chip>
              <Chip size="sm" variant="soft" color="accent">v{config.version}</Chip>
            </div>
            <div className="flex items-center gap-2">
              {canManage && isDraft && (
                <Button variant="primary" onPress={() => activate()} isPending={isMutating}>
                  <Play className="h-4 w-4" /> Activate
                </Button>
              )}
              {canManage && !isDraft && isOpen && (
                <Button variant="danger" onPress={() => { setReason(''); setReasonDialog('close'); }} isDisabled={isMutating}>
                  Close Year
                </Button>
              )}
              {canManage && !isDraft && !isOpen && (
                <Button variant="secondary" onPress={() => { setReason(''); setReasonDialog('reopen'); }} isDisabled={isMutating}>
                  Reopen Year
                </Button>
              )}
            </div>
          </div>

          <Tabs selectedKey={activeTab} onSelectionChange={(k) => setActiveTab(String(k))}>
            <Tabs.List>
              <Tabs.Tab id="definition">Definition</Tabs.Tab>
              <Tabs.Tab id="values">Monthly Values</Tabs.Tab>
              <Tabs.Tab id="results">Results</Tabs.Tab>
              <Tabs.Tab id="history">History</Tabs.Tab>
              <Tabs.Tab id="deleted">Recycle Bin</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel id="definition" className="pt-4">
              {definition ? (
                <ConfigurationEditor
                  definition={definition}
                  isLoading={isLoadingDefinition}
                  error={definitionError}
                  isMutating={isMutating}
                  isReadOnly={!canManage}
                  onSave={saveDefinition}
                />
              ) : (
                <div className="flex justify-center py-10"><Spinner aria-label="Loading definition" /></div>
              )}
            </Tabs.Panel>
            <Tabs.Panel id="values" className="pt-4">
              {definition && (
                <MonthlyValuesEditor
                  definition={definition}
                  isMutating={isMutating}
                  onSave={saveValues}
                  loadValues={getValuesForMonth}
                />
              )}
            </Tabs.Panel>
            <Tabs.Panel id="results" className="pt-4">
              <ResultsView
                configId={selectedConfigId}
                isMutating={isMutating}
                results={results}
                isLoading={isLoadingResults}
                fetchResults={fetchResults}
              />
            </Tabs.Panel>
            <Tabs.Panel id="history" className="pt-4">
              <HistoryView history={history} isLoading={isLoadingHistory} />
            </Tabs.Panel>
            <Tabs.Panel id="deleted" className="pt-4">
              <DeletedNodesView
                deletedList={deletedList}
                isLoading={isLoadingDeleted}
                isMutating={isMutating}
                onRefresh={fetchDeleted}
                onRestore={restoreNode}
              />
            </Tabs.Panel>
          </Tabs>
        </div>
      )}

      {/* Create configuration modal */}
      <Modal isOpen={createOpen} onOpenChange={(o) => { if (!o) setCreateOpen(false); }}>
        <Modal.Backdrop isDismissable>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[480px]">
              <Modal.Header>
                <Modal.Heading>New Configuration</Modal.Heading>
                <Modal.CloseTrigger />
              </Modal.Header>
              <Modal.Body>
                <div className="flex flex-col gap-4">
                  <TextField value={createYear} onChange={setCreateYear}>
                    <Label>Year</Label>
                    <Input type="number" />
                  </TextField>
                  <div className="flex items-end gap-2">
                    <TextField value={cloneFromYear} onChange={setCloneFromYear}>
                      <Label>Clone from year (optional)</Label>
                      <Input type="number" placeholder="e.g. previous year" />
                    </TextField>
                    <Button isIconOnly variant="tertiary" aria-label="Clone previous year" onPress={() => setCloneFromYear(String(Number(createYear) - 1))}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cloning copies aspects, indicators, variables, and bands (values are not copied). The new configuration starts as DRAFT / OPEN.
                  </p>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => setCreateOpen(false)}>Cancel</Button>
                <Button variant="primary" onPress={handleCreate} isPending={isMutating} isDisabled={!Number.isInteger(Number(createYear))}>
                  Create
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Close / reopen reason modal */}
      <Modal isOpen={reasonDialog != null} onOpenChange={(o) => { if (!o) setReasonDialog(null); }}>
        <Modal.Backdrop isDismissable>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[440px]">
              <Modal.Header>
                <Modal.Heading>{reasonDialog === 'close' ? 'Close Recording Year' : 'Reopen Recording Year'}</Modal.Heading>
                <Modal.CloseTrigger />
              </Modal.Header>
              <Modal.Body>
                <TextField value={reason} onChange={setReason}>
                  <Label>Reason (required)</Label>
                  <TextArea
                    variant="secondary"
                    placeholder={reasonDialog === 'close' ? 'e.g. recording finished' : 'e.g. correction needed'}
                  />
                </TextField>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => setReasonDialog(null)}>Cancel</Button>
                <Button
                  variant={reasonDialog === 'close' ? 'danger' : 'primary'}
                  onPress={confirmLifecycle}
                  isPending={isMutating}
                  isDisabled={reason.trim() === ''}
                >
                  Confirm
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
