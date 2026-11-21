import React, { useEffect, useState } from 'react';
import {
  Binary,
  BookOpen,
  Bot,
  Calculator,
  Camera,
  Clock,
  DollarSign,
  FunctionSquare,
  Grid,
  Home,
  LayoutGrid,
  LineChart,
  MessageSquare,
  Mic,
  Repeat,
  Settings,
  Sigma,
  TrendingUp,
  X,
} from 'lucide-react';
import { CalculatorProvider, useCalculator } from './context/CalculatorContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SplashScreen } from './components/pwa/SplashScreen';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { PWAInstallButton } from './components/pwa/PWAInstallButton';
import { HomeView } from './components/home/HomeView';
import { StandardScientificCalc } from './components/calculator/StandardScientificCalc';
import { AISolverView } from './components/ai/AISolverView';
import { GraphingView } from './components/graphs/GraphingView';
import { EquationSolverView } from './components/equations/EquationSolverView';
import { CalculusView } from './components/calculus/CalculusView';
import { ConvertersView } from './components/converters/ConvertersView';
import { FinanceView } from './components/finance/FinanceView';
import { ProgrammerView } from './components/programmer/ProgrammerView';
import { StatisticsView } from './components/statistics/StatisticsView';
import { HistoryView } from './components/history/HistoryView';
import { SettingsView } from './components/settings/SettingsView';
import { MatrixCalculatorView } from './components/matrix/MatrixCalculatorView';
import { VoiceCalculatorModal } from './components/tools/VoiceCalculatorModal';
import { CameraScannerModal } from './components/tools/CameraScannerModal';
import { FormulaLibraryModal } from './components/tools/FormulaLibraryModal';
import { FeedbackModal } from './components/tools/FeedbackModal';
import { AdminRouteView } from './components/admin/AdminRouteView';
import { registerAndroidBackHandler } from './lib/platform/capacitorBridge';
import { initGA4, trackCalculatorFeature, trackCalculatorPageView } from './lib/analytics/ga4Tracker';
import { AI_SOLVER_ENABLED } from './config/features';
import type { NavSection } from './types/calculator';

