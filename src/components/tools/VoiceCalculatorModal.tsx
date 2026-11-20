import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Play, X } from 'lucide-react';
import { parseSpokenMath } from '../../lib/math/voiceParser';
import { evaluateExpression } from '../../lib/math/calculatorEngine';
import { useCalculator } from '../../context/CalculatorContext';

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export const VoiceCalculatorModal: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const { settings, setSharedExpression, recordHistory } = useCalculator();
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedExpr, setParsedExpr] = useState('');
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    if (!open) return;
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;
    setSupported(Boolean(SpeechRec));
    return () => {
      recognitionRef.current?.stop();
    };
  }, [open]);

  useEffect(() => {
    const expr = parseSpokenMath(transcript);
    setParsedExpr(expr);
    if (expr) {
      const evalRes = evaluateExpression(expr, {
        angleUnit: settings.angleUnit,
        precision: settings.precision,
        thousandsSeparator: settings.thousandsSeparator,
      });
      setPreviewResult(evalRes.ok ? evalRes.formattedResult : null);
    } else {
      setPreviewResult(null);
    }
  }, [transcript, settings.angleUnit, settings.precision, settings.thousandsSeparator]);

  if (!open) return null;

  const startListening = () => {
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

    if (!SpeechRec) {
      setSupported(false);
      setStatusError('Web Speech API is unavailable in this browser. Type your spoken phrase below.');
      return;
    }

    setStatusError(null);
    const rec = new SpeechRec();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (event) => {
      let combined = '';
      for (let i = 0; i < event.results.length; i++) {
        combined += event.results[i][0].transcript + ' ';
      }
      setTranscript(combined.trim());
    };
    rec.onerror = (event) => {
      setListening(false);
      setStatusError(`Speech recognition error (${event.error}). You can edit or type manually below.`);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const handleExecute = () => {
    if (!parsedExpr.trim()) return;
    const evalRes = evaluateExpression(parsedExpr, {
      angleUnit: settings.angleUnit,
      precision: settings.precision,
      thousandsSeparator: settings.thousandsSeparator,
    });
    if (evalRes.ok) {
      void recordHistory({
        expression: parsedExpr,
        result: evalRes.formattedResult,
        mode: 'Voice',
        angleUnit: settings.angleUnit,
      });
    }
    setSharedExpression(parsedExpr);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0F141F] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Voice Math Input
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close voice input"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Try saying: “What is 25 multiplied by 40”, “Square root of 144”, “15 percent of 200”, or “2 raised to the power of 5”.
        </p>

        <div className="flex items-center gap-3">
          {supported ? (
            <button
              type="button"
              onClick={listening ? stopListening : startListening}
              className={`flex-1 min-h-[46px] rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                listening
                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                  : 'bg-gradient-to-r from-blue-600 via-violet-600 to-cyan-600 text-white hover:opacity-95'
              }`}
            >
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{listening ? 'Stop Listening' : 'Start Microphone'}</span>
            </button>
          ) : (
            <div className="w-full rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-600 dark:text-amber-300">
              Speech recognition is not supported in this browser. Use the manual phrase input below.
            </div>
          )}
        </div>

        {statusError && (
          <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5">
            {statusError}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Recognized Spoken Phrase (Editable)
            </label>
            <input
              type="text"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="e.g. 15 percent of 200"
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Parsed Mathematical Expression (Review Before Execution)
            </label>
            <input
              type="text"
              value={parsedExpr}
              onChange={(e) => {
                setParsedExpr(e.target.value);
                const ev = evaluateExpression(e.target.value, { angleUnit: settings.angleUnit });
                setPreviewResult(ev.ok ? ev.formattedResult : null);
              }}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-sm font-mono text-cyan-600 dark:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {previewResult !== null && (
            <div className="flex items-center justify-between rounded-xl bg-slate-100 dark:bg-slate-900/80 px-3.5 py-2.5 text-sm">
              <span className="text-slate-500 dark:text-slate-400">Preview Result</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {previewResult}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!parsedExpr.trim()}
            onClick={handleExecute}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>Send to Calculator</span>
          </button>
        </div>
      </div>
    </div>
  );
};
