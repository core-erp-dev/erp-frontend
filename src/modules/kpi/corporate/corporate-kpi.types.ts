/** Corporate KPI — DTOs matching the backend contract (structure lifecycle refactor). */

export interface AssessmentRule {
  lowerBound: number | null;
  lowerInclusive: boolean;
  upperBound: number | null;
  upperInclusive: boolean;
  score: number;
}

/** Yearly lifecycle aggregate — every node belongs to exactly one structure. */
export interface CorporateKpiStructure {
  id: string;
  year: number;
  status: KpiStatus;
  activatedAt: string | null;
  activatedBy: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CorporateKpiNode {
  id: string;
  structureId: string;
  parentId: string | null;
  parentName: string | null;
  code: string;
  name: string;
  nodeType: KpiNodeType;
  /** DERIVED from the owning structure — never stored on the node. */
  year: number;
  description: string | null;
  displayOrder: number;
  // Stored scoring fields (INDICATOR-only; null on ASPECT)
  formula: string | null;
  assessmentRules: AssessmentRule[] | null;
  weight: number | null;
  targetScore: number | null;
  // Computed fields — populated by /tree when month is provided
  formulaResult: number | null;
  actualScore: number | null;
  actualResult: number | null;
  targetResult: number | null;
  calculationStatus: string | null;
  calculationError: string | null;
  // Year-level weight summary
  totalWeight: number | null;
  remainingWeight: number | null;
  weightComplete: boolean | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  children: CorporateKpiNode[];
}

export type KpiNodeType = 'ASPECT' | 'INDICATOR';
export type KpiStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';

/* ── Request DTOs ── */

export interface CreateStructureRequest {
  year: number;
  /**
   * Copy the source year's configuration (aspects, indicators, variable
   * bindings) into the new DRAFT structure. Omit for an empty structure.
   */
  copyFromYear?: number;
}

export interface ChangeStructureStatusRequest {
  status: KpiStatus;
}

export interface CreateKpiRequest {
  code: string;
  name: string;
  nodeType: KpiNodeType;
  /** The owning yearly structure — replaces the old independent year field. */
  structureId: string;
  parentId: string | null;
  description: string | null;
  displayOrder: number;
  // Scoring fields — nullable, INDICATOR staged configuration; ASPECT must send null
  formula: string | null;
  assessmentRules: AssessmentRule[] | null;
  weight: number | null;
  targetScore: number | null;
}

export interface UpdateKpiRequest {
  code: string;
  name: string;
  parentId: string | null;
  description: string | null;
  displayOrder: number;
  // Full PUT semantics: null clears the scoring configuration (DRAFT only)
  formula: string | null;
  assessmentRules: AssessmentRule[] | null;
  weight: number | null;
  targetScore: number | null;
  // Note: nodeType, structureId and year are immutable — NOT sent in update.
}

/* ── Lifecycle ── */

export type LifecycleActionType = 'activate' | 'deactivate' | 'delete' | 'restore';