function isAdminPath(pathname: string): boolean {
  return /^\/admin(\/|$)/i.test(pathname);
}

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'scientific', label: 'Scientific', icon: Calculator },
  { id: 'ai-solver', label: 'AI Solver', icon: Bot },
  { id: 'graphs', label: 'Graphs', icon: LineChart },
  { id: 'equations', label: 'Equations', icon: FunctionSquare },
  { id: 'calculus', label: 'Calculus', icon: Sigma },
  { id: 'converters', label: 'Converters', icon: Repeat },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'programmer', label: 'Programmer', icon: Binary },
  { id: 'statistics', label: 'Statistics', icon: TrendingUp },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const WorkspaceShell: React.FC = () => {
  const { activeSection, navigate, activeSubTool, setActiveSubTool } = useCalculator();
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [formulasOpen, setFormulasOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initialize Google Analytics 4 (when VITE_GA4_MEASUREMENT_ID is configured)
  useEffect(() => {
    initGA4();
  }, []);

  // Track calculator navigation views & popular features in GA4
  useEffect(() => {
    if (activeSubTool === 'matrix') {
      trackCalculatorPageView('/matrix', 'Matrix Calculator');
      trackCalculatorFeature('Matrix Calculator');
      return;
    }
    const navItem = NAV_ITEMS.find((n) => n.id === activeSection);
    const label = navItem?.label || 'Home';
    const path = activeSection === 'home' ? '/' : `/${activeSection}`;
    trackCalculatorPageView(path, label);
    trackCalculatorFeature(label);
  }, [activeSection, activeSubTool]);

  // Android hardware back button handling
  useEffect(() => {
    return registerAndroidBackHandler(() => {
      if (feedbackOpen) {
        setFeedbackOpen(false);
        return true;
      }
      if (voiceOpen) {
        setVoiceOpen(false);
        return true;
      }
      if (cameraOpen) {
        setCameraOpen(false);
        return true;
      }
      if (formulasOpen) {
        setFormulasOpen(false);
        return true;
      }
      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
        return true;
      }
      if (activeSubTool) {
        setActiveSubTool(null);
        return true;
      }
      if (activeSection !== 'home') {
        navigate('home');
        return true;
      }
      return false;
    });
  }, [
    activeSection,
    activeSubTool,
    cameraOpen,
    feedbackOpen,
    formulasOpen,
    mobileMenuOpen,
    navigate,
    setActiveSubTool,
    voiceOpen,
  ]);

  const openMatrix = () => {
    setActiveSubTool('matrix');
    setMobileMenuOpen(false);
  };

  const renderContent = () => {
    if (activeSubTool === 'matrix') {
      return (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                Matrix Calculator
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Perform matrix addition, subtraction, multiplication, transpose, determinant, inverse, and rank
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubTool(null)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
            >
              Back to {NAV_ITEMS.find((n) => n.id === activeSection)?.label || 'Home'}
            </button>
          </div>
          <MatrixCalculatorView />
        </div>
      );
    }

    switch (activeSection) {
      case 'home':
        return (
          <HomeView
            onOpenVoice={() => setVoiceOpen(true)}
            onOpenCamera={() => setCameraOpen(true)}
            onOpenFormulas={() => setFormulasOpen(true)}
            onOpenMatrix={openMatrix}
          />
        );
      case 'scientific':
        return (
          <div className="space-y-4 sm:space-y-5 max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                  Scientific Calculator
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Trigonometric, hyperbolic, logarithmic, combinatorics, engineering notation, and complex evaluation
                </p>
              </div>
              <button
                type="button"
                onClick={openMatrix}
                className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C101B] text-xs font-medium hover:border-cyan-500/60 cursor-pointer w-fit"
              >
                <Grid className="w-4 h-4 nexa-accent-text" />
                <span>Matrix Algebra</span>
              </button>
            </div>
            <StandardScientificCalc
              mode="scientific"
              onOpenVoice={() => setVoiceOpen(true)}
              onOpenCamera={() => setCameraOpen(true)}
              onOpenFormulas={() => setFormulasOpen(true)}
            />
          </div>
        );
      case 'ai-solver':
        return <AISolverView />;
      case 'graphs':
        return <GraphingView />;
      case 'equations':
        return <EquationSolverView />;
      case 'calculus':
        return <CalculusView />;
      case 'converters':
        return <ConvertersView />;
      case 'finance':
        return <FinanceView />;
      case 'programmer':
        return <ProgrammerView />;
      case 'statistics':
        return <StatisticsView />;
      case 'history':
        return <HistoryView />;
      case 'settings':
        return <SettingsView />;
    }
  };

  return (
    <div className="min-h-screen flex overflow-x-hidden bg-slate-50 dark:bg-[#07090E] text-slate-900 dark:text-slate-100 pt-safe pl-safe pr-safe">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-60 shrink-0 border-r border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#090D16] sticky top-0 h-screen">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800/90 flex items-center gap-2.5">
          <img src="/icon.svg" alt="NEXA" className="w-8 h-8 rounded-lg shrink-0" />
          <span className="font-display font-bold text-base tracking-tight whitespace-nowrap">
            NEXA Calculator
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id && !activeSubTool;
            const showComingSoon = item.id === 'ai-solver' && !AI_SOLVER_ENABLED;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition nexa-tactile whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-900 nexa-accent-text border border-slate-200 dark:border-slate-800'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {showComingSoon && (
                  <span className="ml-auto shrink-0 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                    Coming Soon
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800/90 space-y-2">
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => setVoiceOpen(true)}
              title="Voice Calculator"
              className="py-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-cyan-500 flex items-center justify-center cursor-pointer"
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCameraOpen(true)}
              title="Camera Scanner"
              className="py-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-violet-500 flex items-center justify-center cursor-pointer"
            >
              <Camera className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setFormulasOpen(true)}
              title="Formula Library"
              className="py-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-blue-500 flex items-center justify-center cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              title="Send Anonymous Feedback"
              aria-label="Send Anonymous Feedback"
              className="py-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-emerald-500 flex items-center justify-center cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
          <div className="flex justify-center">
            <PWAInstallButton compact />
          </div>
        </div>
      </aside>

      {/* Main Content Stage */}
      <main
        className={`flex-1 min-w-0 lg:pb-10 ${
          activeSection === 'home' && !activeSubTool ? 'pb-mobile-nav-home' : 'pb-mobile-nav'
        }`}
      >
        <div
          className={`max-w-6xl mx-auto lg:px-8 lg:py-7 ${
            activeSection === 'home' && !activeSubTool
              ? 'px-2.5 sm:px-5 pt-2 pb-1'
              : 'px-3 sm:px-6 py-4 sm:py-7'
          }`}
        >
          {renderContent()}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 min-h-[60px] pb-safe px-nav-safe bg-white/95 dark:bg-[#090D16]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 items-center"
      >
        {(
          [
            { id: 'home', label: 'Home', icon: Home },
            { id: 'scientific', label: 'Scientific', icon: Calculator },
            { id: 'ai-solver', label: 'AI Solver', icon: Bot },
            { id: 'graphs', label: 'Graphs', icon: LineChart },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeSection === tab.id && !activeSubTool;
          const showComingSoon = tab.id === 'ai-solver' && !AI_SOLVER_ENABLED;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate(tab.id);
              }}
              className={`relative min-h-[48px] flex flex-col items-center justify-center gap-0.5 nexa-tactile cursor-pointer ${
                active ? 'nexa-accent-text' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {showComingSoon && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1 py-[1px] rounded text-[6.5px] sm:text-[7px] leading-none font-bold uppercase tracking-tight bg-white dark:bg-[#090D16] text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 whitespace-nowrap shadow-xs">
                  Coming Soon
                </span>
              )}
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 nexa-tactile cursor-pointer ${
            mobileMenuOpen ? 'nexa-accent-text' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10px] font-medium whitespace-nowrap">Tools</span>
        </button>
      </nav>

      {/* Mobile All-Tools Sheet */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm">
          <div className="rounded-t-3xl bg-white dark:bg-[#0C101B] border-t border-slate-200 dark:border-slate-800 px-5 pt-5 pb-sheet-safe max-h-[82vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-display text-base font-bold">All Calculators & Tools</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close tools menu"
                className="p-2 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const showComingSoon = item.id === 'ai-solver' && !AI_SOLVER_ENABLED;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      navigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`relative p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 cursor-pointer ${
                      activeSection === item.id
                        ? 'border-blue-500 bg-blue-600/10 text-blue-600 dark:text-cyan-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{item.label}</span>
                    {showComingSoon && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] leading-none font-bold uppercase tracking-wide bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                        Coming Soon
                      </span>
                    )}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={openMatrix}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center gap-1.5 cursor-pointer"
              >
                <Grid className="w-5 h-5 text-cyan-500" />
                <span className="text-xs font-medium">Matrix</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setCameraOpen(true);
                }}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-5 h-5 text-violet-500" />
                <span className="text-xs font-medium">OCR Scan</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setVoiceOpen(true);
                }}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center gap-1.5 cursor-pointer"
              >
                <Mic className="w-5 h-5 text-blue-500" />
                <span className="text-xs font-medium">Voice</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setFeedbackOpen(true);
                }}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-5 h-5 text-emerald-500" />
                <span className="text-xs font-medium">Feedback</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setFormulasOpen(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-cyan-400"
              >
                <BookOpen className="w-4 h-4" />
                <span>Formula & Constants Library</span>
              </button>
              <PWAInstallButton compact />
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <VoiceCalculatorModal open={voiceOpen} onClose={() => setVoiceOpen(false)} />
      <CameraScannerModal open={cameraOpen} onClose={() => setCameraOpen(false)} />
      <FormulaLibraryModal open={formulasOpen} onClose={() => setFormulasOpen(false)} />
      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        currentPage={activeSubTool || activeSection}
      />
      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  const [adminRoute, setAdminRoute] = useState<boolean>(() =>
    typeof window !== 'undefined' ? isAdminPath(window.location.pathname) : false
  );

  useEffect(() => {
    const onPopState = () => {
      setAdminRoute(isAdminPath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const exitAdminRoute = () => {
    if (typeof window !== 'undefined' && isAdminPath(window.location.pathname)) {
      window.history.pushState({}, '', '/');
    }
    setAdminRoute(false);
  };

  return (
    <ErrorBoundary>
      <CalculatorProvider>
        {adminRoute ? (
          <AdminRouteView onBackToCalculator={exitAdminRoute} />
        ) : (
          <>
            <SplashScreen />
            <WorkspaceShell />
          </>
        )}
      </CalculatorProvider>
    </ErrorBoundary>
  );
}
