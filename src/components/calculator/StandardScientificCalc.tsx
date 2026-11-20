import React, { useCallback, useEffect, useRef, useState } from 'react';
import Decimal from 'decimal.js';
import {
  Atom,
  BookOpen,
  Camera,
  Check,
  Copy,
  Delete,
  Mic,
  Minus,
  Plus,
  Share2,
  Star,
} from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { evaluateExpression } from '../../lib/math/calculatorEngine';
import type { NotationMode } from '../../types/calculator';

interface StandardScientificCalcProps {
  mode: 'standard' | 'scientific';
  compactMobile?: boolean;
  onOpenVoice: () => void;
  onOpenCamera: () => void;
  onOpenFormulas: () => void;
}

const QUICK_CONSTANTS = [
  { symbol: 'π', label: 'Pi', insert: 'pi', preview: '3.14159' },
  { symbol: 'e', label: 'Euler', insert: 'e', preview: '2.71828' },
  { symbol: 'φ', label: 'Golden Ratio', insert: 'phi', preview: '1.61803' },
  { symbol: 'c', label: 'Speed of Light', insert: '299792458', preview: '2.998e8 m/s' },
  { symbol: 'G', label: 'Gravitational', insert: '6.6743e-11', preview: '6.674e-11' },
  { symbol: 'h', label: 'Planck', insert: '6.62607015e-34', preview: '6.626e-34' },
  { symbol: 'Nₐ', label: 'Avogadro', insert: '6.02214076e23', preview: '6.022e23' },
  { symbol: 'k', label: 'Boltzmann', insert: '1.380649e-23', preview: '1.381e-23' },
  { symbol: 'R', label: 'Gas Constant', insert: '8.314462618', preview: '8.3145' },
];

