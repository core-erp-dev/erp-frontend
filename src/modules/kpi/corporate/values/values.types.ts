/** Corporate KPI Variable Values — DTOs matching the backend contract. */

export interface VariableValue {
  id: string | null;
  variableId: string;
  variableCode: string;
  year: number;
  month: number;
  /** null when the variable has no stored row for (year, month). */
  value: number | null;
}

/** Sheet row = backend value row + variable metadata merged from the variables list. */
export interface VariableValueSheetRow extends VariableValue {
  name: string;
  unit: string | null;
}

export interface BatchVariableValueItem {
  variableId: string;
  year: number;
  month: number;
  value: number;
}

export interface BatchVariableValueRequest {
  items: BatchVariableValueItem[];
}

/** Draft input per variable: string so empty ('') is distinct from 0 ('0'). */
export type ValueDraft = Record<string, string>;
