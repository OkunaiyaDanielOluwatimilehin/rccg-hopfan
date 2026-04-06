import { useEffect } from 'react';

type SeoProps = {
  title: string;
  description: string;
  image?: string;
  path?: string;
  type?: 'website' | 'article' | 'video.other';
  noIndex?: boolean;
};

function upsertMeta(selector: string, key: string, value: string) {
  let tag = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (!tag) {
    tag = document.createElement(selector.startsWith('link') ? 'link' : 'meta') as HTMLMetaElement | HTMLLinkElement;
    if (selector.startsWith('meta[property=')) {
      const property = selector.match(/meta\[property='([^']+)'\]/)?.[1];
      if (property) (tag as HTMLMetaElement).setAttribute('property', property);
    } else if (selector.startsWith('meta[name=')) {
      const name = selector.match(/meta\[name='([^']+)'\]/)?.[1];
      if (name) (tag as HTMLMetaElement).setAttribute('name', name);
    } else if (selector === "link[rel='canonical']") {
      (tag as HTMLLinkElement).setAttribute('rel', 'canonical');
    }
    document.head.appendChild(tag);
  }

  if (tag instanceof HTMLLinkElement) {
    tag.setAttribute(key, value);
  } else {
    tag.setAttribute(key, value);
  }
}

export default function Seo({ title, description, image, path, type = 'website', noIndex = false }: SeoProps) {
  useEffect(() => {
    const origin = window.location.origin;
    const url = path ? new URL(path, origin).toString() : window.location.href;
    const absoluteImage = image ? new URL(image, origin).toString() : '';

    document.title = title;

    const setMeta = (selector: string, attr: 'name' | 'property' | 'rel', value: string) => {
      let tag = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
      if (!tag) {
        tag = selector.startsWith('link') ? document.createElement('link') : document.createElement('meta');
        if (attr !== 'rel') {
          (tag as HTMLMetaElement).setAttribute(attr, selector.match(/'([^']+)'/)?.[1] || '');
        } else {
          (tag as HTMLLinkElement).setAttribute('rel', 'canonical');
        }
        document.head.appendChild(tag);
      }
      if (attr === 'rel') {
        (tag as HTMLLinkElement).setAttribute('href', value);
      } else {
        (tag as HTMLMetaElement).setAttribute('content', value);
      }
    };

    setMeta("meta[name='description']", 'name', description);
    setMeta("meta[property='og:title']", 'property', title);
    setMeta("meta[property='og:description']", 'property', description);
    setMeta("meta[property='og:url']", 'property', url);
    setMeta("meta[property='og:type']", 'property', type);
    setMeta("meta[name='twitter:card']", 'name', absoluteImage ? 'summary_large_image' : 'summary');
    setMeta("meta[name='twitter:title']", 'name', title);
    setMeta("meta[name='twitter:description']", 'name', description);
    setMeta("meta[property='og:image']", 'property', absoluteImage);
    setMeta("meta[name='twitter:image']", 'name', absoluteImage);
    setMeta("link[rel='canonical']", 'rel', url);
    setMeta("meta[name='robots']", 'name', noIndex ? 'noindex,nofollow' : 'index,follow');

    return () => {
      // Leave current tags in place; route changes will overwrite them.
    };
  }, [title, description, image, path, type, noIndex]);

  return null;
}
