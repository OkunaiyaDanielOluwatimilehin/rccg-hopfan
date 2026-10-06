import { createClient } from '@supabase/supabase-js';
import { renderContentShareHtml, ShareContentType } from './contentShareHtml';
import { resolveShareOrigin, toAbsoluteUrl } from './shareUrl';

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

const tableByType = {
  event: 'events',
  article: 'posts',
  sermon: 'sermons',
  devotional: 'devotionals',
} as const;

export function createContentShareHandler(forcedType?: ShareContentType) {
  return async function handler(req: any, res: any) {
    if (req.method && req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).send('Method not allowed.');
    if (!supabase) return res.status(500).send('Share previews are not configured.');

    const typeValue = forcedType ?? req.params?.type ?? req.query?.type;
    const keyValue = req.params?.key ?? req.query?.key;
    const type = String(Array.isArray(typeValue) ? typeValue[0] : typeValue) as ShareContentType;
    const key = String(Array.isArray(keyValue) ? keyValue[0] : keyValue);
    if (!Object.hasOwn(tableByType, type)) return res.status(404).send('Content not found.');
    const id = key.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)?.[1]
      || key.match(/--([^/]+)$/)?.[1];
    if (!id) return res.status(404).send('Content not found.');

    const { data: row, error } = await supabase.from(tableByType[type]).select('*').eq('id', id).maybeSingle();
    const publishDate = row?.published_at || (type === 'sermon' ? row?.sermon_date : null);
    if (error || !row || row.status === 'draft' || (publishDate && new Date(publishDate) > new Date())) {
      return res.status(404).send('Content not found.');
    }

    const title = String(row.title || '');
    if (!title) return res.status(404).send('Content not found.');
    const origin = resolveShareOrigin(req.headers);
    const destination = type === 'event'
      ? `/events/${encodeURIComponent(row.id)}`
      : type === 'article'
        ? `/editorial/${encodeURIComponent(row.slug)}`
        : type === 'sermon'
          ? `/sermons/${encodeURIComponent(row.id)}`
          : `/devotionals?date=${encodeURIComponent(row.devotional_date || row.date || String(row.published_at || '').slice(0, 10))}`;
    const description = type === 'article'
      ? row.summary || row.byline || row.content
      : type === 'sermon'
        ? row.description || row.speaker_name || row.content
        : type === 'devotional'
          ? row.scripture_reference ? `${row.scripture_reference} ${row.content || ''}` : row.content
          : row.description;
    const image = type === 'article' ? row.image_url : type === 'sermon' ? row.thumbnail_url : row.image_url;
    const version = String(req.query?.v || '');
    const sharePath = `/${type}/${key}${version ? `?v=${encodeURIComponent(version)}` : ''}`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    return res.status(200).send(renderContentShareHtml({ id: row.id, title, description, image: toAbsoluteUrl(image, origin, version), destination, type }, origin, sharePath, version));
  };
}
