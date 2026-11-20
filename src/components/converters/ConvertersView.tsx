import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { UNIT_CATEGORIES, convertUnit, type UnitCategoryId } from '../../lib/math/unitConverter';
import { getCachedCurrency, saveCachedCurrency } from '../../lib/storage/indexedDb';
import { formatNumericResult } from '../../lib/math/calculatorEngine';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'ZAR', name: 'South African Rand' },
];

export const ConvertersView: React.FC = () => {
  const [tab, setTab] = useState<'units' | 'currency'>('units');

  // Unit state
  const [categoryId, setCategoryId] = useState<UnitCategoryId>('length');
  const activeCategory = UNIT_CATEGORIES.find((c) => c.id === categoryId) || UNIT_CATEGORIES[0];
  const [fromUnit, setFromUnit] = useState<string>(
    () => UNIT_CATEGORIES[0].units[2]?.id ?? UNIT_CATEGORIES[0].units[0].id
  );
  const [toUnit, setToUnit] = useState<string>(
    () => UNIT_CATEGORIES[0].units[3]?.id ?? UNIT_CATEGORIES[0].units[0].id
  );
  const [unitAmount, setUnitAmount] = useState('100');

  // Currency state
  const [fxAmount, setFxAmount] = useState('1000');
  const [fromCurr, setFromCurr] = useState('USD');
  const [toCurr, setToCurr] = useState('INR');
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [rateTimestamp, setRateTimestamp] = useState<string>('');
  const [rateProvider, setRateProvider] = useState<string>('');
  const [isHistoricalCache, setIsHistoricalCache] = useState(false);
  const [fxLoading, setFxLoading] = useState(false);
  const [fxError, setFxError] = useState<string | null>(null);

  const handleCategoryChange = (id: UnitCategoryId) => {
    const cat = UNIT_CATEGORIES.find((c) => c.id === id) || UNIT_CATEGORIES[0];
    setCategoryId(cat.id);
    setFromUnit(cat.units[0].id);
    setToUnit(cat.units[Math.min(1, cat.units.length - 1)].id);
  };

  const fetchRates = useCallback(async (base: string) => {
    setFxLoading(true);
    setFxError(null);
    setIsHistoricalCache(false);

    try {
      const resp = await fetch(`/api/currency?base=${encodeURIComponent(base)}`);
      const data = await resp.json();
      if (!resp.ok || !data.rates) {
        throw new Error(data.error || 'Live exchange rate service unavailable');
      }
      setRates(data.rates);
      setRateTimestamp(data.timestamp);
      setRateProvider(data.provider || 'Live FX API');
      setIsHistoricalCache(false);
      await saveCachedCurrency({
        base,
        rates: data.rates,
        timestamp: data.timestamp,
        provider: data.provider || 'Live FX API',
        cachedAt: Date.now(),
      });
    } catch (err) {
      const cached = await getCachedCurrency(base);
      if (cached) {
        setRates(cached.rates);
        setRateTimestamp(cached.timestamp);
        setRateProvider(`${cached.provider} (Cached Historical Rate)`);
        setIsHistoricalCache(true);
        setFxError(
          `Live exchange rate API unavailable. Displaying previously cached historical rates from ${new Date(
            cached.cachedAt
          ).toLocaleString()}.`
        );
      } else {
        setRates(null);
        setFxError(
          err instanceof Error
            ? `${err.message}. Conversion rate is currently unavailable.`
            : 'Conversion rate is currently unavailable.'
        );
      }
    } finally {
      setFxLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'currency') {
      void fetchRates(fromCurr);
    }
  }, [tab, fromCurr, fetchRates]);

  const safeFromUnit = activeCategory.units.some((u) => u.id === fromUnit)
    ? fromUnit
    : activeCategory.units[0].id;
  const safeToUnit = activeCategory.units.some((u) => u.id === toUnit)
    ? toUnit
    : activeCategory.units[Math.min(1, activeCategory.units.length - 1)].id;

  const numericUnitVal = Number(unitAmount);
  const convertedUnitVal = Number.isFinite(numericUnitVal)
    ? convertUnit(numericUnitVal, safeFromUnit, safeToUnit, activeCategory.id)
    : NaN;

  const numericFxVal = Number(fxAmount);
  const targetRate = rates?.[toCurr];
  const convertedFxVal =
    Number.isFinite(numericFxVal) && typeof targetRate === 'number'
      ? numericFxVal * targetRate
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Unit & Currency Converters
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            12 physical unit categories and international currency exchange rates
          </p>
        </div>

        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit">
          <button
            type="button"
            onClick={() => setTab('units')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
              tab === 'units'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Unit Converter
          </button>
          <button
            type="button"
            onClick={() => setTab('currency')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
              tab === 'currency'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Currency Converter
          </button>
        </div>
      </div>

      {tab === 'units' ? (
        <div className="space-y-5">
          {/* Category Selector */}
          <div className="flex flex-wrap gap-1.5">
            {UNIT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
                  categoryId === cat.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-[#0C101B] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-cyan-500/60'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Primary Conversion Card */}
            <div className="lg:col-span-6 rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                {activeCategory.label} Conversion
              </h2>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Value</label>
                <input
                  type="number"
                  step="any"
                  value={unitAmount}
                  onChange={(e) => setUnitAmount(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 font-mono text-lg font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-end gap-2">
                <div className="min-w-0">
                  <label className="block text-xs text-slate-500 mb-1">From</label>
                  <select
                    value={safeFromUnit}
                    onChange={(e) => setFromUnit(e.target.value)}
                    className="w-full min-w-0 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-sm"
                  >
                    {activeCategory.units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFromUnit(safeToUnit);
                    setToUnit(safeFromUnit);
                  }}
                  aria-label="Swap units"
                  className="min-h-[44px] w-fit sm:w-auto justify-self-center p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>

                <div className="min-w-0">
                  <label className="block text-xs text-slate-500 mb-1">To</label>
                  <select
                    value={safeToUnit}
                    onChange={(e) => setToUnit(e.target.value)}
                    className="w-full min-w-0 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-sm"
                  >
                    {activeCategory.units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
                <div className="text-xs text-slate-500 mb-1">Converted Result</div>
                <div className="font-mono tabular-nums text-2xl font-bold text-blue-600 dark:text-cyan-400 break-words">
                  {Number.isFinite(convertedUnitVal)
                    ? `${formatNumericResult(convertedUnitVal, { precision: 8 })} ${
                        activeCategory.units.find((u) => u.id === safeToUnit)?.symbol || ''
                      }`
                    : '—'}
                </div>
              </div>
            </div>

            {/* Instant Table Across All Units */}
            <div className="lg:col-span-6 rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-3">
                All {activeCategory.label} Equivalents
              </h2>
              <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                {activeCategory.units.map((u) => {
                  const val = Number.isFinite(numericUnitVal)
                    ? convertUnit(numericUnitVal, safeFromUnit, u.id, activeCategory.id)
                    : NaN;
                  return (
                    <div key={u.id} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 text-slate-600 dark:text-slate-300">
                        {u.name} <span className="text-slate-400 font-mono text-xs">({u.symbol})</span>
                      </span>
                      <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white shrink-0">
                        {Number.isFinite(val) ? formatNumericResult(val, { precision: 8 }) : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              International Currency Exchange
            </h2>
            <button
              type="button"
              onClick={() => fetchRates(fromCurr)}
              disabled={fxLoading}
              className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fxLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Rate</span>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Amount</label>
              <input
                type="number"
                step="any"
                value={fxAmount}
                onChange={(e) => setFxAmount(e.target.value)}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 font-mono text-lg font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-end gap-2">
              <div className="min-w-0">
                <label className="block text-xs text-slate-500 mb-1">From Currency</label>
                <select
                  value={fromCurr}
                  onChange={(e) => setFromCurr(e.target.value)}
                  className="w-full min-w-0 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-sm"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFromCurr(toCurr);
                  setToCurr(fromCurr);
                }}
                aria-label="Swap currencies"
                className="min-h-[44px] w-fit sm:w-auto justify-self-center p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>

              <div className="min-w-0">
                <label className="block text-xs text-slate-500 mb-1">To Currency</label>
                <select
                  value={toCurr}
                  onChange={(e) => setToCurr(e.target.value)}
                  className="w-full min-w-0 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-sm"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {fxLoading && (
            <div className="flex items-center gap-2 text-sm text-cyan-600 dark:text-cyan-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Fetching live exchange rates...</span>
            </div>
          )}

          {fxError && (
            <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-700 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{fxError}</span>
            </div>
          )}

          {!fxLoading && convertedFxVal !== null && typeof targetRate === 'number' && (
            <div className="rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                1 {fromCurr} = {targetRate.toFixed(6)} {toCurr}
                {isHistoricalCache ? ' (Historical Cached Rate)' : ''}
              </div>
              <div className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {formatNumericResult(convertedFxVal, { precision: 4 })} {toCurr}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Last Updated: {rateTimestamp} · Source: {rateProvider}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
