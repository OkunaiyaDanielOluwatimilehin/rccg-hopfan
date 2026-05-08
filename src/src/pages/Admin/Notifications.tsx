import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2, Clock3, Loader2, Mail, ShieldAlert, Sparkles } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { AdminRole } from '../../types';

type ProfileRow = {
  id: string;
  role: AdminRole;
};

type RequestNotification = {
  id: string;
  request_type: string | null;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
  metadata: Record<string, unknown> | null;
};

type ActivityLog = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_name: string;
  title: string;
  body: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

type FeedItem =
  | {
      key: string;
      source: 'request';
      title: string;
      body: string;
      created_at: string;
      read_at: string | null;
      category: string;
      path: string;
      metadata: Record<string, unknown> | null;
      request_type: string | null;
    }
  | {
      key: string;
      source: 'activity';
      title: string;
      body: string;
      created_at: string;
      read_at: null;
      category: string;
      path: string;
      metadata: Record<string, unknown> | null;
      entity_type: string;
      actor_name: string;
    };

const FILTERS = ['all', 'unread', 'activity'] as const;
type FeedFilter = typeof FILTERS[number];

const REQUEST_PATHS: Record<string, string> = {
  prayer: '/admin/prayer-requests',
  counseling: '/admin/counseling-requests',
  department: '/admin/department-requests',
};

const ACTIVITY_PATHS: Record<string, string> = {
  post: '/admin/posts',
  sermon: '/admin/sermons',
  devotional: '/admin/devotionals',
  event: '/admin/events',
  testimonial: '/admin/testimonials',
  profile: '/admin/users',
  prayer_request: '/admin/prayer-requests',
  counseling_request: '/admin/counseling-requests',
  department_request: '/admin/department-requests',
};

export default function AdminNotifications() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [requests, setRequests] = useState<RequestNotification[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FeedFilter>('all');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      setLoading(true);
      setError(null);
      try {
        const [profileRes, requestRes, activityRes] = await Promise.all([
          supabase.from('profiles').select('id,role').eq('id', user.id).maybeSingle(),
          supabase
            .from('request_notifications')
            .select('id,request_type,title,body,created_at,read_at,metadata')
            .eq('recipient_profile_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('admin_activity_logs')
            .select('id,action,entity_type,entity_id,actor_name,title,body,created_at,metadata')
            .order('created_at', { ascending: false })
            .limit(50),
        ]);

        if (profileRes.error) throw profileRes.error;
        if (requestRes.error) throw requestRes.error;
        if (activityRes.error) throw activityRes.error;

        setProfile((profileRes.data as ProfileRow) || null);
        setRequests((requestRes.data || []) as RequestNotification[]);
        setActivity((activityRes.data || []) as ActivityLog[]);
      } catch (fetchError: any) {
        console.error('Error loading notifications:', fetchError);
        setError(fetchError?.message || 'Could not load notifications.');
        setRequests([]);
        setActivity([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const items = useMemo<FeedItem[]>(() => {
    const requestItems: FeedItem[] = requests.map((item) => ({
      key: `request:${item.id}`,
      source: 'request',
      title: item.title,
      body: item.body,
      created_at: item.created_at,
      read_at: item.read_at,
      category: item.request_type ? item.request_type.replace(/_/g, ' ') : 'request',
      path: REQUEST_PATHS[item.request_type || ''] || '/admin/notifications',
      metadata: item.metadata,
      request_type: item.request_type,
    }));

    const activityItems: FeedItem[] = activity.map((item) => ({
      key: `activity:${item.id}`,
      source: 'activity',
      title: item.title,
      body: item.body || item.action.replace(/_/g, ' '),
      created_at: item.created_at,
      read_at: null,
      category: item.entity_type.replace(/_/g, ' '),
      path: ACTIVITY_PATHS[item.entity_type] || '/admin',
      metadata: item.metadata,
      entity_type: item.entity_type,
      actor_name: item.actor_name,
    }));

    return [...requestItems, ...activityItems].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [activity, requests]);

  const unreadCount = useMemo(() => requests.filter((item) => !item.read_at).length, [requests]);
  const visibleItems = useMemo(() => {
    switch (filter) {
      case 'unread':
        return items.filter((item) => item.source === 'request' && !item.read_at);
      case 'activity':
        return items.filter((item) => item.source !== 'request');
      default:
        return items;
    }
  }, [filter, items]);

  const markRead = async (id: string) => {
    setSavingId(id);
    try {
      const { error: updateError } = await supabase
        .from('request_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
      if (updateError) throw updateError;
      setRequests((current) => current.map((item) => (item.id === id ? { ...item, read_at: new Date().toISOString() } : item)));
    } catch (markError: any) {
      console.error('Error marking notification read:', markError);
      setError(markError?.message || 'Could not mark this notification as read.');
    } finally {
      setSavingId(null);
    }
  };

  const visibleRole = profile?.role || 'member';

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Notifications</h1>
            <p className="text-stone-500 text-sm font-light">Request alerts and site activity in one place.</p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-widest border border-stone-200 text-stone-600 bg-white">
            <Mail className="w-3.5 h-3.5" />
            {unreadCount} unread
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => {
            const active = filter === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border transition-colors ${
                  active ? 'bg-primary text-white border-primary' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="p-4 border border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="bg-white border border-stone-200 shadow-sm">
        <div className="p-6 border-b border-stone-100 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-accent" />
            <h2 className="font-serif text-2xl font-bold text-primary">Full Notifications</h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Sparkles className="w-4 h-4 text-accent" />
            {visibleRole === 'admin' ? 'Core admin' : 'Team admin'}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-stone-500 flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading notifications...
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="p-8 text-stone-500">No notifications yet.</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {visibleItems.map((item) => (
              <article key={item.key} className="p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-primary">{item.title}</h3>
                      <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-3 py-1 border border-stone-200 text-stone-500 bg-white">
                        {item.source}
                      </span>
                      <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-3 py-1 border border-stone-200 text-stone-500 bg-white">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-sm text-stone-600 whitespace-pre-wrap">{item.body}</p>
                    <p className="mt-2 text-[11px] text-stone-400 flex items-center gap-2">
                      <Clock3 className="w-3 h-3" />
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      <span className="text-stone-300">-</span>
                      {format(new Date(item.created_at), 'PPP p')}
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    {item.source === 'request' && !item.read_at ? (
                      <span className="inline-flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest bg-primary text-white">
                        New
                      </span>
                    ) : item.source === 'request' ? (
                      <span className="inline-flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest border border-stone-200 text-stone-500">
                        Read
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest border border-stone-200 text-stone-500">
                        Activity
                      </span>
                    )}
                    <Link
                      to={item.path}
                      className="inline-flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest border border-stone-200 text-stone-600 hover:text-primary hover:border-stone-300 transition-colors"
                    >
                      Open
                    </Link>
                    {item.source === 'request' && !item.read_at ? (
                      <button
                        type="button"
                        onClick={() => markRead(item.key.replace('request:', ''))}
                        disabled={savingId === item.key.replace('request:', '')}
                        className="inline-flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest border border-stone-200 text-stone-600 hover:text-primary hover:border-stone-300 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark Read
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
