/**
 * Guided score-rule builder helpers — defaults, higher/lower rule
 * generation, gap/overlap/duplicate validation, score simulation, and
 * advanced-mode fallback for non-representable rule sets.
 */
import {
  defaultScoreRows,
  validateScoreRows,
  buildAssessmentRules,
  rowCondition,
  simulateScore,
  rulesToSimple,
  rulesToJson,
  parseAssessmentRules,
} from '../score-builder';
import type { AssessmentRule, ScoreRow } from '../score-builder';

const row = (score: string, threshold: string, id = `${score}-${threshold}`): ScoreRow => ({
  id,
  score,
  threshold,
});

describe('defaultScoreRows', () => {
  it('defaults to the official 5-level scaffold (scores 5..1)', () => {
    const rows = defaultScoreRows();
    expect(rows.map((r) => r.score)).toEqual(['5', '4', '3', '2', '1']);
    expect(rows.every((r) => r.threshold === '')).toBe(true);
  });
});

describe('validateScoreRows', () => {
  it('accepts a valid higher-is-better table', () => {
    const rows = [row('5', '90'), row('4', '80'), row('3', '70'), row('2', '60'), row('1', '')];
    expect(validateScoreRows('higher', rows)).toBeNull();
  });

  it('accepts a valid lower-is-better table', () => {
    const rows = [row('5', '60'), row('4', '70'), row('3', '80'), row('2', '90'), row('1', '')];
    expect(validateScoreRows('lower', rows)).toBeNull();
  });

  it('rejects missing thresholds', () => {
    const rows = [row('5', '90'), row('4', ''), row('3', '70'), row('2', '60'), row('1', '')];
    expect(validateScoreRows('higher', rows)).toContain('Threshold is required');
  });

  it('rejects duplicate scores', () => {
    const rows = [row('5', '90'), row('5', '80'), row('3', '70'), row('2', '60'), row('1', '')];
    expect(validateScoreRows('higher', rows)).toContain('Scores must be unique');
  });

  it('rejects gaps/overlaps via non-monotonic thresholds (higher)', () => {
    const rows = [row('5', '80'), row('4', '90'), row('3', '70'), row('2', '60'), row('1', '')];
    expect(validateScoreRows('higher', rows)).toContain('strictly decreasing');
  });

  it('rejects gaps/overlaps via non-monotonic thresholds (lower)', () => {
    const rows = [row('5', '90'), row('4', '80'), row('3', '70'), row('2', '60'), row('1', '')];
    expect(validateScoreRows('lower', rows)).toContain('strictly increasing');
  });

  it('rejects non-numeric scores and thresholds', () => {
    expect(validateScoreRows('higher', [row('high', '90'), row('1', '')])).toContain('Scores must be numbers');
    expect(validateScoreRows('higher', [row('5', 'abc'), row('1', '')])).toContain('must be a number');
  });

  it('allows an empty table (no rules configured)', () => {
    expect(validateScoreRows('higher', [])).toBeNull();
  });
});

describe('buildAssessmentRules', () => {
  it('generates contiguous higher-is-better ranges (example table)', () => {
    const rows = [row('5', '90'), row('4', '80'), row('3', '70'), row('2', '60'), row('1', '')];
    const rules = buildAssessmentRules('higher', rows)!;
    expect(rules).toEqual([
      { lowerBound: null, lowerInclusive: true, upperBound: 60, upperInclusive: false, score: 1 },
      { lowerBound: 60, lowerInclusive: true, upperBound: 70, upperInclusive: false, score: 2 },
      { lowerBound: 70, lowerInclusive: true, upperBound: 80, upperInclusive: false, score: 3 },
      { lowerBound: 80, lowerInclusive: true, upperBound: 90, upperInclusive: false, score: 4 },
      { lowerBound: 90, lowerInclusive: true, upperBound: null, upperInclusive: false, score: 5 },
    ]);
  });

  it('generates contiguous lower-is-better ranges (≤ / above)', () => {
    const rows = [row('5', '60'), row('4', '70'), row('3', '80'), row('2', '90'), row('1', '')];
    const rules = buildAssessmentRules('lower', rows)!;
    expect(rules).toEqual([
      { lowerBound: null, lowerInclusive: true, upperBound: 60, upperInclusive: true, score: 5 },
      { lowerBound: 60, lowerInclusive: false, upperBound: 70, upperInclusive: true, score: 4 },
      { lowerBound: 70, lowerInclusive: false, upperBound: 80, upperInclusive: true, score: 3 },
      { lowerBound: 80, lowerInclusive: false, upperBound: 90, upperInclusive: true, score: 2 },
      { lowerBound: 90, lowerInclusive: false, upperBound: null, upperInclusive: false, score: 1 },
    ]);
  });

  it('builds a single all-open rule for one row', () => {
    expect(buildAssessmentRules('higher', [row('3', '')])).toEqual([
      { lowerBound: null, lowerInclusive: true, upperBound: null, upperInclusive: false, score: 3 },
    ]);
  });

  it('returns null for an invalid table', () => {
    expect(buildAssessmentRules('higher', [row('5', '90'), row('4', ''), row('3', '70')])).toBeNull();
    expect(buildAssessmentRules('higher', [])).toBeNull();
  });
});

