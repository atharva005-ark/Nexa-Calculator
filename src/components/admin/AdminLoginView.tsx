import React from 'react';
import { AlertCircle, ArrowLeft, Loader2, LogOut, ShieldCheck } from 'lucide-react';

interface AdminLoginViewProps {
  loading: boolean;
  signingIn: boolean;
  error: string | null;
  signedInEmail: string | null;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
  onBackToCalculator: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  loading,
  signingIn,
  error,
  signedInEmail,
  onGoogleSignIn,
  onSignOut,
  onBackToCalculator,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07090E] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 pt-safe pb-safe">
      <div className="w-full max-w-md space-y-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToCalculator}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C101B] text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-cyan-500/60 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Calculator</span>
          </button>

          <div className="inline-flex items-center gap-2">
            <img src="/icon.svg" alt="NEXA" className="w-7 h-7 rounded-lg" />
            <span className="font-display font-bold text-sm tracking-tight">NEXA Calculator</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-6 sm:p-7 space-y-6 shadow-xl">
          <div className="space-y-2 text-center">
            <div className="w-12 h-12 rounded-2xl nexa-gradient-bg flex items-center justify-center mx-auto shadow-lg shadow-blue-600/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Administrator Sign In
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sign in with your authorized administrator Google account to access NEXA Calculator analytics and feedback.
            </p>
          </div>

          {loading ? (
            <div className="py-6 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin nexa-accent-text" />
              <span className="text-xs font-medium">Verifying administrator session...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {signedInEmail && (
                <div className="rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="text-slate-500">Signed in as</div>
                    <div className="font-mono text-slate-900 dark:text-white truncate">
                      {signedInEmail}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Switch</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={onGoogleSignIn}
                disabled={signingIn}
                className="w-full min-h-[46px] px-4 py-3 rounded-xl nexa-gradient-bg text-white text-sm font-semibold flex items-center justify-center gap-2.5 shadow-md shadow-blue-600/20 hover:opacity-95 transition disabled:opacity-60 nexa-tactile cursor-pointer"
              >
                {signingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Continue with Google Admin Account</span>
                  </>
                )}
              </button>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                Protected by server-side cryptographic token verification and Firestore role-based security rules. Unauthorized accounts cannot access dashboard data.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
