import type { CorporateKpiStructure } from './corporate-kpi.types';

/** Returns existing structure years plus only the next year after the latest one. */
export function getCorporateKpiYearOptions(
  structures: Pick<CorporateKpiStructure, 'year'>[],
  currentYear: number,
): number[] {
  const dataYears = [...new Set(
    structures
      .map((structure) => structure.year)
      .filter((year) => Number.isInteger(year) && year > 0),
  )];

  if (dataYears.length === 0) return [currentYear];

  const latestYear = Math.max(...dataYears);
  return [...new Set([...dataYears, latestYear + 1])].sort((a, b) => b - a);
}

/** Selects the current year when it is an available option, otherwise the most relevant option. */
export function getCorporateKpiDefaultYear(years: number[], currentYear: number): number {
  return years.includes(currentYear) ? currentYear : years[0] ?? currentYear;
}
