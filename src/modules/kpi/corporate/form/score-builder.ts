/**
 * Guided score-rule builder — pure helpers for the Corporate KPI form.
 *
 * The simple table (direction + score rows) serializes to EXACTLY the
 * contiguous backend assessment-rule ranges enforced by
 * `AssessmentRulesValidator`: first rule open below, last rule open above,
 * consecutive rules touching with XOR inclusivity at each boundary.
 */

import type { AssessmentRule } from '../corporate-kpi.types';

export type ScoreDirection = 'higher' | 'lower';

export interface ScoreRow {
  id: string;
  /** Score for this level (number string; must be unique across rows). */
  score: string;
  /**
   * Boundary for this level. The LAST (worst) row has no threshold — its
   * condition is derived ("Below X" / "Above X") from the previous row.
   */
  threshold: string;
}

let rowSeq = 0;
export function nextRowId(): string {
  rowSeq += 1;
  return `sr-${rowSeq}`;
}

/** Official default scaffold: 5 levels, scores 5..1, higher-is-better. */
export function defaultScoreRows(): ScoreRow[] {
  return [5, 4, 3, 2, 1].map((score) => ({
    id: nextRowId(),
    score: String(score),
    threshold: '',
  }));
}

const DECIMAL_RE = /^\d+(\.\d+)?$/;

/** Validate the simple table; returns an error message or null when valid. */
export function validateScoreRows(direction: ScoreDirection, rows: ScoreRow[]): string | null {
  if (rows.length === 0) return null; // no rules configured (staged DRAFT)
  const scores = new Set<string>();
  for (const row of rows) {
    const score = row.score.trim();
    if (!score) return 'Score is required for every level.';
    if (!DECIMAL_RE.test(score)) return 'Scores must be numbers.';
    if (scores.has(score)) return 'Scores must be unique — remove the duplicate score level.';
    scores.add(score);
  }
  const thresholds: number[] = [];
  for (let i = 0; i < rows.length - 1; i++) {
    const raw = rows[i].threshold.trim();
    if (!raw) return `Threshold is required for score ${rows[i].score.trim()}.`;
    if (!DECIMAL_RE.test(raw)) return `Threshold for score ${rows[i].score.trim()} must be a number.`;
    thresholds.push(Number(raw));
  }
  for (let i = 1; i < thresholds.length; i++) {
    if (direction === 'higher' && thresholds[i] >= thresholds[i - 1]) {
      return 'Thresholds must be strictly decreasing — each better score needs a higher boundary (no gaps or overlaps).';
    }
    if (direction === 'lower' && thresholds[i] <= thresholds[i - 1]) {
      return 'Thresholds must be strictly increasing — each better score needs a lower boundary (no gaps or overlaps).';
    }
  }
  return null;
}

/**
 * Serialize the simple table into the exact contiguous backend ranges.
 * Returns null when the table is invalid or empty.
 */
export function buildAssessmentRules(
  direction: ScoreDirection,
  rows: ScoreRow[],
): AssessmentRule[] | null {
  if (validateScoreRows(direction, rows) !== null || rows.length === 0) return null;
  const n = rows.length;
  const thresholdOf = (index: number) => Number(rows[index].threshold.trim());
  const rules: AssessmentRule[] = [];
  if (direction === 'higher') {
    // Rules ascend in value: worst row (open below) → best row (open above)
    for (let i = n - 1; i >= 0; i--) {
      const score = Number(rows[i].score.trim());
      if (i === n - 1) {
        // worst: (−∞, t[n-2])
        rules.push({
          lowerBound: null,
          lowerInclusive: true,
          upperBound: n >= 2 ? thresholdOf(n - 2) : null,
          upperInclusive: false,
          score,
        });
      } else if (i === 0) {
        // best: [t0, +∞)
        rules.push({
          lowerBound: thresholdOf(0),
          lowerInclusive: true,
          upperBound: null,
          upperInclusive: false,
          score,
        });
      } else {
        // middle: [t_i, t_{i-1})
        rules.push({
          lowerBound: thresholdOf(i),
          lowerInclusive: true,
          upperBound: thresholdOf(i - 1),
          upperInclusive: false,
          score,
        });
      }
    }
  } else {
    // lower-is-better: rules ascend in value — BEST row (open below) first
    for (let i = 0; i < n; i++) {
      const score = Number(rows[i].score.trim());
      if (i === 0) {
        // best: (−∞, t0]
        rules.push({
          lowerBound: null,
          lowerInclusive: true,
          upperBound: n >= 2 ? thresholdOf(0) : null,
          upperInclusive: true,
          score,
        });
      } else if (i === n - 1) {
        // worst: (t[n-2], +∞)
        rules.push({
          lowerBound: n >= 2 ? thresholdOf(n - 2) : null,
          lowerInclusive: false,
          upperBound: null,
          upperInclusive: false,
          score,
        });
      } else {
        // middle: (t_{i-1}, t_i]
        rules.push({
          lowerBound: thresholdOf(i - 1),
          lowerInclusive: false,
          upperBound: thresholdOf(i),
          upperInclusive: true,
          score,
        });
      }
    }
  }
  return rules;
}

