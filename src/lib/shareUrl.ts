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

export function buildShareUrl(type: ShareContentType, title: string, id: string, slug?: string) {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}/${type}/${slugifyShareTitle(slug || title)}--${encodeURIComponent(id)}`;
}
