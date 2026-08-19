import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBirthdayToast, buildContentToast } from '../lib/notificationBuilders';

test('buildBirthdayToast uses 10 second duration and name', () => {
  const toast = buildBirthdayToast('Ada');
  assert.equal(toast.kind, 'birthday');
  assert.equal(toast.title, 'Happy birthday, Ada');
  assert.equal(toast.durationMs, 10000);
});

test('buildContentToast maps content kind to href', () => {
  const toast = buildContentToast('sermon', 'Grace Works', '/sermons/1');
  assert.equal(toast.kind, 'sermon');
  assert.equal(toast.href, '/sermons/1');
  assert.match(toast.message, /sermon/i);
});
