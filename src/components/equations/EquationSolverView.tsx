import React, { useState } from 'react';
import { solveEquation, solveLinearSystem, type EquationSolveResult } from '../../lib/math/symbolicEngine';
import { useCalculator } from '../../context/CalculatorContext';
import { MatrixCalculatorView } from '../matrix/MatrixCalculatorView';

export const EquationSolverView: React.FC = () => {
  const { recordHistory } = useCalculator();
  const [mode, setMode] = useState<'single' | 'system' | 'matrix'>('single');
  const [equationInput, setEquationInput] = useState('x^2 - 5x + 6 = 0');
  const [variable, setVariable] = useState('x');
  const [systemInputs, setSystemInputs] = useState<string[]>(['2x + y = 7', 'x - y = 2']);
  const [result, setResult] = useState<EquationSolveResult | null>(() =>
    solveEquation('x^2 - 5x + 6 = 0', 'x')
  );

  const handleSolveSingle = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const res = solveEquation(equationInput, variable);
    setResult(res);
    if (res.ok) {
      void recordHistory({
        expression: equationInput,
        result: res.solutions.join(', '),
        mode: 'Equation Solver',
      });
    }
  };

  const handleSolveSystem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const res = solveLinearSystem(systemInputs);
    setResult(res);
    if (res.ok) {
      void recordHistory({
        expression: systemInputs.join('; '),
        result: res.solutions.join(', '),
        mode: 'Linear System',
      });
    }
  };

  const presets = [
    { label: 'Linear', eq: '2x + 5 = 15' },
    { label: 'Quadratic', eq: 'x^2 - 5x + 6 = 0' },
    { label: 'Complex Roots', eq: 'x^2 + 4x + 13 = 0' },
    { label: 'Cubic Polynomial', eq: 'x^3 - 6x^2 + 11x - 6 = 0' },
    { label: 'Linear Inequality', eq: '3x - 7 > 8' },
    { label: 'Quadratic Inequality', eq: 'x^2 - 4 <= 0' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Equations & Matrix Algebra
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Solve linear, quadratic, polynomial equations, simultaneous systems, inequalities, and matrices
          </p>
        </div>

        <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit max-w-full">
          {(
            [
              { id: 'single', label: 'Equation / Inequality' },
              { id: 'system', label: 'Simultaneous System' },
              { id: 'matrix', label: 'Matrix Calculator' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMode(t.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap shrink-0 cursor-pointer ${
                mode === t.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'matrix' ? (
        <MatrixCalculatorView />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            {mode === 'single' ? (
              <form onSubmit={handleSolveSingle} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    Equation or Inequality
                  </label>
                  <input
                    type="text"
                    value={equationInput}
                    onChange={(e) => setEquationInput(e.target.value)}
                    placeholder="e.g. x^2 - 5x + 6 = 0 or 2x + 5 > 15"
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    Solve for Variable
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={variable}
                    onChange={(e) => setVariable(e.target.value || 'x')}
                    className="w-24 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 font-mono text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-violet-600 to-cyan-600 text-white text-sm font-medium hover:opacity-95 transition cursor-pointer"
                >
                  Solve Equation
                </button>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-medium text-slate-500 mb-2">Examples</div>
                  <div className="flex flex-wrap gap-1.5">
                    {presets.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          setEquationInput(p.eq);
                          setResult(solveEquation(p.eq, variable));
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:border-cyan-500/60 cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSolveSystem} className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    System of Linear Equations
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSystemInputs((prev) => [...prev, ''])}
                      className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium cursor-pointer"
                    >
                      + Equation
                    </button>
                    {systemInputs.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setSystemInputs((prev) => prev.slice(0, -1))}
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-rose-500 cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {systemInputs.map((eq, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={eq}
                      onChange={(e) =>
                        setSystemInputs((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))
                      }
                      placeholder={`Equation ${idx + 1}, e.g. 2x + 3y - z = 5`}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 font-mono text-sm text-slate-900 dark:text-white"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-violet-600 to-cyan-600 text-white text-sm font-medium hover:opacity-95 transition cursor-pointer"
                >
                  Solve System
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const sys3 = ['x + y + z = 6', '2x - y + z = 3', 'x + 2y - z = 2'];
                    setSystemInputs(sys3);
                    setResult(solveLinearSystem(sys3));
                  }}
                  className="text-xs text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  Load 3×3 System Example
                </button>
              </form>
            )}
          </div>

          <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            {!result ? (
              <p className="text-sm text-slate-500">Enter an equation and click Solve to inspect steps and roots.</p>
            ) : !result.ok ? (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 text-sm text-rose-500">
                {result.error}
              </div>
            ) : (
              <>
                <div className="space-y-1 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Method: {result.method}
                  </div>
                  <div className="font-mono text-base font-semibold text-slate-900 dark:text-white break-words">
                    {result.equation}
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Step-by-Step Solution
                  </h2>
                  <ol className="space-y-2 list-decimal list-inside text-sm text-slate-700 dark:text-slate-300">
                    {result.steps.map((s, i) => (
                      <li key={i} className="font-mono text-xs sm:text-sm leading-relaxed break-words">
                        {s}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
                  <div className="text-xs font-medium text-blue-600 dark:text-cyan-400">
                    Final Solution ({result.solutions.length} {result.solutions.length === 1 ? 'root' : 'roots'})
                  </div>
                  <div className="space-y-1">
                    {result.solutions.map((sol, idx) => (
                      <div key={idx} className="font-mono text-base sm:text-lg font-bold text-slate-900 dark:text-white break-words">
                        {sol}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
