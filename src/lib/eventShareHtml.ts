type ShareEvent = {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  status?: string | null;
  published_at?: string | null;
};

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export function renderEventShareHtml(event: ShareEvent, origin: string) {
  const title = `${event.title} | RCCG HOPFAN`;
  const description = (event.description || `Event details for ${event.title}.`).slice(0, 260);
  const url = new URL(`/events/${encodeURIComponent(event.id)}`, origin).toString();
  const image = new URL(event.image_url || '/Rccg_logo.png', origin).toString();
  const destination = JSON.stringify(`/events/${encodeURIComponent(event.id)}`).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(url)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(url)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:image:alt" content="${escapeHtml(event.title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
</head>
<body>
<p>Opening <a href="${escapeHtml(url)}">${escapeHtml(event.title)}</a>…</p>
<script>window.location.replace(${destination});</script>
</body>
</html>`;
}
