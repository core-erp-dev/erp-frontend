import type { CorporateKpiStructure } from './corporate-kpi.types';

/** Returns configured years plus the current and next calendar year. */
export function getCorporateKpiYearOptions(
  structures: Pick<CorporateKpiStructure, 'year'>[],
  currentYear: number,
): number[] {
  const dataYears = [...new Set(
    structures
      .map((structure) => structure.year)
      .filter((year) => Number.isInteger(year) && year > 0),
  )];

  return [...new Set([...dataYears, currentYear, currentYear + 1])].sort((a, b) => b - a);
}

/** Selects the current year when it is an available option, otherwise the most relevant option. */
export function getCorporateKpiDefaultYear(years: number[], currentYear: number): number {
  return years.includes(currentYear) ? currentYear : years[0] ?? currentYear;
}

/**
 * Value entry/evaluation years are lifecycle-aware. DRAFT structures are
 * staged configuration and are intentionally excluded; ACTIVE and INACTIVE
 * structures are the non-DRAFT states evaluated by the backend tree.
 */
export function getCorporateKpiValueYearOptions(
  structures: Pick<CorporateKpiStructure, 'year' | 'status'>[],
): number[] {
  return [...new Set(
    structures
      .filter((structure) => structure.status !== 'DRAFT')
      .map((structure) => structure.year)
      .filter((year) => Number.isInteger(year) && year > 0),
  )].sort((a, b) => b - a);
}

/** Selects the current valid year, otherwise the latest valid year. */
export function getCorporateKpiDefaultValueYear(years: number[], currentYear: number): number | null {
  return years.includes(currentYear) ? currentYear : years[0] ?? null;
}
