/** Corporate KPI — DTOs matching the backend contract (configuration aggregate). */

/* ── Legacy tree node (Activity selector + recycle bin) ── */

export interface CorporateKpiNode {
  id: string;
  parentId: string | null;
  parentName: string | null;
  code: string;
  name: string;
  nodeType: KpiNodeType;
  year: number;
  unit: string | null;
  targetValue: number | null;
  displayOrder: number | null;
  weight: number | null;
  targetScore: number | null;
  formulaExpression: string | null;
  configurationId: string | null;
  configurationStatus: KpiConfigurationStatus | null;
  recordingStatus: KpiRecordingStatus | null;
  status: KpiStatus;
  description: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  children: CorporateKpiNode[];
}

export type KpiNodeType = 'ASPECT' | 'INDICATOR';
export type KpiStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';
export type KpiConfigurationStatus = 'DRAFT' | 'ACTIVE';
export type KpiRecordingStatus = 'OPEN' | 'CLOSED';

export interface Paginated<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/* ── Configuration aggregate ── */

export interface CorporateConfigurationSummary {
  id: string;
  year: number;
  configurationStatus: KpiConfigurationStatus;
  recordingStatus: KpiRecordingStatus;
  version: number;
  closedAt: string | null;
  closedBy: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IndicatorDefinition {
  id: string | null;
  code: string;
  name: string;
  unit: string | null;
  displayOrder: number | null;
  weight: number | null;
  targetScore: number | null;
  formulaExpression: string | null;
  description: string | null;
}

export interface AspectDefinition {
  id: string | null;
  code: string;
  name: string;
  displayOrder: number | null;
  description: string | null;
  indicators: IndicatorDefinition[];
}

export interface VariableDefinition {
  id: string | null;
  code: string;
  name: string;
  unit: string | null;
  aggregationMethod: KpiAggregationMethod;
  displayOrder: number | null;
  description: string | null;
}

export type KpiAggregationMethod = 'SUM' | 'END_OF_PERIOD' | 'AVERAGE';

export interface ScoreBandDefinition {
  id: string | null;
  indicatorId: string;
  minValue: number | null;
  maxValue: number | null;
  minInclusive: boolean;
  maxInclusive: boolean;
  score: number;
  displayOrder: number | null;
}

export interface PerformanceBandDefinition {
  id: string | null;
  category: string;
  minValue: number | null;
  maxValue: number | null;
  minInclusive: boolean;
  maxInclusive: boolean;
  displayOrder: number | null;
}

export interface CorporateConfigurationDefinition {
  configuration: CorporateConfigurationSummary;
  aspects: AspectDefinition[];
  variables: VariableDefinition[];
  scoreBands: ScoreBandDefinition[];
  performanceBands: PerformanceBandDefinition[];
}

/* ── Request DTOs ── */

export interface CreateConfigurationRequest {
  year: number;
  cloneFromYear?: number | null;
}

export interface AspectNodeRequest {
  id?: string | null;
  clientRef?: string | null;
  code: string;
  name: string;
  displayOrder?: number | null;
  description?: string | null;
  indicators: IndicatorNodeRequest[];
}

export interface IndicatorNodeRequest {
  id?: string | null;
  clientRef?: string | null;
  code: string;
  name: string;
  unit?: string | null;
  displayOrder?: number | null;
  weight?: number | null;
  targetScore?: number | null;
  formulaExpression?: string | null;
  description?: string | null;
}

export interface VariableDefinitionRequest {
  id?: string | null;
  code: string;
  name: string;
  unit?: string | null;
  aggregationMethod: KpiAggregationMethod;
  displayOrder?: number | null;
  description?: string | null;
}

export interface ScoreBandDefinitionRequest {
  id?: string | null;
  /** New indicator clientRef or a persisted indicator UUID. */
  indicatorRef: string;
  minValue?: number | null;
  maxValue?: number | null;
  minInclusive: boolean;
  maxInclusive: boolean;
  score: number;
  displayOrder?: number | null;
}

export interface PerformanceBandDefinitionRequest {
  id?: string | null;
  category: string;
  minValue?: number | null;
  maxValue?: number | null;
  minInclusive: boolean;
  maxInclusive: boolean;
  displayOrder?: number | null;
}

export interface DefinitionApplyRequest {
  version: number;
  aspects: AspectNodeRequest[];
  variables: VariableDefinitionRequest[];
  scoreBands: ScoreBandDefinitionRequest[];
  performanceBands: PerformanceBandDefinitionRequest[];
  removedEntityIds: string[];
}

export interface DefinitionApplyResult {
  configurationId: string;
  version: number;
  idMapping: Record<string, string>;
}

export interface CloseConfigurationRequest {
  version: number;
  reason: string;
}

export interface ReopenConfigurationRequest {
  version: number;
  reason: string;
}

export interface VariableValueEntry {
  variableCode: string;
  value: number | null;
}

export interface VariableValueUpsertRequest {
  version: number;
  entries: VariableValueEntry[];
}

export interface MutationResult {
  configurationId: string;
  version: number;
  configurationStatus: KpiConfigurationStatus;
  recordingStatus: KpiRecordingStatus;
}

export interface NodeRestoreResult {
  node: CorporateKpiNode;
  configurationId: string;
  version: number;
}

/* ── Results ── */

export type IndicatorResultStatus = 'COMPLETE' | 'INCOMPLETE' | 'CALCULATION_ERROR';

export interface IndicatorResult {
  indicatorId: string;
  code: string;
  name: string;
  weight: number;
  targetScore: number;
  status: IndicatorResultStatus;
  formulaResult: number | null;
  actualScore: number | null;
  weightedActual: number | null;
  weightedTarget: number | null;
  missingMonths: number[];
  errorMessage: string | null;
}

export interface CorporateKpiResultResponse {
  configurationId: string;
  year: number;
  configurationStatus: KpiConfigurationStatus;
  recordingStatus: KpiRecordingStatus;
  month: number | null;
  fromMonth: number | null;
  toMonth: number | null;
  indicators: IndicatorResult[];
  actualTotal: number | null;
  targetTotal: number | null;
  aggregateStatus: IndicatorResultStatus | null;
  overallCategory: string | null;
}

/* ── History ── */

export interface CorporateKpiHistoryEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId: string | null;
  occurredAt: string;
  reason: string | null;
  oldValue: unknown;
  newValue: unknown;
}
