import { supabase } from './supabase';
import type { LiveAnnouncement, LiveStream } from '../types';

const ACTIVE_STATUSES = ['live', 'starting'] as const;

export function buildCloudflarePlaybackUrls(customerCode: string, uid: string) {
  const code = customerCode.trim();
  const cleanUid = uid.trim();
  const base = `https://customer-${code}.cloudflarestream.com/${cleanUid}`;

  return {
    embedUrl: `${base}/iframe`,
    hlsUrl: `${base}/manifest/video.m3u8`,
    dashUrl: `${base}/manifest/video.mpd`,
    lifecycleUrl: `${base}/lifecycle`,
  };
}

export function getViewerPlaybackUrl(stream?: LiveStream | null) {
  return stream?.webrtc_playback_url || stream?.playback_embed_url || stream?.playback_hls_url || stream?.playback_dash_url || null;
}

export function getPublisherUrl(stream?: LiveStream | null) {
  return stream?.webrtc_publish_url || null;
}

export function isActiveLiveStream(stream?: LiveStream | null) {
  return Boolean(stream && ACTIVE_STATUSES.includes(stream.status as (typeof ACTIVE_STATUSES)[number]));
}

export async function fetchCurrentLiveStream() {
  return supabase
    .from('streams')
    .select('*')
    .in('status', [...ACTIVE_STATUSES])
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function fetchLatestLiveAnnouncement() {
  return supabase
    .from('live_announcements')
    .select('*')
    .eq('status', 'live')
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}

export function subscribeToLiveStreamChanges(onChange: () => void) {
  const channel = supabase
    .channel('public-streams-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'streams' }, () => onChange())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'live_announcements' }, () => onChange())
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function maybeShowLiveNotification(
  announcement: LiveAnnouncement | null | undefined,
  stream?: LiveStream | null,
  targetUrl?: string,
) {
  if (typeof window === 'undefined' || !announcement || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const notification = new Notification(announcement.title || stream?.title || 'We are live', {
    body: announcement.body || stream?.description || 'Tap to watch the live stream.',
    tag: `live-stream:${stream?.id || announcement.stream_id || 'default'}`,
  });

  if (targetUrl) {
    notification.onclick = () => {
      window.focus();
      window.location.href = targetUrl;
    };
  }
}
