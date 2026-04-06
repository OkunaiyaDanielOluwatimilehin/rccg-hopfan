import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const SOURCE_HTML = path.join(DIST_DIR, 'index.html');

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripText(value = '') {
  return String(value)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[#*_>`[\]()\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function excerpt(value = '', max = 160) {
  const clean = stripText(value);
  if (!clean) return '';
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

function absoluteUrl(siteUrl, value, fallbackPath = '/Rccg_logo.png') {
  const raw = String(value || '').trim();
  const base = siteUrl.replace(/\/+$/, '');
  if (!raw) return `${base}${fallbackPath}`;
  if (/^https?:\/\//i.test(raw)) return raw;
  return new URL(raw.startsWith('/') ? raw : `/${raw}`, base).toString();
}

function normaliseSiteUrl() {
  const raw =
    process.env.SITE_URL?.trim() ||
    process.env.VITE_SITE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://localhost:4173';

  return raw.replace(/\/+$/, '');
}

async function readBaseHtml() {
  try {
    return await fs.readFile(SOURCE_HTML, 'utf8');
  } catch (error) {
    throw new Error(
      `Could not read ${SOURCE_HTML}. Run the Vite build first so the prerender script has a base HTML file.`,
    );
  }
}

function injectMeta(baseHtml, meta) {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const url = escapeHtml(meta.url);
  const image = escapeHtml(meta.image);
  const robots = meta.noIndex ? 'noindex,nofollow' : 'index,follow';
  const type = meta.type || 'website';
  const card = image ? 'summary_large_image' : 'summary';

  const headBlock = `    <!-- PRERENDER_META_START -->
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:type" content="${type}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${image}" />
    <meta name="twitter:card" content="${card}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    <meta name="robots" content="${robots}" />
    <!-- PRERENDER_META_END -->`;

  return baseHtml.replace(
    /    <!-- PRERENDER_META_START -->[\s\S]*?    <!-- PRERENDER_META_END -->/,
    headBlock,
  );
}

async function writeRoute(baseHtml, routePath, meta) {
  const normalized = routePath === '/' ? '/' : `/${routePath.replace(/^\/+/, '').replace(/\/+$/, '')}`;
  const outDir = normalized === '/' ? DIST_DIR : path.join(DIST_DIR, ...normalized.split('/').filter(Boolean));
  const outFile = path.join(outDir, 'index.html');

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outFile, injectMeta(baseHtml, meta), 'utf8');
}

async function fetchRows(client, table, options = {}) {
  try {
    let query = client.from(table).select('*');
    if (options.orderBy) {
      query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending });
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }
    const { data, error } = await query;
    if (error) throw error;
    return Array.isArray(data) ? data : data ? [data] : [];
  } catch {
    return [];
  }
}

async function fetchSingle(client, table) {
  try {
    const { data, error } = await client.from(table).select('*').eq('id', 'site_settings').maybeSingle();
    if (error) throw error;
    return data || null;
  } catch {
    return null;
  }
}

