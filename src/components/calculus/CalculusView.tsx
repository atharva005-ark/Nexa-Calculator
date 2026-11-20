import React, { useState } from 'react';
import { computeCalculus, type CalculusResult } from '../../lib/math/symbolicEngine';
import { useCalculator } from '../../context/CalculatorContext';

export const CalculusView: React.FC = () => {
  const { recordHistory } = useCalculator();
  const [operation, setOperation] = useState<CalculusResult['operation']>('diff');
  const [expression, setExpression] = useState('x^3 * sin(x)');
  const [variable, setVariable] = useState('x');
  const [order, setOrder] = useState(1);
  const [lower, setLower] = useState('0');
  const [upper, setUpper] = useState('pi');
  const [point, setPoint] = useState('0');
  const [limitDirection, setLimitDirection] = useState<'both' | 'left' | 'right'>('both');
  const [result, setResult] = useState<CalculusResult>(() =>
    computeCalculus({ operation: 'diff', expression: 'x^3 * sin(x)', variable: 'x', order: 1 })
  );

  const handleCompute = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const res = computeCalculus({
      operation,
      expression,
      variable,
      order,
      lower,
      upper,
      point,
      limitDirection,
    });
    setResult(res);
    if (res.ok) {
      void recordHistory({
        expression: res.input,
        result: res.symbolicResult || res.numericResult || 'Computed',
        mode: 'Calculus',
      });
    }
  };

  const operations: Array<{ id: CalculusResult['operation']; label: string }> = [
    { id: 'diff', label: 'Symbolic Derivative' },
    { id: 'indef-int', label: 'Indefinite Integral' },
    { id: 'def-int', label: 'Definite Integral' },
    { id: 'limit', label: 'Limit' },
    { id: 'num-diff', label: 'Numerical Derivative' },
    { id: 'num-int', label: 'Numerical Integral' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Calculus Lab
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Symbolic differentiation & integration via Nerdamer, paired with high-precision numerical methods
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit max-w-full">
        {operations.map((op) => (
          <button
            key={op.id}
            type="button"
            onClick={() => {
              setOperation(op.id);
              if (op.id === 'limit' && expression === 'x^3 * sin(x)') {
                setExpression('sin(x)/x');
              }
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap shrink-0 cursor-pointer ${
              operation === op.id
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {op.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleCompute}
          className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Expression f({variable})
            </label>
            <input
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="e.g. x^2 * exp(x) or sin(x)/x"
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 font-mono text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Variable
              </label>
              <input
                type="text"
                maxLength={3}
                value={variable}
                onChange={(e) => setVariable(e.target.value || 'x')}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 font-mono text-sm"
              />
            </div>

            {(operation === 'diff' || operation === 'num-diff') && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Order
                </label>
                <select
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm"
                >
                  <option value={1}>1st (d/dx)</option>
                  <option value={2}>2nd (d²/dx²)</option>
                  <option value={3}>3rd (d³/dx³)</option>
                </select>
              </div>
            )}
          </div>

          {(operation === 'def-int' || operation === 'num-int') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Lower Limit (a)
                </label>
                <input
                  type="text"
                  value={lower}
                  onChange={(e) => setLower(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Upper Limit (b)
                </label>
                <input
                  type="text"
                  value={upper}
                  onChange={(e) => setUpper(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 font-mono text-sm"
                />
              </div>
            </div>
          )}

          {(operation === 'num-diff' || operation === 'limit') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  {operation === 'limit' ? 'Target (e.g. 0, inf, -inf)' : 'Evaluate at x₀'}
                </label>
                <input
                  type="text"
                  value={point}
                  onChange={(e) => setPoint(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 font-mono text-sm"
                />
              </div>
              {operation === 'limit' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Direction
                  </label>
                  <select
                    value={limitDirection}
                    onChange={(e) => setLimitDirection(e.target.value as 'both' | 'left' | 'right')}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm"
                  >
                    <option value="both">Two-sided</option>
                    <option value="left">Left (x → c⁻)</option>
                    <option value="right">Right (x → c⁺)</option>
                  </select>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-violet-600 to-cyan-600 text-white text-sm font-medium hover:opacity-95 transition cursor-pointer"
          >
            Compute
          </button>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-1.5">
            {[
              { label: 'Non-elementary e^(-x²)', expr: 'exp(-x^2)', op: 'def-int' as const },
              { label: 'sin(x)/x limit', expr: 'sin(x)/x', op: 'limit' as const },
              { label: 'x·ln(x) integral', expr: 'x*ln(x)', op: 'indef-int' as const },
            ].map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => {
                  setOperation(sample.op);
                  setExpression(sample.expr);
                  setResult(
                    computeCalculus({
                      operation: sample.op,
                      expression: sample.expr,
                      variable,
                      lower: '0',
                      upper: '1',
                      point: '0',
                    })
                  );
                }}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:border-cyan-500/60 cursor-pointer"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </form>

        <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          {!result.ok ? (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 text-sm text-rose-500">
              {result.error}
            </div>
          ) : (
            <>
              <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {result.exactAvailable ? 'Exact Symbolic Result Available' : 'Numerical Evaluation'}
                </div>
                <div className="font-mono text-base font-semibold text-slate-900 dark:text-white mt-0.5 break-words">
                  {result.input}
                </div>
              </div>

              {result.symbolicResult && (
                <div className="rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
                  <div className="text-xs font-medium text-blue-600 dark:text-cyan-400 mb-1">
                    Symbolic Expression
                  </div>
                  <div className="font-mono text-lg font-bold text-slate-900 dark:text-white break-all">
                    {result.symbolicResult}
                  </div>
                </div>
              )}

              {result.numericResult && (
                <div className="rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
                  <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                    Numerical Value
                  </div>
                  <div className="font-mono text-xl font-bold text-slate-900 dark:text-white break-words">
                    {result.numericResult}
                  </div>
                </div>
              )}

              {result.note && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-2.5 text-xs text-amber-700 dark:text-amber-300">
                  {result.note}
                </div>
              )}

              <div className="space-y-1.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Evaluation Log
                </div>
                <ul className="space-y-1 text-xs sm:text-sm font-mono text-slate-600 dark:text-slate-300">
                  {result.steps.map((s, idx) => (
                    <li key={idx} className="break-words">• {s}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
