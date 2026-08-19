import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFollowUpArchiveUpdate, buildFollowUpAssignmentUpdate } from './followUpLogic';

test('buildFollowUpAssignmentUpdate validates member and marks assigned', () => {
  const update = buildFollowUpAssignmentUpdate({ id: 'member-1', label: 'Follow Up Lead' }, '2026-08-04T00:00:00.000Z');
  assert.equal(update.assigned_follow_up_id, 'member-1');
  assert.equal(update.assigned_follow_up_name, 'Follow Up Lead');
  assert.equal(update.status, 'assigned');
});

test('buildFollowUpArchiveUpdate marks complete', () => {
  const update = buildFollowUpArchiveUpdate('2026-08-04T00:00:00.000Z');
  assert.equal(update.status, 'complete');
  assert.equal(update.archived_at, '2026-08-04T00:00:00.000Z');
});
