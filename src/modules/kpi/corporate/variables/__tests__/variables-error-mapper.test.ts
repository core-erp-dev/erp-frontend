/**
 * Variable mutation error mapping — the backend ANNUAL_REQUIRED lifecycle
 * conflict must surface as a clear delete-first instruction, never as a raw
 * server message.
 */
import { mapVariableError } from '../variables-error-mapper';

describe('mapVariableError', () => {
  it('maps the ANNUAL_REQUIRED mode-change conflict to a delete-first instruction', () => {
    const message = mapVariableError(
      new Error('Cannot change aggregation mode — delete the annual value first'),
      'fallback',
    );
    expect(message).toContain('Mode cannot be changed while an annual value exists');
    expect(message).toContain('KPI Values');
    expect(message).toContain('Delete the annual value first');
  });

  it('maps the annual-value mode mismatch to a clear explanation', () => {
    const message = mapVariableError(
      new Error('Annual values are only allowed for variables with aggregationMode ANNUAL_REQUIRED'),
      'fallback',
    );
    expect(message).toContain('aggregation mode');
    expect(message).toContain('ANNUAL_REQUIRED');
  });

  it('falls back for unknown errors', () => {
    expect(mapVariableError(new Error('something else'), 'fallback text')).toBe('fallback text');
  });
});