/** Human-readable condition for one simple-mode row. */
export function rowCondition(direction: ScoreDirection, rows: ScoreRow[], index: number): string {
  if (rows.length === 1) return 'Any result';
  const t = (i: number) => rows[i].threshold.trim();
  if (direction === 'higher') {
    if (index === 0) return `${t(0)} or higher`;
    if (index === rows.length - 1) return `Below ${t(index - 1)}`;
    return `${t(index)} to below ${t(index - 1)}`;
  }
  if (index === 0) return `${t(0)} or lower`;
  if (index === rows.length - 1) return `Above ${t(index - 1)}`;
  return `Above ${t(index - 1)} to ${t(index)}`;
}

/** Backend apply — mirror of `AssessmentRulesValidator.apply` (assumes validated rules). */
export function applyRules(rules: AssessmentRule[], value: number): number | null {
  for (const rule of rules) {
    const aboveLower =
      rule.lowerBound == null ||
      (rule.lowerInclusive ? value >= rule.lowerBound : value > rule.lowerBound);
    const belowUpper =
      rule.upperBound == null ||
      (rule.upperInclusive ? value <= rule.upperBound : value < rule.upperBound);
    if (aboveLower && belowUpper) return rule.score;
  }
  return null;
}

/** Simulation: sample formula result → resulting score (null when invalid). */
export function simulateScore(
  direction: ScoreDirection,
  rows: ScoreRow[],
  value: number | null,
): number | null {
  if (value == null || Number.isNaN(value)) return null;
  const rules = buildAssessmentRules(direction, rows);
  if (!rules) return null;
  return applyRules(rules, value);
}

/**
 * Convert stored backend rules back into the simple table. Returns null when
 * the rule set cannot be represented safely (falls back to the Advanced rule
 * configuration so existing scoring behavior is never altered).
 */
export function rulesToSimple(
  rules: AssessmentRule[] | null | undefined,
): { direction: ScoreDirection; rows: ScoreRow[] } | null {
  if (!rules || rules.length === 0) return null;
  const n = rules.length;
  // Representable thresholds only (non-negative decimals — matches the simple table).
  const REPRESENTABLE = /^\d+(\.\d+)?$/;
  for (const rule of rules) {
    if (rule.lowerBound != null && !REPRESENTABLE.test(String(rule.lowerBound))) return null;
    if (rule.upperBound != null && !REPRESENTABLE.test(String(rule.upperBound))) return null;
  }
  // Contiguity: consecutive ranges must touch exactly — a gap or overlap cannot
  // be expressed by the simple table (it always serializes contiguous ranges).
  for (let i = 1; i < n; i++) {
    if (rules[i].lowerBound !== rules[i - 1].upperBound) return null;
  }
  // Degenerate single all-open rule: "Any result" (score X).
  if (n === 1 && rules[0].lowerBound == null && rules[0].upperBound == null) {
    return {
      direction: 'higher',
      rows: [{ id: nextRowId(), score: String(rules[0].score), threshold: '' }],
    };
  }
  const first = rules[0];
  if (first.lowerBound != null) return null; // must be open below
  if (first.upperBound == null) return null; // double-open only valid for n === 1

  if (first.upperInclusive) {
    // Lower-is-better: rules ascend in value, scores descend.
    if (first.upperBound == null) return null;
    for (let i = 1; i < n; i++) {
      const rule = rules[i];
      if (rule.lowerInclusive) return null;
      if (i < n - 1 && !rule.upperInclusive) return null;
      if (rule.score >= rules[i - 1].score) return null; // scores must strictly descend
    }
    if (rules[n - 1].upperBound != null) return null;
    if (rules[n - 1].lowerInclusive) return null;
    const rows: ScoreRow[] = rules.map((rule, i) => ({
      id: nextRowId(),
      score: String(rule.score),
      threshold: i < n - 1 ? String(rule.upperBound) : '',
    }));
    return { direction: 'lower', rows };
  }

  // Higher-is-better: rules ascend in value, scores ascend.
  for (let i = 1; i < n; i++) {
    const rule = rules[i];
    if (!rule.lowerInclusive) return null;
    if (i < n - 1 && rule.upperInclusive) return null;
    if (rule.score <= rules[i - 1].score) return null; // scores must strictly ascend
  }
  if (rules[n - 1].upperBound != null) return null;
  if (!rules[n - 1].lowerInclusive) return null;
  const rows: ScoreRow[] = [...rules].reverse().map((rule, i) => ({
    id: nextRowId(),
    score: String(rule.score),
    threshold: i < n - 1 ? String(rule.lowerBound) : '',
  }));
  return { direction: 'higher', rows };
}

/** Parse the advanced rules JSON; throws on malformed JSON. */
export function parseAssessmentRules(json: string | undefined): AssessmentRule[] | null {
  if (!json || !json.trim()) return null;
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    throw new Error('Assessment rules must be a JSON array.');
  }
  return parsed as AssessmentRule[];
}

/** assessmentRules → pretty JSON for the advanced editor. */
export function rulesToJson(rules: AssessmentRule[] | null | undefined): string {
  if (!rules || rules.length === 0) return '';
  return JSON.stringify(rules, null, 2);
}
