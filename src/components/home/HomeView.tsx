import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Binary,
  BookOpen,
  Bot,
  Calculator,
  Camera,
  Clock,
  DollarSign,
  FunctionSquare,
  Grid,
  LineChart,
  Mic,
  Repeat,
  Search,
  Settings,
  Sigma,
  TrendingUp,
} from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { StandardScientificCalc } from '../calculator/StandardScientificCalc';
import { CONSTANTS_LIBRARY, FORMULA_LIBRARY } from '../../lib/math/libraryData';
import { AI_SOLVER_ENABLED } from '../../config/features';
import type { NavSection } from '../../types/calculator';

interface HomeViewProps {
  onOpenVoice: () => void;
  onOpenCamera: () => void;
  onOpenFormulas: () => void;
  onOpenMatrix: () => void;
}

const TOOL_CATALOG: Array<{
  id: NavSection | 'matrix' | 'voice' | 'camera';
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string;
}> = [
  { id: 'scientific', title: 'Scientific Calculator', subtitle: 'Trig, logs, complex, nCr/nPr', icon: Calculator, keywords: 'sin cos tan log factorial complex' },
  {
    id: 'ai-solver',
    title: 'AI Math Solver',
    subtitle: AI_SOLVER_ENABLED ? 'Step-by-step Gemini explanations' : 'Coming soon · Guided math solver',
    icon: Bot,
    keywords: 'ai algebra explain practice solver coming soon',
  },
  { id: 'graphs', title: '2D & 3D Graphing', subtitle: 'Curves, surfaces, derivatives & integrals', icon: LineChart, keywords: 'plot graph chart function roots 3d derivative integral' },
  { id: 'equations', title: 'Equation Solver', subtitle: 'Linear, quadratic, systems, inequalities', icon: FunctionSquare, keywords: 'solve equation quadratic polynomial system' },
  { id: 'calculus', title: 'Calculus Lab', subtitle: 'Derivatives, integrals & limits', icon: Sigma, keywords: 'derivative integral limit calculus' },
  { id: 'matrix', title: 'Matrix Algebra', subtitle: 'Det, inverse, rank, multiply', icon: Grid, keywords: 'matrix determinant inverse transpose rank' },
  { id: 'converters', title: 'Unit & Currency', subtitle: '12 unit categories + live FX', icon: Repeat, keywords: 'unit length weight temperature currency inr usd' },
  { id: 'finance', title: 'Financial Suite', subtitle: 'EMI, SIP, GST, compound & tip', icon: DollarSign, keywords: 'emi sip loan gst compound interest discount' },
  { id: 'programmer', title: 'Programmer Mode', subtitle: 'BIN, OCT, DEC, HEX & bitwise', icon: Binary, keywords: 'binary hex octal bitwise shift xor' },
  { id: 'statistics', title: 'Statistics', subtitle: 'Mean, median, std dev & quartiles', icon: TrendingUp, keywords: 'mean median mode variance standard deviation' },
  { id: 'camera', title: 'Camera Scanner', subtitle: 'OCR equation capture', icon: Camera, keywords: 'camera ocr scan photo' },
  { id: 'voice', title: 'Voice Input', subtitle: 'Speak natural math queries', icon: Mic, keywords: 'voice speech microphone' },
];

