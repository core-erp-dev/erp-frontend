const MONTH_NAMES: Record<number, string> = {
  1: 'Januari',
  2: 'Februari',
  3: 'Maret',
  4: 'April',
  5: 'Mei',
  6: 'Juni',
  7: 'Juli',
  8: 'Agustus',
  9: 'September',
  10: 'Oktober',
  11: 'November',
  12: 'Desember',
};

/**
 * Format a task period as "Juli 2026" or "-" for invalid values.
 */
export function formatTaskPeriod(periodMonth?: number | null, periodYear?: number | null): string {
  if (periodMonth == null || periodYear == null) return '-';
  if (periodMonth < 1 || periodMonth > 12) return '-';
  const monthName = MONTH_NAMES[periodMonth];
  if (!monthName) return '-';
  return `${monthName} ${periodYear}`;
}

/**
 * Month options for Select dropdowns (value = numeric month, label = Indonesian name).
 */
export const MONTH_OPTIONS = Object.entries(MONTH_NAMES).map(([value, label]) => ({
  value: Number(value),
  label,
}));
