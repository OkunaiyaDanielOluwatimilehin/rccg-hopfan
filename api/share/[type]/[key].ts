import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const db = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
const tables: Record<string, string> = { event: 'events', article: 'posts', sermon: 'sermons', devotional: 'devotionals', form: 'custom_forms' };
const esc = (s: unknown) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const first = (value: unknown) => Array.isArray(value) ? value[0] : value;

function resolveShareOrigin(headers: Record<string, string | string[] | undefined> = {}) {
  const host = String(first(headers['x-forwarded-host']) || first(headers.host) || 'rccg-hopfan.vercel.app').split(',')[0].trim();
  const protocol = String(first(headers['x-forwarded-proto']) || 'https').split(',')[0].trim();
  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return 'https://rccg-hopfan.vercel.app';
  }
}

function toAbsoluteUrl(imageUrl: unknown, origin: string, version: string) {
  const fallback = new URL('/Rccg_logo.png', origin);
  if (!imageUrl) return fallback.toString();
  try {
    const image = new URL(String(imageUrl), origin);
    if (!['http:', 'https:'].includes(image.protocol)) return fallback.toString();
    if (version) image.searchParams.set('share', version);
    return image.toString();
  } catch {
    return fallback.toString();
  }
}

export default async function handler(req: any, res: any) {
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).send('Method not allowed.');
  const type = String(first(req.query?.type || req.params?.type) || '');
  const raw = String(first(req.query?.key || req.params?.key) || '');
  const id = raw.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)?.[1] || raw.match(/--([^/]+)$/)?.[1];
  if (!db) return res.status(500).send('Share previews are not configured.');
  if (!tables[type] || !id) return res.status(404).send('Content not found.');

  try {
    const { data: row, error } = await db.from(tables[type]).select('*').eq('id', id).maybeSingle();
    const published = row?.published_at || (type === 'sermon' ? row?.sermon_date : null);
    if (error || !row || row.status === 'draft' || (published && new Date(published) > new Date())) return res.status(404).send('Content not found.');
    const origin = resolveShareOrigin(req.headers);
    const title = String(row.title || '');
    if (!title) return res.status(404).send('Content not found.');
    const description = String(row.description || row.summary || row.speaker_name || row.content || `Complete ${title} from RCCG HOPFAN.`).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 260);
    const imageSource = type === 'sermon' ? row.thumbnail_url : type === 'form' ? row.header_image_url : row.image_url;
    const version = String(first(req.query?.v) || '');
    const image = toAbsoluteUrl(imageSource, origin, version);
    const destination = type === 'sermon' ? `/sermons/${encodeURIComponent(row.id)}` : type === 'article' ? `/editorial/${encodeURIComponent(row.slug)}` : type === 'event' ? `/events/${encodeURIComponent(row.id)}` : type === 'form' ? `/forms/${encodeURIComponent(row.slug)}` : '/devotionals';
    const to = new URL(destination, origin).toString();
    const share = `${origin}/api/share/${type}/${encodeURIComponent(raw)}${version ? `?v=${encodeURIComponent(version)}` : ''}`;
    const fullTitle = `${title} | RCCG HOPFAN`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    return res.status(200).send(`<!doctype html><head><title>${esc(fullTitle)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(to)}"><meta property="og:title" content="${esc(fullTitle)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="article"><meta property="og:url" content="${esc(share)}"><meta property="og:image" content="${esc(image)}"><meta property="og:image:alt" content="${esc(title)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(fullTitle)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${esc(image)}"><meta http-equiv="refresh" content="0;url=${esc(to)}"></head><body></body>`);
  } catch (error) {
    console.error('Share preview failed', { type, id, error });
    return res.status(500).send('Share preview temporarily unavailable.');
  }
}
