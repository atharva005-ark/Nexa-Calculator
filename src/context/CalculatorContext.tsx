import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  type CalculatorSettings,
  type FavoriteFormula,
  type HistoryEntry,
  type NavSection,
} from '../types/calculator';
import {
  addHistoryEntry,
  clearAllHistory,
  deleteFavoriteFormula,
  deleteHistoryEntry,
  getFavoriteFormulas,
  getHistory,
  loadRecentTools,
  loadSettings,
  saveFavoriteFormula,
  saveRecentTools,
  saveSettings,
} from '../lib/storage/indexedDb';
import { triggerClickSound, triggerHaptic } from '../lib/feedback';
import { syncNativeStatusBar } from '../lib/platform/capacitorBridge';

interface CalculatorContextValue {
  activeSection: NavSection;
  navigate: (section: NavSection) => void;
  settings: CalculatorSettings;
  updateSettings: (patch: Partial<CalculatorSettings>) => void;
  history: HistoryEntry[];
  recordHistory: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => Promise<void>;
  removeHistoryItem: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  favorites: FavoriteFormula[];
  addFavorite: (item: Omit<FavoriteFormula, 'id' | 'createdAt'>) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  recentTools: NavSection[];
  memory: string;
  setMemory: React.Dispatch<React.SetStateAction<string>>;
  sharedExpression: string;
  setSharedExpression: React.Dispatch<React.SetStateAction<string>>;
  reuseExpression: (expr: string, targetSection?: NavSection) => void;
  feedbackTap: () => void;
  activeSubTool: string | null;
  setActiveSubTool: React.Dispatch<React.SetStateAction<string | null>>;
}

const CalculatorContext = createContext<CalculatorContextValue | null>(null);

export const CalculatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSection, setActiveSection] = useState<NavSection>('home');
  const [settings, setSettings] = useState<CalculatorSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [favorites, setFavorites] = useState<FavoriteFormula[]>([]);
  const [recentTools, setRecentTools] = useState<NavSection[]>(['scientific', 'graphs', 'ai-solver', 'converters']);
  const [memory, setMemory] = useState<string>('0');
  const [sharedExpression, setSharedExpression] = useState<string>('');
  const [activeSubTool, setActiveSubTool] = useState<string | null>(null);

  // Hydrate from IndexedDB / localStorage on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [loadedSettings, loadedHistory, loadedFavs, loadedRecent] = await Promise.all([
        loadSettings(),
        getHistory(),
        getFavoriteFormulas(),
        loadRecentTools(),
      ]);
      if (!mounted) return;
      setSettings(loadedSettings);
      setHistory(loadedHistory);
      setFavorites(loadedFavs);
      setRecentTools(loadedRecent);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Apply theme class, custom accent attribute, and native Android status bar sync
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-accent', settings.accentColor || 'blue-cyan');

    const applyTheme = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark = settings.theme === 'dark' || (settings.theme === 'auto' && prefersDark);
      root.classList.toggle('dark', shouldBeDark);
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute('content', shouldBeDark ? '#07090E' : '#F8FAFC');
      }
      void syncNativeStatusBar(shouldBeDark);
    };
    applyTheme();
    if (settings.theme === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', applyTheme);
      return () => mq.removeEventListener('change', applyTheme);
    }
  }, [settings.theme, settings.accentColor]);

  const feedbackTap = useCallback(() => {
    triggerHaptic(settings.hapticFeedback, 10);
    triggerClickSound(settings.soundFeedback);
  }, [settings.hapticFeedback, settings.soundFeedback]);

  const updateSettings = useCallback((patch: Partial<CalculatorSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (patch.notationMode !== undefined) {
        next.scientificNotation = patch.notationMode === 'scientific';
      } else if (patch.scientificNotation !== undefined) {
        next.notationMode = patch.scientificNotation ? 'scientific' : 'auto';
      }
      void saveSettings(next);
      return next;
    });
  }, []);

  const navigate = useCallback((section: NavSection) => {
    setActiveSection(section);
    setActiveSubTool(null);
    if (section !== 'home' && section !== 'settings' && section !== 'history') {
      setRecentTools((prev) => {
        const updated = [section, ...prev.filter((s) => s !== section)].slice(0, 6);
        void saveRecentTools(updated);
        return updated;
      });
    }
  }, []);

  const recordHistory = useCallback(async (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    const item: HistoryEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };
    setHistory((prev) => [item, ...prev]);
    await addHistoryEntry(item);
  }, []);

  const removeHistoryItem = useCallback(async (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    await deleteHistoryEntry(id);
  }, []);

  const clearHistory = useCallback(async () => {
    setHistory([]);
    await clearAllHistory();
  }, []);

  const addFavorite = useCallback(async (item: Omit<FavoriteFormula, 'id' | 'createdAt'>) => {
    const newItem: FavoriteFormula = {
      ...item,
      id: `fav-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
    };
    setFavorites((prev) => [newItem, ...prev]);
    await saveFavoriteFormula(newItem);
  }, []);

  const removeFavorite = useCallback(async (id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
    await deleteFavoriteFormula(id);
  }, []);

  const reuseExpression = useCallback(
    (expr: string, targetSection: NavSection = 'scientific') => {
      setSharedExpression(expr);
      navigate(targetSection);
    },
    [navigate]
  );

  return (
    <CalculatorContext.Provider
      value={{
        activeSection,
        navigate,
        settings,
        updateSettings,
        history,
        recordHistory,
        removeHistoryItem,
        clearHistory,
        favorites,
        addFavorite,
        removeFavorite,
        recentTools,
        memory,
        setMemory,
        sharedExpression,
        setSharedExpression,
        reuseExpression,
        feedbackTap,
        activeSubTool,
        setActiveSubTool,
      }}
    >
      {children}
    </CalculatorContext.Provider>
  );
};

export function useCalculator() {
  const ctx = useContext(CalculatorContext);
  if (!ctx) throw new Error('useCalculator must be used inside CalculatorProvider');
  return ctx;
}
