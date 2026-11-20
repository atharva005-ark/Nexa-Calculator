import React, { useState } from 'react';
import {
  addMatrices,
  createIdentityMatrix,
  createZeroMatrix,
  determinantMatrix,
  inverseMatrix,
  multiplyMatrices,
  rankMatrix,
  scalarMultiplyMatrix,
  subtractMatrices,
  transposeMatrix,
  type MatrixData,
  type MatrixResult,
} from '../../lib/math/matrixEngine';

function toStringMatrix(mat: MatrixData): string[][] {
  return mat.map((row) => row.map((v) => String(v)));
}

function toNumberMatrix(raw: string[][]): MatrixData {
  return raw.map((row) =>
    row.map((cell) => {
      const trimmed = cell.trim();
      if (!trimmed || trimmed === '-' || trimmed === '.' || trimmed === '-.') return 0;
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : 0;
    })
  );
}

function resizeRawMatrix(mat: string[][], newRows: number, newCols: number): string[][] {
  return Array.from({ length: newRows }, (_, r) =>
    Array.from({ length: newCols }, (__, c) => mat[r]?.[c] ?? '0')
  );
}

export const MatrixCalculatorView: React.FC = () => {
  const [rawA, setRawA] = useState<string[][]>([
    ['2', '1'],
    ['5', '3'],
  ]);
  const [rawB, setRawB] = useState<string[][]>([
    ['1', '4'],
    ['2', '0'],
  ]);
  const [rawScalar, setRawScalar] = useState<string>('2');
  const [result, setResult] = useState<MatrixResult | null>(null);

  const matA = toNumberMatrix(rawA);
  const matB = toNumberMatrix(rawB);
  const parsedScalar = Number(rawScalar);
  const scalar = Number.isFinite(parsedScalar) ? parsedScalar : 0;

  const updateCell = (
    setter: React.Dispatch<React.SetStateAction<string[][]>>,
    r: number,
    c: number,
    val: string
  ) => {
    setter((prev) => prev.map((row, ri) => row.map((cell, ci) => (ri === r && ci === c ? val : cell))));
  };

  const renderMatrixEditor = (
    label: string,
    mat: string[][],
    setter: React.Dispatch<React.SetStateAction<string[][]>>
  ) => {
    const rows = mat.length;
    const cols = mat[0].length;
    return (
      <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-4 space-y-3 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Matrix {label} ({rows}×{cols})
          </h3>
          <div className="flex items-center gap-1.5 text-xs">
            <select
              aria-label={`Matrix ${label} rows`}
              value={rows}
              onChange={(e) => setter((prev) => resizeRawMatrix(prev, Number(e.target.value), cols))}
              className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}R
                </option>
              ))}
            </select>
            <span className="text-slate-400">×</span>
            <select
              aria-label={`Matrix ${label} columns`}
              value={cols}
              onChange={(e) => setter((prev) => resizeRawMatrix(prev, rows, Number(e.target.value)))}
              className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}C
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setter(toStringMatrix(createIdentityMatrix(Math.min(rows, cols))))}
              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => setter(toStringMatrix(createZeroMatrix(rows, cols)))}
              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            >
              0
            </button>
          </div>
        </div>

        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {mat.map((row, r) =>
            row.map((val, c) => (
              <input
                key={`${r}-${c}`}
                type="text"
                inputMode="decimal"
                aria-label={`Matrix ${label} row ${r + 1} column ${c + 1}`}
                value={val}
                onChange={(e) => updateCell(setter, r, c, e.target.value)}
                className="w-full min-w-0 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1 py-2 text-center font-mono text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {renderMatrixEditor('A', rawA, setRawA)}
        {renderMatrixEditor('B', rawB, setRawB)}
      </div>

      {/* Operations Toolbar */}
      <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setResult(addMatrices(matA, matB))}
          className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 cursor-pointer"
        >
          A + B
        </button>
        <button
          type="button"
          onClick={() => setResult(subtractMatrices(matA, matB))}
          className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 cursor-pointer"
        >
          A − B
        </button>
        <button
          type="button"
          onClick={() => setResult(multiplyMatrices(matA, matB))}
          className="px-3.5 py-2 rounded-xl bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 cursor-pointer"
        >
          A × B
        </button>
        <button
          type="button"
          onClick={() => setResult(transposeMatrix(matA, 'A'))}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          Transpose(A)
        </button>
        <button
          type="button"
          onClick={() => setResult(determinantMatrix(matA, 'A'))}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          det(A)
        </button>
        <button
          type="button"
          onClick={() => setResult(inverseMatrix(matA, 'A'))}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          A⁻¹
        </button>
        <button
          type="button"
          onClick={() => setResult(rankMatrix(matA, 'A'))}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          rank(A)
        </button>
        <div className="flex items-center gap-1.5 sm:ml-auto">
          <input
            type="text"
            inputMode="decimal"
            aria-label="Scalar multiplier k"
            value={rawScalar}
            onChange={(e) => setRawScalar(e.target.value)}
            className="w-16 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1.5 font-mono text-xs text-center"
          />
          <button
            type="button"
            onClick={() => setResult(scalarMultiplyMatrix(matA, scalar, 'A'))}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            k · A
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5">
          {!result.ok ? (
            <div className="text-sm text-rose-500">{result.error}</div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-medium text-blue-600 dark:text-cyan-400">
                Result: {result.operation}
              </div>
              {result.scalar !== undefined && (
                <div className="font-mono text-2xl font-bold text-slate-900 dark:text-white">
                  {result.scalar}
                </div>
              )}
              {result.matrix && (
                <div className="overflow-x-auto">
                  <div
                    className="inline-grid gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                    style={{ gridTemplateColumns: `repeat(${result.matrix[0].length}, minmax(56px, 1fr))` }}
                  >
                    {result.matrix.map((row, r) =>
                      row.map((val, c) => (
                        <div
                          key={`${r}-${c}`}
                          className="font-mono text-sm font-semibold text-center py-1.5 px-2 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                        >
                          {val}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
