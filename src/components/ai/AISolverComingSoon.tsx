import React from 'react';
import {
  ArrowRight,
  Bot,
  Calculator,
  Clock,
  FunctionSquare,
  LineChart,
  Sigma,
  Sparkles,
} from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import type { NavSection } from '../../types/calculator';

const PLANNED_HIGHLIGHTS = [
  {
    title: 'Step-by-Step Derivations',
    description: 'Detailed multi-step breakdowns for algebra, calculus, trigonometry, and word problems.',
  },
  {
    title: 'KaTeX Equation Typesetting',
    description: 'Publication-grade mathematical notation with inline formulas and verification checks.',
  },
  {
    title: 'Alternative Solving Methods',
    description: 'Compare factoring, substitution, graphical, and symbolic approaches side by side.',
  },
];

const AVAILABLE_TOOLS: Array<{
  id: NavSection;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'equations',
    label: 'Equation Solver',
    description: 'Solve linear, quadratic, polynomial & simultaneous equations locally',
    icon: FunctionSquare,
  },
  {
    id: 'calculus',
    label: 'Calculus Lab',
    description: 'Symbolic derivatives, integrals, and limits offline',
    icon: Sigma,
  },
  {
    id: 'scientific',
    label: 'Scientific Calculator',
    description: 'Trig, logs, combinatorics, complex numbers & precision controls',
    icon: Calculator,
  },
  {
    id: 'graphs',
    label: '2D & 3D Graphing',
    description: 'Interactive curve, derivative, integral & surface plotting',
    icon: LineChart,
  },
];

export const AISolverComingSoon: React.FC = () => {
  const { navigate } = useCalculator();

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              AI Math Solver
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
              <Clock className="w-3 h-3" />
              Coming Soon
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Interactive guided mathematical explanations and multi-step proofs
          </p>
        </div>
      </div>

      {/* Dedicated Coming Soon Hero Card */}
      <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-12 h-12 rounded-2xl nexa-gradient-bg text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/20">
            <Bot className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider nexa-accent-text">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Feature Under Preparation</span>
            </div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              AI Math Solver is Coming Soon to NEXA Calculator
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              We are refining the AI Math Solver experience for a future update. While this feature is paused,
              no external AI requests are made—and all of NEXA Calculator&apos;s local scientific, symbolic,
              graphing, matrix, financial, programmer, and statistical engines remain 100% ready to use.
            </p>
          </div>
        </div>

        {/* Planned Capabilities */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {PLANNED_HIGHLIGHTS.map((item) => (
            <div
              key={item.title}
              className="rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 space-y-1.5"
            >
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {item.title}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* Quick Links to Local Math Tools */}
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Use Available Local Math Engines Right Now
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {AVAILABLE_TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => navigate(tool.id)}
                  className="group flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-blue-500/60 dark:hover:border-cyan-500/60 text-left transition nexa-tactile cursor-pointer"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <Icon className="w-5 h-5 nexa-accent-text shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {tool.label}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {tool.description}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
