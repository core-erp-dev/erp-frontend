/**
 * Guided formula builder — pure helpers for the Corporate KPI form.
 *
 * The serialized form is EXACTLY the backend formula syntax accepted by
 * `FormulaEvaluator`: `+ - * /`, parentheses, numbers `\d+(\.\d+)?`, and
 * uppercase identifiers `^[A-Z][A-Z0-9_]*$`. The only built-in symbol is
 * `PERIOD_MONTH_COUNT` (reserved by the backend: 1 for a monthly scope,
 * 12 for the annual scope).
 */

export type FormulaTokenKind = 'variable' | 'number' | 'symbol' | 'operator' | 'paren';

export interface FormulaToken {
  id: string;
  kind: FormulaTokenKind;
  /** variable code / number literal / PERIOD_MONTH_COUNT / operator char / '(' or ')' */
  value: string;
}

let tokenSeq = 0;
export function nextTokenId(): string {
  tokenSeq += 1;
  return `ft-${tokenSeq}`;
}

export const PERIOD_MONTH_COUNT = 'PERIOD_MONTH_COUNT';
export const PERIOD_MONTH_COUNT_LABEL = 'months in the period';

/** Human-readable operator symbols (readable preview only — never serialized). */
export const OPERATOR_LABELS: Record<string, string> = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
};

/** Constant inputs must match the backend number grammar `\d+(\.\d+)?`. */
export function isDecimalNumber(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value.trim());
}

const isOperand = (kind: FormulaTokenKind) =>
  kind === 'variable' || kind === 'number' || kind === 'symbol';
const isOpenParen = (t: { kind: FormulaTokenKind; value: string } | undefined) =>
  !!t && t.kind === 'paren' && t.value === '(';
const isCloseParen = (t: { kind: FormulaTokenKind; value: string } | undefined) =>
  !!t && t.kind === 'paren' && t.value === ')';

/** Whether a token of `kind` (and `value` for parentheses) may be appended. */
export function canAppend(tokens: FormulaToken[], kind: FormulaTokenKind, value?: string): boolean {
  const last = tokens[tokens.length - 1];
  if (kind === 'operator') {
    return tokens.length > 0 && (isOperand(last.kind) || isCloseParen(last));
  }
  if (kind === 'paren') {
    if (value === ')') {
      return tokens.length > 0 && (isOperand(last.kind) || isCloseParen(last));
    }
    // '('
    return tokens.length === 0 || last.kind === 'operator' || isOpenParen(last);
  }
  // operands (variable / number / symbol)
  return tokens.length === 0 || last.kind === 'operator' || isOpenParen(last);
}

/**
 * Structural validation of a token sequence (balanced parentheses +
 * operand/operator alternation). Returns an error message, or null when the
 * sequence is a well-formed backend expression. An empty list is valid.
 */
export function validateTokenSequence(tokens: { kind: FormulaTokenKind; value: string }[]): string | null {
  if (tokens.length === 0) return null;
  let depth = 0;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const prev = i > 0 ? tokens[i - 1] : undefined;
    if (token.kind === 'paren') {
      if (token.value === '(') {
        depth += 1;
        if (prev && !(prev.kind === 'operator' || isOpenParen(prev))) {
          return 'Invalid formula: "(" must follow an operator or another "(".';
        }
      } else {
        depth -= 1;
        if (depth < 0) return 'Invalid formula: unbalanced parentheses.';
        if (!prev || !(isOperand(prev.kind) || isCloseParen(prev))) {
          return 'Invalid formula: ")" must follow an operand or another ")".';
        }
      }
      continue;
    }
    if (isOperand(token.kind)) {
      if (prev && !(prev.kind === 'operator' || isOpenParen(prev))) {
        return 'Operands must be separated by an operator.';
      }
    } else {
      // operator
      if (!prev || !(isOperand(prev.kind) || isCloseParen(prev))) {
        return 'An operator must follow an operand or a closing parenthesis.';
      }
    }
  }
  if (depth !== 0) return 'Invalid formula: unbalanced parentheses.';
  const last = tokens[tokens.length - 1];
  if (last.kind === 'operator') return 'The formula cannot end with an operator.';
  if (isOpenParen(last)) return 'The formula cannot end with an open parenthesis.';
  return null;
}

/** Serialize guided tokens into the exact backend formula string. */
export function serializeTokens(tokens: FormulaToken[]): string {
  return tokens.map((t) => t.value).join(' ');
}

