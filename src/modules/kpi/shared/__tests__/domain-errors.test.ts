/**
 * Domain-error classification tests — backend MessageConstants strings must
 * map to recoverable conflict kinds so mutations surface a banner + refetch
 * instead of a generic unknown-error toast.
 */
import {
  classifyActivityError,
  classifyReportError,
  recoverableConflict,
} from '../domain-errors';

describe('classifyActivityError', () => {
  it('classifies already-processed', () => {
    expect(classifyActivityError('Request has already been processed')).toBe('already-processed');
  });

  it('classifies version-conflict', () => {
    expect(classifyActivityError('Activity was modified by another user — reload and retry')).toBe('version-conflict');
  });

  it('classifies duplicate-pending', () => {
    expect(classifyActivityError('A pending update or cancel request already exists for this activity')).toBe('duplicate-pending');
  });

  it('classifies own-request (exact backend string)', () => {
    expect(classifyActivityError('Cannot approve your own request')).toBe('own-request');
  });

  it('no longer recognizes the removed stored-approver message (centralized queue)', () => {
    expect(classifyActivityError('You are not the assigned approver for this request')).toBe('other');
  });

  it('falls back to other for unknown strings', () => {
    expect(classifyActivityError('Some unrelated failure')).toBe('other');
  });
});

describe('classifyReportError', () => {
  it('classifies already-processed', () => {
    expect(classifyReportError('Report has already been processed')).toBe('already-processed');
  });

  it('classifies not-reviewer', () => {
    expect(classifyReportError('You are not the designated reviewer for this report')).toBe('not-reviewer');
  });

  it('classifies own-report', () => {
    expect(classifyReportError('Cannot review your own report')).toBe('own-report');
  });

  it('falls back to other for unknown strings', () => {
    expect(classifyReportError('Evidence file not found')).toBe('other');
  });
});

describe('recoverableConflict', () => {
  it('produces a refetchable descriptor', () => {
    const conflict = recoverableConflict('already-processed');
    expect(conflict.kind).toBe('already-processed');
    expect(conflict.refetch).toBe(true);
    expect(conflict.message.length).toBeGreaterThan(0);
  });
});
