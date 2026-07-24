/**
 * Corporate KPI error-mapper tests.
 * Maps known backend error details to user-facing English messages.
 */
import { mapKpiError } from '../corporate-kpi-error-mapper';

const fallback = 'Something went wrong while saving the Corporate KPI.';

describe('mapKpiError', () => {
  /* ── Known domain errors ── */

  it('maps duplicate code error', () => {
    const err = new Error('Corporate KPI code already exists in this year');
    expect(mapKpiError(err, fallback)).toBe(
      'A Corporate KPI with this code already exists for the selected year.',
    );
  });

  it('maps invalid parent error', () => {
    const err = new Error('An INDICATOR must have an ASPECT parent');
    expect(mapKpiError(err, fallback)).toBe(
      'The selected parent is not a valid Aspect.',
    );
  });

  it('maps parent-year mismatch error', () => {
    const err = new Error('Parent and child must be in the same year');
    expect(mapKpiError(err, fallback)).toBe(
      'The Indicator and its parent Aspect must belong to the same year.',
    );
  });

  it('maps parent status restriction error', () => {
    const err = new Error('An INDICATOR can only become ACTIVE when its parent ASPECT is ACTIVE');
    expect(mapKpiError(err, fallback)).toBe(
      'An Indicator cannot be activated while its parent Aspect is inactive.',
    );
  });

  it('maps entity not found error', () => {
    const err = new Error('Corporate KPI not found');
    expect(mapKpiError(err, fallback)).toBe(
      'The Corporate KPI could not be found.',
    );
  });

  it('maps forbidden error', () => {
    const err = new Error('ACCESS_DENIED');
    expect(mapKpiError(err, fallback)).toBe(
      'You do not have permission to perform this action.',
    );
  });

  /* ── Unknown / fallback ── */

  it('falls back for empty error message', () => {
    const err = new Error('');
    expect(mapKpiError(err, fallback)).toBe(fallback);
  });

  it('falls back for null error', () => {
    expect(mapKpiError(null, fallback)).toBe(fallback);
  });

  it('passes through unknown error', () => {
    const err = new Error('Some unexpected server problem');
    expect(mapKpiError(err, fallback)).toBe('Some unexpected server problem');
  });
});