export const HomeView: React.FC<HomeViewProps> = ({
  onOpenVoice,
  onOpenCamera,
  onOpenFormulas,
  onOpenMatrix,
}) => {
  const { navigate, history, recentTools, reuseExpression, settings, updateSettings } = useCalculator();
  const [searchQuery, setSearchQuery] = useState('');

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const tools = TOOL_CATALOG.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.subtitle.toLowerCase().includes(q) ||
        t.keywords.includes(q)
    );
    const formulas = FORMULA_LIBRARY.filter(
      (f) => f.title.toLowerCase().includes(q) || f.formula.toLowerCase().includes(q)
    );
    const constants = CONSTANTS_LIBRARY.filter(
      (c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)
    );
    const hist = history
      .filter((h) => h.expression.toLowerCase().includes(q) || h.result.toLowerCase().includes(q))
      .slice(0, 4);
    return { tools, formulas, constants, hist };
  }, [searchQuery, history]);

  const handleToolClick = (id: string) => {
    setSearchQuery('');
    if (id === 'matrix') onOpenMatrix();
    else if (id === 'voice') onOpenVoice();
    else if (id === 'camera') onOpenCamera();
    else navigate(id as NavSection);
  };

  const toolLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of TOOL_CATALOG) map[t.id] = t.title;
    return map;
  }, []);

  return (
    <div className="space-y-2 sm:space-y-3 lg:space-y-6">
      {/* Top Hero / Brand Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1.5 sm:gap-2.5 lg:gap-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 lg:gap-3 min-w-0">
            <img
              src="/icon.svg"
              alt="NEXA Calculator logo"
              className="w-7 h-7 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl shrink-0"
            />
            <div className="min-w-0">
              <h1 className="font-display text-base sm:text-xl lg:text-2xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
                NEXA Calculator
              </h1>
              <p className="hidden lg:block text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Precision arithmetic · Symbolic math · Interactive graphing · AI problem solving
              </p>
            </div>
          </div>

          {/* Mobile compact theme & settings buttons inline with header */}
          <div className="flex lg:hidden items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() =>
                updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
              }
              className="min-h-[32px] px-2.5 rounded-lg bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {settings.theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <button
              type="button"
              onClick={() => navigate('settings')}
              aria-label="Open Settings"
              className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 min-w-0 lg:w-80">
            <Search className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-slate-400 absolute left-3 lg:left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tools, formulas, constants, history..."
              aria-label="Search NEXA Calculator"
              className="w-full min-h-[34px] lg:min-h-[42px] pl-8 lg:pl-10 pr-3 lg:pr-4 rounded-xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 text-xs lg:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <button
            type="button"
            onClick={() =>
              updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
            }
            className="hidden lg:inline-flex items-center min-h-[42px] px-3.5 rounded-xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {settings.theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
          </button>
          <button
            type="button"
            onClick={() => navigate('settings')}
            aria-label="Open Settings"
            className="hidden lg:flex min-h-[42px] min-w-[42px] items-center justify-center rounded-xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Search Dropdown Results */}
      {searchResults && (
        <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Search Results for “{searchQuery}”
            </h2>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
            >
              Clear search
            </button>
          </div>
          {searchResults.tools.length === 0 &&
          searchResults.formulas.length === 0 &&
          searchResults.constants.length === 0 &&
          searchResults.hist.length === 0 ? (
            <p className="text-sm text-slate-500">No matching tools, formulas, or calculations found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchResults.tools.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleToolClick(t.id)}
                  className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/60 text-left cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-white">
                      <span className="truncate">{t.title}</span>
                      {t.id === 'ai-solver' && !AI_SOLVER_ENABLED && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{t.subtitle}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              ))}
              {searchResults.formulas.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    onOpenFormulas();
                  }}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/60 text-left cursor-pointer"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{f.title}</div>
                    <div className="font-mono text-xs text-cyan-600 dark:text-cyan-400">{f.formula}</div>
                  </div>
                  <BookOpen className="w-4 h-4 text-slate-400" />
                </button>
              ))}
              {searchResults.constants.map((c) => (
                <button
                  key={c.symbol}
                  type="button"
                  onClick={() => reuseExpression(c.numericValue, 'home')}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/60 text-left cursor-pointer"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      {c.symbol} · {c.name}
                    </div>
                    <div className="font-mono text-xs text-slate-500">{c.value}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
              {searchResults.hist.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => reuseExpression(h.expression, 'home')}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/60 text-left cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-slate-500 truncate">{h.expression}</div>
                    <div className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                      = {h.result}
                    </div>
                  </div>
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Split: Calculator + Quick Access & Recent Calculations (Desktop Dashboard Only) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-5">
          <StandardScientificCalc
            mode="standard"
            compactMobile
            onOpenVoice={onOpenVoice}
            onOpenCamera={onOpenCamera}
            onOpenFormulas={onOpenFormulas}
          />
        </div>

        <div className="hidden lg:block xl:col-span-7 space-y-6">
          {/* Quick Access to Specialized Tools */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Computational Tools
              </h2>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span>Recent:</span>
                {recentTools.slice(0, 3).map((toolId, idx) => (
                  <React.Fragment key={toolId}>
                    {idx > 0 && <span aria-hidden="true">·</span>}
                    <button
                      type="button"
                      onClick={() => navigate(toolId)}
                      className="hover:text-blue-600 dark:hover:text-cyan-400 underline-offset-2 hover:underline cursor-pointer"
                    >
                      {toolLabelMap[toolId] || toolId}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {TOOL_CATALOG.map((tool) => {
                const Icon = tool.icon;
                const isComingSoon = tool.id === 'ai-solver' && !AI_SOLVER_ENABLED;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => handleToolClick(tool.id)}
                    className="group text-left p-3.5 rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 hover:border-blue-500/60 dark:hover:border-cyan-500/60 transition nexa-tactile cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-2">
                      <Icon className="w-5 h-5 nexa-accent-text shrink-0" />
                      {isComingSoon ? (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 whitespace-nowrap">
                          Coming Soon
                        </span>
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      )}
                    </div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {tool.title}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {tool.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent Calculations */}
          <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Recent Calculations
              </h2>
              <button
                type="button"
                onClick={() => navigate('history')}
                className="text-xs font-medium text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
              >
                View all history
              </button>
            </div>

            {history.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4">
                Your calculations are saved locally in IndexedDB. Try evaluating an expression to see it here.
              </p>
            ) : (
              <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                {history.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => reuseExpression(item.expression, 'home')}
                    className="w-full py-2.5 flex items-center justify-between gap-4 text-left hover:bg-slate-50 dark:hover:bg-slate-900/50 px-2 rounded-lg transition cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-slate-500 dark:text-slate-400 truncate">
                        {item.expression}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {item.mode} · {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="font-mono tabular-nums text-base font-semibold text-slate-900 dark:text-white shrink-0">
                      = {item.result}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
