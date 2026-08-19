import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAnalyticsPayload } from './analytics';

test('buildAnalyticsPayload aggregates metrics and series', () => {
  const payload = buildAnalyticsPayload({
    days: 7,
    now: new Date('2026-08-04T12:00:00.000Z'),
    views: [{ created_at: '2026-08-04T10:00:00.000Z' }],
    downloads: [{ created_at: '2026-08-03T10:00:00.000Z' }],
    watchRows: [{ last_viewed_at: '2026-08-04T10:00:00.000Z', duration_seconds: 600, completion_percentage: 50 }],
  });

  assert.equal(payload.metrics.contentViews, 1);
  assert.equal(payload.metrics.downloads, 1);
  assert.equal(payload.metrics.watchMinutes, 10);
  assert.equal(payload.metrics.averageCompletionRate, 50);
  assert.equal(payload.series.length, 7);
  assert.equal(payload.series.at(-1)?.views, 1);
});
