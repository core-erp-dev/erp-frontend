/**
 * Guided formula builder helpers — serialization, readable preview,
 * backend-syntax validation, and guided round-trip.
 */
import {
  canAppend,
  serializeTokens,
  readableFormula,
  validateFormulaSyntax,
  validateTokenSequence,
  tokenizeGuidedFormula,
  isDecimalNumber,
  PERIOD_MONTH_COUNT,
} from '../formula-builder';
import type { FormulaToken } from '../formula-builder';

const tk = (id: string, kind: FormulaToken['kind'], value: string): FormulaToken => ({ id, kind, value });

describe('canAppend', () => {
  it('allows a first operand and an operand after an operator', () => {
    expect(canAppend([], 'variable')).toBe(true);
    expect(canAppend([tk('1', 'variable', 'ROI')], 'operator')).toBe(true);
    expect(canAppend([tk('1', 'variable', 'ROI'), tk('2', 'operator', '+')], 'number')).toBe(true);
  });

  it('blocks operators without an operand and operands after operands', () => {
    expect(canAppend([], 'operator')).toBe(false);
    expect(canAppend([tk('1', 'variable', 'ROI')], 'variable')).toBe(false);
    expect(canAppend([tk('1', 'variable', 'ROI'), tk('2', 'operator', '+')], 'operator')).toBe(false);
  });

  it('handles parentheses', () => {
    // '(' at the start or after an operator
    expect(canAppend([], 'paren', '(')).toBe(true);
    expect(canAppend([tk('1', 'variable', 'ROI'), tk('2', 'operator', '+')], 'paren', '(')).toBe(true);
    // '(' after an operand is blocked
    expect(canAppend([tk('1', 'variable', 'ROI')], 'paren', '(')).toBe(false);
    // ')' after an operand or another ')'
    expect(canAppend([tk('1', 'variable', 'ROI')], 'paren', ')')).toBe(true);
    expect(canAppend([tk('1', 'paren', '('), tk('2', 'variable', 'ROI'), tk('3', 'paren', ')')], 'paren', ')')).toBe(true);
    // ')' at the start or after an operator is blocked
    expect(canAppend([], 'paren', ')')).toBe(false);
    expect(canAppend([tk('1', 'variable', 'ROI'), tk('2', 'operator', '+')], 'paren', ')')).toBe(false);
  });
});

describe('validateTokenSequence', () => {
  it('accepts well-formed sequences including parentheses', () => {
    expect(validateTokenSequence([tk('1', 'variable', 'ROI'), tk('2', 'operator', '+'), tk('3', 'variable', 'NPM')])).toBeNull();
    expect(
      validateTokenSequence([
        tk('1', 'paren', '('),
        tk('2', 'variable', 'ROI'),
        tk('3', 'operator', '+'),
        tk('4', 'variable', 'NPM'),
        tk('5', 'paren', ')'),
        tk('6', 'operator', '/'),
        tk('7', 'number', '2'),
      ]),
    ).toBeNull();
    expect(validateTokenSequence([tk('1', 'number', '100')])).toBeNull();
    expect(validateTokenSequence([])).toBeNull();
  });

  it('rejects dangling operators and adjacent operands', () => {
    expect(validateTokenSequence([tk('1', 'variable', 'ROI'), tk('2', 'operator', '+')])).toContain('end with an operator');
    expect(validateTokenSequence([tk('1', 'operator', '+'), tk('2', 'variable', 'ROI')])).toContain('must follow');
    expect(validateTokenSequence([tk('1', 'variable', 'ROI'), tk('2', 'variable', 'NPM')])).toContain('separated by an operator');
  });

  it('rejects unbalanced parentheses', () => {
    expect(validateTokenSequence([tk('1', 'paren', '('), tk('2', 'variable', 'ROI')])).toContain('unbalanced');
    expect(validateTokenSequence([tk('1', 'variable', 'ROI'), tk('2', 'paren', ')')])).toContain('unbalanced');
    expect(validateTokenSequence([tk('1', 'paren', '('), tk('2', 'paren', ')')])).not.toBeNull();
  });
});

describe('isDecimalNumber', () => {
  it('matches the backend number grammar', () => {
    expect(isDecimalNumber('100')).toBe(true);
    expect(isDecimalNumber('0.5')).toBe(true);
    expect(isDecimalNumber(' 42 ')).toBe(true);
    expect(isDecimalNumber('')).toBe(false);
    expect(isDecimalNumber('1e3')).toBe(false);
    expect(isDecimalNumber('-5')).toBe(false);
    expect(isDecimalNumber('.5')).toBe(false);
  });
});

describe('serializeTokens', () => {
  it('serializes to the exact backend formula string', () => {
    expect(
      serializeTokens([
        tk('1', 'variable', 'NET_PROFIT_AFTER_TAX'),
        tk('2', 'operator', '/'),
        tk('3', 'variable', 'TOTAL_EQUITY'),
      ]),
    ).toBe('NET_PROFIT_AFTER_TAX / TOTAL_EQUITY');
  });

  it('serializes the built-in symbol and numbers', () => {
    expect(
      serializeTokens([
        tk('1', 'variable', 'ROI'),
        tk('2', 'operator', '*'),
        tk('3', 'symbol', PERIOD_MONTH_COUNT),
        tk('4', 'operator', '+'),
        tk('5', 'number', '100'),
      ]),
    ).toBe('ROI * PERIOD_MONTH_COUNT + 100');
  });
});

