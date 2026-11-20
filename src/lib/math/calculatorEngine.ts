import Decimal from 'decimal.js';
import { all, create, type MathJsInstance } from 'mathjs';
import type { AngleUnit, NotationMode } from '../../types/calculator';

// Configure high-precision Decimal.js
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

const math: MathJsInstance = create(all, {
  number: 'number',
  precision: 32,
});

export interface EvaluationOptions {
  angleUnit?: AngleUnit;
  precision?: number;
  thousandsSeparator?: boolean;
  scientificNotation?: boolean;
  notationMode?: NotationMode;
  ans?: string;
}

export interface EvaluationResult {
  ok: boolean;
  rawResult: string;
  formattedResult: string;
  numericValue?: number;
  isComplex?: boolean;
  error?: string;
  engineUsed: 'decimal' | 'mathjs';
}

const MAX_EXPRESSION_LENGTH = 500;

/**
 * Normalizes human-friendly math symbols into canonical expression syntax.
 * Rejects dangerous or non-mathematical tokens (never uses JS eval).
 */
export function normalizeExpression(raw: string, ansValue = '0'): string {
  let expr = raw.trim();
  if (!expr) return '';

  // Reject unsafe characters or JS injection patterns immediately
  if (/[;`${}\\"']|__proto__|constructor|prototype|window|document|eval|Function/i.test(expr)) {
    throw new Error('Invalid or unsupported expression characters');
  }

  expr = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, 'pi')
    .replace(/φ/g, 'phi')
    .replace(/τ/g, '(2*pi)')
    .replace(/√\(/g, 'sqrt(')
    .replace(/√(\d+(?:\.\d+)?)/g, 'sqrt($1)')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/\bans\b/gi, `(${ansValue || '0'})`)
    .replace(/\blog10\(/g, 'log10(')
    .replace(/\blog\(/g, 'log10(')
    .replace(/\bln\(/g, 'log(')
    .replace(/\blog2\(/g, 'log2(')
    .replace(/\bsin⁻¹\(/g, 'asin(')
    .replace(/\bcos⁻¹\(/g, 'acos(')
    .replace(/\btan⁻¹\(/g, 'atan(')
    .replace(/\bmod\b/gi, ' mod ');

  // Support nPr(n,r) & nCr(n,r) and infix "5 P 2" / "5 C 2"
  expr = expr
    .replace(/(\d+(?:\.\d+)?)\s*P\s*(\d+(?:\.\d+)?)/g, 'permutations($1, $2)')
    .replace(/(\d+(?:\.\d+)?)\s*C\s*(\d+(?:\.\d+)?)/g, 'combinations($1, $2)')
    .replace(/\bnPr\(/g, 'permutations(')
    .replace(/\bnCr\(/g, 'combinations(');

  // Convert percentage suffixes like `15%` -> `(15/100)` without clobbering modulo `a % b`
  expr = expr.replace(/(\d+(?:\.\d+)?)\s*%(?!\s*[\d(])/g, '($1/100)');
  expr = expr.replace(/\)\s*%(?!\s*[\d(])/g, ')/100');

  // Implicit multiplication: `2pi`, `2(3)`, `(2)(3)`, `3sin(30)`, `)sin(`, `)x` (preserve `1e-5`, `log10(`, `log2(`)
  expr = expr
    .replace(
      /(?<![a-zA-Z_])(\d+)\s*(pi|phi|e(?![+-]?\d)|i|sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|sqrt|cbrt|nroot|log10|log2|logb|log|abs|floor|ceil|round|exp|conj|re|im|arg|permutations|combinations)\b/g,
      '$1*$2'
    )
    .replace(/(?<![a-zA-Z0-9_])(\d+(?:\.\d+)?)\s*\(/g, '$1*(')
    .replace(/\)\s*\(/g, ')*(')
    .replace(/\)\s*(\d|pi|phi|e(?![+-]?\d))\b/g, ')*$1');

  return expr;
}

/**
 * Checks if expression is pure decimal arithmetic (+, -, *, /, ^, %, parentheses, numbers)
 * so we can evaluate with exact Decimal.js precision (avoiding 0.1 + 0.2 = 0.30000000000000004).
 */
function isPureDecimalExpression(expr: string): boolean {
  if (!expr) return false;
  return /^[0-9+\-*/^().\s]+$/.test(expr) && !/\*\*|\/\//.test(expr);
}

/**
 * Shunting-yard + RPN evaluator backed strictly by Decimal.js (no eval).
 */
function evaluateWithDecimal(expr: string): Decimal {
  const tokens: string[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let numStr = '';
      let dotCount = 0;
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        if (expr[i] === '.') dotCount++;
        if (dotCount > 1) throw new Error('Invalid decimal number');
        numStr += expr[i++];
      }
      if (numStr === '.') throw new Error('Invalid decimal point');
      tokens.push(numStr);
      continue;
    }
    if ('+-*/^()'.includes(ch)) {
      const prev = tokens[tokens.length - 1];
      if ((ch === '-' || ch === '+') && (!prev || '+-*/^('.includes(prev))) {
        if (ch === '-') {
          tokens.push('u-');
        }
        i++;
        continue;
      }
      tokens.push(ch);
      i++;
      continue;
    }
    throw new Error(`Unexpected character '${ch}'`);
  }

  const precedence: Record<string, number> = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2,
    'u-': 3,
    '^': 4,
  };
  const rightAssoc = new Set(['^', 'u-']);

  const output: string[] = [];
  const ops: string[] = [];

  for (const tok of tokens) {
    if (/^[0-9.]+$/.test(tok)) {
      output.push(tok);
    } else if (tok === '(') {
      ops.push(tok);
    } else if (tok === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') {
        output.push(ops.pop()!);
      }
      if (!ops.length || ops[ops.length - 1] !== '(') {
        throw new Error('Mismatched parentheses');
      }
      ops.pop();
    } else {
      while (ops.length) {
        const top = ops[ops.length - 1];
        if (top === '(') break;
        const pTok = precedence[tok];
        const pTop = precedence[top];
        if ((!rightAssoc.has(tok) && pTok <= pTop) || (rightAssoc.has(tok) && pTok < pTop)) {
          output.push(ops.pop()!);
        } else {
          break;
        }
      }
      ops.push(tok);
    }
  }

  while (ops.length) {
    const op = ops.pop()!;
    if (op === '(' || op === ')') throw new Error('Mismatched parentheses');
    output.push(op);
  }

  const stack: Decimal[] = [];
  for (const tok of output) {
    if (/^[0-9.]+$/.test(tok)) {
      stack.push(new Decimal(tok));
    } else if (tok === 'u-') {
      if (stack.length < 1) throw new Error('Invalid unary negation');
      stack.push(stack.pop()!.neg());
    } else {
      if (stack.length < 2) throw new Error('Incomplete expression');
      const b = stack.pop()!;
      const a = stack.pop()!;
      switch (tok) {
        case '+':
          stack.push(a.plus(b));
          break;
        case '-':
          stack.push(a.minus(b));
          break;
        case '*':
          stack.push(a.times(b));
          break;
        case '/':
          if (b.isZero()) throw new Error('Division by zero');
          stack.push(a.div(b));
          break;
        case '^':
          if (a.isNegative() && !b.isInteger()) {
            throw new Error('Complex power requires scientific engine');
          }
          stack.push(a.pow(b));
          break;
      }
    }
  }

  if (stack.length !== 1) throw new Error('Invalid expression syntax');
  const res = stack[0];
  if (!res.isFinite()) throw new Error('Numeric overflow');
  return res;
}

export function formatNumericResult(
  value: number | Decimal | string,
  options: {
    precision?: number;
    thousandsSeparator?: boolean;
    scientificNotation?: boolean;
    notationMode?: NotationMode;
  } = {}
): string {
  const precision = Math.max(1, Math.min(16, options.precision ?? 10));
  const useSep = options.thousandsSeparator ?? true;
  const mode: NotationMode = options.notationMode ?? (options.scientificNotation ? 'scientific' : 'auto');

  if (typeof value === 'string') return value;

  const d = value instanceof Decimal ? value : new Decimal(value);
  if (!d.isFinite()) {
    if (d.isNaN()) return 'Error';
    return d.isNegative() ? '-∞' : '∞';
  }

  if (d.isZero()) return '0';

  const abs = d.abs();

  if (mode === 'engineering') {
    const expRaw = abs.log(10).floor().div(3).floor().times(3).toNumber();
    let exp3 = expRaw;
    let mantissa = d.div(new Decimal(10).pow(exp3));
    let rounded = mantissa.toDecimalPlaces(Math.min(precision, 12), Decimal.ROUND_HALF_UP);
    if (rounded.abs().gte(1000)) {
      exp3 += 3;
      mantissa = mantissa.div(1000);
      rounded = mantissa.toDecimalPlaces(Math.min(precision, 12), Decimal.ROUND_HALF_UP);
    }
    const mantStr = rounded.toFixed().replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
    const expSign = exp3 >= 0 ? '+' : '';
    return `${mantStr}e${expSign}${exp3}`;
  }

  if (mode === 'scientific' || abs.gte('1e12') || (abs.gt(0) && abs.lt('1e-8'))) {
    const expStr = d.toExponential(Math.min(precision, 12));
    return expStr.replace(/(\.\d*?[1-9])0+e/, '$1e').replace(/\.0+e/, 'e');
  }

  // Round to configured significant decimal places and strip trailing zeros
  const fixed = d.toDecimalPlaces(precision, Decimal.ROUND_HALF_UP).toFixed();
  const [intPart, fracPart] = fixed.split('.');
  const cleanFrac = fracPart ? fracPart.replace(/0+$/, '') : '';
  const formattedInt = useSep ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : intPart;

  return cleanFrac ? `${formattedInt}.${cleanFrac}` : formattedInt;
}

function buildMathScope(angleUnit: AngleUnit) {
  const toRad = (x: number) => (angleUnit === 'DEG' ? (x * Math.PI) / 180 : x);
  const fromRad = (x: number) => (angleUnit === 'DEG' ? (x * 180) / Math.PI : x);

  return {
    phi: (1 + Math.sqrt(5)) / 2,
    sin: (x: unknown) => {
      if (typeof x === 'number') {
        const rad = toRad(x);
        const val = Math.sin(rad);
        return Math.abs(val) < 1e-15 ? 0 : val;
      }
      return math.sin(x as Parameters<typeof math.sin>[0]);
    },
    cos: (x: unknown) => {
      if (typeof x === 'number') {
        const rad = toRad(x);
        const val = Math.cos(rad);
        return Math.abs(val) < 1e-15 ? 0 : val;
      }
      return math.cos(x as Parameters<typeof math.cos>[0]);
    },
    tan: (x: unknown) => {
      if (typeof x === 'number') {
        if (angleUnit === 'DEG' && Math.abs((x % 180) - 90) < 1e-12) {
          throw new Error('Undefined (tan at 90°)');
        }
        const val = Math.tan(toRad(x));
        if (Math.abs(val) > 1e15) throw new Error('Undefined (asymptote)');
        return Math.abs(val) < 1e-15 ? 0 : val;
      }
      return math.tan(x as Parameters<typeof math.tan>[0]);
    },
    asin: (x: number) => {
      if (typeof x === 'number' && (x < -1 || x > 1)) {
        return math.asin(x);
      }
      return fromRad(Math.asin(x));
    },
    acos: (x: number) => {
      if (typeof x === 'number' && (x < -1 || x > 1)) {
        return math.acos(x);
      }
      return fromRad(Math.acos(x));
    },
    atan: (x: number) => fromRad(Math.atan(x)),
    logb: (x: number, base: number) => {
      if (base <= 0 || base === 1) throw new Error('Invalid logarithm base');
      if (x <= 0) throw new Error('Logarithm domain error (x ≤ 0)');
      return Math.log(x) / Math.log(base);
    },
    log2: (x: number) => {
      if (x <= 0) throw new Error('Logarithm domain error (x ≤ 0)');
      return Math.log2(x);
    },
    log10: (x: number) => {
      if (x <= 0) throw new Error('Logarithm domain error (x ≤ 0)');
      return Math.log10(x);
    },
    nroot: (x: number, n: number) => {
      if (n === 0) throw new Error('0th root is undefined');
      if (x < 0 && n % 2 !== 0) return -Math.pow(-x, 1 / n);
      return math.nthRoot(x, n);
    },
    conj: (z: unknown) => math.conj(z as Parameters<typeof math.conj>[0]),
    re: (z: unknown) => math.re(z as Parameters<typeof math.re>[0]),
    im: (z: unknown) => math.im(z as Parameters<typeof math.im>[0]),
    arg: (z: unknown) => {
      const rad = Number(math.arg(z as Parameters<typeof math.arg>[0]));
      return angleUnit === 'DEG' ? (rad * 180) / Math.PI : rad;
    },
  };
}

export function evaluateExpression(rawExpr: string, options: EvaluationOptions = {}): EvaluationResult {
  const {
    angleUnit = 'DEG',
    precision = 10,
    thousandsSeparator = true,
    scientificNotation = false,
    notationMode,
    ans = '0',
  } = options;

  const resolvedMode: NotationMode = notationMode ?? (scientificNotation ? 'scientific' : 'auto');

  if (!rawExpr || !rawExpr.trim()) {
    return {
      ok: false,
      rawResult: '',
      formattedResult: '',
      error: 'Empty expression',
      engineUsed: 'decimal',
    };
  }

  if (rawExpr.length > MAX_EXPRESSION_LENGTH) {
    return {
      ok: false,
      rawResult: '',
      formattedResult: 'Error',
      error: `Expression exceeds ${MAX_EXPRESSION_LENGTH} characters`,
      engineUsed: 'decimal',
    };
  }

  try {
    const normalized = normalizeExpression(rawExpr, ans);

    if (isPureDecimalExpression(normalized)) {
      try {
        const decVal = evaluateWithDecimal(normalized);
        return {
          ok: true,
          rawResult: decVal.toString(),
          formattedResult: formatNumericResult(decVal, {
            precision,
            thousandsSeparator,
            scientificNotation,
            notationMode: resolvedMode,
          }),
          numericValue: decVal.toNumber(),
          engineUsed: 'decimal',
        };
      } catch (decErr) {
        const msg = decErr instanceof Error ? decErr.message : '';
        if (msg !== 'Complex power requires scientific engine') {
          return {
            ok: false,
            rawResult: '',
            formattedResult: 'Error',
            error: msg || 'Invalid arithmetic expression',
            engineUsed: 'decimal',
          };
        }
      }
    }

    const scope = buildMathScope(angleUnit);
    const compiled = math.compile(normalized);
    const val = compiled.evaluate(scope);

    if (typeof val === 'number') {
      if (!Number.isFinite(val)) {
        return {
          ok: false,
          rawResult: '',
          formattedResult: 'Error',
          error: Number.isNaN(val) ? 'Result is undefined (NaN)' : 'Division by zero or numeric overflow',
          engineUsed: 'mathjs',
        };
      }
      const clean = Math.abs(val) < 1e-15 ? 0 : val;
      return {
        ok: true,
        rawResult: String(clean),
        formattedResult: formatNumericResult(clean, {
          precision,
          thousandsSeparator,
          scientificNotation,
          notationMode: resolvedMode,
        }),
        numericValue: clean,
        engineUsed: 'mathjs',
      };
    }

    if (typeof val === 'bigint') {
      return {
        ok: true,
        rawResult: val.toString(),
        formattedResult: val.toString(),
        engineUsed: 'mathjs',
      };
    }

    // Complex numbers or BigNumber / Matrix from mathjs
    if (val && typeof val === 'object') {
      if ('re' in val && 'im' in val) {
        const re = Number((val as { re: number }).re);
        const im = Number((val as { im: number }).im);
        if (!Number.isFinite(re) || !Number.isFinite(im)) {
          return {
            ok: false,
            rawResult: '',
            formattedResult: 'Error',
            error: 'Complex numeric overflow',
            engineUsed: 'mathjs',
          };
        }
        const reClean = Math.abs(re) < 1e-14 ? 0 : re;
        const imClean = Math.abs(im) < 1e-14 ? 0 : im;
        if (imClean === 0) {
          return {
            ok: true,
            rawResult: String(reClean),
            formattedResult: formatNumericResult(reClean, {
              precision,
              thousandsSeparator,
              scientificNotation,
              notationMode: resolvedMode,
            }),
            numericValue: reClean,
            engineUsed: 'mathjs',
          };
        }
        const reFmt = formatNumericResult(reClean, {
          precision,
          thousandsSeparator: false,
          scientificNotation,
          notationMode: resolvedMode,
        });
        const imAbsFmt = formatNumericResult(Math.abs(imClean), {
          precision,
          thousandsSeparator: false,
          scientificNotation,
          notationMode: resolvedMode,
        });
        const sign = imClean >= 0 ? ' + ' : ' - ';
        const formatted = reClean === 0 ? `${imClean < 0 ? '-' : ''}${imAbsFmt}i` : `${reFmt}${sign}${imAbsFmt}i`;
        return {
          ok: true,
          rawResult: formatted,
          formattedResult: formatted,
          isComplex: true,
          engineUsed: 'mathjs',
        };
      }

      const strVal = math.format(val, { precision: Math.min(precision, 14) });
      return {
        ok: true,
        rawResult: strVal,
        formattedResult: strVal,
        engineUsed: 'mathjs',
      };
    }

    return {
      ok: false,
      rawResult: '',
      formattedResult: 'Error',
      error: 'Unsupported evaluation result',
      engineUsed: 'mathjs',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid mathematical expression';
    return {
      ok: false,
      rawResult: '',
      formattedResult: 'Error',
      error: msg,
      engineUsed: 'mathjs',
    };
  }
}

/**
 * Evaluates an expression of single variable `x` safely for graphing / numerical calculus.
 */
export function compileFunctionOfX(rawExpr: string): ((x: number) => number) | null {
  try {
    const normalized = normalizeExpression(rawExpr.replace(/^y\s*=\s*/i, '').replace(/^f\(x\)\s*=\s*/i, ''));
    if (!normalized) return null;
    const compiled = math.compile(normalized);
    const scopeBase = buildMathScope('RAD');
    return (x: number) => {
      try {
        const res = compiled.evaluate({ ...scopeBase, x });
        if (typeof res === 'number' && Number.isFinite(res)) {
          return res;
        }
        return NaN;
      } catch {
        return NaN;
      }
    };
  } catch {
    return null;
  }
}

/**
 * Evaluates a two-variable surface `z = f(x, y)` safely for 3D graphing.
 */
export function compileFunctionOfXY(rawExpr: string): ((x: number, y: number) => number) | null {
  try {
    const normalized = normalizeExpression(
      rawExpr.replace(/^z\s*=\s*/i, '').replace(/^f\(x,\s*y\)\s*=\s*/i, '')
    );
    if (!normalized) return null;
    const compiled = math.compile(normalized);
    const scopeBase = buildMathScope('RAD');
    return (x: number, y: number) => {
      try {
        const res = compiled.evaluate({ ...scopeBase, x, y });
        if (typeof res === 'number' && Number.isFinite(res)) {
          return res;
        }
        return NaN;
      } catch {
        return NaN;
      }
    };
  } catch {
    return null;
  }
}
