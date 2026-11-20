import React, { useMemo, useState } from 'react';
import {
  calculateCompoundInterest,
  calculateDiscount,
  calculateEMI,
  calculateGST,
  calculateProfitLoss,
  calculateRetirement,
  calculateSIP,
  calculateSimpleInterest,
  calculateTip,
} from '../../lib/math/financeEngine';

type FinanceTool =
  | 'emi'
  | 'sip'
  | 'compound'
  | 'simple'
  | 'gst'
  | 'discount'
  | 'percentage'
  | 'profit-loss'
  | 'tip'
  | 'retirement';

const fmt = (n: number) =>
  Number.isFinite(n)
    ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—';

export const FinanceView: React.FC = () => {
  const [tool, setTool] = useState<FinanceTool>('emi');

  // EMI
  const [loanAmount, setLoanAmount] = useState(500000);
  const [loanRate, setLoanRate] = useState(8.5);
  const [loanMonths, setLoanMonths] = useState(60);
  const [showSchedule, setShowSchedule] = useState(false);

  // SIP
  const [sipMonthly, setSipMonthly] = useState(10000);
  const [sipReturn, setSipReturn] = useState(12);
  const [sipYears, setSipYears] = useState(10);

  // Compound / Simple
  const [principal, setPrincipal] = useState(100000);
  const [rate, setRate] = useState(7.5);
  const [years, setYears] = useState(5);
  const [compFreq, setCompFreq] = useState(4);

  // GST
  const [gstAmount, setGstAmount] = useState(1000);
  const [gstRate, setGstRate] = useState(18);
  const [gstMode, setGstMode] = useState<'exclusive' | 'inclusive'>('exclusive');

  // Discount
  const [origPrice, setOrigPrice] = useState(2500);
  const [discPct, setDiscPct] = useState(20);

  // Percentage
  const [pctA, setPctA] = useState(15);
  const [pctB, setPctB] = useState(200);

  // Profit & Loss
  const [costPrice, setCostPrice] = useState(800);
  const [sellPrice, setSellPrice] = useState(1040);

  // Tip
  const [billAmt, setBillAmt] = useState(120);
  const [tipPct, setTipPct] = useState(15);
  const [splitPeople, setSplitPeople] = useState(2);

  // Retirement
  const [curAge, setCurAge] = useState(28);
  const [retAge, setRetAge] = useState(60);
  const [curSavings, setCurSavings] = useState(25000);
  const [retMonthly, setRetMonthly] = useState(800);
  const [retReturn, setRetReturn] = useState(8);

  const emiState = useMemo(() => {
    if (!Number.isFinite(loanAmount) || loanAmount <= 0) {
      return { data: null, error: 'Loan amount must be greater than 0.' };
    }
    if (!Number.isFinite(loanRate) || loanRate < 0) {
      return { data: null, error: 'Annual interest rate cannot be negative.' };
    }
    if (!Number.isFinite(loanMonths) || loanMonths <= 0) {
      return { data: null, error: 'Loan duration must be at least 1 month.' };
    }
    try {
      return { data: calculateEMI(loanAmount, loanRate, loanMonths), error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Invalid EMI parameters.' };
    }
  }, [loanAmount, loanRate, loanMonths]);

  const sipState = useMemo(() => {
    if (!Number.isFinite(sipMonthly) || sipMonthly <= 0) {
      return { data: null, error: 'Monthly investment must be greater than 0.' };
    }
    if (!Number.isFinite(sipReturn) || sipReturn < 0) {
      return { data: null, error: 'Expected annual return cannot be negative.' };
    }
    if (!Number.isFinite(sipYears) || sipYears <= 0) {
      return { data: null, error: 'Investment duration must be greater than 0 years.' };
    }
    try {
      return { data: calculateSIP(sipMonthly, sipReturn, sipYears), error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Invalid SIP parameters.' };
    }
  }, [sipMonthly, sipReturn, sipYears]);

  const tools: Array<{ id: FinanceTool; label: string }> = [
    { id: 'emi', label: 'EMI Loan' },
    { id: 'sip', label: 'SIP Investment' },
    { id: 'compound', label: 'Compound Interest' },
    { id: 'simple', label: 'Simple Interest' },
    { id: 'gst', label: 'GST' },
    { id: 'discount', label: 'Discount' },
    { id: 'percentage', label: 'Percentage' },
    { id: 'profit-loss', label: 'Profit & Loss' },
    { id: 'tip', label: 'Tip Split' },
    { id: 'retirement', label: 'Retirement' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Financial Calculator Suite
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Loan amortization, investment projections, tax breakdowns, and everyday commerce math
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tools.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTool(t.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
              tool === t.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-[#0C101B] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tool === 'emi' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Loan Amount</label>
                <input
                  type="number"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Annual Interest Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={loanRate}
                  onChange={(e) => setLoanRate(Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Loan Duration (Months)</label>
                <input
                  type="number"
                  value={loanMonths}
                  onChange={(e) => setLoanMonths(Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 font-mono text-sm"
                />
              </div>
            </div>

            {emiState.error ? (
              <div className="lg:col-span-7 rounded-2xl bg-rose-500/10 border border-rose-500/30 p-5 text-sm text-rose-600 dark:text-rose-300">
                {emiState.error}
              </div>
            ) : emiState.data && (
              <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-slate-500">Monthly EMI</div>
                    <div className="font-mono tabular-nums text-2xl font-bold text-blue-600 dark:text-cyan-400 mt-1">
                      {fmt(emiState.data.monthlyEMI)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Total Interest</div>
                    <div className="font-mono tabular-nums text-xl font-bold text-slate-900 dark:text-white mt-1">
                      {fmt(emiState.data.totalInterest)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Total Repayment</div>
                    <div className="font-mono tabular-nums text-xl font-bold text-slate-900 dark:text-white mt-1">
                      {fmt(emiState.data.totalPayment)}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSchedule((s) => !s)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {showSchedule ? 'Hide Amortization Schedule' : `Show Amortization Schedule (${emiState.data.schedule.length} months)`}
                </button>

                {showSchedule && (
                  <div className="max-h-72 overflow-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-xs text-right font-mono tabular-nums">
                      <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="p-2 text-left">Month</th>
                          <th className="p-2">Principal</th>
                          <th className="p-2">Interest</th>
                          <th className="p-2">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {emiState.data.schedule.map((row) => (
                          <tr key={row.month}>
                            <td className="p-2 text-left">{row.month}</td>
                            <td className="p-2">{fmt(row.principalPaid)}</td>
                            <td className="p-2">{fmt(row.interestPaid)}</td>
                            <td className="p-2">{fmt(row.remainingBalance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tool === 'sip' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Monthly Investment</label>
              <input
                type="number"
                value={sipMonthly}
                onChange={(e) => setSipMonthly(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Expected Annual Return (%)</label>
              <input
                type="number"
                step="0.1"
                value={sipReturn}
                onChange={(e) => setSipReturn(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Investment Duration (Years)</label>
              <input
                type="number"
                value={sipYears}
                onChange={(e) => setSipYears(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 font-mono text-sm"
              />
            </div>
          </div>

          {sipState.error ? (
            <div className="lg:col-span-7 rounded-2xl bg-rose-500/10 border border-rose-500/30 p-5 text-sm text-rose-600 dark:text-rose-300">
              {sipState.error}
            </div>
          ) : sipState.data && (
            <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-slate-500">Estimated Future Value</div>
                  <div className="font-mono tabular-nums text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {fmt(sipState.data.futureValue)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Invested Amount</div>
                  <div className="font-mono tabular-nums text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {fmt(sipState.data.investedAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Estimated Returns</div>
                  <div className="font-mono tabular-nums text-xl font-bold text-blue-600 dark:text-cyan-400 mt-1">
                    {fmt(sipState.data.estimatedReturns)}
                  </div>
                </div>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                Note: SIP projections are mathematical estimates assuming a constant annual rate of return and are not guaranteed market returns.
              </p>
            </div>
          )}
        </div>
      )}

      {(tool === 'compound' || tool === 'simple') && (
        <div className="max-w-2xl rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Principal</label>
              <input
                type="number"
                value={principal}
                onChange={(e) => setPrincipal(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Annual Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Time (Years)</label>
              <input
                type="number"
                step="0.5"
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 font-mono text-sm"
              />
            </div>
          </div>

          {tool === 'compound' && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Compounding Frequency</label>
              <select
                value={compFreq}
                onChange={(e) => setCompFreq(Number(e.target.value))}
                className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm"
              >
                <option value={1}>Annually (1/yr)</option>
                <option value={2}>Semi-Annually (2/yr)</option>
                <option value={4}>Quarterly (4/yr)</option>
                <option value={12}>Monthly (12/yr)</option>
                <option value={365}>Daily (365/yr)</option>
              </select>
            </div>
          )}

          {(() => {
            const res =
              tool === 'compound'
                ? calculateCompoundInterest(principal, rate, years, compFreq)
                : calculateSimpleInterest(principal, rate, years);
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs text-slate-500">Total Interest</div>
                  <div className="font-mono text-xl font-bold text-blue-600 dark:text-cyan-400">
                    {fmt(res.interest)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Maturity Amount</div>
                  <div className="font-mono text-xl font-bold text-slate-900 dark:text-white">
                    {fmt(res.totalAmount)}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {tool === 'gst' && (
        <div className="max-w-xl rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Amount</label>
              <input
                type="number"
                value={gstAmount}
                onChange={(e) => setGstAmount(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">GST Rate (%)</label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 font-mono text-sm"
              >
                {[3, 5, 12, 18, 28].map((r) => (
                  <option key={r} value={r}>
                    {r}%
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            {(['exclusive', 'inclusive'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setGstMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize cursor-pointer ${
                  gstMode === m ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800'
                }`}
              >
                GST {m}
              </button>
            ))}
          </div>
          {(() => {
            const g = calculateGST(gstAmount, gstRate, gstMode);
            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs text-slate-500">Base Price</div>
                  <div className="font-mono font-bold">{fmt(g.baseAmount)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">GST (CGST+SGST)</div>
                  <div className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                    {fmt(g.gstAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Total Amount</div>
                  <div className="font-mono font-bold">{fmt(g.totalAmount)}</div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {tool === 'discount' && (
        <div className="max-w-xl rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Original Price</label>
              <input
                type="number"
                value={origPrice}
                onChange={(e) => setOrigPrice(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Discount (%)</label>
              <input
                type="number"
                value={discPct}
                onChange={(e) => setDiscPct(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 font-mono text-sm"
              />
            </div>
          </div>
          {(() => {
            const d = calculateDiscount(origPrice, discPct);
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs text-slate-500">You Save</div>
                  <div className="font-mono text-xl font-bold text-emerald-500">{fmt(d.savings)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Final Price</div>
                  <div className="font-mono text-xl font-bold">{fmt(d.finalPrice)}</div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {tool === 'percentage' && (
        <div className="max-w-xl rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Value X</label>
              <input
                type="number"
                value={pctA}
                onChange={(e) => setPctA(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Value Y</label>
              <input
                type="number"
                value={pctB}
                onChange={(e) => setPctB(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 font-mono text-sm"
              />
            </div>
          </div>
          <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800 text-sm font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">{pctA}% of {pctB}</span>
              <span className="font-bold">{fmt((pctA / 100) * pctB)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{pctA} is what % of {pctB}</span>
              <span className="font-bold">{pctB !== 0 ? `${fmt((pctA / pctB) * 100)}%` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">% change from {pctA} to {pctB}</span>
              <span className="font-bold">{pctA !== 0 ? `${fmt(((pctB - pctA) / pctA) * 100)}%` : '—'}</span>
            </div>
          </div>
        </div>
      )}

      {tool === 'profit-loss' && (
        <div className="max-w-xl rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Cost Price</label>
              <input
                type="number"
                value={costPrice}
                onChange={(e) => setCostPrice(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Selling Price</label>
              <input
                type="number"
                value={sellPrice}
                onChange={(e) => setSellPrice(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 font-mono text-sm"
              />
            </div>
          </div>
          {(() => {
            const pl = calculateProfitLoss(costPrice, sellPrice);
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs text-slate-500">{pl.status} Amount</div>
                  <div className={`font-mono text-xl font-bold ${pl.status === 'Loss' ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {fmt(pl.amount)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">{pl.status} Margin</div>
                  <div className="font-mono text-xl font-bold">{fmt(pl.percent)}%</div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {tool === 'tip' && (
        <div className="max-w-xl rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Bill Total</label>
              <input
                type="number"
                value={billAmt}
                onChange={(e) => setBillAmt(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Tip (%)</label>
              <input
                type="number"
                value={tipPct}
                onChange={(e) => setTipPct(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Split People</label>
              <input
                type="number"
                min={1}
                value={splitPeople}
                onChange={(e) => setSplitPeople(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 font-mono text-sm"
              />
            </div>
          </div>
          {(() => {
            const tip = calculateTip(billAmt, tipPct, splitPeople);
            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs text-slate-500">Tip Amount</div>
                  <div className="font-mono font-bold">{fmt(tip.tipAmount)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Total Bill</div>
                  <div className="font-mono font-bold">{fmt(tip.totalBill)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Per Person</div>
                  <div className="font-mono font-bold text-blue-600 dark:text-cyan-400">
                    {fmt(tip.perPerson)}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {tool === 'retirement' && (
        <div className="max-w-2xl rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Current Age</label>
              <input
                type="number"
                value={curAge}
                onChange={(e) => setCurAge(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Retirement Age</label>
              <input
                type="number"
                value={retAge}
                onChange={(e) => setRetAge(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Current Savings</label>
              <input
                type="number"
                value={curSavings}
                onChange={(e) => setCurSavings(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Monthly Contribution</label>
              <input
                type="number"
                value={retMonthly}
                onChange={(e) => setRetMonthly(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Est. Annual Return (%)</label>
              <input
                type="number"
                step="0.1"
                value={retReturn}
                onChange={(e) => setRetReturn(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 font-mono text-sm"
              />
            </div>
          </div>

          {(() => {
            const ret = calculateRetirement({
              currentAge: curAge,
              retirementAge: retAge,
              currentSavings: curSavings,
              monthlyContribution: retMonthly,
              annualReturnPercent: retReturn,
            });
            return (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="text-xs text-slate-500">Projected Corpus</div>
                    <div className="font-mono text-xl font-bold text-emerald-500">
                      {fmt(ret.projectedCorpus)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Total Contributed</div>
                    <div className="font-mono font-bold">{fmt(ret.totalPrincipal)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Est. Compound Growth</div>
                    <div className="font-mono font-bold text-cyan-500">{fmt(ret.estimatedGrowth)}</div>
                  </div>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                  Note: Retirement figures are hypothetical estimates and do not guarantee future investment returns or adjust for inflation.
                </p>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};