describe('rowCondition', () => {
  it('renders the example conditions for higher-is-better', () => {
    const rows = [row('5', '90'), row('4', '80'), row('3', '70'), row('2', '60'), row('1', '')];
    expect(rowCondition('higher', rows, 0)).toBe('90 or higher');
    expect(rowCondition('higher', rows, 1)).toBe('80 to below 90');
    expect(rowCondition('higher', rows, 2)).toBe('70 to below 80');
    expect(rowCondition('higher', rows, 3)).toBe('60 to below 70');
    expect(rowCondition('higher', rows, 4)).toBe('Below 60');
  });

  it('renders or-lower/above conditions for lower-is-better', () => {
    const rows = [row('5', '60'), row('4', '70'), row('3', '80'), row('2', '90'), row('1', '')];
    expect(rowCondition('lower', rows, 0)).toBe('60 or lower');
    expect(rowCondition('lower', rows, 1)).toBe('Above 60 to 70');
    expect(rowCondition('lower', rows, 2)).toBe('Above 70 to 80');
    expect(rowCondition('lower', rows, 4)).toBe('Above 90');
  });

  it('renders "Any result" for a single score level', () => {
    expect(rowCondition('higher', [row('3', '')], 0)).toBe('Any result');
    expect(rowCondition('lower', [row('3', '')], 0)).toBe('Any result');
  });
});

describe('simulateScore', () => {
  it('returns the resulting score for a sample result (higher)', () => {
    const rows = [row('5', '90'), row('4', '80'), row('3', '70'), row('2', '60'), row('1', '')];
    expect(simulateScore('higher', rows, 85)).toBe(4);
    expect(simulateScore('higher', rows, 90)).toBe(5);
    expect(simulateScore('higher', rows, 59)).toBe(1);
    expect(simulateScore('higher', rows, 60)).toBe(2);
  });

  it('returns the resulting score for lower-is-better', () => {
    const rows = [row('5', '60'), row('4', '70'), row('3', '80'), row('2', '90'), row('1', '')];
    expect(simulateScore('lower', rows, 85)).toBe(2);
    expect(simulateScore('lower', rows, 60)).toBe(5);
    expect(simulateScore('lower', rows, 61)).toBe(4);
  });

  it('returns null for invalid input or invalid tables', () => {
    const rows = [row('5', '90'), row('4', '80'), row('3', '70'), row('2', '60'), row('1', '')];
    expect(simulateScore('higher', rows, null)).toBeNull();
    expect(simulateScore('higher', [row('5', '90'), row('4', ''), row('3', '70')], 85)).toBeNull();
  });
});

