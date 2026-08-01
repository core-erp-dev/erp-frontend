'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@heroui/react';
import { corporateKpiApi, extractKpiError, isVersionConflict } from './corporate-kpi-api';
import { mapKpiError } from './corporate-kpi-error-mapper';
import type {
  CloseConfigurationRequest,
  CorporateConfigurationDefinition,
  CorporateConfigurationSummary,
  CorporateKpiHistoryEntry,
  CorporateKpiNode,
  CorporateKpiResultResponse,
  DefinitionApplyRequest,
  DefinitionApplyResult,
  MutationResult,
  NodeRestoreResult,
  Paginated,
  ReopenConfigurationRequest,
  VariableValueUpsertRequest,
} from './corporate-kpi.types';

/**
 * Configuration-workspace hook (WP6). Owns the configuration list, the
 * selected configuration's definition (source of truth for the version), and
 * every aggregate mutation. All mutations pass the client-side expected
 * version; a 409 conflict reloads the current definition and informs the user.
 */
export interface UseConfigurationWorkspaceReturn {
  /* ── Config list ── */
  configurations: CorporateConfigurationSummary[];
  isLoadingConfigs: boolean;
  configsError: string | null;
  fetchConfigurations: (year: number) => Promise<void>;

  /* ── Selection + definition ── */
  selectedConfigId: string | null;
  selectConfiguration: (id: string | null) => void;
  definition: CorporateConfigurationDefinition | null;
  isLoadingDefinition: boolean;
  definitionError: string | null;
  refreshDefinition: () => Promise<void>;

  /* ── Mutations (version-bearing, 409-aware) ── */
  isMutating: boolean;
  conflictMessage: string | null;
  clearConflict: () => void;
  saveDefinition: (payload: DefinitionApplyRequest) => Promise<DefinitionApplyResult | null>;
  activate: () => Promise<MutationResult | null>;
  close: (reason: string) => Promise<MutationResult | null>;
  reopen: (reason: string) => Promise<MutationResult | null>;
  deleteNode: (nodeId: string) => Promise<MutationResult | null>;
  restoreNode: (nodeId: string) => Promise<NodeRestoreResult | null>;
  saveValues: (month: number, entries: VariableValueUpsertRequest['entries']) => Promise<MutationResult | null>;

  /* ── Values / results / history / recycle bin (reads) ── */
  getValuesForMonth: (month: number) => Promise<{ variableCode: string; value: number | null }[]>;
  results: CorporateKpiResultResponse | null;
  isLoadingResults: boolean;
  fetchResults: (window: { month?: number; fromMonth?: number; toMonth?: number }) => Promise<void>;
  history: CorporateKpiHistoryEntry[];
  isLoadingHistory: boolean;
  fetchHistory: () => Promise<void>;
  deletedList: Paginated<CorporateKpiNode>;
  isLoadingDeleted: boolean;
  fetchDeleted: (params?: { page?: number; size?: number; search?: string }) => Promise<void>;
}

