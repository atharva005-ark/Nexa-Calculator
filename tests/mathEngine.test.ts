import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateExpression } from '../src/lib/math/calculatorEngine.ts';
import { solveEquation, solveLinearSystem, computeCalculus } from '../src/lib/math/symbolicEngine.ts';
import {
  addMatrices,
  determinantMatrix,
  inverseMatrix,
  multiplyMatrices,
  rankMatrix,
  transposeMatrix,
} from '../src/lib/math/matrixEngine.ts';
import { convertUnit } from '../src/lib/math/unitConverter.ts';
import { calculateEMI, calculateSIP, calculateGST } from '../src/lib/math/financeEngine.ts';
import { computeStatistics, parseDataset } from '../src/lib/math/statisticsEngine.ts';
import { parseInBase, performBitwiseOperation, bitwiseNot } from '../src/lib/math/programmerEngine.ts';
import { parseSpokenMath } from '../src/lib/math/voiceParser.ts';

test('Basic arithmetic & Decimal.js exact precision', () => {
  const sum = evaluateExpression('0.1 + 0.2');
  assert.equal(sum.ok, true);
  assert.equal(sum.rawResult, '0.3');

  const prec = evaluateExpression('100 * 15% + (20 / 4)^2');
  assert.equal(prec.ok, true);
  assert.equal(prec.numericValue, 40);
});

test('Division by zero & invalid expressions handled gracefully', () => {
  const divZero = evaluateExpression('42 / 0');
  assert.equal(divZero.ok, false);
  assert.match(divZero.error || '', /zero/i);

  const invalid = evaluateExpression('5 + * 3');
  assert.equal(invalid.ok, false);

  const injection = evaluateExpression('window.alert(1)');
  assert.equal(injection.ok, false);
});

test('Scientific functions (DEG/RAD, trig, logs, factorial, nCr, complex)', () => {
  const sinDeg = evaluateExpression('sin(30)', { angleUnit: 'DEG' });
  assert.equal(sinDeg.ok, true);
  assert.ok(Math.abs((sinDeg.numericValue ?? 0) - 0.5) < 1e-12);

  const cosRad = evaluateExpression('cos(pi)', { angleUnit: 'RAD' });
  assert.equal(cosRad.ok, true);
  assert.ok(Math.abs((cosRad.numericValue ?? 0) - -1) < 1e-12);

  const logBase = evaluateExpression('logb(8, 2)');
  assert.equal(logBase.ok, true);
  assert.equal(logBase.numericValue, 3);

  const comb = evaluateExpression('nCr(5, 2) + 4!');
  assert.equal(comb.ok, true);
  assert.equal(comb.numericValue, 34);

  const complex = evaluateExpression('sqrt(-16)');
  assert.equal(complex.ok, true);
  assert.equal(complex.isComplex, true);
  assert.equal(complex.formattedResult, '4i');
});

test('Equation solving (linear, quadratic, simultaneous, inequality)', () => {
  const lin = solveEquation('2x + 5 = 15');
  assert.equal(lin.ok, true);
  assert.ok(lin.solutions.some((s) => s.includes('5')));

  const quad = solveEquation('x^2 - 5x + 6 = 0');
  assert.equal(quad.ok, true);
  assert.equal(quad.solutions.length, 2);

  const sys = solveLinearSystem(['2x + y = 7', 'x - y = 2']);
  assert.equal(sys.ok, true);
  assert.ok(sys.solutions.some((s) => s.includes('x = 3')));
  assert.ok(sys.solutions.some((s) => s.includes('y = 1')));

  const ineq = solveEquation('2x + 5 > 15');
  assert.equal(ineq.ok, true);
  assert.ok(ineq.solutions[0].includes('(5, ∞)'));
});

test('Calculus symbolic & numerical fallback', () => {
  const deriv = computeCalculus({ operation: 'diff', expression: 'x^3', variable: 'x' });
  assert.equal(deriv.ok, true);
  assert.equal(deriv.symbolicResult, '3*x^2');

  const defInt = computeCalculus({
    operation: 'def-int',
    expression: 'exp(-x^2)',
    lower: '0',
    upper: '1',
  });
  assert.equal(defInt.ok, true);
  assert.ok(Math.abs(Number(defInt.numericResult) - 0.7468241328) < 1e-6);

  const lim = computeCalculus({ operation: 'limit', expression: 'sin(x)/x', point: '0' });
  assert.equal(lim.ok, true);
  assert.ok(Math.abs(Number(lim.numericResult) - 1) < 1e-4);
});