describe('rulesToSimple', () => {
  const higherRules: AssessmentRule[] = [
    { lowerBound: null, lowerInclusive: true, upperBound: 60, upperInclusive: false, score: 1 },
    { lowerBound: 60, lowerInclusive: true, upperBound: 70, upperInclusive: false, score: 2 },
    { lowerBound: 70, lowerInclusive: true, upperBound: 80, upperInclusive: false, score: 3 },
    { lowerBound: 80, lowerInclusive: true, upperBound: 90, upperInclusive: false, score: 4 },
    { lowerBound: 90, lowerInclusive: true, upperBound: null, upperInclusive: false, score: 5 },
  ];

  it('round-trips a higher-is-better rule set back into rows', () => {
    const simple = rulesToSimple(higherRules)!;
    expect(simple.direction).toBe('higher');
    expect(simple.rows.map((r) => r.score)).toEqual(['5', '4', '3', '2', '1']);
    expect(simple.rows.map((r) => r.threshold)).toEqual(['90', '80', '70', '60', '']);
    // Re-serialization reproduces the original rules exactly
    expect(buildAssessmentRules(simple.direction, simple.rows)).toEqual(higherRules);
  });

  it('round-trips a lower-is-better rule set (≤ boundaries)', () => {
    const lowerRules: AssessmentRule[] = [
      { lowerBound: null, lowerInclusive: true, upperBound: 0.5, upperInclusive: true, score: 5 },
      { lowerBound: 0.5, lowerInclusive: false, upperBound: 0.65, upperInclusive: true, score: 4 },
      { lowerBound: 0.65, lowerInclusive: false, upperBound: 0.85, upperInclusive: true, score: 3 },
      { lowerBound: 0.85, lowerInclusive: false, upperBound: 1, upperInclusive: true, score: 2 },
      { lowerBound: 1, lowerInclusive: false, upperBound: null, upperInclusive: false, score: 1 },
    ];
    const simple = rulesToSimple(lowerRules)!;
    expect(simple.direction).toBe('lower');
    expect(simple.rows.map((r) => r.score)).toEqual(['5', '4', '3', '2', '1']);
    expect(simple.rows.map((r) => r.threshold)).toEqual(['0.5', '0.65', '0.85', '1', '']);
    expect(buildAssessmentRules(simple.direction, simple.rows)).toEqual(lowerRules);
  });

  it('returns null for non-representable rule sets (exclusive best boundary)', () => {
    const exclusiveBest: AssessmentRule[] = [
      { lowerBound: null, lowerInclusive: true, upperBound: 60, upperInclusive: false, score: 1 },
      { lowerBound: 60, lowerInclusive: false, upperBound: null, upperInclusive: false, score: 2 },
    ];
    expect(rulesToSimple(exclusiveBest)).toBeNull();
  });

  it('returns null for duplicate-score rule sets (cannot map to unique levels)', () => {
    const dup: AssessmentRule[] = [
      { lowerBound: null, lowerInclusive: true, upperBound: 60, upperInclusive: false, score: 2 },
      { lowerBound: 60, lowerInclusive: true, upperBound: null, upperInclusive: false, score: 2 },
    ];
    expect(rulesToSimple(dup)).toBeNull();
  });

  it('returns null for empty or null rules', () => {
    expect(rulesToSimple(null)).toBeNull();
    expect(rulesToSimple([])).toBeNull();
  });

  it('returns null for rule sets with a gap (cannot be expressed by the table)', () => {
    const gap: AssessmentRule[] = [
      { lowerBound: null, lowerInclusive: true, upperBound: 50, upperInclusive: false, score: 1 },
      { lowerBound: 60, lowerInclusive: true, upperBound: null, upperInclusive: false, score: 2 },
    ];
    expect(rulesToSimple(gap)).toBeNull();
  });

  it('returns null for overlapping rule sets', () => {
    const overlap: AssessmentRule[] = [
      { lowerBound: null, lowerInclusive: true, upperBound: 70, upperInclusive: false, score: 1 },
      { lowerBound: 60, lowerInclusive: true, upperBound: null, upperInclusive: false, score: 2 },
    ];
    expect(rulesToSimple(overlap)).toBeNull();
  });

  it('returns null for bounds the simple table cannot represent (negative)', () => {
    const negative: AssessmentRule[] = [
      { lowerBound: null, lowerInclusive: true, upperBound: -10, upperInclusive: false, score: 1 },
      { lowerBound: -10, lowerInclusive: true, upperBound: null, upperInclusive: false, score: 2 },
    ];
    expect(rulesToSimple(negative)).toBeNull();
  });

  it('maps a single all-open rule to one "Any result" row', () => {
    const single: AssessmentRule[] = [
      { lowerBound: null, lowerInclusive: true, upperBound: null, upperInclusive: false, score: 7 },
    ];
    const simple = rulesToSimple(single)!;
    expect(simple.direction).toBe('higher');
    expect(simple.rows).toEqual([{ id: expect.any(String), score: '7', threshold: '' }]);
    expect(buildAssessmentRules(simple.direction, simple.rows)).toEqual(single);
  });
});

describe('rules JSON helpers', () => {
  it('round-trips rules through JSON', () => {
    const rules: AssessmentRule[] = [
      { lowerBound: null, lowerInclusive: true, upperBound: 60, upperInclusive: false, score: 1 },
    ];
    expect(parseAssessmentRules(rulesToJson(rules))).toEqual(rules);
    expect(parseAssessmentRules('')).toBeNull();
    expect(() => parseAssessmentRules('{bad json')).toThrow();
    expect(() => parseAssessmentRules('{"a":1}')).toThrow('JSON array');
  });
});
