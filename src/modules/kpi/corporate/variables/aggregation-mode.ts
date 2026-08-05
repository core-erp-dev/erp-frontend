/**
 * Corporate KPI Variable aggregation modes — the exact four backend enum
 * values with English UI labels and concise supporting descriptions.
 * The UI label must never be submitted as a value; only the enum strings are
 * valid API payloads.
 */
export const AGGREGATION_MODES = ['SUM', 'AVERAGE', 'LAST_NON_NULL', 'ANNUAL_REQUIRED'] as const;

export type AggregationMode = (typeof AGGREGATION_MODES)[number];

export const AGGREGATION_MODE_LABELS: Record<AggregationMode, string> = {
  SUM: 'Sum',
  AVERAGE: 'Average',
  LAST_NON_NULL: 'Last Non-Null',
  ANNUAL_REQUIRED: 'Annual Value',
};

export const AGGREGATION_MODE_DESCRIPTIONS: Record<AggregationMode, string> = {
  SUM: 'The annual value is derived by summing the available monthly values.',
  AVERAGE: 'The annual value is derived by averaging the available monthly values.',
  LAST_NON_NULL: 'Uses the value from the last month that has been entered.',
  ANNUAL_REQUIRED: 'The annual value is entered separately; monthly values may still be entered.',
};

/** English label for a backend mode string, falling back to the raw value. */
export function aggregationModeLabel(mode: string | null | undefined): string {
  if (!mode) return '–';
  return AGGREGATION_MODE_LABELS[mode as AggregationMode] ?? mode;
}
