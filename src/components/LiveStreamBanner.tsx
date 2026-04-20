import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BellRing, Radio } from 'lucide-react';
import { fetchCurrentLiveStream, fetchLatestLiveAnnouncement, isActiveLiveStream, maybeShowLiveNotification, subscribeToLiveStreamChanges } from '../lib/liveStream';
import type { LiveAnnouncement, LiveStream } from '../types';

export default function LiveStreamBanner() {
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [announcement, setAnnouncement] = useState<LiveAnnouncement | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default',
  );
  const previousStatusRef = useRef<string | null>(null);
  const hasLoadedRef = useRef(false);

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
        console.error('Error loading live banner state:', error);
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
        console.error('Error updating live banner state:', error);
      }
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, []);

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

  const requestBrowserNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  if (loading || !isActiveLiveStream(stream)) {
    return null;
  }

  return (
    <section className="border-b border-rose-200 bg-gradient-to-r from-rose-50 via-white to-amber-50">
      <div className="w-full px-4 sm:px-8 md:px-16 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/20 shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.35em] bg-rose-600 text-white rounded-full">
                Live Now
              </div>
              <h2 className="mt-2 text-lg sm:text-xl font-serif font-bold text-primary">
                {announcement?.title || stream?.title || 'We are live right now'}
              </h2>
              <p className="mt-1 text-sm text-stone-600 max-w-2xl">
                {announcement?.body || stream?.description || 'Join the live service and watch from anywhere.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {notificationPermission !== 'granted' ? (
              <button
                type="button"
                onClick={requestBrowserNotifications}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border border-stone-200 bg-white text-stone-700 hover:border-primary hover:text-primary transition-colors"
              >
                <BellRing className="w-4 h-4" />
                Enable Alerts
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border border-emerald-200 bg-emerald-50 text-emerald-700">
                <BellRing className="w-4 h-4" />
                Alerts On
              </span>
            )}
            <Link
              to="/live"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-widest bg-primary text-white hover:bg-primary/90 transition-colors shadow-lg shadow-primary/10"
            >
              Watch Live
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