/** Human-readable preview: variable names, symbol words, and ÷/×/− operators. */
export function readableFormula(
  tokens: FormulaToken[],
  nameByCode: Record<string, string>,
): string {
  return tokens
    .map((t) => {
      if (t.kind === 'operator') return OPERATOR_LABELS[t.value] ?? t.value;
      if (t.kind === 'paren') return t.value;
      if (t.kind === 'symbol') return PERIOD_MONTH_COUNT_LABEL;
      if (t.kind === 'variable') return nameByCode[t.value] ?? t.value;
      return t.value;
    })
    .join(' ');
}

/* ── Raw formula syntax (mirrors the backend recursive-descent grammar) ── */

const IDENT_RE = /^[A-Z][A-Z0-9_]*$/;
const NUMBER_RE = /^\d+(\.\d+)?$/;

interface RawToken {
  type: 'operand' | 'operator' | 'paren';
  value: string;
}

/** Tokenize a raw backend formula; null on any syntax error. */
export function tokenizeRawFormula(formula: string): RawToken[] | null {
  if (!formula || !formula.trim()) return null;
  const out: RawToken[] = [];
  const s = formula;
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if (c === '(' || c === ')') {
      out.push({ type: 'paren', value: c });
      i += 1;
      continue;
    }
    if (c === '+' || c === '-' || c === '*' || c === '/') {
      out.push({ type: 'operator', value: c });
      i += 1;
      continue;
    }
    if (c >= 'A' && c <= 'Z') {
      const start = i;
      while (i < s.length && /[A-Z0-9_]/.test(s[i])) i += 1;
      const token = s.slice(start, i);
      if (!IDENT_RE.test(token)) return null;
      out.push({ type: 'operand', value: token });
      continue;
    }
    if (c >= '0' && c <= '9') {
      const start = i;
      while (i < s.length && /[0-9.]/.test(s[i])) i += 1;
      const token = s.slice(start, i);
      if (!NUMBER_RE.test(token)) return null;
      out.push({ type: 'operand', value: token });
      continue;
    }
    return null;
  }
  return out.length > 0 ? out : null;
}

/**
 * Validate a raw backend formula (parentheses allowed). Returns an error
 * message, or null when the formula matches the backend grammar exactly.
 */
export function validateFormulaSyntax(formula: string): string | null {
  const tokens = tokenizeRawFormula(formula);
  if (!tokens) return 'Formula syntax is invalid.';
  const fail = () => 'Formula syntax is invalid.';
  let pos = 0;
  const parseExpression = (): boolean => {
    if (!parseTerm()) return false;
    while (pos < tokens.length && tokens[pos].type === 'operator') {
      pos += 1;
      if (!parseTerm()) return false;
    }
    return true;
  };
  const parseTerm = (): boolean => {
    if (!parseFactor()) return false;
    while (pos < tokens.length && tokens[pos].type === 'operator') {
      pos += 1;
      if (!parseFactor()) return false;
    }
    return true;
  };
  const parseFactor = (): boolean => {
    if (pos >= tokens.length) return false;
    const t = tokens[pos];
    if (t.type === 'operand') {
      pos += 1;
      return true;
    }
    if (t.type === 'paren' && t.value === '(') {
      pos += 1;
      if (!parseExpression()) return false;
      if (pos >= tokens.length || tokens[pos].type !== 'paren' || tokens[pos].value !== ')') {
        return false;
      }
      pos += 1;
      return true;
    }
    return false;
  };
  if (!parseExpression()) return fail();
  return pos === tokens.length ? null : fail();
}

/**
 * Tokenize a formula for the GUIDED builder (parentheses supported).
 *
 * Representability vs validity are intentionally separate: this function
 * returns tokens for ANY sequence the backend token grammar can express
 * (uppercase codes, numbers, `+ - * /`, parentheses) — even structurally
 * INVALID ones such as `ACTIVE_DOMESTIC_CUSTOMER_COUNT )` or `ROI +`. Those
 * render in Guided mode with a danger alert (see `validateTokenSequence`)
 * and must round-trip back to Advanced losslessly. Returns null only for
 * genuinely unsupported syntax (lowercase codes, invalid characters or
 * malformed numbers) — such formulas stay in the Advanced editor.
 * An empty formula returns an empty token list.
 */
export function tokenizeGuidedFormula(formula: string | null | undefined): FormulaToken[] | null {
  if (!formula || !formula.trim()) return [];
  const raw = tokenizeRawFormula(formula);
  if (!raw) return null;
  return raw.map((t) => {
    if (t.type === 'paren') return { id: nextTokenId(), kind: 'paren', value: t.value };
    if (t.type === 'operator') return { id: nextTokenId(), kind: 'operator', value: t.value };
    const kind: FormulaTokenKind =
      t.value === PERIOD_MONTH_COUNT ? 'symbol' : IDENT_RE.test(t.value) ? 'variable' : 'number';
    return { id: nextTokenId(), kind, value: t.value };
  });
}
