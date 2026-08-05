/**
 * Aggregation-mode constants — the four UI labels must map exactly to the
 * backend enum values, and descriptions must be present for all four.
 */
import {
  AGGREGATION_MODES,
  AGGREGATION_MODE_LABELS,
  AGGREGATION_MODE_DESCRIPTIONS,
  aggregationModeLabel,
} from '../aggregation-mode';

describe('aggregation mode constants', () => {
  it('exposes exactly the four backend enum values', () => {
    expect(AGGREGATION_MODES).toEqual(['SUM', 'AVERAGE', 'LAST_NON_NULL', 'ANNUAL_REQUIRED']);
  });

  it('maps each backend value to the intended English label', () => {
    expect(AGGREGATION_MODE_LABELS.SUM).toBe('Sum');
    expect(AGGREGATION_MODE_LABELS.AVERAGE).toBe('Average');
    expect(AGGREGATION_MODE_LABELS.LAST_NON_NULL).toBe('Last Non-Null');
    expect(AGGREGATION_MODE_LABELS.ANNUAL_REQUIRED).toBe('Annual Value');
  });

  it('provides a concise description for every mode', () => {
    for (const mode of AGGREGATION_MODES) {
      expect(AGGREGATION_MODE_DESCRIPTIONS[mode].length).toBeGreaterThan(10);
    }
  });

  it('label fallback never fabricates a value for null/unknown input', () => {
    expect(aggregationModeLabel(null)).toBe('–');
    expect(aggregationModeLabel(undefined)).toBe('–');
    expect(aggregationModeLabel('UNKNOWN')).toBe('UNKNOWN');
  });
});
