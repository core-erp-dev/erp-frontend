/**
 * Corporate KPI Variable aggregation modes — the exact four backend enum
 * values with Indonesian UI labels and concise supporting descriptions.
 * The UI label must never be submitted as a value; only the enum strings are
 * valid API payloads.
 */
export const AGGREGATION_MODES = ['SUM', 'AVERAGE', 'LAST_NON_NULL', 'ANNUAL_REQUIRED'] as const;

export type AggregationMode = (typeof AGGREGATION_MODES)[number];

export const AGGREGATION_MODE_LABELS: Record<AggregationMode, string> = {
  SUM: 'Jumlah',
  AVERAGE: 'Rata-rata',
  LAST_NON_NULL: 'Nilai Terakhir',
  ANNUAL_REQUIRED: 'Nilai Tahunan',
};

export const AGGREGATION_MODE_DESCRIPTIONS: Record<AggregationMode, string> = {
  SUM: 'Nilai tahunan dihitung dari jumlah nilai bulanan yang tersedia.',
  AVERAGE: 'Nilai tahunan dihitung dari rata-rata nilai bulanan yang tersedia.',
  LAST_NON_NULL: 'Menggunakan nilai dari bulan terakhir yang telah diisi.',
  ANNUAL_REQUIRED: 'Nilai tahunan diisi secara terpisah; nilai bulanan tetap dapat diisi.',
};

/** Indonesian label for a backend mode string, falling back to the raw value. */
export function aggregationModeLabel(mode: string | null | undefined): string {
  if (!mode) return '-';
  return AGGREGATION_MODE_LABELS[mode as AggregationMode] ?? mode;
}
