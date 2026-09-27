export type ShareContentType = 'event' | 'article' | 'sermon' | 'devotional';

type ShareContent = {
  id: string;
  title: string;
  description?: string | null;
  image?: string | null;
  destination: string;
  type: ShareContentType;
};

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export function renderContentShareHtml(content: ShareContent, origin: string, sharePath: string, imageVersion = '') {
  const title = `${content.title} | RCCG HOPFAN`;
  const description = String(content.description || `Read ${content.title} from RCCG HOPFAN.`)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 260);
  const url = new URL(content.destination, origin).toString();
  const shareUrl = new URL(sharePath, origin).toString();
  let image = new URL('/Rccg_logo.png', origin).toString();
  try {
    const candidate = new URL(content.image || '', origin);
    if (candidate.protocol === 'https:' || candidate.protocol === 'http:') {
      if (imageVersion) candidate.searchParams.set('share', imageVersion);
      image = candidate.toString();
    }
  } catch {
    // Use site logo when content has no valid public image URL.
  }
  const destination = JSON.stringify(url).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(url)}">
<meta property="og:type" content="${content.type === 'article' ? 'article' : 'website'}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(shareUrl)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:image:alt" content="${escapeHtml(content.title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
<meta http-equiv="refresh" content="0;url=${escapeHtml(url)}">
</head>
<body><p>Opening <a href="${escapeHtml(url)}">${escapeHtml(content.title)}</a>...</p>
<script>window.location.replace(${destination});</script>
</body>
</html>`;
}
