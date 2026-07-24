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

  it('returns fallback for unknown error', () => {
    const err = new Error('Some unexpected server problem');
    expect(mapKpiError(err, fallback)).toBe(fallback);
  });

  /* ── Safety: raw technical content must never be exposed ── */

  it('does not expose Spring exception class names', () => {
    const err = new Error('org.springframework.dao.DataIntegrityViolationException');
    expect(mapKpiError(err, fallback)).not.toMatch(/org\.springframework/);
    expect(mapKpiError(err, fallback)).toBe(fallback);
  });

  it('does not expose PSQLException', () => {
    const err = new Error('PSQLException: ERROR: duplicate key value violates unique constraint');
    expect(mapKpiError(err, fallback)).not.toMatch(/PSQLException|duplicate key|unique constraint/);
    expect(mapKpiError(err, fallback)).toBe(fallback);
  });

  it('does not expose SQL constraint text', () => {
    const err = new Error('ERROR: null value in column "unit" violates not-null constraint');
    expect(mapKpiError(err, fallback)).not.toMatch(/null value|violates not-null|column/);
    expect(mapKpiError(err, fallback)).toBe(fallback);
  });

  it('does not expose stack-trace-like content', () => {
    const err = new Error('Error\n\tat com.erp.kpi.service.create(CorporateKpiServiceImpl.java:142)');
    const result = mapKpiError(err, fallback);
    expect(result).not.toMatch(/\n/);
    expect(result).not.toMatch(/\.java/);
    expect(result).toBe(fallback);
  });

  it('does not expose internal Java class names', () => {
    const err = new Error('com.erp.kpi.entity.CorporateKpi cannot be cast to');
    expect(mapKpiError(err, fallback)).not.toMatch(/com\.erp/);
    expect(mapKpiError(err, fallback)).toBe(fallback);
  });

  it('uses generic message for network errors', () => {
    const err = new Error('Network Error');
    expect(mapKpiError(err, fallback)).toBe(fallback);
  });

  it('uses specific message for 403 errors', () => {
    const err = new Error('ACCESS_DENIED');
    expect(mapKpiError(err, fallback)).toMatch(/permission/);
  });

  it('uses specific message for 404 errors', () => {
    const err = new Error('Corporate KPI not found');
    expect(mapKpiError(err, fallback)).toMatch(/could not be found/);
  });
});