async function main() {
  const baseHtml = await readBaseHtml();
  const siteUrl = normaliseSiteUrl();
  const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim() || process.env.VITE_SUPABASE_ANON_KEY?.trim();

  const client = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

  const [siteSettings, events, posts, sermons, gallery, devotionals] = client
    ? await Promise.all([
        fetchSingle(client, 'site_settings'),
        fetchRows(client, 'events', { orderBy: { column: 'event_date', ascending: true } }),
        fetchRows(client, 'posts', { orderBy: { column: 'published_at', ascending: false } }),
        fetchRows(client, 'sermons', { orderBy: { column: 'sermon_date', ascending: false } }),
        fetchRows(client, 'gallery', { orderBy: { column: 'created_at', ascending: false }, limit: 12 }),
        fetchRows(client, 'devotionals', { orderBy: { column: 'devotional_date', ascending: false }, limit: 12 }),
      ])
    : [null, [], [], [], [], []];

  const defaultImage = absoluteUrl(siteUrl, '', '/Rccg_logo.png');
  const heroImage =
    absoluteUrl(siteUrl, siteSettings?.hero_image_url || siteSettings?.hero_images?.[0] || '', '/Rccg_logo.png') ||
    defaultImage;

  const homeDescription =
    siteSettings?.hero_subtitle ||
    'RCCG HOPFAN is a Christ-centered church community sharing sermons, events, devotionals, gallery highlights, and editorial articles.';

  const firstEvent = events[0];
  const firstPost = posts.find((post) => post.status === 'published') || posts[0];
  const firstSermon = sermons[0];
  const firstGallery = gallery[0];
  const latestDevotional = devotionals[0];

  const routes = [
    {
      path: '/',
      title: 'RCCG HOPFAN | Home',
      description: homeDescription,
      image: heroImage,
      type: 'website',
    },
    {
      path: '/about',
      title: 'About | RCCG HOPFAN',
      description: 'Learn more about RCCG HOPFAN, our mission, and what we believe as a church community.',
      image: heroImage,
      type: 'website',
    },
    {
      path: '/gallery',
      title: 'Gallery | RCCG HOPFAN',
      description: 'Browse photos and highlights from church services, events, and ministry moments.',
      image: absoluteUrl(siteUrl, firstGallery?.image_url || '', '/Rccg_logo.png'),
      type: 'website',
    },
    {
      path: '/serve',
      title: 'Serve | RCCG HOPFAN',
      description: 'Discover opportunities to serve and get involved in ministry at RCCG HOPFAN.',
      image: heroImage,
      type: 'website',
    },
    {
      path: '/contact',
      title: 'Contact | RCCG HOPFAN',
      description: 'Get in touch with RCCG HOPFAN for prayer, support, directions, or ministry questions.',
      image: heroImage,
      type: 'website',
    },
    {
      path: '/sermons',
      title: 'Sermons | RCCG HOPFAN',
      description: 'Listen to and watch recent sermons from RCCG HOPFAN.',
      image: absoluteUrl(siteUrl, firstSermon?.thumbnail_url || '', '/Rccg_logo.png'),
      type: 'website',
    },
    {
      path: '/editorial',
      title: 'Editorial | RCCG HOPFAN',
      description: 'Read articles, news, and reflections from RCCG HOPFAN.',
      image: absoluteUrl(siteUrl, firstPost?.image_url || '', '/Rccg_logo.png'),
      type: 'website',
    },
    {
      path: '/devotionals',
      title: 'Devotionals | RCCG HOPFAN',
      description: 'Daily devotional content and spiritual encouragement from RCCG HOPFAN.',
      image: absoluteUrl(siteUrl, latestDevotional?.image_url || '', '/Rccg_logo.png'),
      type: 'article',
    },
    {
      path: '/events',
      title: 'Events | RCCG HOPFAN',
      description: 'Browse upcoming church events, mark interest, and share event details with others.',
      image: absoluteUrl(siteUrl, firstEvent?.image_url || '', '/Rccg_logo.png'),
      type: 'website',
    },
    {
      path: '/login',
      title: 'Login | RCCG HOPFAN',
      description: 'Sign in to your RCCG HOPFAN account.',
      image: defaultImage,
      type: 'website',
      noIndex: true,
    },
    {
      path: '/register',
      title: 'Register | RCCG HOPFAN',
      description: 'Create a new RCCG HOPFAN account.',
      image: defaultImage,
      type: 'website',
      noIndex: true,
    },
    {
      path: '/profile',
      title: 'Profile | RCCG HOPFAN',
      description: 'Manage your RCCG HOPFAN profile and account details.',
      image: defaultImage,
      type: 'website',
      noIndex: true,
    },
    {
      path: '/playlists',
      title: 'Playlists | RCCG HOPFAN',
      description: 'Manage your sermon playlists and saved collections.',
      image: defaultImage,
      type: 'website',
      noIndex: true,
    },
    {
      path: '/admin/login',
      title: 'Admin Login | RCCG HOPFAN',
      description: 'Admin access for RCCG HOPFAN.',
      image: defaultImage,
      type: 'website',
      noIndex: true,
    },
    {
      path: '/admin/register',
      title: 'Admin Register | RCCG HOPFAN',
      description: 'Create an admin account for RCCG HOPFAN.',
      image: defaultImage,
      type: 'website',
      noIndex: true,
    },
    {
      path: '/admin',
      title: 'Admin Dashboard | RCCG HOPFAN',
      description: 'Manage content, users, and site settings for RCCG HOPFAN.',
      image: defaultImage,
      type: 'website',
      noIndex: true,
    },
  ];

  for (const route of routes) {
    await writeRoute(baseHtml, route.path, {
      title: route.title,
      description: route.description,
      image: route.image,
      url: new URL(route.path, siteUrl).toString(),
      type: route.type,
      noIndex: route.noIndex || false,
    });
  }

  for (const event of events) {
    await writeRoute(baseHtml, `/events/${event.id}`, {
      title: `${event.title} | Events | RCCG HOPFAN`,
      description: event.description || `${event.title} happening on ${event.event_date}.`,
      image: absoluteUrl(siteUrl, event.image_url || '', '/Rccg_logo.png'),
      url: new URL(`/events/${event.id}`, siteUrl).toString(),
      type: 'article',
    });
  }

  for (const post of posts.filter((item) => item.status === 'published')) {
    const previewDescription = post.summary || excerpt(post.content, 180) || `${post.title} from RCCG HOPFAN.`;
    await writeRoute(baseHtml, `/editorial/${post.slug}`, {
      title: `${post.title} | Editorial | RCCG HOPFAN`,
      description: previewDescription,
      image: absoluteUrl(siteUrl, post.image_url || '', '/Rccg_logo.png'),
      url: new URL(`/editorial/${post.slug}`, siteUrl).toString(),
      type: 'article',
    });
  }

  for (const sermon of sermons) {
    const previewDescription = sermon.description || excerpt(sermon.content, 180) || `${sermon.title} by ${sermon.speaker_name}.`;
    await writeRoute(baseHtml, `/sermons/${sermon.id}`, {
      title: `${sermon.title} | Sermons | RCCG HOPFAN`,
      description: previewDescription,
      image: absoluteUrl(siteUrl, sermon.thumbnail_url || '', '/Rccg_logo.png'),
      url: new URL(`/sermons/${sermon.id}`, siteUrl).toString(),
      type: 'video.other',
    });
  }

  console.log('Prerender complete.');
}

main().catch((error) => {
  console.error('Prerender failed:', error);
  process.exitCode = 1;
});
