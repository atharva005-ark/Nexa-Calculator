export type NavSection =
  | 'home'
  | 'scientific'
  | 'ai-solver'
  | 'graphs'
  | 'equations'
  | 'calculus'
  | 'converters'
  | 'finance'
  | 'programmer'
  | 'statistics'
  | 'history'
  | 'settings';

export type AngleUnit = 'DEG' | 'RAD';
export type ThemeMode = 'dark' | 'light' | 'auto';
export type AccentColor = 'blue-cyan' | 'violet-indigo' | 'emerald-teal' | 'amber-orange';
export type NotationMode = 'auto' | 'scientific' | 'engineering';

export const ACCENT_THEMES: Record<
  AccentColor,
  {
    label: string;
    from: string;
    via: string;
    to: string;
    solid: string;
    textDark: string;
    textLight: string;
  }
> = {
  'blue-cyan': {
    label: 'Cyan Blue',
    from: '#2563EB',
    via: '#7C3AED',
    to: '#0891B2',
    solid: '#06B6D4',
    textDark: '#22D3EE',
    textLight: '#2563EB',
  },
  'violet-indigo': {
    label: 'Royal Violet',
    from: '#7C3AED',
    via: '#6366F1',
    to: '#A855F7',
    solid: '#8B5CF6',
    textDark: '#C084FC',
    textLight: '#7C3AED',
  },
  'emerald-teal': {
    label: 'Emerald Teal',
    from: '#059669',
    via: '#0D9488',
    to: '#06B6D4',
    solid: '#10B981',
    textDark: '#34D399',
    textLight: '#059669',
  },
  'amber-orange': {
    label: 'Solar Amber',
    from: '#D97706',
    via: '#EA580C',
    to: '#F59E0B',
    solid: '#F59E0B',
    textDark: '#FBBF24',
    textLight: '#D97706',
  },
};

export interface CalculatorSettings {
  theme: ThemeMode;
  accentColor: AccentColor;
  precision: number;
  angleUnit: AngleUnit;
  thousandsSeparator: boolean;
  scientificNotation: boolean;
  notationMode: NotationMode;
  hapticFeedback: boolean;
  soundFeedback: boolean;
}

export const DEFAULT_SETTINGS: CalculatorSettings = {
  theme: 'dark',
  accentColor: 'blue-cyan',
  precision: 10,
  angleUnit: 'DEG',
  thousandsSeparator: true,
  scientificNotation: false,
  notationMode: 'auto',
  hapticFeedback: true,
  soundFeedback: false,
};

export interface HistoryEntry {
  id: string;
  expression: string;
  result: string;
  mode: string;
  timestamp: number;
  angleUnit?: AngleUnit;
}

export interface GraphFunctionItem {
  id: string;
  expression: string;
  color: string;
  visible: boolean;
  showDerivative?: boolean;
  lineStyle: 'solid' | 'dash' | 'dot';
  lineWidth: number;
}

export interface SavedGraph {
  id: string;
  name: string;
  functions: GraphFunctionItem[];
  xRange: [number, number];
  yRange: [number, number];
  createdAt: number;
}

export interface FavoriteFormula {
  id: string;
  title: string;
  expression: string;
  category: string;
  description: string;
  createdAt: number;
}

export interface CurrencyCacheEntry {
  base: string;
  rates: Record<string, number>;
  timestamp: string;
  provider: string;
  cachedAt: number;
}
