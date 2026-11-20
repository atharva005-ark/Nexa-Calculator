import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Eraser,
  Loader2,
  Plus,
  Send,
  ShieldCheck,
  User,
} from 'lucide-react';
import { MathBlock, MathText } from '../math/MathDisplay';
import { evaluateExpression } from '../../lib/math/calculatorEngine';
import { solveEquation } from '../../lib/math/symbolicEngine';
import { AI_SOLVER_ENABLED } from '../../config/features';
import { AISolverComingSoon } from './AISolverComingSoon';

interface AIStep {
  stepNumber: number;
  title: string;
  expression: string;
  explanation: string;
}

interface AIVerification {
  method: string;
  checkExpression: string;
  result: string;
  isVerified: boolean;
}

interface AISolverResponse {
  originalEquation: string;
  topic: string;
  method: string;
  conceptSummary: string;
  steps: AIStep[];
  finalAnswer: string;
  verification?: AIVerification;
  alternativeMethods: Array<{ method: string; summary: string }>;
  practiceQuestions: Array<{ question: string; hint: string; answer: string }>;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  mode: 'solve' | 'explain' | 'formula' | 'practice';
  userText?: string;
  response?: AISolverResponse;
  localCheck?: string | null;
  errorText?: string;
  timestamp: number;
}

const DOMAIN_EXAMPLES: Array<{ label: string; prompt: string }> = [
  { label: 'Algebra', prompt: 'Solve 2x + 5 = 15' },
  { label: 'Quadratic', prompt: 'Solve 3x^2 - 7x + 2 = 0 using factoring and quadratic formula' },
  { label: 'Calculus', prompt: 'Find the derivative and critical points of f(x) = x^3 - 6x^2 + 9x + 1' },
  { label: 'Trigonometry', prompt: 'Solve sin(2x) = sqrt(3)/2 for 0 <= x < 2pi' },
  { label: 'Geometry', prompt: 'Find the area and diagonal of a triangle with sides 5, 12, 13' },
  { label: 'Word Problem', prompt: 'A train travels 180 km at speed v and returns 15 km/h faster in 1 hour less. Find v.' },
];

function computeLocalVerification(questionText: string, response: AISolverResponse): string | null {
  const cleaned = questionText
    .replace(/^solve\s+/i, '')
    .replace(/^calculate\s+/i, '')
    .replace(/^evaluate\s+/i, '')
    .trim();

  if (cleaned.includes('=') && !cleaned.includes('==') && cleaned.length < 100) {
    const sol = solveEquation(cleaned);
    if (sol.ok && sol.solutions.length > 0) {
      return `Local CAS Check: ${sol.solutions.join(', ')}`;
    }
  } else if (/^[0-9+\-*/^().\sπesincotalgqrb!]+$/i.test(cleaned)) {
    const ev = evaluateExpression(cleaned);
    if (ev.ok && ev.formattedResult) {
      return `Local Engine Check: ${ev.formattedResult}`;
    }
  }

  if (response.verification?.isVerified && response.verification.result) {
    return `${response.verification.method}: Verified`;
  }
  return null;
}

