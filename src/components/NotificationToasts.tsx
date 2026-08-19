import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Bell, BookOpen, CalendarDays, Gift, Handshake, Newspaper, X, Headphones } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AppToast, buildBirthdayToast, buildContentToast, toastLabels } from '../lib/notificationBuilders';
import { registerPushNotifications } from '../lib/pushNotifications';

type NotificationContextValue = {
  notify: (toast: Omit<AppToast, 'id'> & { id?: string }) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
}

function ToastCard({ toast, onClose }: { toast: AppToast; onClose: () => void }) {
  const meta = toastLabels[toast.kind];
  const duration = toast.durationMs || 10000;
  const isBirthday = toast.kind === 'birthday';
  const Icon = {
    birthday: Gift,
    event: CalendarDays,
    sermon: Headphones,
    article: Newspaper,
    devotional: BookOpen,
    assignment: Handshake,
  }[toast.kind] || Bell;

  if (isBirthday) {
    return <BirthdayToastCard toast={toast} duration={duration} onClose={onClose} />;
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.96 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="relative w-[min(92vw,24rem)] overflow-hidden border border-accent/25 bg-white shadow-2xl shadow-primary/20"
      role="status"
    >
      <div className="flex items-start gap-4 bg-gradient-to-r from-primary via-primary to-primary/90 p-5 text-white">
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          className="flex h-12 w-12 shrink-0 items-center justify-center bg-white/10 text-white"
          aria-hidden="true"
        >
          <Icon className="h-6 w-6" />
        </motion.div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">{meta.eyebrow}</p>
          <p className="mt-1 font-serif text-xl font-bold leading-tight sm:text-2xl">{toast.title}</p>
        </div>
        <button type="button" onClick={onClose} className="shrink-0 p-1 text-white/70 hover:text-white" aria-label="Close notification">
          <X className="h-4 w-4" />
        </button>
      </div>
      <a href={toast.href || '#'} onClick={(e) => !toast.href && e.preventDefault()} className="block p-5 text-sm leading-relaxed text-stone-600">
        {toast.message}
      </a>
      <motion.div
        className="h-1 bg-accent"
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
      />
    </motion.div>
  );
}

