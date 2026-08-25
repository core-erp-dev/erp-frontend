/** Corporate KPI Variable Values — DTOs matching the backend contract. */

export interface VariableValue {
  id: string | null;
  variableId: string;
  variableCode: string;
  year: number;
  /**
   * 1..12 for monthly rows; NULL for the explicit annual value of the year.
   * Renderers must never pass a null month into a month-name array.
   */
  month: number | null;
  /** null when the variable has no stored row for the period. */
  value: number | null;
}

/** Sheet row = backend value row + variable metadata merged from the variables list. */
export interface VariableValueSheetRow extends VariableValue {
  name: string;
  unit: string | null;
  /** Merged from the variables master — shows the ANNUAL_REQUIRED badge. */
  aggregationMode: string | null;
}

export interface BatchVariableValueItem {
  variableId: string;
  year: number;
  /** 1..12 for monthly items; null for annual items. */
  month: number | null;
  value: number;
}

export interface BatchVariableValueRequest {
  items: BatchVariableValueItem[];
}

/** Draft input per variable: string so empty ('') is distinct from 0 ('0'). */
export type ValueDraft = Record<string, string>;

/** Period scope of a loaded sheet — month absent means the ANNUAL scope. */
export interface SheetPeriod {
  year: number;
  month?: number;
  sortBy?: 'name' | 'code';
  sortDirection?: 'asc' | 'desc';
}
