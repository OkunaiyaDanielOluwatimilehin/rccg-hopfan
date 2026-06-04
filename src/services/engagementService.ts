import { supabase } from '../lib/supabase';

const GUEST_SESSION_KEY = 'hopfan_guest_session_id';
const GUEST_VIEW_COUNT_KEY = 'hopfan_viewed_content_count';
const GUEST_RECENT_KEY = 'hopfan_recently_viewed';
const GUEST_PROMPT_DISMISSED_KEY = 'hopfan_account_prompt_dismissed';

type ContentType = 'sermon' | 'audio' | 'devotional' | 'post' | 'event' | 'series' | 'podcast' | 'resource';
type ActivityAction = 'view' | 'play' | 'complete' | 'download' | 'save' | 'like' | 'comment' | 'note';

export function getGuestSessionId() {
  if (typeof window === 'undefined') return null;
  const existing = window.localStorage.getItem(GUEST_SESSION_KEY);
  if (existing) return existing;
  const next = crypto.randomUUID();
  window.localStorage.setItem(GUEST_SESSION_KEY, next);
  return next;
}

export function shouldShowAccountPrompt() {
  if (typeof window === 'undefined') return false;
  if (window.localStorage.getItem(GUEST_PROMPT_DISMISSED_KEY) === 'true') return false;
  return Number(window.localStorage.getItem(GUEST_VIEW_COUNT_KEY) || '0') >= 3;
}

export function dismissAccountPrompt() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(GUEST_PROMPT_DISMISSED_KEY, 'true');
}

export async function recordContentActivity(input: {
  userId?: string | null;
  contentType: ContentType;
  contentId: string;
  action: ActivityAction;
  durationSeconds?: number;
  completionPercentage?: number;
  metadata?: Record<string, unknown>;
}) {
  const guestSessionId = input.userId ? null : getGuestSessionId();
  const payload = {
    user_id: input.userId || null,
    guest_session_id: guestSessionId,
    content_type: input.contentType,
    content_id: input.contentId,
    action: input.action,
    duration_seconds: input.durationSeconds || 0,
    completion_percentage: input.completionPercentage || 0,
    metadata: input.metadata || {},
  };

  const { error } = await supabase.from('content_activity').insert(payload);
  if (error) console.warn('Content activity not recorded:', error.message);

  if (!input.userId && input.action === 'view' && typeof window !== 'undefined') {
    const count = Number(window.localStorage.getItem(GUEST_VIEW_COUNT_KEY) || '0') + 1;
    window.localStorage.setItem(GUEST_VIEW_COUNT_KEY, String(count));
    const recent = JSON.parse(window.localStorage.getItem(GUEST_RECENT_KEY) || '[]') as unknown[];
    window.localStorage.setItem(GUEST_RECENT_KEY, JSON.stringify([{ ...payload, created_at: new Date().toISOString() }, ...recent].slice(0, 20)));
  }
}

export async function upsertWatchProgress(input: {
  userId: string;
  contentType: Exclude<ContentType, 'resource'>;
  contentId: string;
  playbackPositionSeconds: number;
  durationSeconds?: number;
}) {
  const duration = input.durationSeconds || 0;
  const completion = duration > 0 ? Math.min(100, Math.round((input.playbackPositionSeconds / duration) * 10000) / 100) : 0;
  const { error } = await supabase.from('watch_progress').upsert(
    {
      user_id: input.userId,
      content_type: input.contentType,
      content_id: input.contentId,
      playback_position_seconds: Math.max(0, Math.floor(input.playbackPositionSeconds)),
      duration_seconds: Math.max(0, Math.floor(duration)),
      completion_percentage: completion,
      completed: completion >= 90,
      last_viewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,content_type,content_id' },
  );
  if (error) console.warn('Watch progress not saved:', error.message);
}

export async function recordDownload(userId: string, contentType: ContentType, contentId: string, resourceUrl: string, resourceType = 'file') {
  const { error } = await supabase.from('content_downloads').insert({
    user_id: userId,
    content_type: contentType,
    content_id: contentId,
    resource_url: resourceUrl,
    resource_type: resourceType,
  });
  if (error) console.warn('Download not recorded:', error.message);
}