export function useConfigurationWorkspace(): UseConfigurationWorkspaceReturn {
  const [configurations, setConfigurations] = useState<CorporateConfigurationSummary[]>([]);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(true);
  const [configsError, setConfigsError] = useState<string | null>(null);

  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [definition, setDefinition] = useState<CorporateConfigurationDefinition | null>(null);
  const [isLoadingDefinition, setIsLoadingDefinition] = useState(false);
  const [definitionError, setDefinitionError] = useState<string | null>(null);

  const [isMutating, setIsMutating] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  const [results, setResults] = useState<CorporateKpiResultResponse | null>(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [history, setHistory] = useState<CorporateKpiHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [deletedList, setDeletedList] = useState<Paginated<CorporateKpiNode>>({
    content: [], pageNumber: 1, pageSize: 10, totalElements: 0, totalPages: 0, first: true, last: true,
  });
  const [isLoadingDeleted, setIsLoadingDeleted] = useState(false);

  const mountedRef = useRef(true);
  const selectedConfigIdRef = useRef<string | null>(null);
  selectedConfigIdRef.current = selectedConfigId;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Config list ──

  const fetchConfigurations = useCallback(async (year: number) => {
    setIsLoadingConfigs(true);
    setConfigsError(null);
    try {
      const data = await corporateKpiApi.listConfigurations(year);
      if (mountedRef.current) setConfigurations(data);
    } catch (err: unknown) {
      const msg = extractKpiError(err);
      if (mountedRef.current) { setConfigsError(msg); setConfigurations([]); }
    } finally {
      if (mountedRef.current) setIsLoadingConfigs(false);
    }
  }, []);

  // ── Selection + definition ──

  const selectConfiguration = useCallback((id: string | null) => {
    setSelectedConfigId(id);
    setDefinition(null);
    setDefinitionError(null);
    setConflictMessage(null);
    setResults(null);
    setHistory([]);
  }, []);

  const refreshDefinition = useCallback(async () => {
    const id = selectedConfigIdRef.current;
    if (id == null) return;
    setIsLoadingDefinition(true);
    setDefinitionError(null);
    try {
      const data = await corporateKpiApi.getConfiguration(id);
      if (mountedRef.current && selectedConfigIdRef.current === id) setDefinition(data);
    } catch (err: unknown) {
      const msg = extractKpiError(err);
      if (mountedRef.current) setDefinitionError(msg);
    } finally {
      if (mountedRef.current) setIsLoadingDefinition(false);
    }
  }, []);

  useEffect(() => {
    if (selectedConfigId != null) {
      void refreshDefinition();
    }
  }, [selectedConfigId, refreshDefinition]);

  // ── Conflict handling ──

  const clearConflict = useCallback(() => setConflictMessage(null), []);

  const handleConflict = useCallback(async () => {
    setConflictMessage('The configuration was changed by someone else. Reloaded the latest version — review and re-apply your changes.');
    await refreshDefinition();
  }, [refreshDefinition]);

  /** Generic mutation wrapper: version-bearing call, 409 -> reload + inform. */
  const runMutation = useCallback(
    async <T,>(fn: () => Promise<T>, successMessage: string): Promise<T | null> => {
      setIsMutating(true);
      try {
        const result = await fn();
        toast.success(successMessage);
        await refreshDefinition();
        return result;
      } catch (err: unknown) {
        if (isVersionConflict(err)) {
          await handleConflict();
        } else {
          toast.danger(mapKpiError(err, 'Something went wrong.'));
        }
        return null;
      } finally {
        if (mountedRef.current) setIsMutating(false);
      }
    },
    [refreshDefinition, handleConflict],
  );

  // ── Mutations ──

  const currentVersion = () => definition?.configuration.version ?? 0;

  const saveDefinition = useCallback(
    async (payload: DefinitionApplyRequest): Promise<DefinitionApplyResult | null> => {
      const id = selectedConfigIdRef.current;
      if (id == null) return null;
      return runMutation(
        () => corporateKpiApi.applyDefinition(id, payload),
        'Definition saved successfully.',
      );
    },
    [runMutation],
  );

  const activate = useCallback(async (): Promise<MutationResult | null> => {
    const id = selectedConfigIdRef.current;
    if (id == null) return null;
    return runMutation(() => corporateKpiApi.activate(id, currentVersion()), 'Configuration activated.');
  }, [runMutation, definition]);

  const close = useCallback(
    async (reason: string): Promise<MutationResult | null> => {
      const id = selectedConfigIdRef.current;
      if (id == null) return null;
      const payload: CloseConfigurationRequest = { version: currentVersion(), reason };
      return runMutation(() => corporateKpiApi.close(id, payload), 'Recording year closed.');
    },
    [runMutation, definition],
  );

  const reopen = useCallback(
    async (reason: string): Promise<MutationResult | null> => {
      const id = selectedConfigIdRef.current;
      if (id == null) return null;
      const payload: ReopenConfigurationRequest = { version: currentVersion(), reason };
      return runMutation(() => corporateKpiApi.reopen(id, payload), 'Recording year reopened.');
    },
    [runMutation, definition],
  );

  const deleteNode = useCallback(
    async (nodeId: string): Promise<MutationResult | null> => {
      const id = selectedConfigIdRef.current;
      if (id == null) return null;
      return runMutation(
        () => corporateKpiApi.deleteNode(id, nodeId, currentVersion()),
        'Node deleted.',
      );
    },
    [runMutation, definition],
  );

  const restoreNode = useCallback(
    async (nodeId: string): Promise<NodeRestoreResult | null> => {
      return runMutation(
        () => corporateKpiApi.restoreNode(nodeId, currentVersion()),
        'Node restored.',
      );
    },
    [runMutation, definition],
  );

  const saveValues = useCallback(
    async (month: number, entries: VariableValueUpsertRequest['entries']): Promise<MutationResult | null> => {
      const id = selectedConfigIdRef.current;
      if (id == null) return null;
      const payload: VariableValueUpsertRequest = { version: currentVersion(), entries };
      return runMutation(() => corporateKpiApi.upsertValues(id, month, payload), `Month ${month} saved.`);
    },
    [runMutation, definition],
  );

  // ── Reads ──

  const getValuesForMonth = useCallback(async (month: number) => {
    const id = selectedConfigIdRef.current;
    if (id == null) return [];
    const data = await corporateKpiApi.getValues(id, month);
    return data.entries;
  }, []);

  const fetchResults = useCallback(async (window: { month?: number; fromMonth?: number; toMonth?: number }) => {
    const id = selectedConfigIdRef.current;
    if (id == null) return;
    setIsLoadingResults(true);
    try {
      const data = await corporateKpiApi.getResults(id, window);
      if (mountedRef.current) setResults(data);
    } catch (err: unknown) {
      toast.danger(mapKpiError(err, 'Failed to load results.'));
    } finally {
      if (mountedRef.current) setIsLoadingResults(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    const id = selectedConfigIdRef.current;
    if (id == null) return;
    setIsLoadingHistory(true);
    try {
      const data = await corporateKpiApi.getHistory(id);
      if (mountedRef.current) setHistory(data);
    } catch (err: unknown) {
      toast.danger(mapKpiError(err, 'Failed to load history.'));
    } finally {
      if (mountedRef.current) setIsLoadingHistory(false);
    }
  }, []);

  const fetchDeleted = useCallback(async (params?: { page?: number; size?: number; search?: string }) => {
    setIsLoadingDeleted(true);
    try {
      const data = await corporateKpiApi.getDeleted({ page: params?.page ?? 1, size: params?.size ?? 10, search: params?.search });
      if (mountedRef.current) setDeletedList(data);
    } catch (err: unknown) {
      toast.danger(mapKpiError(err, 'Failed to load deleted nodes.'));
    } finally {
      if (mountedRef.current) setIsLoadingDeleted(false);
    }
  }, []);

  return {
    configurations, isLoadingConfigs, configsError, fetchConfigurations,
    selectedConfigId, selectConfiguration,
    definition, isLoadingDefinition, definitionError, refreshDefinition,
    isMutating, conflictMessage, clearConflict,
    saveDefinition, activate, close, reopen, deleteNode, restoreNode, saveValues,
    getValuesForMonth,
    results, isLoadingResults, fetchResults,
    history, isLoadingHistory, fetchHistory,
    deletedList, isLoadingDeleted, fetchDeleted,
  };
}
