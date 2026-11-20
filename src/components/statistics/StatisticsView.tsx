import React, { useMemo, useState } from 'react';
import { computeStatistics, parseDataset } from '../../lib/math/statisticsEngine';
import { formatNumericResult } from '../../lib/math/calculatorEngine';

export const StatisticsView: React.FC = () => {
  const [rawInput, setRawInput] = useState('12, 15, 18, 22, 22, 25, 29, 34, 41, 48');

  const parsed = useMemo(() => parseDataset(rawInput), [rawInput]);
  const stats = useMemo(() => {
    if (parsed.values.length === 0) return null;
    try {
      return computeStatistics(parsed.values);
    } catch {
      return null;
    }
  }, [parsed.values]);

  const metrics = stats
    ? [
        { label: 'Count (n)', value: String(stats.count) },
        { label: 'Sum (Σx)', value: formatNumericResult(stats.sum, { precision: 6 }) },
        { label: 'Mean (x̄)', value: formatNumericResult(stats.mean, { precision: 6 }) },
        { label: 'Median', value: formatNumericResult(stats.median, { precision: 6 }) },
        {
          label: 'Mode',
          value: stats.mode.length ? stats.mode.join(', ') : 'None (all unique)',
        },
        { label: 'Range (Max - Min)', value: formatNumericResult(stats.range, { precision: 6 }) },
        { label: 'Minimum', value: formatNumericResult(stats.min, { precision: 6 }) },
        { label: 'Maximum', value: formatNumericResult(stats.max, { precision: 6 }) },
        { label: 'Sample Variance (s²)', value: formatNumericResult(stats.varianceSample, { precision: 6 }) },
        { label: 'Population Variance (σ²)', value: formatNumericResult(stats.variancePopulation, { precision: 6 }) },
        { label: 'Sample Std Dev (s)', value: formatNumericResult(stats.stdDevSample, { precision: 6 }) },
        { label: 'Population Std Dev (σ)', value: formatNumericResult(stats.stdDevPopulation, { precision: 6 }) },
        { label: 'Q1 (25th Percentile)', value: formatNumericResult(stats.q1, { precision: 6 }) },
        { label: 'Q3 (75th Percentile)', value: formatNumericResult(stats.q3, { precision: 6 }) },
        { label: 'Interquartile Range (IQR)', value: formatNumericResult(stats.iqr, { precision: 6 }) },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Statistics Calculator
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Descriptive statistics, variance, standard deviation, and quartile analysis
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Dataset (comma, space, or newline separated)
            </label>
            <button
              type="button"
              onClick={() => setRawInput('')}
              className="text-xs text-rose-500 hover:underline cursor-pointer"
            >
              Clear
            </button>
          </div>
          <textarea
            rows={6}
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="Enter numbers separated by commas or line breaks..."
            className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />

          {parsed.invalidTokens.length > 0 && (
            <div className="text-xs text-amber-600 dark:text-amber-400">
              Ignored non-numeric tokens: {parsed.invalidTokens.join(', ')}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setRawInput('10, 20, 30, 40, 50')}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs cursor-pointer"
            >
              Uniform (10–50)
            </button>
            <button
              type="button"
              onClick={() => setRawInput('98.2\n99.1\n97.8\n98.6\n98.6\n100.4\n97.5')}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs cursor-pointer"
            >
              Lab Samples
            </button>
          </div>
        </div>

        <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5">
          {!stats ? (
            <p className="text-sm text-slate-500">Enter at least one valid number to view statistical summary.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {metrics.map((m) => (
                  <div
                    key={m.label}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80"
                  >
                    <div className="text-xs text-slate-500 dark:text-slate-400">{m.label}</div>
                    <div className="font-mono tabular-nums text-base font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                      {m.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 mb-1">Sorted Sequence</div>
                <div className="font-mono text-xs text-slate-700 dark:text-slate-300 break-words">
                  [{stats.sorted.join(', ')}]
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