test('Matrix operations', () => {
  const A = [
    [2, 1],
    [5, 3],
  ];
  const B = [
    [1, 4],
    [2, 0],
  ];
  const sum = addMatrices(A, B);
  assert.equal(sum.ok, true);
  assert.deepEqual(sum.matrix, [
    [3, 5],
    [7, 3],
  ]);

  const prod = multiplyMatrices(A, B);
  assert.equal(prod.ok, true);
  assert.deepEqual(prod.matrix, [
    [4, 8],
    [11, 20],
  ]);

  const det = determinantMatrix(A);
  assert.equal(det.scalar, 1);

  const inv = inverseMatrix(A);
  assert.equal(inv.ok, true);
  assert.deepEqual(inv.matrix, [
    [3, -1],
    [-5, 2],
  ]);

  const tr = transposeMatrix([[1, 2, 3], [4, 5, 6]]);
  assert.deepEqual(tr.matrix, [
    [1, 4],
    [2, 5],
    [3, 6],
  ]);

  const rk = rankMatrix([
    [1, 2],
    [2, 4],
  ]);
  assert.equal(rk.scalar, 1);
});

test('Unit conversions', () => {
  assert.ok(Math.abs(convertUnit(100, 'cm', 'm', 'length') - 1) < 1e-12);
  assert.ok(Math.abs(convertUnit(0, 'C', 'F', 'temperature') - 32) < 1e-12);
  assert.ok(Math.abs(convertUnit(100, 'C', 'K', 'temperature') - 373.15) < 1e-12);
  assert.ok(Math.abs(convertUnit(1, 'KiB', 'B', 'data') - 1024) < 1e-12);
});

test('Financial calculations (EMI, SIP, GST)', () => {
  const emi = calculateEMI(100000, 12, 12);
  assert.ok(Math.abs(emi.monthlyEMI - 8884.88) < 0.05);
  assert.equal(emi.schedule.length, 12);
  assert.ok(emi.schedule[11].remainingBalance < 0.01);

  const sip = calculateSIP(10000, 12, 1);
  assert.equal(sip.investedAmount, 120000);
  assert.ok(sip.futureValue > 120000);

  const gst = calculateGST(1000, 18, 'exclusive');
  assert.equal(gst.gstAmount, 180);
  assert.equal(gst.totalAmount, 1180);
});

test('Statistics & Programmer & Voice parser', () => {
  const { values } = parseDataset('2, 4, 4, 4, 5, 5, 7, 9');
  const st = computeStatistics(values);
  assert.equal(st.count, 8);
  assert.equal(st.mean, 5);
  assert.equal(st.median, 4.5);
  assert.deepEqual(st.mode, [4]);
  assert.equal(st.stdDevPopulation, 2);

  const hexVal = parseInBase('FF', 'HEX', 32);
  assert.equal(hexVal, 255n);
  assert.equal(performBitwiseOperation(0b1010n, 0b1100n, 'AND', 8), 0b1000n);
  assert.equal(bitwiseNot(0n, 8), -1n);

  assert.equal(parseSpokenMath('What is 25 multiplied by 40?'), '25 * 40');
  assert.equal(parseSpokenMath('Square root of 144'), 'sqrt(144)');
  assert.equal(parseSpokenMath('15 percent of 200'), '(15/100) * 200');
  assert.equal(parseSpokenMath('2 raised to the power of 5'), '2 ^ 5');
});

