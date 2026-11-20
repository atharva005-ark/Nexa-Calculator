import React, { useMemo, useState } from 'react';
import { Check, Copy, CornerUpLeft, Search, Trash2 } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';

export const HistoryView: React.FC = () => {
  const { history, removeHistoryItem, clearHistory, reuseExpression } = useCalculator();
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      (h) =>
        h.expression.toLowerCase().includes(q) ||
        h.result.toLowerCase().includes(q) ||
        h.mode.toLowerCase().includes(q)
    );
  }, [history, search]);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Calculation History
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Stored locally on your device via IndexedDB · {history.length} saved entries
          </p>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={() => void clearHistory()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-medium cursor-pointer w-fit"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear All History</span>
          </button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search expressions, answers, or mode..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
          {history.length === 0
            ? 'No calculation history yet. Perform any calculation and it will appear here automatically.'
            : 'No entries match your search filter.'}
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="min-w-0 space-y-1">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {item.mode}
                  {item.angleUnit ? ` · ${item.angleUnit}` : ''} ·{' '}
                  {new Date(item.timestamp).toLocaleString()}
                </div>
                <div className="font-mono text-sm text-slate-700 dark:text-slate-300 break-all">
                  {item.expression}
                </div>
                <div className="font-mono tabular-nums text-lg font-bold text-slate-900 dark:text-white">
                  = {item.result}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => reuseExpression(item.expression, 'scientific')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/10 text-blue-600 dark:text-cyan-400 hover:bg-blue-600 hover:text-white text-xs font-medium transition cursor-pointer"
                >
                  <CornerUpLeft className="w-3.5 h-3.5" />
                  <span>Reuse</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(item.id, item.result)}
                  aria-label="Copy result"
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  {copiedId === item.id ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void removeHistoryItem(item.id)}
                  aria-label="Delete history entry"
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-rose-500 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
