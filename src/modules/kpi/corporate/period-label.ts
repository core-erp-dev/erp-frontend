/**
 * English month names for the Corporate KPI period selectors (KPI Values
 * month dropdown). The Indonesian period-label helpers were removed with the
 * legacy variable-values UI.
 */
export const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const;

/** @deprecated Use MONTH_NAMES_ID for user-facing labels. */
export const MONTH_NAMES_EN = MONTH_NAMES_ID;