export const StandardScientificCalc: React.FC<StandardScientificCalcProps> = ({
  mode,
  compactMobile = false,
  onOpenVoice,
  onOpenCamera,
  onOpenFormulas,
}) => {
  const {
    settings,
    updateSettings,
    recordHistory,
    memory,
    setMemory,
    sharedExpression,
    setSharedExpression,
    addFavorite,
    feedbackTap,
  } = useCalculator();

  const [expression, setExpression] = useState<string>('');
  const [result, setResult] = useState<string>('0');
  const [rawAns, setRawAns] = useState<string>('0');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [secondFn, setSecondFn] = useState(false);
  const [hyperbolic, setHyperbolic] = useState(false);
  const [showConstants, setShowConstants] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeNotation: NotationMode =
    settings.notationMode ?? (settings.scientificNotation ? 'scientific' : 'auto');

  // Sync incoming shared expression (e.g. from History, Voice, OCR, or Formulas)
  useEffect(() => {
    if (sharedExpression) {
      setExpression(sharedExpression);
      setErrorMsg(null);
      setSharedExpression('');
    }
  }, [sharedExpression, setSharedExpression]);

  // Live preview evaluation when expression is valid
  useEffect(() => {
    if (!expression.trim()) {
      setResult('0');
      setErrorMsg(null);
      return;
    }
    const evalRes = evaluateExpression(expression, {
      angleUnit: settings.angleUnit,
      precision: settings.precision,
      thousandsSeparator: settings.thousandsSeparator,
      scientificNotation: settings.scientificNotation,
      notationMode: activeNotation,
      ans: rawAns,
    });
    if (evalRes.ok) {
      setResult(evalRes.formattedResult);
      setErrorMsg(null);
    } else {
      setErrorMsg(null);
    }
  }, [
    expression,
    settings.angleUnit,
    settings.precision,
    settings.thousandsSeparator,
    settings.scientificNotation,
    activeNotation,
    rawAns,
  ]);

  const appendToken = useCallback(
    (token: string) => {
      feedbackTap();
      setErrorMsg(null);
      setExpression((prev) => prev + token);
    },
    [feedbackTap]
  );

  const handleClear = useCallback(() => {
    feedbackTap();
    setExpression('');
    setResult('0');
    setErrorMsg(null);
  }, [feedbackTap]);

  const handleBackspace = useCallback(() => {
    feedbackTap();
    setErrorMsg(null);
    setExpression((prev) => prev.slice(0, -1));
  }, [feedbackTap]);

  const handleNegate = useCallback(() => {
    feedbackTap();
    setExpression((prev) => {
      if (!prev) return '-';
      if (prev.startsWith('-(') && prev.endsWith(')')) {
        return prev.slice(2, -1);
      }
      return `-(${prev})`;
    });
  }, [feedbackTap]);

  const handleSquare = useCallback(() => {
    feedbackTap();
    setExpression((prev) => (prev ? `(${prev})^2` : ''));
  }, [feedbackTap]);

  const handleSqrt = useCallback(() => {
    feedbackTap();
    setExpression((prev) => (prev ? `sqrt(${prev})` : 'sqrt('));
  }, [feedbackTap]);

  const handleReciprocal = useCallback(() => {
    feedbackTap();
    setExpression((prev) => (prev ? `1/(${prev})` : '1/('));
  }, [feedbackTap]);

  const handleEquals = useCallback(() => {
    feedbackTap();
    const target = expression.trim();
    if (!target) return;

    const evalRes = evaluateExpression(target, {
      angleUnit: settings.angleUnit,
      precision: settings.precision,
      thousandsSeparator: settings.thousandsSeparator,
      scientificNotation: settings.scientificNotation,
      notationMode: activeNotation,
      ans: rawAns,
    });

    if (evalRes.ok) {
      setResult(evalRes.formattedResult);
      setRawAns(evalRes.rawResult);
      setErrorMsg(null);
      void recordHistory({
        expression: target,
        result: evalRes.formattedResult,
        mode: mode === 'scientific' ? 'Scientific' : 'Standard',
        angleUnit: settings.angleUnit,
      });
    } else {
      setResult('Error');
      setErrorMsg(evalRes.error || 'Invalid mathematical expression');
    }
  }, [
    activeNotation,
    expression,
    feedbackTap,
    mode,
    rawAns,
    recordHistory,
    settings.angleUnit,
    settings.precision,
    settings.scientificNotation,
    settings.thousandsSeparator,
  ]);

  // High-precision Memory operations
  const handleMemoryOp = useCallback(
    (op: 'MC' | 'MR' | 'M+' | 'M-' | 'MS') => {
      feedbackTap();
      if (op === 'MC') {
        setMemory('0');
        return;
      }
      if (op === 'MR') {
        appendToken(memory);
        return;
      }

      const currentVal = evaluateExpression(expression || rawAns, {
        angleUnit: settings.angleUnit,
        precision: 16,
        thousandsSeparator: false,
      });

      if (!currentVal.ok) return;

      if (op === 'MS') {
        setMemory(currentVal.rawResult || '0');
        return;
      }

      if (currentVal.isComplex || currentVal.numericValue === undefined) {
        setErrorMsg('M+ and M- support real numbers; use MS for complex values.');
        return;
      }

      try {
        const curDec = new Decimal(currentVal.rawResult);
        const memDec = new Decimal(memory || '0');
        const nextMem = op === 'M+' ? memDec.plus(curDec) : memDec.minus(curDec);
        setMemory(nextMem.toString());
      } catch {
        setErrorMsg('Cannot combine complex memory value with arithmetic M+/M-.');
      }
    },
    [appendToken, expression, feedbackTap, memory, rawAns, setMemory, settings.angleUnit]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isOtherInput =
        activeEl &&
        activeEl !== inputRef.current &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');
      if (isOtherInput) return;

      if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (e.key === 'Escape' || (e.key === 'Delete' && activeEl !== inputRef.current)) {
        e.preventDefault();
        handleClear();
      } else if (e.key === 'Backspace' && activeEl !== inputRef.current) {
        e.preventDefault();
        handleBackspace();
      } else if (activeEl !== inputRef.current && /^[0-9+\-*/().^%!]$/.test(e.key)) {
        e.preventDefault();
        appendToken(e.key);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [appendToken, handleBackspace, handleClear, handleEquals]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  };

  const handleShare = async () => {
    const text = expression ? `${expression} = ${result}` : result;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'NEXA Calculator Result', text });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    await handleCopy();
  };

  const handleSaveFavorite = async () => {
    if (!expression.trim()) return;
    await addFavorite({
      title: expression.slice(0, 42),
      expression: expression.trim(),
      category: mode === 'scientific' ? 'Scientific' : 'Standard',
      description: `Evaluates to ${result} (${settings.angleUnit})`,
    });
    setFavorited(true);
    setTimeout(() => setFavorited(false), 1800);
  };

  const keyBase = compactMobile
    ? 'nexa-mobile-main-key min-w-0 min-h-[40px] sm:min-h-[44px] lg:min-h-[48px] rounded-xl font-medium nexa-tactile select-none flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500'
    : 'min-w-0 min-h-[44px] sm:min-h-[48px] rounded-xl font-medium nexa-tactile select-none flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500';
  const numKey = `${keyBase} bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/90 ${
    compactMobile ? 'text-base sm:text-lg' : 'text-lg'
  } font-mono`;
  const opKey = `${keyBase} bg-slate-100 dark:bg-[#161F30] nexa-accent-text border border-slate-200 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-slate-800 ${
    compactMobile ? 'text-base sm:text-lg' : 'text-lg'
  } font-semibold`;
  const sciKey = `${keyBase} px-1 bg-slate-100/90 dark:bg-[#0F1624] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800/90 hover:border-blue-400 dark:hover:border-cyan-500/60 text-xs sm:text-sm font-mono`;
  const compactUtilKey = compactMobile
    ? 'nexa-mobile-util-key min-w-0 min-h-[34px] sm:min-h-[38px] lg:min-h-[48px] rounded-xl font-medium nexa-tactile select-none flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 bg-slate-100/90 dark:bg-[#0F1624] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800/90 hover:border-blue-400 dark:hover:border-cyan-500/60 text-[11px] sm:text-xs lg:text-sm font-mono'
    : sciKey;
  const eqKey = `${keyBase} nexa-gradient-bg text-white font-semibold ${
    compactMobile ? 'text-lg sm:text-xl' : 'text-xl'
  } shadow-md shadow-blue-600/20 hover:opacity-95`;

  const trigBtns = hyperbolic
    ? [
        { label: 'sinh', insert: 'sinh(' },
        { label: 'cosh', insert: 'cosh(' },
        { label: 'tanh', insert: 'tanh(' },
      ]
    : secondFn
    ? [
        { label: 'sin⁻¹', insert: 'asin(' },
        { label: 'cos⁻¹', insert: 'acos(' },
        { label: 'tan⁻¹', insert: 'atan(' },
      ]
    : [
        { label: 'sin', insert: 'sin(' },
        { label: 'cos', insert: 'cos(' },
        { label: 'tan', insert: 'tan(' },
      ];

  return (
    <div
      className={`bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 rounded-2xl ${
        compactMobile ? 'nexa-mobile-home-calc p-2.5 sm:p-3.5 lg:p-5' : 'p-3 sm:p-5'
      }`}
    >
      {/* Top Display Controls */}
      <div
        className={`flex flex-wrap items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 ${
          compactMobile ? 'gap-1 sm:gap-1.5 lg:gap-2 pb-1.5 sm:pb-2 lg:pb-3' : 'gap-2 pb-3'
        }`}
      >
        <div className={`flex flex-wrap items-center ${compactMobile ? 'gap-1 lg:gap-1.5' : 'gap-1.5'}`}>
          {/* DEG / RAD */}
          <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-800">
            {(['DEG', 'RAD'] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => {
                  feedbackTap();
                  updateSettings({ angleUnit: u });
                }}
                className={`${
                  compactMobile
                    ? 'px-1.5 py-0.5 text-[10px] lg:px-2 lg:py-1 lg:text-[11px]'
                    : 'px-2 py-1 text-[11px]'
                } font-mono font-semibold rounded-md transition cursor-pointer ${
                  settings.angleUnit === u
                    ? 'nexa-accent-solid-bg text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          {/* STD / SCI / ENG Notation Switch */}
          <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-800">
            {(
              [
                { id: 'auto', label: 'STD' },
                { id: 'scientific', label: 'SCI' },
                { id: 'engineering', label: 'ENG' },
              ] as const
            ).map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  feedbackTap();
                  updateSettings({ notationMode: n.id });
                }}
                title={`${n.label} output notation`}
                className={`${
                  compactMobile
                    ? 'px-1.5 py-0.5 text-[10px] lg:px-2 lg:py-1 lg:text-[11px]'
                    : 'px-2 py-1 text-[11px]'
                } font-mono font-semibold rounded-md transition cursor-pointer ${
                  activeNotation === n.id
                    ? 'bg-slate-900 dark:bg-slate-700 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>

          {/* Inline Custom Precision Stepper */}
          <div
            className={`inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono ${
              compactMobile ? 'text-[10px] lg:text-[11px]' : 'text-[11px]'
            }`}
            title="Decimal Precision"
          >
            <button
              type="button"
              onClick={() => {
                feedbackTap();
                updateSettings({ precision: Math.max(2, settings.precision - 1) });
              }}
              aria-label="Decrease precision"
              className={`${
                compactMobile ? 'px-1 py-0.5 lg:px-1.5 lg:py-1' : 'px-1.5 py-1'
              } text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer`}
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="px-1 text-slate-700 dark:text-slate-300 font-semibold">
              P:{settings.precision}
            </span>
            <button
              type="button"
              onClick={() => {
                feedbackTap();
                updateSettings({ precision: Math.min(15, settings.precision + 1) });
              }}
              aria-label="Increase precision"
              className={`${
                compactMobile ? 'px-1 py-0.5 lg:px-1.5 lg:py-1' : 'px-1.5 py-1'
              } text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer`}
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-0.5 lg:gap-1">
          <button
            type="button"
            onClick={() => {
              feedbackTap();
              setShowConstants((v) => !v);
            }}
            title="Quick Scientific Constants"
            className={`${
              compactMobile ? 'min-h-[28px] px-1.5 lg:min-h-[34px] lg:px-2' : 'min-h-[34px] px-2'
            } rounded-lg text-xs font-medium inline-flex items-center gap-1 transition cursor-pointer ${
              showConstants
                ? 'bg-slate-200 dark:bg-slate-800 nexa-accent-text'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Atom className="w-3.5 h-3.5 nexa-accent-text" />
            <span className="hidden sm:inline">Const</span>
          </button>
          <button
            type="button"
            onClick={onOpenVoice}
            title="Voice Calculator"
            className={`${
              compactMobile ? 'min-h-[28px] px-1.5 lg:min-h-[34px] lg:px-2' : 'min-h-[34px] px-2'
            } rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1 transition cursor-pointer`}
          >
            <Mic className="w-3.5 h-3.5 text-cyan-500" />
            <span className="hidden sm:inline">Voice</span>
          </button>
          <button
            type="button"
            onClick={onOpenCamera}
            title="Camera Math Scanner"
            className={`${
              compactMobile ? 'min-h-[28px] px-1.5 lg:min-h-[34px] lg:px-2' : 'min-h-[34px] px-2'
            } rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1 transition cursor-pointer`}
          >
            <Camera className="w-3.5 h-3.5 text-violet-500" />
            <span className="hidden sm:inline">Scan</span>
          </button>
          <button
            type="button"
            onClick={onOpenFormulas}
            title="Formulas & Constants"
            className={`${
              compactMobile ? 'min-h-[28px] px-1.5 lg:min-h-[34px] lg:px-2' : 'min-h-[34px] px-2'
            } rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1 transition cursor-pointer`}
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">Library</span>
          </button>
        </div>
      </div>

      {/* Collapsible Constants Strip */}
      {showConstants && (
        <div className="pt-2.5 pb-2 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-wrap gap-1.5">
          {QUICK_CONSTANTS.map((c) => (
            <button
              key={c.symbol}
              type="button"
              onClick={() => appendToken(c.insert)}
              title={`${c.label} (${c.preview})`}
              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono hover:border-cyan-500/60 transition cursor-pointer"
            >
              <span className="font-semibold nexa-accent-text">{c.symbol}</span>
              <span className="text-[10px] text-slate-500 ml-1 hidden sm:inline">{c.preview}</span>
            </button>
          ))}
        </div>
      )}

      {/* Expression & Result Display */}
      <div
        className={`flex flex-col items-end ${
          compactMobile
            ? 'nexa-mobile-calc-display py-1.5 sm:py-2.5 lg:py-4 px-1.5 sm:px-2 lg:px-3 gap-0.5 sm:gap-1.5 lg:gap-2'
            : 'py-4 px-2 sm:px-3 gap-2'
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          value={expression}
          onChange={(e) => {
            setExpression(e.target.value);
            setErrorMsg(null);
          }}
          placeholder="Enter expression, e.g. 25 * sin(30) + conj(3+4i)"
          aria-label="Calculator expression"
          className={`w-full text-right bg-transparent font-mono text-slate-600 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none ${
            compactMobile ? 'text-sm sm:text-base lg:text-lg' : 'text-base sm:text-lg'
          }`}
        />

        <div className="w-full flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              title="Copy result"
              className={`${
                compactMobile ? 'p-1.5 lg:p-2' : 'p-2'
              } rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer`}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleShare}
              title="Share calculation"
              className={`${
                compactMobile ? 'p-1.5 lg:p-2' : 'p-2'
              } rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer`}
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleSaveFavorite}
              title="Save expression to Favorites"
              className={`${
                compactMobile ? 'p-1.5 lg:p-2' : 'p-2'
              } rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer`}
            >
              <Star className={`w-4 h-4 ${favorited ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>
          </div>

          <div
            data-testid="calc-result"
            className={`min-w-0 font-mono tabular-nums font-bold tracking-tight truncate ${
              compactMobile ? 'text-2xl sm:text-3xl lg:text-4xl' : 'text-2xl sm:text-4xl'
            } ${errorMsg ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}
          >
            {result}
          </div>
        </div>

        <div
          className={`w-full items-center justify-between gap-2 ${
            compactMobile
              ? memory !== '0' || errorMsg
                ? 'flex min-h-[16px] lg:min-h-[18px]'
                : 'hidden lg:flex min-h-[18px]'
              : 'flex min-h-[18px]'
          }`}
        >
          <div>
            {memory !== '0' && (
              <button
                type="button"
                onClick={() => appendToken(memory)}
                className="text-[11px] font-mono nexa-accent-text hover:underline cursor-pointer"
              >
                M = {memory.length > 14 ? `${memory.slice(0, 14)}…` : memory}
              </button>
            )}
          </div>
          {errorMsg && <div className="text-right text-xs text-rose-500 font-medium">{errorMsg}</div>}
        </div>
      </div>

      {/* Memory Strip */}
      <div
        className={`grid grid-cols-5 ${
          compactMobile ? 'gap-1 lg:gap-1.5 pb-1.5 sm:pb-2 lg:pb-3' : 'gap-1.5 pb-3'
        }`}
      >
        {(['MC', 'MR', 'M+', 'M-', 'MS'] as const).map((mOp) => (
          <button
            key={mOp}
            type="button"
            onClick={() => handleMemoryOp(mOp)}
            className={`${
              compactMobile
                ? 'nexa-mobile-mem-key min-h-[30px] sm:min-h-[34px] text-[11px] lg:text-xs'
                : 'min-h-[38px] sm:min-h-[34px] text-xs'
            } rounded-lg font-mono font-medium border transition nexa-tactile cursor-pointer ${
              mOp === 'MR' && memory !== '0'
                ? 'bg-slate-200/80 dark:bg-slate-800 nexa-accent-text border-cyan-500/40'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {mOp}
          </button>
        ))}
      </div>

      {/* Scientific Panel */}
      {mode === 'scientific' && (
        <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 sm:gap-2 pb-3">
          <button
            type="button"
            onClick={() => {
              feedbackTap();
              setSecondFn((v) => !v);
            }}
            className={`${sciKey} ${
              secondFn ? '!bg-blue-600 !text-white !border-blue-600' : ''
            }`}
          >
            2nd
          </button>
          <button
            type="button"
            onClick={() => {
              feedbackTap();
              setHyperbolic((v) => !v);
            }}
            className={`${sciKey} ${
              hyperbolic ? '!bg-violet-600 !text-white !border-violet-600' : ''
            }`}
          >
            HYP
          </button>
          {trigBtns.map((b) => (
            <button key={b.label} type="button" onClick={() => appendToken(b.insert)} className={sciKey}>
              {b.label}
            </button>
          ))}
          <button type="button" onClick={() => appendToken('abs(')} className={sciKey}>
            |x|
          </button>

          <button type="button" onClick={() => appendToken('log(')} className={sciKey}>
            log₁₀
          </button>
          <button type="button" onClick={() => appendToken('ln(')} className={sciKey}>
            ln
          </button>
          <button type="button" onClick={() => appendToken('log2(')} className={sciKey}>
            log₂
          </button>
          <button type="button" onClick={() => appendToken('logb(')} title="logb(x, base)" className={sciKey}>
            log_b
          </button>
          <button type="button" onClick={() => appendToken('exp(')} className={sciKey}>
            eˣ
          </button>
          <button type="button" onClick={() => appendToken('10^')} className={sciKey}>
            10ˣ
          </button>

          <button type="button" onClick={() => appendToken('pi')} className={sciKey}>
            π
          </button>
          <button type="button" onClick={() => appendToken('e')} className={sciKey}>
            e
          </button>
          <button type="button" onClick={() => appendToken('phi')} title="Golden Ratio φ" className={sciKey}>
            φ
          </button>
          <button type="button" onClick={() => appendToken('!')} className={sciKey}>
            n!
          </button>
          <button type="button" onClick={() => appendToken('nPr(')} title="nPr(n, r)" className={sciKey}>
            nPr
          </button>
          <button type="button" onClick={() => appendToken('nCr(')} title="nCr(n, r)" className={sciKey}>
            nCr
          </button>

          <button type="button" onClick={() => appendToken('^')} className={sciKey}>
            xʸ
          </button>
          <button type="button" onClick={() => appendToken('nroot(')} title="nroot(x, n)" className={sciKey}>
            ⁿ√x
          </button>
          <button type="button" onClick={() => appendToken('floor(')} className={sciKey}>
            floor
          </button>
          <button type="button" onClick={() => appendToken('ceil(')} className={sciKey}>
            ceil
          </button>
          <button type="button" onClick={() => appendToken(' mod ')} className={sciKey}>
            mod
          </button>
          <button type="button" onClick={() => appendToken(',')} className={sciKey}>
            ,
          </button>

          {/* Complex Number Analysis Row */}
          <button type="button" onClick={() => appendToken('i')} title="Imaginary unit i" className={sciKey}>
            i
          </button>
          <button type="button" onClick={() => appendToken('re(')} title="Real part Re(z)" className={sciKey}>
            Re
          </button>
          <button type="button" onClick={() => appendToken('im(')} title="Imaginary part Im(z)" className={sciKey}>
            Im
          </button>
          <button type="button" onClick={() => appendToken('conj(')} title="Complex conjugate" className={sciKey}>
            conj
          </button>
          <button type="button" onClick={() => appendToken('arg(')} title="Phase angle arg(z)" className={sciKey}>
            arg
          </button>
          <button type="button" onClick={() => appendToken('abs(')} title="Modulus |z|" className={sciKey}>
            |z|
          </button>
        </div>
      )}

      {/* Quick Scientific Row in Standard Mode */}
      {mode === 'standard' && (
        <div
          className={`grid grid-cols-6 ${
            compactMobile ? 'gap-1 lg:gap-1.5 pb-1.5 sm:pb-2 lg:pb-2.5' : 'gap-1.5 pb-2.5'
          }`}
        >
          <button type="button" onClick={() => appendToken('sin(')} className={compactUtilKey}>
            sin
          </button>
          <button type="button" onClick={() => appendToken('cos(')} className={compactUtilKey}>
            cos
          </button>
          <button type="button" onClick={() => appendToken('tan(')} className={compactUtilKey}>
            tan
          </button>
          <button type="button" onClick={() => appendToken('log(')} className={compactUtilKey}>
            log
          </button>
          <button type="button" onClick={() => appendToken('pi')} className={compactUtilKey}>
            π
          </button>
          <button type="button" onClick={() => appendToken('^')} className={compactUtilKey}>
            xʸ
          </button>
        </div>
      )}

      {/* Main Standard Keypad */}
      <div className={`grid grid-cols-4 ${compactMobile ? 'nexa-mobile-keypad gap-1.5 lg:gap-2' : 'gap-2'}`}>
        <button type="button" onClick={handleClear} className={`${opKey} !text-rose-500`}>
          AC
        </button>
        <button type="button" onClick={() => appendToken('(')} className={opKey}>
          (
        </button>
        <button type="button" onClick={() => appendToken(')')} className={opKey}>
          )
        </button>
        <button type="button" onClick={handleBackspace} aria-label="Backspace" className={opKey}>
          <Delete className="w-5 h-5" />
        </button>

        <button type="button" onClick={handleReciprocal} className={sciKey}>
          1/x
        </button>
        <button type="button" onClick={handleSquare} className={sciKey}>
          x²
        </button>
        <button type="button" onClick={handleSqrt} className={sciKey}>
          √x
        </button>
        <button type="button" onClick={() => appendToken('/')} className={opKey}>
          ÷
        </button>

        <button type="button" onClick={() => appendToken('7')} className={numKey}>
          7
        </button>
        <button type="button" onClick={() => appendToken('8')} className={numKey}>
          8
        </button>
        <button type="button" onClick={() => appendToken('9')} className={numKey}>
          9
        </button>
        <button type="button" onClick={() => appendToken('*')} className={opKey}>
          ×
        </button>

        <button type="button" onClick={() => appendToken('4')} className={numKey}>
          4
        </button>
        <button type="button" onClick={() => appendToken('5')} className={numKey}>
          5
        </button>
        <button type="button" onClick={() => appendToken('6')} className={numKey}>
          6
        </button>
        <button type="button" onClick={() => appendToken('-')} className={opKey}>
          −
        </button>

        <button type="button" onClick={() => appendToken('1')} className={numKey}>
          1
        </button>
        <button type="button" onClick={() => appendToken('2')} className={numKey}>
          2
        </button>
        <button type="button" onClick={() => appendToken('3')} className={numKey}>
          3
        </button>
        <button type="button" onClick={() => appendToken('+')} className={opKey}>
          +
        </button>

        <button type="button" onClick={handleNegate} className={numKey}>
          ±
        </button>
        <button type="button" onClick={() => appendToken('0')} className={numKey}>
          0
        </button>
        <button type="button" onClick={() => appendToken('.')} className={numKey}>
          .
        </button>
        <button type="button" onClick={handleEquals} className={eqKey}>
          =
        </button>

        <button
          type="button"
          onClick={() => appendToken('%')}
          className={`${compactUtilKey} col-span-2`}
        >
          % Percent
        </button>
        <button
          type="button"
          onClick={() => appendToken('ans')}
          className={`${compactUtilKey} col-span-2 px-2 truncate`}
        >
          ANS ({rawAns.length > 8 ? `${rawAns.slice(0, 8)}…` : rawAns})
        </button>
      </div>
    </div>
  );
};