test('Modulus vs percentage, scientific notation, right-associativity, and error edge cases', () => {
  const modRes = evaluateExpression('10 mod 3');
  assert.equal(modRes.ok, true);
  assert.equal(modRes.numericValue, 1);

  const pctParen = evaluateExpression('(10+5)%');
  assert.equal(pctParen.ok, true);
  assert.ok(Math.abs((pctParen.numericValue ?? 0) - 0.15) < 1e-12);

  const sciRes = evaluateExpression('1e-5 * 2');
  assert.equal(sciRes.ok, true);
  assert.ok(Math.abs((sciRes.numericValue ?? 0) - 2e-5) < 1e-15);

  const powRight = evaluateExpression('2^3^2');
  assert.equal(powRight.ok, true);
  assert.equal(powRight.numericValue, 512);

  const zeroNegPow = evaluateExpression('0^(-1)');
  assert.equal(zeroNegPow.ok, false);

  const mismatchedParens = evaluateExpression('(2 + 3');
  assert.equal(mismatchedParens.ok, false);

  const logNeg = evaluateExpression('log(-5)');
  assert.equal(logNeg.ok, false);
  assert.match(logNeg.error || '', /domain/i);

  const log10Res = evaluateExpression('log(100) + log2(8) + ln(e)');
  assert.equal(log10Res.ok, true);
  assert.ok(Math.abs((log10Res.numericValue ?? 0) - 6) < 1e-12);

  const implRes = evaluateExpression('2(3+4)');
  assert.equal(implRes.ok, true);
  assert.equal(implRes.numericValue, 14);
});

test('Transcendental equation, scientific notation equations, and negative/fractional matrices', () => {
  const trans = solveEquation('cos(x) = x');
  assert.equal(trans.ok, true);
  assert.ok(
    trans.solutions.some((s) => {
      const m = s.match(/[-+]?\d*\.?\d+/);
      return m ? Math.abs(Number(m[0]) - 0.739085) < 1e-3 : false;
    })
  );

  const sciEq = solveEquation('1e-5 * x = 1');
  assert.equal(sciEq.ok, true);
  assert.ok(sciEq.solutions.some((s) => s.includes('100000')));

  const negA = [
    [-1.5, 2],
    [0.5, -2],
  ];
  const negB = [
    [2, -0.5],
    [-1, 1.5],
  ];
  const added = addMatrices(negA, negB);
  assert.equal(added.ok, true);
  assert.deepEqual(added.matrix, [
    [0.5, 1.5],
    [-0.5, -0.5],
  ]);

  const det = determinantMatrix(negA);
  assert.equal(det.ok, true);
  assert.equal(det.scalar, 2);

  const inv = inverseMatrix(negA);
  assert.equal(inv.ok, true);
  assert.deepEqual(inv.matrix, [
    [-1, -1],
    [-0.25, -0.75],
  ]);
});

test('NEXA 2.0: Engineering notation, complex helpers, golden ratio, and 3D surface evaluation', async () => {
  const { compileFunctionOfXY } = await import('../src/lib/math/calculatorEngine.ts');

  const engLarge = evaluateExpression('12500', { notationMode: 'engineering', precision: 4 });
  assert.equal(engLarge.ok, true);
  assert.equal(engLarge.formattedResult, '12.5e+3');

  const engSmall = evaluateExpression('0.00045', { notationMode: 'engineering', precision: 4 });
  assert.equal(engSmall.ok, true);
  assert.equal(engSmall.formattedResult, '450e-6');

  const conjRes = evaluateExpression('conj(3 + 4i)');
  assert.equal(conjRes.ok, true);
  assert.equal(conjRes.formattedResult, '3 - 4i');

  const reImRes = evaluateExpression('re(3 + 4i) + im(3 + 4i)');
  assert.equal(reImRes.ok, true);
  assert.equal(reImRes.numericValue, 7);

  const argDeg = evaluateExpression('arg(1 + i)', { angleUnit: 'DEG' });
  assert.equal(argDeg.ok, true);
  assert.ok(Math.abs((argDeg.numericValue ?? 0) - 45) < 1e-10);

  const phiRes = evaluateExpression('phi^2 - phi - 1');
  assert.equal(phiRes.ok, true);
  assert.ok(Math.abs(phiRes.numericValue ?? 1) < 1e-12);

  const surfaceFn = compileFunctionOfXY('z = x^2 - y^2');
  assert.ok(surfaceFn !== null);
  assert.equal(surfaceFn(3, 2), 5);
});


