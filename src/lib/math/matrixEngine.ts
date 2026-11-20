import { create, all } from 'mathjs';

const math = create(all);

export type MatrixData = number[][];

export interface MatrixResult {
  ok: boolean;
  operation: string;
  matrix?: MatrixData;
  scalar?: number;
  error?: string;
}

export function createZeroMatrix(rows: number, cols: number): MatrixData {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
}

export function createIdentityMatrix(size: number): MatrixData {
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (__, c) => (r === c ? 1 : 0))
  );
}

function cleanMatrix(m: number[][]): MatrixData {
  return m.map((row) => row.map((v) => (Math.abs(v) < 1e-12 ? 0 : Number(v.toPrecision(10)))));
}

export function addMatrices(a: MatrixData, b: MatrixData): MatrixResult {
  if (a.length !== b.length || a[0].length !== b[0].length) {
    return {
      ok: false,
      operation: 'A + B',
      error: `Dimension mismatch: A is ${a.length}×${a[0].length} and B is ${b.length}×${b[0].length}.`,
    };
  }
  const res = math.add(a, b) as number[][];
  return { ok: true, operation: 'A + B', matrix: cleanMatrix(res) };
}

export function subtractMatrices(a: MatrixData, b: MatrixData): MatrixResult {
  if (a.length !== b.length || a[0].length !== b[0].length) {
    return {
      ok: false,
      operation: 'A - B',
      error: `Dimension mismatch: A is ${a.length}×${a[0].length} and B is ${b.length}×${b[0].length}.`,
    };
  }
  const res = math.subtract(a, b) as number[][];
  return { ok: true, operation: 'A - B', matrix: cleanMatrix(res) };
}

export function multiplyMatrices(a: MatrixData, b: MatrixData): MatrixResult {
  if (a[0].length !== b.length) {
    return {
      ok: false,
      operation: 'A × B',
      error: `Cannot multiply ${a.length}×${a[0].length} by ${b.length}×${b[0].length}. Inner dimensions must match.`,
    };
  }
  const res = math.multiply(a, b) as number[][];
  return { ok: true, operation: 'A × B', matrix: cleanMatrix(res) };
}

export function transposeMatrix(a: MatrixData, label = 'A'): MatrixResult {
  const res = math.transpose(a) as number[][];
  return { ok: true, operation: `Transpose(${label})`, matrix: cleanMatrix(res) };
}

export function determinantMatrix(a: MatrixData, label = 'A'): MatrixResult {
  if (a.length !== a[0].length) {
    return {
      ok: false,
      operation: `det(${label})`,
      error: `Determinant requires a square matrix (got ${a.length}×${a[0].length}).`,
    };
  }
  const det = Number(math.det(a));
  const cleanDet = Math.abs(det) < 1e-12 ? 0 : Number(det.toPrecision(10));
  return { ok: true, operation: `det(${label})`, scalar: cleanDet };
}

export function inverseMatrix(a: MatrixData, label = 'A'): MatrixResult {
  if (a.length !== a[0].length) {
    return {
      ok: false,
      operation: `${label}⁻¹`,
      error: `Inverse requires a square matrix (got ${a.length}×${a[0].length}).`,
    };
  }
  const det = Number(math.det(a));
  if (Math.abs(det) < 1e-12) {
    return {
      ok: false,
      operation: `${label}⁻¹`,
      error: `Matrix ${label} is singular (det = 0) and does not have an inverse.`,
    };
  }
  const inv = math.inv(a) as number[][];
  return { ok: true, operation: `${label}⁻¹`, matrix: cleanMatrix(inv) };
}

export function rankMatrix(a: MatrixData, label = 'A'): MatrixResult {
  const rows = a.length;
  const cols = a[0].length;
  const m = a.map((r) => [...r]);
  let rank = 0;

  for (let col = 0; col < cols && rank < rows; col++) {
    let pivot = rank;
    for (let i = rank + 1; i < rows; i++) {
      if (Math.abs(m[i][col]) > Math.abs(m[pivot][col])) {
        pivot = i;
      }
    }
    if (Math.abs(m[pivot][col]) < 1e-10) continue;

    [m[rank], m[pivot]] = [m[pivot], m[rank]];
    const pivotVal = m[rank][col];
    for (let j = col; j < cols; j++) {
      m[rank][j] /= pivotVal;
    }
    for (let i = 0; i < rows; i++) {
      if (i !== rank && Math.abs(m[i][col]) > 1e-10) {
        const factor = m[i][col];
        for (let j = col; j < cols; j++) {
          m[i][j] -= factor * m[rank][j];
        }
      }
    }
    rank++;
  }

  return { ok: true, operation: `rank(${label})`, scalar: rank };
}

export function scalarMultiplyMatrix(a: MatrixData, k: number, label = 'A'): MatrixResult {
  const res = a.map((row) => row.map((v) => v * k));
  return { ok: true, operation: `${k} · ${label}`, matrix: cleanMatrix(res) };
}
