/** Corporate KPI Variables — DTOs matching the backend contract. */

export interface Variable {
  id: string;
  code: string;
  name: string;
  unit: string | null;
  /** One of SUM, AVERAGE, LAST_NON_NULL, ANNUAL_REQUIRED. */
  aggregationMode: string | null;
  description: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type VariableSortField = 'name' | 'code';
export type VariableSortDirection = 'asc' | 'desc';

export interface CreateVariableRequest {
  code: string;
  name: string;
  unit: string | null;
  /** Required on create — the backend rejects a missing mode. */
  aggregationMode: string;
  description: string | null;
}

/**
 * Update carries NO code field — the code is immutable (backend contract).
 * `aggregationMode` may be omitted/null to PRESERVE the stored mode; the edit
 * form always submits the loaded mode explicitly.
 */
export interface UpdateVariableRequest {
  name: string;
  unit: string | null;
  aggregationMode?: string | null;
  description: string | null;
}
