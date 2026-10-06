export type ShareContentType = 'event' | 'article' | 'sermon' | 'devotional' | 'form';

export function slugifyShareTitle(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'content';
}

function imageVersion(imageUrl?: string) {
  if (!imageUrl) return '';
  let hash = 2166136261;
  for (let index = 0; index < imageUrl.length; index += 1) {
    hash ^= imageUrl.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function resolveShareOrigin(headers?: Record<string, string | string[] | undefined>) {
  const forwardedHost = String(headers?.['x-forwarded-host'] || headers?.host || '').split(',')[0].trim();
  const host = forwardedHost || 'rccg-hopfan.vercel.app';
  const forwardedProto = String(headers?.['x-forwarded-proto'] || headers?.protocol || '').split(',')[0].trim();
  const protocol = forwardedProto || 'https';
  const normalized = /^https?:\/\//i.test(protocol) ? protocol : `${protocol}://`;
  try {
    return new URL(normalized === 'https://' ? `https://${host}` : normalized.includes('://') ? `${normalized}${host}` : `${protocol}://${host}`).toString().replace(/\/$/, '');
  } catch {
    return 'https://rccg-hopfan.vercel.app';
  }
}

export function toAbsoluteUrl(imageUrl: string | null | undefined, origin: string, version?: string) {
  const fallback = new URL('/Rccg_logo.png', origin).toString();
  if (!imageUrl) return fallback;
  try {
    const candidate = new URL(imageUrl, origin);
    if (!['http:', 'https:'].includes(candidate.protocol)) return fallback;
    if (version) candidate.searchParams.set('share', version);
    return candidate.toString();
  } catch {
    return fallback;
  }
}

export function buildShareUrl(type: ShareContentType, title: string, id: string, slug?: string, imageUrl?: string) {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const version = imageVersion(imageUrl);
  const query = version ? `?v=${version}` : '';
  return `${origin}/api/share/${type}/${slugifyShareTitle(slug || title)}--${encodeURIComponent(id)}${query}`;
}
