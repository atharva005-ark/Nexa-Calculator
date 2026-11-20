import React from 'react';
import { Download, Palette, Shield, Smartphone, Trash2 } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { ACCENT_THEMES, type AccentColor, type NotationMode } from '../../types/calculator';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, history, clearHistory } = useCalculator();

  const activeNotation: NotationMode =
    settings.notationMode ?? (settings.scientificNotation ? 'scientific' : 'auto');

  const handleExportHistory = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexa-calculator-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Settings & Preferences
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure theme, custom accent palette, numerical notation, feedback, and Android/PWA options
          </p>
        </div>
        <PWAInstallButton />
      </div>

      {/* Theme, Accent & Display */}
      <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-5">
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
          Appearance & Precision
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-white">Theme Mode</div>
            <div className="text-xs text-slate-500">Choose dark, light, or system automatic theme</div>
          </div>
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit">
            {(['dark', 'light', 'auto'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => updateSettings({ theme: mode })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition cursor-pointer ${
                  settings.theme === mode
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Accent Color Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-white">
              <Palette className="w-4 h-4 nexa-accent-text" />
              <span>Accent Palette</span>
            </div>
            <div className="text-xs text-slate-500">Customize interactive highlights across dark & light modes</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ACCENT_THEMES) as AccentColor[]).map((key) => {
              const item = ACCENT_THEMES[key];
              const active = (settings.accentColor || 'blue-cyan') === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateSettings({ accentColor: key })}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition nexa-tactile cursor-pointer ${
                    active
                      ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${item.from}, ${item.to})`,
                    }}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-white">
              Decimal Precision ({settings.precision} digits)
            </div>
            <div className="text-xs text-slate-500">Controls displayed decimal places across calculators</div>
          </div>
          <input
            type="range"
            min={2}
            max={15}
            value={settings.precision}
            onChange={(e) => updateSettings({ precision: Number(e.target.value) })}
            className="w-44 max-w-full"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-white">Default Angle Unit</div>
            <div className="text-xs text-slate-500">Applied to trigonometric functions</div>
          </div>
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit">
            {(['DEG', 'RAD'] as const).map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => updateSettings({ angleUnit: unit })}
                className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition cursor-pointer ${
                  settings.angleUnit === unit
                    ? 'nexa-accent-solid-bg text-white'
                    : 'text-slate-500'
                }`}
              >
                {unit}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-white">Default Output Notation</div>
            <div className="text-xs text-slate-500">Standard decimal, Scientific (10ⁿ), or Engineering (10³ᵏ)</div>
          </div>
          <div className="inline-flex flex-wrap p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit max-w-full">
            {(
              [
                { id: 'auto', label: 'Standard' },
                { id: 'scientific', label: 'Scientific' },
                { id: 'engineering', label: 'Engineering' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => updateSettings({ notationMode: opt.id })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                  activeNotation === opt.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
          {[
            {
              key: 'thousandsSeparator' as const,
              title: 'Thousands Separators',
              desc: 'Format large numbers with commas (e.g. 1,000,000)',
            },
            {
              key: 'hapticFeedback' as const,
              title: 'Haptic Feedback',
              desc: 'Subtle vibration on keypad taps where hardware supports it',
            },
            {
              key: 'soundFeedback' as const,
              title: 'Keypad Click Sound',
              desc: 'Soft synthesized acoustic feedback on keypad presses',
            },
          ].map((toggle) => (
            <label key={toggle.key} className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{toggle.title}</div>
                <div className="text-xs text-slate-500">{toggle.desc}</div>
              </div>
              <input
                type="checkbox"
                checked={settings[toggle.key]}
                onChange={(e) => updateSettings({ [toggle.key]: e.target.checked })}
                className="w-4 h-4 accent-blue-600"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Data & History Management */}
      <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
          Calculation History & Data
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          All calculation history, saved graphs, preferences, and favorite formulas are stored strictly on your device in IndexedDB with localStorage backup and are never transmitted to external servers.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportHistory}
            disabled={history.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export History (JSON)</span>
          </button>
          <button
            type="button"
            onClick={() => void clearHistory()}
            disabled={history.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-medium disabled:opacity-40 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Local History ({history.length})</span>
          </button>
        </div>
      </div>

      {/* Android & Offline Readiness */}
      <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 nexa-accent-text" />
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Android & Offline Readiness
          </h2>
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
          <p>
            <strong>Offline-First Core:</strong> Standard, Scientific, 2D &amp; 3D Graphing, Equation Solver, Calculus, Matrix Algebra, Unit Converter, Financial Suite, Programmer Mode, Statistics, and KaTeX math rendering run 100% offline on-device.
          </p>
          <p>
            <strong>Capacitor Native Integration:</strong> Configured with Android safe-area support, hardware back-button navigation, status-bar theme synchronization, splash screen handoff, and on-demand Camera/Voice permissions.
          </p>
        </div>
      </div>

      {/* Privacy & About */}
      <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-500" />
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Privacy Policy & About NEXA Calculator
          </h2>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
          <p>
            <strong>Privacy Notice:</strong> NEXA Calculator performs all standard, scientific, symbolic, matrix, statistical, programmer, financial, and OCR computations locally on your device. Camera frames and voice transcripts are processed on-device and never uploaded. Network requests occur only when you explicitly submit a prompt to the AI Math Solver or refresh live currency exchange rates.
          </p>
          <p>
            <strong>Application Version:</strong> NEXA Calculator v2.0.0 · Architecture: React, TypeScript, Math.js, Decimal.js, Nerdamer, KaTeX, Plotly.js, Tesseract.js, PWA &amp; Capacitor Android.
          </p>
        </div>
      </div>
    </div>
  );
};
