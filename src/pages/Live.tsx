import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, BellRing, Clock3, ExternalLink, Radio, Tv2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fetchCurrentLiveStream, fetchLatestLiveAnnouncement, getViewerPlaybackUrl, isActiveLiveStream, maybeShowLiveNotification, subscribeToLiveStreamChanges } from '../lib/liveStream';
import type { LiveAnnouncement, LiveStream } from '../types';
import Seo from '../components/Seo';
import LiveStreamPlayer from '../components/LiveStreamPlayer';

export default function Live() {
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [announcement, setAnnouncement] = useState<LiveAnnouncement | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default',
  );
  const previousStatusRef = React.useRef<string | null>(null);
  const hasLoadedRef = React.useRef(false);

  const playbackUrl = useMemo(() => getViewerPlaybackUrl(stream), [stream]);

  useEffect(() => {
    let disposed = false;

    const load = async () => {
      setLoading(true);
      try {
        const [streamRes, announcementRes] = await Promise.all([fetchCurrentLiveStream(), fetchLatestLiveAnnouncement()]);
        if (disposed) return;
        setStream((streamRes.data as LiveStream | null) || null);
        setAnnouncement((announcementRes.data as LiveAnnouncement | null) || null);
        previousStatusRef.current = ((streamRes.data as LiveStream | null) || null)?.status || null;
        hasLoadedRef.current = true;
      } catch (error) {
        console.error('Error loading live page:', error);
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    load();

    const unsubscribe = subscribeToLiveStreamChanges(async () => {
      try {
        const [streamRes, announcementRes] = await Promise.all([fetchCurrentLiveStream(), fetchLatestLiveAnnouncement()]);
        if (disposed) return;
        const nextStream = (streamRes.data as LiveStream | null) || null;
        const nextAnnouncement = (announcementRes.data as LiveAnnouncement | null) || null;

        setStream(nextStream);
        setAnnouncement(nextAnnouncement);
        setLoading(false);
      } catch (error) {
        console.error('Error updating live page:', error);
      }
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, []);

  const requestBrowserNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  useEffect(() => {
    if (!stream) return;
    if (!hasLoadedRef.current) {
      return;
    }

    const wasActive = previousStatusRef.current ? ['live', 'starting'].includes(previousStatusRef.current) : false;
    const isNowActive = isActiveLiveStream(stream);
    if (!wasActive && isNowActive) {
      maybeShowLiveNotification(announcement, stream, '/live');
    }
    previousStatusRef.current = stream.status;
  }, [stream, announcement]);

  const live = isActiveLiveStream(stream);
  const title = announcement?.title || stream?.title || 'Live Stream';
  const body = announcement?.body || stream?.description || 'Our service live stream will appear here when we are broadcasting.';
  const statusLabel = stream?.status === 'starting' ? 'Starting Soon' : live ? 'Live Now' : 'Offline';

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-white to-amber-50">
      <Seo title="Live Stream" description="Watch our live service and receive live updates when RCCG HOPFAN goes on air." />

      <section className="relative overflow-hidden border-b border-stone-200 bg-primary text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(214,170,59,0.18),transparent_45%),radial-gradient(circle_at_left,rgba(255,255,255,0.08),transparent_35%)]" />
        <div className="w-full px-4 sm:px-8 md:px-16 py-16 sm:py-20 lg:py-24 relative z-10">
          <div className="max-w-5xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.4em] bg-white/10 border border-white/10 rounded-full">
              <Radio className="w-3.5 h-3.5" />
              Stream Center
            </div>
            <h1 className="mt-6 text-5xl sm:text-6xl lg:text-8xl font-serif font-bold leading-[0.9] tracking-tight">
              Watch the <span className="text-accent italic">Live</span> Service
            </h1>
            <p className="mt-6 max-w-3xl text-lg sm:text-xl text-stone-200 leading-relaxed font-light">
              {live
                ? 'Join the live broadcast below. You can also turn on browser alerts so you get notified the moment the stream starts.'
                : 'This page is ready for the next broadcast. When the stream goes live, the player and notifications update automatically.'}
            </p>
          </div>
        </div>
      </section>

      <section className="w-full px-4 sm:px-8 md:px-16 py-12 sm:py-16 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-stone-200 shadow-[0_20px_80px_rgba(15,23,42,0.08)] overflow-hidden"
          >
            <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-stone-100">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`inline-flex items-center gap-2 px-3 py-1 text-[10px] font-bold uppercase tracking-widest border ${live ? 'bg-rose-600 text-white border-rose-600' : 'bg-stone-100 text-stone-600 border-stone-200'}`}>
                  <Radio className="w-3.5 h-3.5" />
                  {statusLabel}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-primary truncate">{title}</p>
                  {stream?.started_at ? (
                    <p className="text-xs text-stone-500 flex items-center gap-1">
                      <Clock3 className="w-3 h-3" />
                      Started {formatDistanceToNow(new Date(stream.started_at), { addSuffix: true })}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {notificationPermission !== 'granted' ? (
                  <button
                    type="button"
                    onClick={requestBrowserNotifications}
                    className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-widest border border-stone-200 text-stone-600 hover:border-primary hover:text-primary transition-colors"
                  >
                    <BellRing className="w-4 h-4" />
                    Alerts
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-widest border border-emerald-200 bg-emerald-50 text-emerald-700">
                    <BellRing className="w-4 h-4" />
                    Alerts On
                  </span>
                )}
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-widest border border-stone-200 text-stone-600 hover:border-primary hover:text-primary transition-colors"
                >
                  Home
                </Link>
              </div>
            </div>

            <div className="bg-stone-950">
              {live && playbackUrl ? (
                <LiveStreamPlayer
                  playbackUrl={playbackUrl}
                  title={title}
                  muted={true}
                  className="w-full aspect-video"
                />
              ) : (
                <div className="min-h-[320px] sm:min-h-[480px] flex flex-col items-center justify-center text-center px-6 py-16 text-white/85">
                  <Tv2 className="w-14 h-14 text-accent mb-5" />
                  <h2 className="text-2xl font-serif font-bold text-white">We are not live yet</h2>
                  <p className="mt-3 max-w-xl text-sm sm:text-base text-white/70 leading-relaxed">
                    {body}
                  </p>
                  <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Link
                      to="/events"
                      className="inline-flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest bg-white text-primary hover:bg-stone-100 transition-colors"
                    >
                      View Events
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      to="/contact"
                      className="inline-flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest border border-white/20 text-white hover:bg-white/10 transition-colors"
                    >
                      Contact Church
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="space-y-6"
          >
            <div className="bg-white border border-stone-200 p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-stone-400">About This Stream</p>
              <h2 className="mt-3 text-2xl font-serif font-bold text-primary">{title}</h2>
              <p className="mt-4 text-sm leading-relaxed text-stone-600">{body}</p>
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-stone-500">State</span>
                  <span className={`font-bold uppercase tracking-widest ${live ? 'text-rose-600' : 'text-stone-600'}`}>{statusLabel}</span>
                </div>
                {stream?.scheduled_start_at ? (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-stone-500">Scheduled</span>
                    <span className="font-medium text-stone-700">{new Date(stream.scheduled_start_at).toLocaleString()}</span>
                  </div>
                ) : null}
                {playbackUrl ? (
                  <a
                    href={playbackUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary hover:text-accent transition-colors"
                  >
                    Open live playback
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : null}
              </div>
            </div>

            <div className="bg-primary text-white p-6 shadow-lg shadow-primary/10">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-white/50">Notifications</p>
              <h3 className="mt-3 text-xl font-serif font-bold">{notificationPermission === 'granted' ? 'You are subscribed' : 'Turn on live alerts'}</h3>
              <p className="mt-3 text-sm leading-relaxed text-stone-200">
                Enable browser alerts so we can notify you the moment the live service starts or ends while you have the site open.
              </p>
              {notificationPermission !== 'granted' ? (
                <button
                  type="button"
                  onClick={requestBrowserNotifications}
                  className="mt-5 inline-flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-widest bg-white text-primary hover:bg-stone-100 transition-colors"
                >
                  Enable Browser Alerts
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : null}
            </div>
          </motion.aside>
        </div>
      </section>
    </div>
  );
}
