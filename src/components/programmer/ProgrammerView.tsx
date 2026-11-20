import React, { useState } from 'react';
import { Delete } from 'lucide-react';
import {
  bitwiseNot,
  formatAllBases,
  parseInBase,
  performBitwiseOperation,
  type BitWidth,
  type BitwiseOp,
  type NumberBase,
} from '../../lib/math/programmerEngine';

export const ProgrammerView: React.FC = () => {
  const [base, setBase] = useState<NumberBase>('DEC');
  const [width, setWidth] = useState<BitWidth>(32);
  const [value, setValue] = useState<bigint>(42n);
  const [inputText, setInputText] = useState('42');
  const [pendingOp, setPendingOp] = useState<{ lhs: bigint; op: BitwiseOp } | null>(null);
  const [awaitingSecondOperand, setAwaitingSecondOperand] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const bases = formatAllBases(value, width);

  const syncFromBigInt = (next: bigint) => {
    const masked = BigInt.asIntN(width, next);
    setValue(masked);
    const fmt = formatAllBases(masked, width);
    setInputText(fmt[base]);
    setErrorMsg(null);
  };

  const handleBaseSwitch = (nextBase: NumberBase) => {
    setBase(nextBase);
    const fmt = formatAllBases(value, width);
    setInputText(fmt[nextBase]);
    setErrorMsg(null);
  };

  const handleDirectEdit = (raw: string) => {
    setAwaitingSecondOperand(false);
    setInputText(raw);
    try {
      const parsed = parseInBase(raw, base, width);
      setValue(parsed);
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Invalid digit for current base');
    }
  };

  const appendDigit = (d: string) => {
    if (awaitingSecondOperand) {
      handleDirectEdit(d);
      return;
    }
    const nextStr = inputText === '0' ? d : inputText + d;
    handleDirectEdit(nextStr);
  };

  const triggerOp = (op: BitwiseOp) => {
    if (pendingOp && awaitingSecondOperand) {
      setPendingOp({ lhs: pendingOp.lhs, op });
      return;
    }
    if (pendingOp) {
      try {
        const res = performBitwiseOperation(pendingOp.lhs, value, pendingOp.op, width);
        setPendingOp({ lhs: res, op });
        setAwaitingSecondOperand(true);
        syncFromBigInt(res);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Bitwise error');
      }
    } else {
      setPendingOp({ lhs: value, op });
      setAwaitingSecondOperand(true);
    }
  };

  const handleEquals = () => {
    if (!pendingOp) return;
    try {
      const rhs = awaitingSecondOperand ? pendingOp.lhs : value;
      const res = performBitwiseOperation(pendingOp.lhs, rhs, pendingOp.op, width);
      setPendingOp(null);
      setAwaitingSecondOperand(false);
      syncFromBigInt(res);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Operation error');
    }
  };

  const toggleBit = (bitIndexFromLeft: number) => {
    const bitPos = BigInt(width - 1 - bitIndexFromLeft);
    const toggled = value ^ (1n << bitPos);
    syncFromBigInt(toggled);
  };

  const isDigitAllowed = (d: string) => {
    if (base === 'BIN') return d === '0' || d === '1';
    if (base === 'OCT') return /^[0-7]$/.test(d);
    if (base === 'DEC') return /^[0-9]$/.test(d);
    return /^[0-9A-F]$/.test(d);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Programmer Calculator
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Instant Binary, Octal, Decimal, Hexadecimal conversions and bitwise logic
          </p>
        </div>

        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit">
          {([8, 16, 32, 64] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => {
                setWidth(w);
                const masked = BigInt.asIntN(w, value);
                setValue(masked);
                setInputText(formatAllBases(masked, w)[base]);
              }}
              className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition cursor-pointer ${
                width === w
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              {w}-bit
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Multi-Base Display + Bit Toggle Grid */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            {pendingOp && (
              <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400">
                Pending: {formatAllBases(pendingOp.lhs, width)[base]} {pendingOp.op}
              </div>
            )}
            <input
              type="text"
              value={inputText}
              onChange={(e) => handleDirectEdit(e.target.value.toUpperCase())}
              className="w-full text-right bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 font-mono text-2xl font-bold text-slate-900 dark:text-white"
            />
            {errorMsg && <div className="text-xs text-rose-500 text-right">{errorMsg}</div>}

            <div className="divide-y divide-slate-200 dark:divide-slate-800 pt-1">
              {(['HEX', 'DEC', 'OCT', 'BIN'] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => handleBaseSwitch(b)}
                  className={`w-full py-2.5 px-3 flex items-center justify-between gap-4 text-left rounded-lg transition cursor-pointer ${
                    base === b ? 'bg-blue-600/10 text-blue-600 dark:text-cyan-400' : 'hover:bg-slate-50 dark:hover:bg-slate-900/60'
                  }`}
                >
                  <span className="font-mono text-xs font-bold w-10 shrink-0">{b}</span>
                  <span className="font-mono text-sm font-semibold break-all text-right">
                    {bases[b]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Bit Inspector */}
          <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-4 space-y-2">
            <div className="text-xs font-medium text-slate-500">
              Interactive Bit Register ({width}-bit, click any bit to flip)
            </div>
            <div className="grid grid-cols-8 gap-1">
              {bases.bits.map((bit, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleBit(idx)}
                  title={`Bit ${width - 1 - idx}`}
                  className={`min-w-0 min-h-[32px] py-1 rounded font-mono text-[11px] font-bold border transition cursor-pointer ${
                    bit
                      ? 'bg-cyan-600 text-white border-cyan-600'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {bit ? '1' : '0'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bitwise & Base-Aware Keypad */}
        <div className="lg:col-span-6 rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {(['AND', 'OR', 'XOR', 'LSH', 'RSH'] as const).map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => triggerOp(op)}
                className={`min-w-0 min-h-[42px] px-1 rounded-xl border font-mono text-[11px] sm:text-xs font-semibold cursor-pointer ${
                  pendingOp?.op === op && awaitingSecondOperand
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-blue-600 dark:text-cyan-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {op === 'LSH' ? '<<' : op === 'RSH' ? '>>' : op}
              </button>
            ))}
            <button
              type="button"
              onClick={() => syncFromBigInt(bitwiseNot(value, width))}
              className="min-w-0 min-h-[42px] px-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px] sm:text-xs font-semibold text-violet-600 dark:text-violet-400 cursor-pointer"
            >
              NOT (~)
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {['A', 'B', 'C', 'D', 'E', 'F'].map((hexChar) => (
              <button
                key={hexChar}
                type="button"
                disabled={!isDigitAllowed(hexChar)}
                onClick={() => appendDigit(hexChar)}
                className="min-h-[46px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono font-bold text-sm disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {hexChar}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setPendingOp(null);
                setAwaitingSecondOperand(false);
                syncFromBigInt(0n);
              }}
              className="min-h-[46px] rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 font-mono font-bold text-sm cursor-pointer"
            >
              AC
            </button>
            <button
              type="button"
              onClick={() => {
                const sliced = inputText.slice(0, -1) || '0';
                handleDirectEdit(sliced);
              }}
              aria-label="Backspace"
              className="min-h-[46px] rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center cursor-pointer"
            >
              <Delete className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => triggerOp('MOD')}
              className="min-h-[46px] rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs font-bold cursor-pointer"
            >
              MOD
            </button>
            <button
              type="button"
              onClick={() => triggerOp('DIV')}
              className="min-h-[46px] rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-base font-bold cursor-pointer"
            >
              ÷
            </button>

            {['7', '8', '9'].map((d) => (
              <button
                key={d}
                type="button"
                disabled={!isDigitAllowed(d)}
                onClick={() => appendDigit(d)}
                className="min-h-[46px] rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 font-mono text-lg font-bold disabled:opacity-30 cursor-pointer"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => triggerOp('MUL')}
              className="min-h-[46px] col-span-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-base font-bold cursor-pointer"
            >
              ×
            </button>

            {['4', '5', '6'].map((d) => (
              <button
                key={d}
                type="button"
                disabled={!isDigitAllowed(d)}
                onClick={() => appendDigit(d)}
                className="min-h-[46px] rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 font-mono text-lg font-bold disabled:opacity-30 cursor-pointer"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => triggerOp('SUB')}
              className="min-h-[46px] col-span-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-base font-bold cursor-pointer"
            >
              −
            </button>

            {['1', '2', '3'].map((d) => (
              <button
                key={d}
                type="button"
                disabled={!isDigitAllowed(d)}
                onClick={() => appendDigit(d)}
                className="min-h-[46px] rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 font-mono text-lg font-bold disabled:opacity-30 cursor-pointer"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => triggerOp('ADD')}
              className="min-h-[46px] col-span-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-base font-bold cursor-pointer"
            >
              +
            </button>

            <button
              type="button"
              onClick={() => syncFromBigInt(-value)}
              className="min-h-[46px] rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 font-mono text-base font-bold cursor-pointer"
            >
              ±
            </button>
            <button
              type="button"
              onClick={() => appendDigit('0')}
              className="min-h-[46px] col-span-2 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 font-mono text-lg font-bold cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleEquals}
              className="min-h-[46px] col-span-2 rounded-xl bg-gradient-to-r from-blue-600 via-violet-600 to-cyan-600 text-white font-mono text-xl font-bold cursor-pointer"
            >
              =
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