describe('readableFormula', () => {
  it('shows variable names, symbol words, and ÷/× operators', () => {
    const names = { NET_PROFIT_AFTER_TAX: 'Net Profit After Tax', TOTAL_EQUITY: 'Total Equity' };
    expect(
      readableFormula(
        [
          tk('1', 'variable', 'NET_PROFIT_AFTER_TAX'),
          tk('2', 'operator', '/'),
          tk('3', 'variable', 'TOTAL_EQUITY'),
        ],
        names,
      ),
    ).toBe('Net Profit After Tax ÷ Total Equity');
    expect(
      readableFormula(
        [tk('1', 'variable', 'ROI'), tk('2', 'operator', '*'), tk('3', 'symbol', PERIOD_MONTH_COUNT)],
        {},
      ),
    ).toBe('ROI × months in the period');
  });
});

describe('validateFormulaSyntax', () => {
  it('accepts backend-valid formulas', () => {
    expect(validateFormulaSyntax('ROI + NPM')).toBeNull();
    expect(validateFormulaSyntax('(ROI + NPM) / 2')).toBeNull();
    expect(validateFormulaSyntax('NET_PROFIT_AFTER_TAX / TOTAL_EQUITY')).toBeNull();
    expect(validateFormulaSyntax('ROI * PERIOD_MONTH_COUNT + 100')).toBeNull();
    expect(validateFormulaSyntax('100')).toBeNull();
  });

  it('rejects invalid syntax', () => {
    expect(validateFormulaSyntax('')).not.toBeNull();
    expect(validateFormulaSyntax('ROI +')).not.toBeNull();
    expect(validateFormulaSyntax('+ ROI')).not.toBeNull();
    expect(validateFormulaSyntax('(ROI + NPM')).not.toBeNull();
    expect(validateFormulaSyntax('ROI + NPM)')).not.toBeNull();
    expect(validateFormulaSyntax('roi + npm')).not.toBeNull(); // lowercase identifiers
    expect(validateFormulaSyntax('ROI AND NPM')).not.toBeNull();
    expect(validateFormulaSyntax('ROI > 5')).not.toBeNull();
    expect(validateFormulaSyntax('ROI--NPM')).not.toBeNull();
  });
});

describe('tokenizeGuidedFormula', () => {
  it('round-trips a linear formula into guided tokens', () => {
    const tokens = tokenizeGuidedFormula('NET_PROFIT_AFTER_TAX / TOTAL_EQUITY');
    expect(tokens).not.toBeNull();
    expect(serializeTokens(tokens!)).toBe('NET_PROFIT_AFTER_TAX / TOTAL_EQUITY');
    expect(tokens!.map((t) => t.kind)).toEqual(['variable', 'operator', 'variable']);
  });

  it('treats PERIOD_MONTH_COUNT as a symbol', () => {
    const tokens = tokenizeGuidedFormula('ROI * PERIOD_MONTH_COUNT');
    expect(tokens!.map((t) => t.kind)).toEqual(['variable', 'operator', 'symbol']);
  });

  it('round-trips parenthesized formulas into guided tokens', () => {
    const tokens = tokenizeGuidedFormula('(ROI + NPM) / 2');
    expect(tokens).not.toBeNull();
    expect(serializeTokens(tokens!)).toBe('( ROI + NPM ) / 2');
    expect(tokens!.map((t) => t.kind)).toEqual(['paren', 'variable', 'operator', 'variable', 'paren', 'operator', 'number']);
  });

  it('returns tokens for invalid-but-representable formulas (validated separately)', () => {
    // A variable followed by an unmatched closing parenthesis must round-trip
    const tokens = tokenizeGuidedFormula('ACTIVE_DOMESTIC_CUSTOMER_COUNT )');
    expect(tokens).not.toBeNull();
    expect(tokens!.map((t) => t.kind)).toEqual(['variable', 'paren']);
    expect(serializeTokens(tokens!)).toBe('ACTIVE_DOMESTIC_CUSTOMER_COUNT )');
    // Trailing operator and unbalanced parens are also representable
    expect(serializeTokens(tokenizeGuidedFormula('ROI +')!)).toBe('ROI +');
    expect(serializeTokens(tokenizeGuidedFormula('(ROI + NPM')!)).toBe('( ROI + NPM');
    expect(serializeTokens(tokenizeGuidedFormula('ROI + NPM)')!)).toBe('ROI + NPM )');
  });

  it('returns null only for genuinely unsupported syntax (advanced mode only)', () => {
    expect(tokenizeGuidedFormula('roi + npm')).toBeNull(); // lowercase identifiers
    expect(tokenizeGuidedFormula('ROI $ NPM')).toBeNull(); // unsupported character
    expect(tokenizeGuidedFormula('ROI 1.2.3')).toBeNull(); // malformed number
  });

  it('returns an empty list for an empty formula', () => {
    expect(tokenizeGuidedFormula('')).toEqual([]);
    expect(tokenizeGuidedFormula(null)).toEqual([]);
    expect(tokenizeGuidedFormula(undefined)).toEqual([]);
  });
});
