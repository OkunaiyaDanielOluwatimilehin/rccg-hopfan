import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveShareOrigin, toAbsoluteUrl } from './shareUrl';

test('resolveShareOrigin falls back to a valid origin when headers are empty', () => {
  const origin = resolveShareOrigin({});
  assert.match(origin, /^https?:\/\//);
  assert.doesNotThrow(() => new URL('/Rccg_logo.png', origin));
});

test('toAbsoluteUrl falls back to the site logo for unsupported image URLs', () => {
  const resolved = toAbsoluteUrl('ftp://example.com/logo.png', 'https://rccg-hopfan.vercel.app');
  assert.equal(resolved, 'https://rccg-hopfan.vercel.app/Rccg_logo.png');
});
