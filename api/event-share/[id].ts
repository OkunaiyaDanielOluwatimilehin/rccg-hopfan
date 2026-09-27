import { createClient } from '@supabase/supabase-js';
import { renderEventShareHtml } from '../../src/lib/eventShareHtml';

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req: any, res: any) {
  if (req.method && req.method !== 'GET') {
    res.status(405).send('Method not allowed.');
    return;
  }
  if (!supabase) {
    res.status(500).send('Event previews are not configured.');
    return;
  }

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const { data: event, error } = await supabase.from('events').select('id,title,description,image_url,status,published_at').eq('id', id).maybeSingle();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const origin = host ? `${protocol}://${host}` : 'https://rccghopfan.org';

  if (error || !event || event.status === 'draft' || (event.published_at && new Date(event.published_at) > new Date())) {
    res.status(404).send('Event not found.');
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.status(200).send(renderEventShareHtml(event, origin));
}
