import React, { useState } from 'react';
import { Bug, CheckCircle2, Lightbulb, MessageSquare, Send, Star, X } from 'lucide-react';
import {
  FEEDBACK_LIMITS,
  submitAnonymousFeedback,
  type FeedbackType,
} from '../../lib/firebase/feedbackService';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  currentPage: string;
}

const FEEDBACK_TYPES: Array<{
  id: FeedbackType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'rating', label: 'Rating', icon: Star },
  { id: 'suggestion', label: 'Suggestion', icon: Lightbulb },
  { id: 'bug', label: 'Bug Report', icon: Bug },
  { id: 'general', label: 'General', icon: MessageSquare },
];

const TOOL_CATEGORIES = [
  'General',
  'Home Calculator',
  'Scientific',
  'Graphing Lab',
  'Equation Solver',
  'Calculus Lab',
  'Converters',
  'Finance',
  'Programmer',
  'Statistics',
  'Matrix Algebra',
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ open, onClose, currentPage }) => {
  const [type, setType] = useState<FeedbackType>('suggestion');
  const [rating, setRating] = useState<number>(5);
  const [category, setCategory] = useState<string>('General');
  const [message, setMessage] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = message.trim();
    if (trimmed.length < FEEDBACK_LIMITS.MESSAGE_MIN) {
      setError(`Please enter at least ${FEEDBACK_LIMITS.MESSAGE_MIN} characters.`);
      return;
    }

    setSubmitting(true);
    try {
      await submitAnonymousFeedback({
        type,
        rating,
        category,
        message: trimmed,
        page: currentPage || 'home',
      });
      setSubmitted(true);
      setMessage('');
    } catch (err) {
      setError(
        err instanceof Error && !err.message.startsWith('{')
          ? err.message
          : 'Unable to submit feedback right now. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Send Anonymous Feedback"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-5 h-5 nexa-accent-text" />
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Send Anonymous Feedback
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Share ratings, feature ideas, or report an issue — no account required
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            aria-label="Close feedback modal"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Thank you for your feedback
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Your anonymous submission has been recorded for the NEXA Calculator team.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Submit Another
              </button>
              <button
                type="button"
                onClick={handleResetAndClose}
                className="min-h-[40px] px-4 py-2 rounded-xl nexa-gradient-bg text-white text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
                Feedback Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FEEDBACK_TYPES.map((item) => {
                  const Icon = item.icon;
                  const active = type === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setType(item.id)}
                      className={`min-h-[40px] px-2.5 py-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        active
                          ? 'border-cyan-500/70 bg-cyan-500/15 nexa-accent-text'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
                  Experience Rating
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <button
                      key={starVal}
                      type="button"
                      onClick={() => setRating(starVal)}
                      aria-label={`Rate ${starVal} out of 5 stars`}
                      className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Star
                        className={`w-5 h-5 transition ${
                          starVal <= rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300 dark:text-slate-700'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-1 font-mono text-xs text-slate-500">{rating}/5</span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="feedback-category"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-2"
                >
                  Calculator Tool
                </label>
                <select
                  id="feedback-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full min-h-[38px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  {TOOL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="feedback-message"
                  className="text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  Details
                </label>
                <span className="font-mono text-[11px] text-slate-400">
                  {message.length}/{FEEDBACK_LIMITS.MESSAGE_MAX}
                </span>
              </div>
              <textarea
                id="feedback-message"
                rows={4}
                maxLength={FEEDBACK_LIMITS.MESSAGE_MAX}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  type === 'bug'
                    ? 'Describe what happened, which tool you were using, and how to reproduce it...'
                    : type === 'suggestion'
                      ? 'Tell us what feature or improvement would make NEXA Calculator better...'
                      : 'Share your thoughts about NEXA Calculator...'
                }
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-3.5 py-2.5 text-xs text-rose-500">
                {error}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-[11px] text-slate-500">
                Submitted anonymously — no personal email or identity is stored.
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl nexa-gradient-bg text-white text-xs font-semibold hover:opacity-95 transition disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Submitting...' : 'Submit Feedback'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