function BirthdayToastCard({ toast, duration, onClose }: { toast: AppToast; duration: number; onClose: () => void }) {
  const [showWish, setShowWish] = useState(false);
  const [progress, setProgress] = useState(100);
  const name = toast.title.replace(/^happy birthday,\s*/i, '').trim();

  useEffect(() => {
    const wishTimer = window.setTimeout(() => setShowWish(true), 800);
    const start = Date.now();
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.max(0, 100 - (elapsed / duration) * 100));
    }, 50);

    return () => {
      window.clearTimeout(wishTimer);
      window.clearInterval(interval);
    };
  }, [duration]);

  return (
    <motion.div layout className="flex w-[min(92vw,32.5rem)] flex-col items-end gap-2" role="status">
      <motion.div
        initial={{ opacity: 0, x: 120 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 120 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="flex items-center gap-3 bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-400 px-5 py-3 text-white shadow-xl"
      >
        <span className="inline-block animate-bounce text-3xl [animation-duration:2.5s]" aria-hidden="true">
          🎂
        </span>
        <span className="text-sm font-semibold tracking-wide">
          HAPPY BIRTHDAY, {name.toUpperCase()}! 🎉
        </span>
        <button type="button" onClick={onClose} className="ml-2 p-1 hover:bg-white/20" aria-label="Close birthday greeting">
          <X size={16} />
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={showWish ? { opacity: 1, y: 0 } : { opacity: 0, y: -12 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="w-full border border-yellow-300 bg-white shadow-lg"
      >
        <div className="flex items-center gap-3 px-5 py-3">
          <span className="text-lg" aria-hidden="true">
            🙏
          </span>
          <div className="flex-1">
            <p className="text-sm leading-5 text-gray-700">{toast.message}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-pink-600">
              ❤️ FROM YOUR CHURCH FAMILY
            </p>
          </div>
        </div>
        <div className="h-1 bg-gray-200">
          <div
            className="h-full bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

function getBirthdayToastSlot(now: Date) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes >= 18 * 60) return 'evening';
  if (minutes >= 12 * 60) return 'midday';
  return 'first-visit';
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [toasts, setToasts] = useState<AppToast[]>([]);

  const showBrowserNotification = useCallback((toast: AppToast) => {
    if (!('Notification' in window)) return;
    const options = {
      body: toast.message,
      data: { url: toast.href || '/' },
    };
    if (Notification.permission === 'granted') {
      new Notification(toast.title, options);
      return;
    }
    if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') new Notification(toast.title, options);
      });
    }
  }, []);

  const notify = useCallback((toast: Omit<AppToast, 'id'> & { id?: string }) => {
    const id = toast.id || `${toast.kind}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const nextToast = { ...toast, id };
    setToasts((current) => {
      if (current.some((item) => item.id === id)) return current;
      showBrowserNotification(nextToast);
      return [...current, nextToast];
    });
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, toast.durationMs || 10000);
  }, [showBrowserNotification]);

  useEffect(() => {
    if (!user?.id) return;
    registerPushNotifications(user.id).catch((error) => console.error('Error registering push notifications:', error));
  }, [user?.id]);

  useEffect(() => {
    if (!user || location.pathname !== '/') return;
    let cancelled = false;
    async function loadBirthday() {
      const today = new Date();
      const { data } = await supabase.from('profiles').select('full_name,birth_month,birth_day').eq('id', user.id).maybeSingle();
      if (cancelled) return;
      const isBirthday = Number((data as any)?.birth_month) === today.getMonth() + 1 && Number((data as any)?.birth_day) === today.getDate();
      const dateKey = today.toISOString().slice(0, 10);
      const slot = getBirthdayToastSlot(today);
      const seenKey = `birthday:${user.id}:${dateKey}:${slot}`;
      if (isBirthday && localStorage.getItem(seenKey) !== 'seen') {
        localStorage.setItem(seenKey, 'seen');
        notify({
          ...buildBirthdayToast((data as any)?.full_name || String(user.email || 'friend').split('@')[0]),
          id: seenKey,
        });
      }
    }
    loadBirthday();
    return () => {
      cancelled = true;
    };
  }, [location.key, location.pathname, notify, user]);

  useEffect(() => {
    let cancelled = false;
    async function loadContent() {
      const seen = new Set(JSON.parse(localStorage.getItem('hopfan_seen_content_toasts') || '[]'));
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [events, sermons, posts, devotionals] = await Promise.all([
        supabase.from('events').select('id,title,created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(1),
        supabase.from('sermons').select('id,title,created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(1),
        supabase.from('posts').select('id,title,slug,created_at').eq('status', 'published').gte('created_at', since).order('created_at', { ascending: false }).limit(1),
        supabase.from('devotionals').select('id,title,created_at').eq('status', 'published').gte('created_at', since).order('created_at', { ascending: false }).limit(1),
      ]);
      if (cancelled) return;
      const candidates = [
        events.data?.[0] && { toast: buildContentToast('event', events.data[0].title, `/events/${events.data[0].id}`), sourceId: events.data[0].id },
        sermons.data?.[0] && { toast: buildContentToast('sermon', sermons.data[0].title, `/sermons/${sermons.data[0].id}`), sourceId: sermons.data[0].id },
        posts.data?.[0] && { toast: buildContentToast('article', posts.data[0].title, `/editorial/${(posts.data[0] as any).slug}`), sourceId: posts.data[0].id },
        devotionals.data?.[0] && { toast: buildContentToast('devotional', devotionals.data[0].title, '/devotionals'), sourceId: devotionals.data[0].id },
      ].filter(Boolean) as Array<{ toast: Omit<AppToast, 'id'>; sourceId: string }>;
      candidates.forEach(({ toast, sourceId }) => {
        const id = `content:${toast.kind}:${sourceId}`;
        if (!seen.has(id)) {
          seen.add(id);
          notify({ ...toast, id });
        }
      });
      localStorage.setItem('hopfan_seen_content_toasts', JSON.stringify(Array.from(seen).slice(-80)));
    }
    loadContent().catch((error) => console.error('Error loading content notifications:', error));
    return () => {
      cancelled = true;
    };
  }, [notify]);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onClose={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} />
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}
