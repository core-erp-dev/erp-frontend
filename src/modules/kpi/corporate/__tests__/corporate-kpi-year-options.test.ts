import { getCorporateKpiYearOptions } from '../corporate-kpi-year-options';

describe('getCorporateKpiYearOptions', () => {
  it('returns the current year only when no structure exists', () => {
    expect(getCorporateKpiYearOptions([], 2026)).toEqual([2026]);
  });

  it('adds one year after the latest existing structure', () => {
    expect(getCorporateKpiYearOptions([{ year: 2025 }], 2026)).toEqual([2026, 2025]);
    expect(getCorporateKpiYearOptions([{ year: 2023 }, { year: 2024 }, { year: 2025 }], 2026))
      .toEqual([2026, 2025, 2024, 2023]);
  });

  it('deduplicates and ignores malformed structure years', () => {
    expect(getCorporateKpiYearOptions([{ year: 2025 }, { year: 2025 }, { year: 0 }], 2026))
      .toEqual([2026, 2025]);
  });
});
