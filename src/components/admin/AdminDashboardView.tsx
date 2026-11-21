import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Bug,
  Calendar,
  CheckCircle2,
  Eye,
  LayoutDashboard,
  Lightbulb,
  Loader2,
  LogOut,
  MessageSquare,
  Monitor,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Star,
  Tablet,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type {
  GA4AnalyticsResponse,
  GA4TimeSeriesPoint,
} from '../../lib/analytics/ga4Server';
import {
  deleteFeedbackItem,
  parseFeedbackError,
  subscribeToAdminFeedback,
  updateFeedbackStatus,
  type FeedbackRecord,
  type FeedbackStatus,
  type FeedbackType,
  type ParsedFeedbackError,
} from '../../lib/firebase/feedbackService';

type AdminTab = 'overview' | 'analytics' | 'feedback';

interface AdminDashboardViewProps {
  firebaseUser: User;
  adminEmail: string;
  authorizedVia?: 'owner' | 'admin_emails';
  onSignOut: () => void;
  onBackToCalculator: () => void;
}

const BarSeriesChart: React.FC<{
  title: string;
  subtitle: string;
  data: GA4TimeSeriesPoint[];
  barColorClass: string;
}> = ({ title, subtitle, data, barColorClass }) => {
  const maxVal = Math.max(1, ...data.map((d) => d.visitors));

  return (
    <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
      <div>
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
          {title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>

      {data.length === 0 ? (
        <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
          No recorded Google Analytics 4 visitor series in this date range yet.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="h-44 flex items-end gap-1 sm:gap-1.5 pt-4 overflow-x-auto pb-1">
            {data.map((pt) => {
              const heightPct = Math.max(4, Math.round((pt.visitors / maxVal) * 100));
              return (
                <div
                  key={pt.rawDate}
                  title={`${pt.label}: ${pt.visitors.toLocaleString()} visitors · ${pt.pageViews.toLocaleString()} page views`}
                  className="flex-1 min-w-[14px] h-full flex flex-col justify-end items-center gap-1 group"
                >
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t-md transition-opacity group-hover:opacity-100 opacity-85 ${barColorClass}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>{data[0]?.label}</span>
            <span>Peak: {maxVal.toLocaleString()} visitors</span>
            <span>{data[data.length - 1]?.label}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const GA4SetupBanner: React.FC<{
  missingEnvVars?: string[];
  error?: string;
}> = ({ missingEnvVars, error }) => (
  <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-amber-500/35 p-5 space-y-3">
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500 shrink-0">
        <AlertCircle className="w-5 h-5" />
      </div>
      <div className="space-y-1.5 min-w-0">
        <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
          {error
            ? 'Google Analytics 4 Connection Error'
            : 'Connect Google Analytics 4 for Real Visitor Statistics'}
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {error
            ? error
            : 'No simulated or placeholder numbers are shown. Add your Google Analytics 4 Data API credentials on the server to populate live visitor, page view, feature, and device reports.'}
        </p>

        {missingEnvVars && missingEnvVars.length > 0 && (
          <div className="pt-2 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Missing Server Environment Variables
            </div>
            <div className="flex flex-wrap gap-1.5">
              {missingEnvVars.map((envKey) => (
                <code
                  key={envKey}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-amber-600 dark:text-amber-400"
                >
                  {envKey}
                </code>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Also set <code className="font-mono">VITE_GA4_MEASUREMENT_ID</code> (format <code className="font-mono">G-XXXXXXXXXX</code>) to record real browser page views and calculator feature events.
            </p>
          </div>
        )}
      </div>
    </div>
  </div>
);

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  firebaseUser,
  adminEmail,
  authorizedVia = 'owner',
  onSignOut,
  onBackToCalculator,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // GA4 Analytics state (loaded via server-side authenticated /api/admin/analytics)
  const [analytics, setAnalytics] = useState<GA4AnalyticsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Real-time Firestore Feedback state
  const [feedbackList, setFeedbackList] = useState<FeedbackRecord[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [feedbackError, setFeedbackError] = useState<ParsedFeedbackError | null>(null);
  const [feedbackRetryKey, setFeedbackRetryKey] = useState(0);
  const [typeFilter, setTypeFilter] = useState<'all' | FeedbackType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | FeedbackStatus>('all');
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [busyFeedbackId, setBusyFeedbackId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const idToken = await firebaseUser.getIdToken();
      const resp = await fetch('/api/admin/analytics', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${idToken}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      });

      const contentType = (resp.headers.get('content-type') || '').toLowerCase();
      if (!contentType.includes('application/json')) {
        throw new Error('Admin analytics API returned an unexpected non-JSON response.');
      }

      const data = (await resp.json()) as GA4AnalyticsResponse & { error?: string };
      if (!resp.ok) {
        throw new Error(data.error || `Failed to load analytics (HTTP ${resp.status}).`);
      }

      setAnalytics(data);
    } catch (err) {
      setAnalyticsError(
        err instanceof Error ? err.message : 'Unable to load Google Analytics 4 data.'
      );
    } finally {
      setAnalyticsLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    setFeedbackLoading(true);
    setFeedbackError(null);

    const startSubscription = async () => {
      try {
        // Ensure Firebase Auth token is settled before issuing the protected Firestore list query
        await firebaseUser.getIdToken();
      } catch {
        // Proceed; onSnapshot will surface any auth/permission issue cleanly
      }
      if (cancelled) return;

      unsubscribe = subscribeToAdminFeedback(
        (items) => {
          if (cancelled) return;
          setFeedbackList(items);
          setFeedbackError(null);
          setFeedbackLoading(false);
        },
        (parsedErr) => {
          if (cancelled) return;
          setFeedbackError(parsedErr);
          setFeedbackLoading(false);
        }
      );
    };

    void startSubscription();

    return () => {
      cancelled = true;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [firebaseUser, feedbackRetryKey]);

  const feedbackStats = useMemo(() => {
    const total = feedbackList.length;
    const avgRating =
      total > 0
        ? (feedbackList.reduce((acc, item) => acc + item.rating, 0) / total).toFixed(1)
        : '—';
    const newCount = feedbackList.filter((f) => f.status === 'new').length;
    const bugCount = feedbackList.filter((f) => f.type === 'bug').length;
    const suggestionCount = feedbackList.filter((f) => f.type === 'suggestion').length;
    return { total, avgRating, newCount, bugCount, suggestionCount };
  }, [feedbackList]);

  const filteredFeedback = useMemo(() => {
    const q = feedbackSearch.trim().toLowerCase();
    return feedbackList.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (q) {
        const hay = `${item.message} ${item.category} ${item.page} ${item.type}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [feedbackList, feedbackSearch, statusFilter, typeFilter]);

  const handleStatusChange = async (id: string, nextStatus: FeedbackStatus) => {
    setBusyFeedbackId(id);
    try {
      await updateFeedbackStatus(id, nextStatus);
    } catch (err) {
      setFeedbackError(
        parseFeedbackError(err instanceof Error ? err.message : 'Failed to update status.')
      );
    } finally {
      setBusyFeedbackId(null);
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    setBusyFeedbackId(id);
    try {
      await deleteFeedbackItem(id);
      setConfirmDeleteId(null);
    } catch (err) {
      setFeedbackError(
        parseFeedbackError(err instanceof Error ? err.message : 'Failed to delete feedback item.')
      );
    } finally {
      setBusyFeedbackId(null);
    }
  };

  const formatMetric = (val: number | undefined | null) =>
    typeof val === 'number' ? val.toLocaleString() : '—';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07090E] text-slate-900 dark:text-slate-100 pt-safe pb-safe pl-safe pr-safe">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#090D16]/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/icon.svg" alt="NEXA" className="w-8 h-8 rounded-lg shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base tracking-tight truncate">
                  NEXA Admin
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                {adminEmail}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void loadAnalytics();
                setFeedbackRetryKey((k) => k + 1);
              }}
              disabled={analyticsLoading}
              className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C101B] text-xs font-medium hover:border-cyan-500/60 transition disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${analyticsLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={onBackToCalculator}
              className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C101B] text-xs font-medium hover:border-cyan-500/60 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Calculator</span>
            </button>

            <button
              type="button"
              onClick={onSignOut}
              className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-medium hover:bg-rose-500/20 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6">
        {/* Section Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex flex-wrap p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit max-w-full">
            {(
              [
                { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                { id: 'feedback', label: 'Feedback', icon: MessageSquare },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-[38px] inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.id === 'feedback' && feedbackStats.newCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-cyan-500/20 text-cyan-600 dark:text-cyan-300">
                      {feedbackStats.newCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {analytics?.fetchedAt && (
            <div className="text-[11px] font-mono text-slate-500">
              Synced: {new Date(analytics.fetchedAt).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* OVERVIEW SECTION */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {analyticsError && <GA4SetupBanner error={analyticsError} />}
            {!analyticsError && analytics && (!analytics.configured || analytics.error) && (
              <GA4SetupBanner
                missingEnvVars={analytics.missingEnvVars}
                error={analytics.error}
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'Total Visitors',
                  value: formatMetric(analytics?.overview?.totalVisitors),
                  sub: 'All-time GA4 sessions',
                  icon: Users,
                  accent: 'text-blue-500',
                },
                {
                  label: 'Unique Visitors',
                  value: formatMetric(analytics?.overview?.uniqueVisitors),
                  sub: 'Distinct GA4 users',
                  icon: Activity,
                  accent: 'text-cyan-500',
                },
                {
                  label: "Today's Visitors",
                  value: formatMetric(analytics?.overview?.todayVisitors),
                  sub: 'Active users today',
                  icon: Calendar,
                  accent: 'text-emerald-500',
                },
                {
                  label: 'Page Views',
                  value: formatMetric(analytics?.overview?.pageViews),
                  sub: 'Total screen & page views',
                  icon: Eye,
                  accent: 'text-violet-500',
                },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {card.label}
                      </span>
                      <Icon className={`w-4 h-4 ${card.accent}`} />
                    </div>
                    <div className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                      {analyticsLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                      ) : (
                        card.value
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">{card.sub}</div>
                  </div>
                );
              })}
            </div>

            {/* Live Feedback Snapshot Card */}
            <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                    Firestore Feedback Database Summary
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Real-time counts from anonymous user submissions
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('feedback')}
                  className="text-xs font-medium nexa-accent-text hover:underline cursor-pointer"
                >
                  Open Feedback Inbox
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-3.5">
                  <div className="text-[11px] text-slate-500">Total Submissions</div>
                  <div className="font-mono text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {feedbackLoading ? '…' : feedbackStats.total}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-3.5">
                  <div className="text-[11px] text-slate-500">Average Rating</div>
                  <div className="font-mono text-xl font-bold text-amber-500 mt-1 flex items-center gap-1">
                    <span>{feedbackLoading ? '…' : feedbackStats.avgRating}</span>
                    {feedbackStats.total > 0 && <Star className="w-4 h-4 fill-amber-400 text-amber-400" />}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-3.5">
                  <div className="text-[11px] text-slate-500">Unread / New</div>
                  <div className="font-mono text-xl font-bold text-cyan-500 mt-1">
                    {feedbackLoading ? '…' : feedbackStats.newCount}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-3.5">
                  <div className="text-[11px] text-slate-500">Bug Reports</div>
                  <div className="font-mono text-xl font-bold text-rose-500 mt-1">
                    {feedbackLoading ? '…' : feedbackStats.bugCount}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICS SECTION */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {analyticsError && <GA4SetupBanner error={analyticsError} />}
            {!analyticsError && analytics && (!analytics.configured || analytics.error) && (
              <GA4SetupBanner
                missingEnvVars={analytics.missingEnvVars}
                error={analytics.error}
              />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <BarSeriesChart
                title="Daily Visitors (Last 30 Days)"
                subtitle="Active users per day from Google Analytics 4"
                data={analytics?.dailyVisitors || []}
                barColorClass="bg-gradient-to-t from-blue-600 to-cyan-400"
              />
              <BarSeriesChart
                title="Monthly Visitors (Last 12 Months)"
                subtitle="Monthly active user trend from Google Analytics 4"
                data={analytics?.monthlyVisitors || []}
                barColorClass="bg-gradient-to-t from-violet-600 to-blue-400"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Popular Calculator Features */}
              <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                      Popular Calculator Features
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Most-used tools over the last 90 days (GA4)
                    </p>
                  </div>
                  <TrendingUp className="w-4 h-4 nexa-accent-text" />
                </div>

                {!analytics?.popularFeatures || analytics.popularFeatures.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-500">
                    No GA4 feature usage data available yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(() => {
                      const maxViews = Math.max(
                        1,
                        ...analytics.popularFeatures.map((f) => f.views)
                      );
                      return analytics.popularFeatures.map((item) => (
                        <div key={item.feature} className="space-y-1">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              {item.feature}
                            </span>
                            <span className="font-mono text-slate-500 dark:text-slate-400 shrink-0">
                              {item.views.toLocaleString()} views · {item.users.toLocaleString()} users
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                            <div
                              className="h-full rounded-full nexa-gradient-bg"
                              style={{
                                width: `${Math.max(4, Math.round((item.views / maxViews) * 100))}%`,
                              }}
                            />
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>

              {/* Device Breakdown */}
              <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                <div>
                  <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                    Device Breakdown
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Mobile, desktop, and tablet audience share (Last 90 days)
                  </p>
                </div>

                {!analytics?.deviceBreakdown || analytics.deviceBreakdown.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-500">
                    No GA4 device breakdown data available yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {analytics.deviceBreakdown.map((dev) => {
                      const lower = dev.device.toLowerCase();
                      const Icon =
                        lower === 'mobile'
                          ? Smartphone
                          : lower === 'tablet'
                            ? Tablet
                            : Monitor;
                      return (
                        <div
                          key={dev.device}
                          className="rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-3.5 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 nexa-accent-text" />
                              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                {dev.device}
                              </span>
                            </div>
                            <span className="font-mono text-sm font-bold nexa-accent-text">
                              {dev.percentage}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full nexa-accent-solid-bg"
                              style={{ width: `${Math.min(100, dev.percentage)}%` }}
                            />
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {dev.visitors.toLocaleString()} users · {dev.sessions.toLocaleString()} sessions
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* FEEDBACK SECTION */}
        {activeTab === 'feedback' && (
          <div className="space-y-5">
            {feedbackError && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 space-y-2 text-xs text-rose-500">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="space-y-1 min-w-0">
                      <div className="font-semibold text-rose-600 dark:text-rose-400">
                        {feedbackError.isPermissionDenied
                          ? 'Firestore permission denied while reading feedback'
                          : 'Unable to load feedback from Firestore'}
                      </div>
                      <p className="break-words text-rose-600/90 dark:text-rose-300/90">
                        {feedbackError.message}
                        {feedbackError.operationType && feedbackError.path
                          ? ` (Operation: ${feedbackError.operationType}, Path: ${feedbackError.path})`
                          : ''}
                      </p>
                      {feedbackError.isPermissionDenied && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                          Signed in as <code className="font-mono">{adminEmail}</code>
                          {authorizedVia === 'admin_emails'
                            ? ' (authorized via server ADMIN_EMAILS). Because Firestore Security Rules cannot read server environment variables, add this lowercase email to isAuthorizedAdminEmail() in firestore.rules and publish the rules to Firestore.'
                            : '. Make sure the updated firestore.rules are published to your Firestore database and retry.'}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFeedbackRetryKey((k) => k + 1)}
                    className="shrink-0 min-h-[32px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300 font-medium hover:bg-rose-500/20 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                </div>
              </div>
            )}

            {/* Filters Bar */}
            <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={feedbackSearch}
                  onChange={(e) => setFeedbackSearch(e.target.value)}
                  placeholder="Search anonymous feedback, suggestions, or bug reports..."
                  className="w-full min-h-[38px] pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as 'all' | FeedbackType)}
                  aria-label="Filter feedback type"
                  className="min-h-[38px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                >
                  <option value="all">All Types</option>
                  <option value="rating">Ratings</option>
                  <option value="suggestion">Suggestions</option>
                  <option value="bug">Bug Reports</option>
                  <option value="general">General</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | FeedbackStatus)}
                  aria-label="Filter feedback status"
                  className="min-h-[38px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="new">New</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            {feedbackLoading ? (
              <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-10 flex flex-col items-center gap-2 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin nexa-accent-text" />
                <span className="text-xs">Loading live feedback from Firestore...</span>
              </div>
            ) : filteredFeedback.length === 0 ? (
              <div className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-10 text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" />
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  {feedbackList.length === 0 ? 'No user feedback yet' : 'No matching feedback'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {feedbackList.length === 0
                    ? 'Anonymous ratings, feature suggestions, and bug reports submitted from NEXA Calculator will appear here in real time.'
                    : 'Try clearing your search or changing the type/status filters.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFeedback.map((item) => {
                  const TypeIcon =
                    item.type === 'bug'
                      ? Bug
                      : item.type === 'suggestion'
                        ? Lightbulb
                        : item.type === 'rating'
                          ? Star
                          : MessageSquare;
                  const typeStyle =
                    item.type === 'bug'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                      : item.type === 'suggestion'
                        ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30'
                        : item.type === 'rating'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30';

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-semibold capitalize ${typeStyle}`}
                          >
                            <TypeIcon className="w-3 h-3" />
                            <span>{item.type}</span>
                          </span>

                          <span className="inline-flex items-center gap-0.5 text-amber-400">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= item.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-300 dark:text-slate-700'
                                }`}
                              />
                            ))}
                          </span>

                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                            {item.category}
                          </span>

                          <span className="text-[11px] font-mono text-slate-400 capitalize">
                            {item.deviceType} · /{item.page}
                          </span>
                        </div>

                        <span className="text-[11px] font-mono text-slate-500">
                          {item.createdAt ? item.createdAt.toLocaleString() : 'Just now'}
                        </span>
                      </div>

                      <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                        {item.message}
                      </p>

                      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500">Status:</span>
                          {(['new', 'reviewed', 'resolved'] as const).map((st) => (
                            <button
                              key={st}
                              type="button"
                              disabled={busyFeedbackId === item.id}
                              onClick={() => void handleStatusChange(item.id, st)}
                              className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize border transition cursor-pointer ${
                                item.status === st
                                  ? st === 'resolved'
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                                    : st === 'reviewed'
                                      ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/40'
                                      : 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/40'
                                  : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              {st === 'resolved' && item.status === st && (
                                <CheckCircle2 className="w-3 h-3 inline mr-1" />
                              )}
                              {st}
                            </button>
                          ))}
                        </div>

                        <div>
                          {confirmDeleteId === item.id ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={busyFeedbackId === item.id}
                                onClick={() => void handleDeleteFeedback(item.id)}
                                className="min-h-[32px] px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-semibold cursor-pointer"
                              >
                                Confirm Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="min-h-[32px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(item.id)}
                              aria-label="Delete feedback"
                              className="min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
