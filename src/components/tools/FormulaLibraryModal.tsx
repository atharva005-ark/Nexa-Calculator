import React, { useState } from 'react';
import { Plus, Star, Trash2, X } from 'lucide-react';
import { CONSTANTS_LIBRARY, FORMULA_LIBRARY } from '../../lib/math/libraryData';
import { evaluateExpression } from '../../lib/math/calculatorEngine';
import { useCalculator } from '../../context/CalculatorContext';

export const FormulaLibraryModal: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const { favorites, addFavorite, removeFavorite, setSharedExpression, settings } = useCalculator();
  const [tab, setTab] = useState<'formulas' | 'constants' | 'favorites'>('formulas');
  const [selectedFormulaId, setSelectedFormulaId] = useState<string>(FORMULA_LIBRARY[0].id);
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [computedFormula, setComputedFormula] = useState<string | null>(null);

  if (!open) return null;

  const activeFormula = FORMULA_LIBRARY.find((f) => f.id === selectedFormulaId) || FORMULA_LIBRARY[0];

  const handleEvaluateFormula = () => {
    let expr = activeFormula.evaluableTemplate;
    for (const v of activeFormula.variables) {
      const val = varValues[v.name] ?? String(v.defaultVal);
      expr = expr.replace(new RegExp(`\\b${v.name}\\b`, 'g'), `(${val})`);
    }
    const res = evaluateExpression(expr, {
      angleUnit: settings.angleUnit,
      precision: settings.precision,
      thousandsSeparator: settings.thousandsSeparator,
    });
    setComputedFormula(res.ok ? res.formattedResult : res.error || 'Error');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#0F141F] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Formulas, Favorites & Constants Library
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close library"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          {(
            [
              { id: 'formulas', label: 'Formula Library' },
              { id: 'constants', label: 'Constants' },
              { id: 'favorites', label: `Favorites (${favorites.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition cursor-pointer ${
                tab === t.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {tab === 'formulas' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                {FORMULA_LIBRARY.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setSelectedFormulaId(f.id);
                      setComputedFormula(null);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                      f.id === activeFormula.id
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <div className="text-xs text-slate-500 dark:text-slate-400">{f.category}</div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{f.title}</div>
                    <div className="font-mono text-xs text-cyan-600 dark:text-cyan-400 mt-1">
                      {f.formula}
                    </div>
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/50 h-fit">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{activeFormula.category}</div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">{activeFormula.title}</h4>
                  </div>
                  <button
                    type="button"
                    title="Add to Favorites"
                    onClick={() =>
                      addFavorite({
                        title: activeFormula.title,
                        expression: activeFormula.evaluableTemplate,
                        category: activeFormula.category,
                        description: activeFormula.formula,
                      })
                    }
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 cursor-pointer"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">{activeFormula.description}</p>
                <div className="font-mono text-sm text-blue-600 dark:text-cyan-400 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
                  {activeFormula.formula}
                </div>

                <div className="space-y-2">
                  {activeFormula.variables.map((v) => (
                    <div key={v.name}>
                      <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">
                        {v.label}
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={varValues[v.name] ?? String(v.defaultVal)}
                        onChange={(e) =>
                          setVarValues((prev) => ({ ...prev, [v.name]: e.target.value }))
                        }
                        className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 font-mono text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleEvaluateFormula}
                  className="w-full py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition cursor-pointer"
                >
                  Compute Formula
                </button>

                {computedFormula !== null && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-xs text-slate-500">Result</span>
                    <span className="font-mono font-bold text-lg text-emerald-600 dark:text-emerald-400">
                      {computedFormula}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'constants' && (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
              {CONSTANTS_LIBRARY.map((c) => (
                <div
                  key={c.symbol}
                  className="flex items-center justify-between gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-900/60"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                        {c.symbol}
                      </span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {c.name}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {c.category} · {c.unit}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      {c.value}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSharedExpression(c.numericValue);
                        onClose();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-blue-600 hover:text-white transition cursor-pointer"
                    >
                      Insert
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'favorites' && (
            <div className="space-y-2">
              {favorites.length === 0 ? (
                <div className="text-center py-10 text-sm text-slate-500 dark:text-slate-400">
                  No favorite formulas saved yet. Click the star icon on any calculation or formula to pin it here.
                </div>
              ) : (
                favorites.map((fav) => (
                  <div
                    key={fav.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800"
                  >
                    <div className="min-w-0">
                      <div className="text-xs text-slate-500 dark:text-slate-400">{fav.category}</div>
                      <div className="font-mono text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {fav.expression}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {fav.description}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSharedExpression(fav.expression);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Use</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFavorite(fav.id)}
                        aria-label="Remove favorite"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
