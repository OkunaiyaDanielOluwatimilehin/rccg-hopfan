import { createClient } from '@supabase/supabase-js';
import { buildAnalyticsPayload } from '../../src/lib/analytics';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

export default async function handler(req: any, res: any) {
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
    const [viewsRes, downloadsRes, watchRes] = await Promise.all([
      supabaseAdmin
        .from('content_activity')
        .select('id,created_at')
        .eq('action', 'view')
        .gte('created_at', since),
      supabaseAdmin
        .from('content_downloads')
        .select('id,created_at')
        .gte('created_at', since),
      supabaseAdmin
        .from('watch_progress')
        .select('duration_seconds,completion_percentage,last_viewed_at')
        .gte('last_viewed_at', since),
    ]);

    const firstError = viewsRes.error || downloadsRes.error || watchRes.error;
    if (firstError) throw firstError;

    res.status(200).json(buildAnalyticsPayload({
      days,
      views: viewsRes.data || [],
      downloads: downloadsRes.data || [],
      watchRows: watchRes.data || [],
    }));
  } catch (error: any) {
    console.error('Error loading analytics:', error);
    res.status(500).json({ error: error?.message || 'Failed to load analytics data' });
  }
}
