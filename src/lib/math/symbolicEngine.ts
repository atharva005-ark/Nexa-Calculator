import nerdamer from 'nerdamer';
import { create, all } from 'mathjs';
import { compileFunctionOfX } from './calculatorEngine';

const math = create(all);

export interface EquationSolveResult {
  ok: boolean;
  equation: string;
  method: string;
  steps: string[];
  solutions: string[];
  exactAvailable: boolean;
  error?: string;
}

export interface CalculusResult {
  ok: boolean;
  operation: 'diff' | 'indef-int' | 'def-int' | 'limit' | 'num-diff' | 'num-int';
  input: string;
  symbolicResult?: string;
  numericResult?: string;
  exactAvailable: boolean;
  steps: string[];
  note?: string;
  error?: string;
}

function cleanExprForNerdamer(expr: string): string {
  return expr
    .trim()
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, 'pi')
    .replace(/\bln\(/g, 'log(')
    .replace(/(?<![a-zA-Z_])(\d+)([a-df-zA-DF-Z(]|e(?![+-]?\d))/g, '$1*$2')
    .replace(/\)\s*\(/g, ')*(')
    .replace(/\)\s*([a-zA-Z0-9])/g, ')*$1');
}

function formatNerdamerRoots(rawText: string): string[] {
  const trimmed = rawText.trim();
  const stripped =
    (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
    (trimmed.startsWith('{') && trimmed.endsWith('}'))
      ? trimmed.slice(1, -1)
      : trimmed;
  if (!stripped) return [];
  // Split top-level commas (outside parentheses/brackets/braces)
  const items: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of stripped) {
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    if (ch === ',' && depth === 0) {
      if (cur.trim()) items.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) items.push(cur.trim());
  return items;
}

function getNumericApprox(exprStr: string): string | null {
  try {
    const val = math.evaluate(exprStr.replace(/pi/g, 'pi'));
    if (typeof val === 'number' && Number.isFinite(val)) {
      return Number(val.toPrecision(10)).toString();
    }
    if (val && typeof val === 'object' && 're' in val && 'im' in val) {
      const re = Number((val as { re: number }).re.toPrecision(6));
      const im = Number((val as { im: number }).im.toPrecision(6));
      if (Math.abs(im) < 1e-12) return String(re);
      return `${re} ${im >= 0 ? '+' : '-'} ${Math.abs(im)}i`;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Solves single-variable equations (linear, quadratic, polynomial, transcendental)
 * and basic inequalities (`<`, `<=`, `>`, `>=`).
 */
export function solveEquation(rawInput: string, variable = 'x'): EquationSolveResult {
  const input = rawInput.trim();
  if (!input) {
    return {
      ok: false,
      equation: rawInput,
      method: 'Input Validation',
      steps: [],
      solutions: [],
      exactAvailable: false,
      error: 'Please enter an equation or inequality.',
    };
  }

  // Check for inequality
  const ineqMatch = input.match(/^(.+?)(<=|>=|<|>)(.+)$/);
  if (ineqMatch) {
    return solveInequality(ineqMatch[1], ineqMatch[2], ineqMatch[3], variable, input);
  }

  const eqParts = input.split('=');
  const lhsRaw = eqParts[0];
  const rhsRaw = eqParts.length > 1 ? eqParts[1] : '0';
  if (eqParts.length > 2) {
    return {
      ok: false,
      equation: input,
      method: 'Parser',
      steps: [],
      solutions: [],
      exactAvailable: false,
      error: 'Equation cannot contain multiple "=" signs.',
    };
  }

  try {
    const lhs = cleanExprForNerdamer(lhsRaw);
    const rhs = cleanExprForNerdamer(rhsRaw);
    const canonical = `${lhs}-(${rhs})`;
    const expanded = nerdamer(`expand(${canonical})`).text();

    // Detect polynomial degree in variable if polynomial
    const steps: string[] = [
      `Original equation: ${lhsRaw.trim()} = ${rhsRaw.trim()}`,
      `Rewrite in standard form f(${variable}) = 0: ${expanded} = 0`,
    ];

    // Check linear / quadratic coefficients via derivatives at 0
    let degree = -1;
    let isPoly = true;
    try {
      const fn = compileFunctionOfX(expanded.replace(new RegExp(`\\b${variable}\\b`, 'g'), 'x'));
      if (!fn) isPoly = false;
      const d0 = nerdamer(expanded).evaluate({ [variable]: 0 });
      const d1 = nerdamer.diff(expanded, variable, 1);
      const d2 = nerdamer.diff(expanded, variable, 2);
      const d3 = nerdamer.diff(expanded, variable, 3);
      const d4 = nerdamer.diff(expanded, variable, 4);

      if (!d1.toString().includes(variable) && !expanded.includes('sin') && !expanded.includes('cos') && !expanded.includes('log')) {
        degree = 1;
      } else if (!d2.toString().includes(variable) && !expanded.includes('sin') && !expanded.includes('cos') && !expanded.includes('log')) {
        degree = 2;
      } else if (!d3.toString().includes(variable)) {
        degree = 3;
      } else if (!d4.toString().includes(variable)) {
        degree = 4;
      } else {
        isPoly = false;
      }
      void d0;
    } catch {
      isPoly = false;
    }

    let method = 'Symbolic Algebraic Solver';

    if (isPoly && degree === 1) {
      method = 'Linear Equation Isolation';
      const bVal = Number(nerdamer(expanded).evaluate({ [variable]: 0 }).text());
      const aVal = Number(nerdamer.diff(expanded, variable, 1).evaluate({ [variable]: 0 }).text());
      if (Number.isFinite(aVal) && Number.isFinite(bVal) && aVal !== 0) {
        steps.push(`Identify coefficients: a = ${aVal}, b = ${bVal} in a${variable} + b = 0`);
        steps.push(`Isolate ${variable}: ${aVal}${variable} = ${-bVal} → ${variable} = ${-bVal} / ${aVal}`);
      }
    } else if (isPoly && degree === 2) {
      method = 'Quadratic Formula (x = [-b ± √(b² - 4ac)] / 2a)';
      const cVal = Number(nerdamer(expanded).evaluate({ [variable]: 0 }).text());
      const bVal = Number(nerdamer.diff(expanded, variable, 1).evaluate({ [variable]: 0 }).text());
      const aVal = Number(nerdamer.diff(expanded, variable, 2).evaluate({ [variable]: 0 }).text()) / 2;
      if (Number.isFinite(aVal) && Number.isFinite(bVal) && Number.isFinite(cVal) && aVal !== 0) {
        const disc = bVal * bVal - 4 * aVal * cVal;
        steps.push(`Identify quadratic coefficients: a = ${aVal}, b = ${bVal}, c = ${cVal}`);
        steps.push(`Compute discriminant: Δ = b² - 4ac = (${bVal})² - 4(${aVal})(${cVal}) = ${disc}`);
        if (disc > 0) {
          steps.push('Since Δ > 0, there are two distinct real roots.');
        } else if (disc === 0) {
          steps.push('Since Δ = 0, there is one repeated real root.');
        } else {
          steps.push('Since Δ < 0, there are two complex conjugate roots.');
        }
      }
    } else if (isPoly && degree >= 3) {
      method = `Degree-${degree} Polynomial Factorization & Root Extraction`;
      try {
        const factored = nerdamer(`factor(${expanded})`).text();
        if (factored !== expanded) {
          steps.push(`Factor polynomial: ${factored} = 0`);
        }
      } catch {
        // ignore factor failure
      }
    }

    let rawRoots: string[] = [];
    try {
      const solved = nerdamer.solve(`${lhs}=${rhs}`, variable);
      rawRoots = formatNerdamerRoots(solved.text());
    } catch {
      rawRoots = [];
    }

    if (rawRoots.length === 0) {
      // Numerical root finder fallback on [-50, 50]
      const fn = compileFunctionOfX(canonical.replace(new RegExp(`\\b${variable}\\b`, 'g'), 'x'));
      if (fn) {
        const numRoots: number[] = [];
        const samples = 1000;
        const xMin = -50;
        const xMax = 50;
        const dx = (xMax - xMin) / samples;
        for (let i = 0; i < samples; i++) {
          const a = xMin + i * dx;
          const b = a + dx;
          const fa = fn(a);
          const fb = fn(b);
          if (!Number.isFinite(fa) || !Number.isFinite(fb)) continue;
          if (Math.abs(fa) < 1e-7) {
            if (!numRoots.some((r) => Math.abs(r - a) < 1e-4)) numRoots.push(a);
          } else if (fa * fb < 0 && Math.abs(fa - fb) < 50) {
            let lo = a;
            let hi = b;
            let flo = fa;
            for (let it = 0; it < 30; it++) {
              const mid = (lo + hi) / 2;
              const fmid = fn(mid);
              if (!Number.isFinite(fmid)) break;
              if (flo * fmid <= 0) hi = mid;
              else {
                lo = mid;
                flo = fmid;
              }
            }
            const rootVal = (lo + hi) / 2;
            if (Math.abs(fn(rootVal)) < 1e-3 && !numRoots.some((r) => Math.abs(r - rootVal) < 1e-4)) {
              numRoots.push(rootVal);
            }
          }
        }
        if (numRoots.length > 0) {
          const sols = numRoots.slice(0, 10).map((r) => `${variable} ≈ ${Number(r.toPrecision(8))}`);
          steps.push('No closed-form algebraic root available; scanned [-50, 50] via numerical bisection.');
          steps.push(`Numerical root(s): ${sols.join(', ')}`);
          return {
            ok: true,
            equation: input,
            method: 'Numerical Root Finder (Bisection on [-50, 50])',
            steps,
            solutions: sols,
            exactAvailable: false,
          };
        }
      }

      return {
        ok: false,
        equation: input,
        method,
        steps,
        solutions: [],
        exactAvailable: false,
        error: 'No closed-form symbolic or real numerical solution found in [-50, 50].',
      };
    }

    const formattedSolutions = rawRoots.map((root) => {
      const approx = getNumericApprox(root);
      if (approx && approx !== root && !root.includes('i')) {
        return `${variable} = ${root}  (≈ ${approx})`;
      }
      return `${variable} = ${root}`;
    });

    steps.push(`Solved root(s): ${formattedSolutions.join(', ')}`);

    return {
      ok: true,
      equation: input,
      method,
      steps,
      solutions: formattedSolutions,
      exactAvailable: true,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      equation: input,
      method: 'Symbolic Solver',
      steps: [],
      solutions: [],
      exactAvailable: false,
      error: err instanceof Error ? err.message : 'Unable to parse or solve equation.',
    };
  }
}

function solveInequality(
  lhsRaw: string,
  op: string,
  rhsRaw: string,
  variable: string,
  fullInput: string
): EquationSolveResult {
  try {
    const lhs = cleanExprForNerdamer(lhsRaw);
    const rhs = cleanExprForNerdamer(rhsRaw);
    const expr = `${lhs}-(${rhs})`;
    const solved = nerdamer.solve(`${lhs}=${rhs}`, variable);
    const rootsStr = formatNerdamerRoots(solved.text());
    const numericRoots = rootsStr
      .map((r) => {
        try {
          const val = math.evaluate(r);
          return typeof val === 'number' && Number.isFinite(val) ? val : NaN;
        } catch {
          return NaN;
        }
      })
      .filter((v) => Number.isFinite(v))
      .sort((a, b) => a - b);

    const fn = compileFunctionOfX(expr.replace(new RegExp(`\\b${variable}\\b`, 'g'), 'x'));
    if (!fn) {
      throw new Error('Could not evaluate inequality function.');
    }

    const uniqueRoots: number[] = [];
    for (const r of numericRoots) {
      if (!uniqueRoots.some((u) => Math.abs(u - r) < 1e-9)) {
        uniqueRoots.push(r);
      }
    }

    const checkOp = (val: number) => {
      if (op === '<') return val < -1e-9;
      if (op === '<=') return val <= 1e-9;
      if (op === '>') return val > 1e-9;
      return val >= -1e-9;
    };

    const inclusive = op === '<=' || op === '>=';
    const boundaries = [-Infinity, ...uniqueRoots, Infinity];
    const validIntervals: string[] = [];

    for (let i = 0; i < boundaries.length - 1; i++) {
      const a = boundaries[i];
      const b = boundaries[i + 1];
      let sample: number;
      if (a === -Infinity && b === Infinity) sample = 0;
      else if (a === -Infinity) sample = b - 1;
      else if (b === Infinity) sample = a + 1;
      else sample = (a + b) / 2;

      const val = fn(sample);
      if (Number.isFinite(val) && checkOp(val)) {
        const leftBracket = a === -Infinity ? '(' : inclusive ? '[' : '(';
        const rightBracket = b === Infinity ? ')' : inclusive ? ']' : ')';
        const aLabel = a === -Infinity ? '-∞' : Number(a.toPrecision(6)).toString();
        const bLabel = b === Infinity ? '∞' : Number(b.toPrecision(6)).toString();
        validIntervals.push(`${leftBracket}${aLabel}, ${bLabel}${rightBracket}`);
      }
    }

    const steps = [
      `Original inequality: ${fullInput}`,
      `Move all terms to LHS: ${expr} ${op} 0`,
      `Find critical boundary roots where LHS = 0: ${uniqueRoots.length ? uniqueRoots.map((r) => `${variable} = ${Number(r.toPrecision(6))}`).join(', ') : 'None'}`,
      `Test sign intervals across critical points`,
    ];

    const intervalResult = validIntervals.length ? `${variable} ∈ ${validIntervals.join(' ∪ ')}` : 'No real solution (∅)';
    steps.push(`Solution interval: ${intervalResult}`);

    return {
      ok: true,
      equation: fullInput,
      method: 'Critical Point & Sign-Interval Analysis',
      steps,
      solutions: [intervalResult],
      exactAvailable: true,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      equation: fullInput,
      method: 'Inequality Solver',
      steps: [],
      solutions: [],
      exactAvailable: false,
      error: err instanceof Error ? err.message : 'Unable to solve inequality.',
    };
  }
}

/**
 * Solves a system of simultaneous linear equations Ax = b.
 */
export function solveLinearSystem(equations: string[]): EquationSolveResult {
  const cleanEqs = equations.map((e) => e.trim()).filter(Boolean);
  if (cleanEqs.length < 2) {
    return {
      ok: false,
      equation: cleanEqs.join('; '),
      method: 'Gaussian Elimination',
      steps: [],
      solutions: [],
      exactAvailable: false,
      error: 'Enter at least 2 simultaneous equations.',
    };
  }

  try {
    const canonicalList = cleanEqs.map((eq) => {
      const parts = eq.split('=');
      if (parts.length !== 2) throw new Error(`Invalid equation format: "${eq}". Expected "lhs = rhs".`);
      return `${cleanExprForNerdamer(parts[0])}-(${cleanExprForNerdamer(parts[1])})`;
    });

    // Discover variables (exclude math function names & constants like pi, e)
    const reserved = new Set(['sin', 'cos', 'tan', 'log', 'ln', 'sqrt', 'exp', 'pi', 'e', 'abs']);
    const varSet = new Set<string>();
    for (const c of canonicalList) {
      const matches = c.match(/\b[a-zA-Z]\w*\b/g) || [];
      for (const m of matches) {
        if (!reserved.has(m.toLowerCase())) varSet.add(m);
      }
    }

    const vars = Array.from(varSet).sort();
    if (vars.length === 0) {
      throw new Error('No variables detected in simultaneous equations.');
    }
    if (vars.length !== cleanEqs.length) {
      throw new Error(`Expected ${vars.length} equations for variables (${vars.join(', ')}), got ${cleanEqs.length}.`);
    }

    const zeroScope: Record<string, number> = {};
    for (const v of vars) zeroScope[v] = 0;

    const n = vars.length;
    const aug: number[][] = canonicalList.map((expr) => {
      const row = vars.map((v) => {
        const deriv = nerdamer.diff(expr, v, 1).evaluate(zeroScope).text();
        const num = Number(math.evaluate(deriv));
        if (!Number.isFinite(num)) throw new Error(`Non-linear term detected in variable ${v}`);
        return num;
      });
      const constStr = nerdamer(expr).evaluate(zeroScope).text();
      const constVal = Number(math.evaluate(constStr));
      if (!Number.isFinite(constVal)) throw new Error('Invalid constant term in system');
      row.push(-constVal);
      return row;
    });

    // Gaussian elimination with partial pivoting
    for (let col = 0; col < n; col++) {
      let pivot = col;
      for (let r = col + 1; r < n; r++) {
        if (Math.abs(aug[r][col]) > Math.abs(aug[pivot][col])) pivot = r;
      }
      if (Math.abs(aug[pivot][col]) < 1e-12) {
        throw new Error('System is singular (either no solution or infinitely many solutions).');
      }
      [aug[col], aug[pivot]] = [aug[pivot], aug[col]];
      const div = aug[col][col];
      for (let j = col; j <= n; j++) aug[col][j] /= div;
      for (let r = 0; r < n; r++) {
        if (r !== col && Math.abs(aug[r][col]) > 1e-12) {
          const factor = aug[r][col];
          for (let j = col; j <= n; j++) aug[r][j] -= factor * aug[col][j];
        }
      }
    }

    const solutions = vars.map((v, idx) => {
      const val = Math.abs(aug[idx][n]) < 1e-12 ? 0 : Number(aug[idx][n].toPrecision(10));
      return `${v} = ${val}`;
    });

    const steps: string[] = [
      `System of ${cleanEqs.length} linear equations in (${vars.join(', ')}):`,
      ...cleanEqs.map((eq, idx) => `(${idx + 1}) ${eq}`),
      'Constructed augmented matrix [A | b] and reduced to row-echelon form via partial-pivot Gaussian elimination.',
      `Unique solution vector: (${solutions.join(', ')})`,
    ];

    return {
      ok: true,
      equation: cleanEqs.join('  |  '),
      method: 'Gaussian Elimination (RREF)',
      steps,
      solutions,
      exactAvailable: true,
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : 'System may be inconsistent (no solution) or underdetermined (infinite solutions).';
    return {
      ok: false,
      equation: cleanEqs.join('  |  '),
      method: 'Gaussian Elimination (RREF)',
      steps: [],
      solutions: [],
      exactAvailable: false,
      error: msg,
    };
  }
}

/**
 * Numerical central difference derivative O(h^4)
 */
export function numericalDerivative(expr: string, x0: number, order = 1): number {
  const fn = compileFunctionOfX(expr);
  if (!fn) throw new Error('Invalid function expression');
  const h = 1e-4;
  if (order === 1) {
    return (-fn(x0 + 2 * h) + 8 * fn(x0 + h) - 8 * fn(x0 - h) + fn(x0 - 2 * h)) / (12 * h);
  }
  if (order === 2) {
    return (-fn(x0 + 2 * h) + 16 * fn(x0 + h) - 30 * fn(x0) + 16 * fn(x0 - h) - fn(x0 - 2 * h)) / (12 * h * h);
  }
  // Recursive finite difference for higher orders
  const step = 1e-2;
  return (numericalDerivative(expr, x0 + step, order - 1) - numericalDerivative(expr, x0 - step, order - 1)) / (2 * step);
}

/**
 * Composite Simpson's rule for accurate definite numerical integration
 */
export function numericalIntegrate(expr: string, a: number, b: number, intervals = 1000): number {
  const fn = compileFunctionOfX(expr);
  if (!fn) throw new Error('Invalid integrand expression');
  if (a === b) return 0;
  const n = intervals % 2 === 0 ? intervals : intervals + 1;
  const sign = b < a ? -1 : 1;
  const low = Math.min(a, b);
  const high = Math.max(a, b);
  const h = (high - low) / n;

  let sum = fn(low) + fn(high);
  for (let i = 1; i < n; i++) {
    const x = low + i * h;
    const y = fn(x);
    if (!Number.isFinite(y)) {
      throw new Error(`Singularity or undefined value encountered near x = ${x.toFixed(4)}`);
    }
    sum += (i % 2 === 0 ? 2 : 4) * y;
  }
  return sign * ((h / 3) * sum);
}

export function computeCalculus(params: {
  operation: CalculusResult['operation'];
  expression: string;
  variable?: string;
  order?: number;
  lower?: string;
  upper?: string;
  point?: string;
  limitDirection?: 'both' | 'left' | 'right';
}): CalculusResult {
  const {
    operation,
    expression,
    variable = 'x',
    order = 1,
    lower = '0',
    upper = '1',
    point = '0',
    limitDirection = 'both',
  } = params;

  const clean = cleanExprForNerdamer(expression);
  if (!clean) {
    return {
      ok: false,
      operation,
      input: expression,
      exactAvailable: false,
      steps: [],
      error: 'Please enter a valid mathematical expression.',
    };
  }

  try {
    if (operation === 'diff') {
      const res = nerdamer.diff(clean, variable, order).text();
      return {
        ok: true,
        operation,
        input: `d${order > 1 ? `^${order}` : ''}/d${variable}${order > 1 ? `^${order}` : ''} (${expression})`,
        symbolicResult: res,
        exactAvailable: true,
        steps: [
          `Input function: f(${variable}) = ${expression}`,
          `Apply symbolic differentiation rules (order ${order}) with respect to ${variable}`,
          `Result: ${res}`,
        ],
      };
    }

    if (operation === 'num-diff') {
      const x0 = Number(math.evaluate(cleanExprForNerdamer(point)));
      if (!Number.isFinite(x0)) throw new Error('Evaluation point must be a finite real number');
      const val = numericalDerivative(expression, x0, order);
      if (!Number.isFinite(val)) throw new Error('Derivative undefined at this point');
      const formatted = Number(val.toPrecision(10)).toString();
      let symAtPoint: string | undefined;
      try {
        const sym = nerdamer.diff(clean, variable, order);
        symAtPoint = sym.text();
      } catch {
        symAtPoint = undefined;
      }
      return {
        ok: true,
        operation,
        input: `f${"'".repeat(Math.min(order, 3))}(${point}) for f(x) = ${expression}`,
        symbolicResult: symAtPoint,
        numericResult: formatted,
        exactAvailable: Boolean(symAtPoint),
        steps: [
          `Evaluated numerical derivative at ${variable} = ${point} using 5-point stencil O(h⁴)`,
          ...(symAtPoint ? [`Symbolic derivative: ${symAtPoint}`] : []),
          `Numerical value: ${formatted}`,
        ],
      };
    }

    if (operation === 'indef-int') {
      const res = nerdamer.integrate(clean, variable).text();
      // Nerdamer returns `integrate(...)` verbatim when no closed-form antiderivative exists
      const hasUnevaluated = res.includes('integrate(');
      if (hasUnevaluated) {
        return {
          ok: true,
          operation,
          input: `∫ (${expression}) d${variable}`,
          exactAvailable: false,
          steps: [
            `Attempted symbolic antiderivative of ${expression} with respect to ${variable}.`,
            'No elementary closed-form antiderivative exists in terms of standard functions.',
          ],
          note: 'Exact symbolic antiderivative unavailable. Switch to Definite Integral (Numerical) to compute a numerical area over bounds [a, b].',
        };
      }
      return {
        ok: true,
        operation,
        input: `∫ (${expression}) d${variable}`,
        symbolicResult: `${res} + C`,
        exactAvailable: true,
        steps: [
          `Integrand: f(${variable}) = ${expression}`,
          `Computed symbolic antiderivative F(${variable})`,
          `Result: ${res} + C`,
        ],
      };
    }

    if (operation === 'def-int' || operation === 'num-int') {
      const a = Number(math.evaluate(cleanExprForNerdamer(lower)));
      const b = Number(math.evaluate(cleanExprForNerdamer(upper)));
      if (!Number.isFinite(a) || !Number.isFinite(b)) {
        throw new Error('Integration limits a and b must be finite numbers');
      }

      let symResult: string | undefined;
      let exactAvailable = false;

      if (operation === 'def-int') {
        try {
          const antideriv = nerdamer.integrate(clean, variable).text();
          if (!antideriv.includes('integrate(')) {
            const def = nerdamer.defint(clean, lower, upper, variable).text();
            if (!def.includes('defint(') && !def.includes('integrate(')) {
              symResult = def;
              exactAvailable = true;
            }
          }
        } catch {
          exactAvailable = false;
        }
      }

      const numVal = numericalIntegrate(expression, a, b, 1000);
      const formattedNum = Number(numVal.toPrecision(10)).toString();

      return {
        ok: true,
        operation,
        input: `∫[${lower}, ${upper}] (${expression}) d${variable}`,
        symbolicResult: symResult,
        numericResult: formattedNum,
        exactAvailable,
        steps: [
          `Definite integral over [${lower}, ${upper}]`,
          ...(symResult
            ? [`Exact symbolic evaluation via Fundamental Theorem of Calculus: ${symResult}`]
            : ['Exact elementary antiderivative unavailable; applied composite Simpson’s rule (n = 1,000 subintervals).']),
          `Numerical value ≈ ${formattedNum}`,
        ],
        note: exactAvailable
          ? undefined
          : 'Exact symbolic closed-form result unavailable; computed high-precision numerical integral via Simpson’s rule.',
      };
    }

    if (operation === 'limit') {
      const fn = compileFunctionOfX(expression);
      if (!fn) throw new Error('Invalid expression for limit evaluation');

      const pTrim = point.trim().toLowerCase();
      const isPosInf = pTrim === 'inf' || pTrim === 'infinity' || pTrim === '∞' || pTrim === '+∞';
      const isNegInf = pTrim === '-inf' || pTrim === '-infinity' || pTrim === '-∞';

      if (isPosInf || isNegInf) {
        const sign = isPosInf ? 1 : -1;
        const samples = [1e3, 1e5, 1e7].map((m) => fn(sign * m));
        const last = samples[samples.length - 1];
        const prev = samples[samples.length - 2];
        let resultStr = 'Does not exist / Oscillates';
        if (Number.isFinite(last) && Number.isFinite(prev) && Math.abs(last - prev) < 1e-4) {
          resultStr = Number(last.toPrecision(8)).toString();
        } else if (Number.isFinite(last) && Math.abs(last) > 1e12) {
          resultStr = last > 0 ? '+∞' : '-∞';
        }
        return {
          ok: true,
          operation,
          input: `lim (${variable} → ${point}) ${expression}`,
          numericResult: resultStr,
          exactAvailable: false,
          steps: [
            `Evaluated asymptotic behavior as ${variable} → ${point}`,
            `Sample values at ${sign * 1e3}, ${sign * 1e5}, ${sign * 1e7}: ${samples.map((v) => (Number.isFinite(v) ? v.toPrecision(6) : 'NaN')).join(', ')}`,
            `Estimated limit: ${resultStr}`,
          ],
          note: 'Limit evaluated numerically via asymptotic sampling.',
        };
      }

      const c = Number(math.evaluate(cleanExprForNerdamer(point)));
      if (!Number.isFinite(c)) throw new Error('Limit target must be a number, inf, or -inf');

      // Direct substitution first if continuous
      const direct = fn(c);
      const leftVals = [1e-3, 1e-5, 1e-7].map((d) => fn(c - d));
      const rightVals = [1e-3, 1e-5, 1e-7].map((d) => fn(c + d));

      const leftLimit = leftVals[2];
      const rightLimit = rightVals[2];

      let chosen: number;
      if (limitDirection === 'left') chosen = leftLimit;
      else if (limitDirection === 'right') chosen = rightLimit;
      else {
        if (Number.isFinite(leftLimit) && Number.isFinite(rightLimit)) {
          if (Math.abs(leftLimit - rightLimit) < 1e-4) {
            chosen = Math.abs(direct - leftLimit) < 1e-6 && Number.isFinite(direct) ? direct : (leftLimit + rightLimit) / 2;
          } else {
            return {
              ok: true,
              operation,
              input: `lim (${variable} → ${point}) ${expression}`,
              numericResult: 'Does not exist (LHL ≠ RHL)',
              exactAvailable: false,
              steps: [
                `Left-hand limit (${variable} → ${point}⁻) ≈ ${leftLimit.toPrecision(7)}`,
                `Right-hand limit (${variable} → ${point}⁺) ≈ ${rightLimit.toPrecision(7)}`,
                'Left-hand and right-hand limits do not match.',
              ],
              note: 'Evaluated numerically by approaching target from left and right.',
            };
          }
        } else {
          chosen = Number.isFinite(direct) ? direct : NaN;
        }
      }

      if (!Number.isFinite(chosen)) {
        return {
          ok: true,
          operation,
          input: `lim (${variable} → ${point}) ${expression}`,
          numericResult: 'Undefined / Diverges',
          exactAvailable: false,
          steps: [
            `Left approach samples: ${leftVals.map((v) => v.toPrecision(5)).join(', ')}`,
            `Right approach samples: ${rightVals.map((v) => v.toPrecision(5)).join(', ')}`,
          ],
          note: 'Limit diverges or is undefined near this point.',
        };
      }

      const cleanNum = Math.abs(chosen) < 1e-10 ? 0 : Number(chosen.toPrecision(8));
      return {
        ok: true,
        operation,
        input: `lim (${variable} → ${point}${limitDirection === 'left' ? '⁻' : limitDirection === 'right' ? '⁺' : ''}) ${expression}`,
        numericResult: String(cleanNum),
        exactAvailable: Number.isFinite(direct),
        steps: [
          `Left approach (${variable} → ${point}⁻): ${leftVals.map((v) => Number(v.toPrecision(6))).join(' → ')}`,
          `Right approach (${variable} → ${point}⁺): ${rightVals.map((v) => Number(v.toPrecision(6))).join(' → ')}`,
          `Converged limit value: ${cleanNum}`,
        ],
        note: Number.isFinite(direct) ? undefined : 'Evaluated numerically near removable discontinuity / indeterminate form.',
      };
    }
  } catch (err: unknown) {
    return {
      ok: false,
      operation,
      input: expression,
      exactAvailable: false,
      steps: [],
      error: err instanceof Error ? err.message : 'Calculus operation failed',
    };
  }

  return {
    ok: false,
    operation,
    input: expression,
    exactAvailable: false,
    steps: [],
    error: 'Unsupported calculus operation',
  };
}
