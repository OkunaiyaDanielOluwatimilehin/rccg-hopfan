import { createClient } from '@supabase/supabase-js';
import { buildAnalyticsPayload } from '../../src/lib/analytics';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

function isMissingRelationError(error: any) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || message.includes('does not exist') || message.includes('could not find the table');
}

async function readOptionalRows<T>(query: PromiseLike<{ data: T[] | null; error: any }>, label: string) {
  const { data, error } = await query;
  if (!error) return data || [];
  if (isMissingRelationError(error)) {
    console.warn(`Analytics source unavailable (${label}):`, error.message);
    return [];
  }
  throw error;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  if (!supabaseAdmin) {
    res.status(500).json({ error: 'Supabase service role key is not configured.' });
    return;
  }

  const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Missing authorization token.' });
    return;
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    res.status(401).json({ error: 'Invalid session.' });
    return;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id,role')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required.' });
    return;
  }

  const daysRaw = Number(req.query.days || 7);
  const days = [7, 30, 90].includes(daysRaw) ? daysRaw : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    const [views, downloads, watchRows] = await Promise.all([
      readOptionalRows(
        supabaseAdmin
        .from('content_activity')
        .select('id,created_at')
        .eq('action', 'view')
        .gte('created_at', since),
        'content_activity',
      ),
      readOptionalRows(
        supabaseAdmin
        .from('content_downloads')
        .select('id,created_at')
        .gte('created_at', since),
        'content_downloads',
      ),
      readOptionalRows(
        supabaseAdmin
        .from('watch_progress')
        .select('duration_seconds,completion_percentage,last_viewed_at')
        .gte('last_viewed_at', since),
        'watch_progress',
      ),
    ]);

    res.status(200).json(buildAnalyticsPayload({
      days,
      views,
      downloads,
      watchRows,
    }));
  } catch (error: any) {
    console.error('Error loading analytics:', error);
    res.status(500).json({ error: error?.message || 'Failed to load analytics data' });
  }
}
