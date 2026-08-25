import {
  getCorporateKpiDefaultValueYear,
  getCorporateKpiDefaultYear,
  getCorporateKpiValueYearOptions,
  getCorporateKpiYearOptions,
} from '../corporate-kpi-year-options';

describe('getCorporateKpiYearOptions', () => {
  it('returns the current and next year when no structure exists', () => {
    expect(getCorporateKpiYearOptions([], 2026)).toEqual([2027, 2026]);
  });

  it('always includes the current year and the next calendar year', () => {
    expect(getCorporateKpiYearOptions([{ year: 2025 }], 2026)).toEqual([2027, 2026, 2025]);
    expect(getCorporateKpiYearOptions([{ year: 2023 }, { year: 2024 }, { year: 2025 }], 2026))
      .toEqual([2027, 2026, 2025, 2024, 2023]);
    expect(getCorporateKpiYearOptions([{ year: 2025 }, { year: 2026 }, { year: 2027 }], 2026))
      .toEqual([2027, 2026, 2025]);
  });

  it('deduplicates and ignores malformed structure years', () => {
    expect(getCorporateKpiYearOptions([{ year: 2025 }, { year: 2025 }, { year: 0 }], 2026))
      .toEqual([2027, 2026, 2025]);
  });

  it('defaults to the current year when it is available instead of the first sorted option', () => {
    expect(getCorporateKpiDefaultYear([2027, 2026, 2025], 2026)).toBe(2026);
  });

  it('falls back to the first available option when the current year is unavailable', () => {
    expect(getCorporateKpiDefaultYear([2027, 2025], 2026)).toBe(2027);
    expect(getCorporateKpiDefaultYear([], 2026)).toBe(2026);
  });

  it('excludes DRAFT structures from variable value years', () => {
    expect(getCorporateKpiValueYearOptions([
      { year: 2027, status: 'DRAFT' },
      { year: 2026, status: 'ACTIVE' },
      { year: 2025, status: 'INACTIVE' },
    ])).toEqual([2026, 2025]);
  });

  it('defaults variable values to the current valid year, then latest valid year', () => {
    expect(getCorporateKpiDefaultValueYear([2027, 2026, 2025], 2026)).toBe(2026);
    expect(getCorporateKpiDefaultValueYear([2025], 2026)).toBe(2025);
    expect(getCorporateKpiDefaultValueYear([], 2026)).toBeNull();
  });
});
