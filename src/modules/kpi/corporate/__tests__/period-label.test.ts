/**
 * Period labels — the English month-name array used by the KPI Values month
 * dropdown (the Indonesian period-label helpers were removed with the legacy
 * variable-values UI).
 */
import { MONTH_NAMES_EN } from '../period-label';

describe('MONTH_NAMES_EN', () => {
  it('keeps the English month names stable (12 entries)', () => {
    expect(MONTH_NAMES_EN).toHaveLength(12);
    expect(MONTH_NAMES_EN[0]).toBe('January');
    expect(MONTH_NAMES_EN[2]).toBe('March');
    expect(MONTH_NAMES_EN[7]).toBe('August');
    expect(MONTH_NAMES_EN[11]).toBe('December');
  });
});
