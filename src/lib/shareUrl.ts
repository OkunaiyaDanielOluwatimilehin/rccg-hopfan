export type ShareContentType = 'event' | 'article' | 'sermon' | 'devotional';

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

export function buildShareUrl(type: ShareContentType, title: string, id: string, slug?: string, imageUrl?: string) {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const version = imageVersion(imageUrl);
  const query = version ? `?v=${version}` : '';
  return `${origin}/${type}/${slugifyShareTitle(slug || title)}--${encodeURIComponent(id)}${query}`;
}
