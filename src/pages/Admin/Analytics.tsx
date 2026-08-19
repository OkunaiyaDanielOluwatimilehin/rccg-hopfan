import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownToLine, BarChart3, Clock3, Eye, FileClock, Loader2, Percent, ShieldAlert, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

type AnalyticsPayload = {
  periodDays: number;
  metrics: {
    contentViews: number;
    downloads: number;
    watchMinutes: number;
    averageCompletionRate: number;
  };
  series: Array<{ date: string; views: number; downloads: number; watchMinutes: number }>;
};

type ActivityLog = {
  id: string;
  action: string;
  entity_type: string;
  title: string;
  body?: string | null;
  actor_name?: string | null;
  created_at: string;
};

const periods = [7, 30, 90];

function SparkChart({ data, field }: { data: AnalyticsPayload['series']; field: 'views' | 'downloads' | 'watchMinutes' }) {
  const points = useMemo(() => {
    if (data.length === 0) return '0,92 100,92';
    const max = Math.max(...data.map((item) => Number(item[field] || 0)), 1);
    return data.map((item, index) => {
      const x = data.length === 1 ? 0 : (index / (data.length - 1)) * 100;
      const y = 90 - (Number(item[field] || 0) / max) * 80;
      return `${x},${y}`;
    }).join(' ');
  }, [data, field]);

  return (
    <svg viewBox="0 0 100 100" className="h-40 w-full overflow-visible sm:h-56" preserveAspectRatio="none" role="img" aria-label={`${field} chart`}>
      <defs>
        <linearGradient id={`chart-${field}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#003366" />
          <stop offset="100%" stopColor="#C5A059" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={`url(#chart-${field})`} strokeWidth="4" points={points} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="0" y1="92" x2="100" y2="92" stroke="#e7e5e4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function AdminAnalytics() {
  const { getAccessToken } = useAuth();
  const [period, setPeriod] = useState(7);
  const [payload, setPayload] = useState<AnalyticsPayload | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const token = await getAccessToken();
        if (!token) throw new Error('Missing admin session.');
        const response = await fetch(`/api/admin/analytics?days=${period}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error || 'Could not load analytics.');
        if (!cancelled) setPayload(body);
      } catch (loadError: any) {
        if (!cancelled) setError(loadError?.message || 'Could not load analytics.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAnalytics();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken, period]);

  useEffect(() => {
    let cancelled = false;
    async function loadActivity() {
      setActivityLoading(true);
      try {
        const { data, error: activityError } = await supabase
          .from('admin_activity_logs')
          .select('id,action,entity_type,title,body,actor_name,created_at')
          .order('created_at', { ascending: false })
          .limit(12);
        if (activityError) {
          if (!activityError.message.includes('relation "admin_activity_logs" does not exist')) throw activityError;
          if (!cancelled) setActivityLogs([]);
          return;
        }
        if (!cancelled) setActivityLogs((data || []) as ActivityLog[]);
      } catch (activityLoadError) {
        console.error('Error loading activity logs:', activityLoadError);
        if (!cancelled) setActivityLogs([]);
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    }
    loadActivity();
    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = payload?.metrics || {
    contentViews: 60,
    downloads: 1,
    watchMinutes: 125,
    averageCompletionRate: 13,
  };

  const cards = [
    { label: 'Content Views', value: metrics.contentViews, icon: Eye, tone: 'bg-primary text-white', hint: 'Total page and content opens' },
    { label: 'Downloads', value: metrics.downloads, icon: ArrowDownToLine, tone: 'bg-accent text-white', hint: 'Resources saved by members' },
    { label: 'Watch Minutes', value: metrics.watchMinutes, icon: Clock3, tone: 'bg-emerald-600 text-white', hint: 'Total sermon watch time' },
    { label: 'Avg Completion', value: `${metrics.averageCompletionRate}%`, icon: Percent, tone: 'bg-stone-900 text-white', hint: 'Average watch progress' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:flex lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.35em] text-accent">Insights</p>
          <h1 className="text-3xl font-serif font-bold text-primary tracking-tight sm:text-4xl">Analytics</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">Content performance, member engagement, and recent admin activity in one view.</p>
        </div>
        <div className="grid grid-cols-3 border border-stone-200 bg-white shadow-sm">
          {periods.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setPeriod(days)}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-widest ${period === days ? 'bg-primary text-white' : 'text-stone-600 hover:bg-stone-50'}`}
            >
              {days} days
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="p-4 border border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="group overflow-hidden border border-stone-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div className={`flex h-11 w-11 items-center justify-center ${card.tone}`}>
                <card.icon className="h-5 w-5" />
              </div>
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-stone-400" /> : null}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-stone-400">{card.label}</p>
            <p className="mt-2 text-4xl font-black text-primary">{card.value}</p>
            <p className="mt-3 text-xs leading-relaxed text-stone-500">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <section className="border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-accent/10 p-3 text-accent">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-serif text-2xl font-bold text-primary">Performance Trend</h2>
                <p className="text-xs text-stone-500">Views, downloads, and watch minutes over selected period.</p>
              </div>
            </div>
            <BarChart3 className="h-5 w-5 text-stone-300" />
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="border border-stone-100 bg-stone-50 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-stone-500">Views</p>
            <SparkChart data={payload?.series || []} field="views" />
            </div>
            <div className="border border-stone-100 bg-stone-50 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-stone-500">Downloads</p>
            <SparkChart data={payload?.series || []} field="downloads" />
            </div>
            <div className="border border-stone-100 bg-stone-50 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-stone-500">Watch Minutes</p>
            <SparkChart data={payload?.series || []} field="watchMinutes" />
            </div>
          </div>
        </section>

        <section className="border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-3 text-primary">
                <FileClock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-serif text-2xl font-bold text-primary">Recent Activity</h2>
                <p className="text-xs text-stone-500">Latest admin-side changes.</p>
              </div>
            </div>
          </div>
          <div className="max-h-[31rem] overflow-y-auto">
            {activityLoading ? (
              <div className="p-6 text-sm text-stone-500">Loading activity logs...</div>
            ) : activityLogs.length === 0 ? (
              <div className="p-6 text-sm text-stone-500">Activity logs will appear here as content changes.</div>
            ) : (
              activityLogs.map((log) => (
                <article key={log.id} className="border-t border-stone-100 p-5 transition-colors hover:bg-stone-50">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                      {log.entity_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h3 className="font-bold text-primary">{log.title}</h3>
                  {log.body ? <p className="mt-1 text-sm leading-relaxed text-stone-600">{log.body}</p> : null}
                  <p className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-stone-400">
                    <Clock3 className="h-3 w-3" />
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    {log.actor_name ? <span>{log.actor_name}</span> : null}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