function formatCopyText(msg: ChatMessage): string {
  const r = msg.response;
  if (!r) return msg.userText || '';
  const stepsText = r.steps
    .map((s) => `Step ${s.stepNumber} (${s.title}): ${s.expression}\n  ${s.explanation}`)
    .join('\n');
  return [
    `Problem: ${r.originalEquation}`,
    `Topic: ${r.topic} (${r.method})`,
    `\nSummary:\n${r.conceptSummary}`,
    `\nSteps:\n${stepsText}`,
    `\nFinal Answer: ${r.finalAnswer}`,
    r.verification ? `\nVerification (${r.verification.method}): ${r.verification.checkExpression} => ${r.verification.result}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export const AISolverView: React.FC = () => {
  const [question, setQuestion] = useState('Solve 2x + 5 = 15');
  const [mode, setMode] = useState<'solve' | 'explain' | 'formula' | 'practice'>('solve');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const threadEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messages.length > 0 || loading) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length, loading]);

  const handleClearConversation = () => {
    setMessages([]);
    setRevealedAnswers({});
  };

  const handleNewQuestion = () => {
    setQuestion('');
    setTimeout(() => textareaRef.current?.focus(), 20);
  };

  const handleCopyResponse = async (msg: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(formatCopyText(msg));
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      // ignore clipboard restrictions
    }
  };

  const submitPrompt = async (promptText: string) => {
    if (!AI_SOLVER_ENABLED) return;
    const trimmed = promptText.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      mode,
      userText: trimmed,
      timestamp: Date.now(),
    };

    const historyPayload = messages
      .filter((m) => (m.role === 'user' && m.userText) || (m.role === 'assistant' && m.response))
      .slice(-6)
      .map((m) => ({
        role: m.role,
        text:
          m.role === 'user'
            ? m.userText || ''
            : `${m.response?.originalEquation || ''} -> Final Answer: ${m.response?.finalAnswer || ''}`,
      }));

    setMessages((prev) => [...prev, userMsg]);
    setQuestion('');
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 50000);

    try {
      const resp = await fetch('/api/ai-solver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ question: trimmed, mode, history: historyPayload }),
        signal: controller.signal,
      });

      const contentType = (resp.headers.get('content-type') || '').toLowerCase();
      const rawBody = await resp.text();
      const trimmedBody = rawBody.trim();

      const looksLikeHtml =
        contentType.includes('text/html') ||
        /^<!doctype/i.test(trimmedBody) ||
        /^<html/i.test(trimmedBody);

      if (looksLikeHtml) {
        throw new Error(
          `The AI solver endpoint returned an HTML page instead of JSON (HTTP ${resp.status}). ` +
            'Make sure the backend server is running and /api/ai-solver is reachable.'
        );
      }

      if (!contentType.includes('application/json') && !trimmedBody.startsWith('{')) {
        throw new Error(
          resp.ok
            ? 'Received an unexpected non-JSON response from the AI solver server.'
            : `AI solver request failed (HTTP ${resp.status}). Please try again.`
        );
      }

      let data: Partial<AISolverResponse> & { success?: boolean; answer?: string; error?: string; code?: string };
      try {
        data = JSON.parse(trimmedBody) as Partial<AISolverResponse> & {
          success?: boolean;
          answer?: string;
          error?: string;
          code?: string;
        };
      } catch {
        throw new Error(
          `Received malformed JSON from the AI solver server (HTTP ${resp.status}). Please try again.`
        );
      }

      if (!resp.ok || data.success === false) {
        throw new Error(data.error || `AI solver request failed (HTTP ${resp.status}).`);
      }

      if (
        !data ||
        typeof data.finalAnswer !== 'string' ||
        typeof data.originalEquation !== 'string' ||
        !Array.isArray(data.steps)
      ) {
        throw new Error('The AI solver returned an incomplete solution format. Please try again.');
      }

      const parsed = data as AISolverResponse;
      const localCheck = computeLocalVerification(trimmed, parsed);

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          mode,
          response: parsed,
          localCheck,
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      let friendlyMessage =
        'Unable to reach AI Math Solver. Please check your internet connection and try again.';

      if (err instanceof DOMException && err.name === 'AbortError') {
        friendlyMessage = 'Request timed out after 50 seconds. Please try again or shorten your question.';
      } else if (err instanceof TypeError) {
        friendlyMessage =
          'Network connection error: could not reach /api/ai-solver. Check your connection or backend status.';
      } else if (err instanceof Error && err.message) {
        friendlyMessage = err.message;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          mode,
          errorText: friendlyMessage,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitPrompt(question);
  };

  if (!AI_SOLVER_ENABLED) {
    return <AISolverComingSoon />;
  }

  return (
    <div className="space-y-5">
      {/* Header & Conversation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            AI Math Solver
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Interactive multi-turn mathematical tutor with KaTeX typesetting, step-by-step proofs, and verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNewQuestion}
            className="min-h-[38px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C101B] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 transition nexa-tactile cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 nexa-accent-text" />
            <span>New Question</span>
          </button>
          <button
            type="button"
            onClick={handleClearConversation}
            disabled={messages.length === 0 && !loading}
            className="min-h-[38px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C101B] text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-rose-500 hover:border-rose-500/40 disabled:opacity-40 inline-flex items-center gap-1.5 transition nexa-tactile cursor-pointer whitespace-nowrap"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Clear Chat</span>
          </button>
        </div>
      </div>

      {/* Chat Thread */}
      <div className="space-y-4">
        {messages.length === 0 && !loading && (
          <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl nexa-gradient-bg text-white flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  Ask algebra, calculus, trigonometry, geometry, polynomials, or word problems
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Select a sample problem below or enter your own expression. Follow-up questions automatically remember previous steps in the thread.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {DOMAIN_EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => setQuestion(ex.prompt)}
                  className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/60 bg-slate-50/70 dark:bg-slate-900/50 transition nexa-tactile cursor-pointer"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wider nexa-accent-text mb-1">
                    {ex.label}
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                    {ex.prompt}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-2xl rounded-2xl rounded-br-sm nexa-gradient-bg text-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-[11px] text-white/80 mb-1">
                    <User className="w-3.5 h-3.5" />
                    <span>
                      You · {msg.mode} · {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-sm font-medium whitespace-pre-wrap break-words">
                    {msg.userText}
                  </div>
                </div>
              </div>
            );
          }

          if (msg.errorText) {
            return (
              <div
                key={msg.id}
                className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 text-sm text-rose-600 dark:text-rose-300"
              >
                {msg.errorText}
              </div>
            );
          }

          const res = msg.response;
          if (!res) return null;

          return (
            <div key={msg.id} className="space-y-4">
              {/* Main Structured AI Card */}
              <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Bot className="w-4 h-4 nexa-accent-text shrink-0" />
                    <span className="font-medium text-slate-700 dark:text-slate-200">{res.topic}</span>
                    <span aria-hidden="true">·</span>
                    <span>{res.method}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {msg.localCheck && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{msg.localCheck}</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleCopyResponse(msg)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Answer</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Original Equation (KaTeX) */}
                <div className="rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 px-4 py-3 text-slate-900 dark:text-white overflow-x-auto">
                  <MathBlock math={res.originalEquation} displayMode className="text-base sm:text-lg" />
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  <MathText text={res.conceptSummary} />
                </p>

                {/* Step-by-Step Derivations */}
                <div className="space-y-2">
                  <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                    Step-by-Step Solution
                  </h2>
                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {res.steps.map((step) => (
                      <div key={step.stepNumber} className="py-3 first:pt-1 last:pb-0 space-y-2">
                        <div className="text-xs font-semibold nexa-accent-text">
                          Step {step.stepNumber}: {step.title}
                        </div>
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-slate-900 dark:text-white overflow-x-auto">
                          <MathBlock math={step.expression} displayMode />
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          <MathText text={step.explanation} />
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Final Answer & Verification */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-2">
                  <div className="rounded-xl bg-gradient-to-r from-blue-600/10 via-violet-600/10 to-cyan-600/10 border border-blue-500/30 dark:border-cyan-500/30 p-4 overflow-x-auto">
                    <div className="text-xs font-medium nexa-accent-text mb-1">Final Answer</div>
                    <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                      <MathBlock math={res.finalAnswer} displayMode />
                    </div>
                  </div>

                  {res.verification && (
                    <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/25 p-4 space-y-1.5 overflow-x-auto">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verification · {res.verification.method}</span>
                      </div>
                      <div className="text-sm text-slate-800 dark:text-slate-200">
                        <MathBlock math={res.verification.checkExpression} />
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        Result: <MathText text={res.verification.result} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Alternative Methods & Practice */}
                {(res.alternativeMethods.length > 0 || res.practiceQuestions.length > 0) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                    {res.alternativeMethods.length > 0 && (
                      <div className="space-y-2.5">
                        <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                          Alternative Methods
                        </h3>
                        <div className="space-y-2.5">
                          {res.alternativeMethods.map((alt, i) => (
                            <div key={i} className="space-y-0.5">
                              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                {alt.method}
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                <MathText text={alt.summary} />
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {res.practiceQuestions.length > 0 && (
                      <div className="space-y-2.5">
                        <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                          Practice Questions
                        </h3>
                        <div className="space-y-2.5">
                          {res.practiceQuestions.map((pq, i) => {
                            const key = `${msg.id}-pq-${i}`;
                            const isOpen = !!revealedAnswers[key];
                            return (
                              <div
                                key={key}
                                className="border-b border-slate-200/80 dark:border-slate-800/80 pb-2.5 last:border-b-0 last:pb-0 space-y-1"
                              >
                                <div className="text-xs font-medium text-slate-900 dark:text-white">
                                  {i + 1}. <MathText text={pq.question} />
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  Hint: <MathText text={pq.hint} />
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRevealedAnswers((prev) => ({ ...prev, [key]: !prev[key] }))
                                  }
                                  className="inline-flex items-center gap-1 text-xs font-medium nexa-accent-text hover:underline cursor-pointer"
                                >
                                  {isOpen ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                  <span>{isOpen ? 'Hide Answer' : 'Reveal Answer'}</span>
                                </button>
                                {isOpen && (
                                  <div className="text-xs text-emerald-600 dark:text-emerald-400 pt-0.5">
                                    Answer: <MathText text={pq.answer} />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-6 flex items-center gap-3.5 text-slate-600 dark:text-slate-300">
            <div className="w-9 h-9 rounded-xl nexa-gradient-bg text-white flex items-center justify-center shrink-0">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                Solving & formatting mathematical derivation...
              </div>
              <div className="text-xs text-slate-500">
                Generating KaTeX equations, alternative approaches, and verification checks
              </div>
            </div>
          </div>
        )}
        <div ref={threadEndRef} />
      </div>

      {/* Prompt Input Composer */}
      <form
        onSubmit={handleFormSubmit}
        className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {(
              [
                { id: 'solve', label: 'Step-by-Step Solve' },
                { id: 'explain', label: 'Explain Concept' },
                { id: 'formula', label: 'Explain Formula' },
                { id: 'practice', label: 'Practice Generator' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === m.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          ref={textareaRef}
          rows={2}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void submitPrompt(question);
            }
          }}
          placeholder={
            messages.length > 0
              ? 'Ask a follow-up question (e.g., Show the graph steps, or Verify with x = 5)...'
              : 'Ask any math problem (algebra, calculus, trig, geometry, word problem)...'
          }
          className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Verify critical results with the local Symbolic or Scientific engine.</span>
          </div>

          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl nexa-gradient-bg text-white text-sm font-medium hover:opacity-95 disabled:opacity-50 transition nexa-tactile cursor-pointer whitespace-nowrap shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{loading ? 'Solving...' : messages.length > 0 ? 'Send Follow-Up' : 'Solve with AI'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
