export type FollowUpStatus = 'new' | 'assigned' | 'complete';

export function buildFollowUpAssignmentUpdate(member: { id: string; label: string }, assignedAt = new Date().toISOString()) {
  if (!member.id) throw new Error('Follow-up member required.');
  return {
    assigned_follow_up_id: member.id,
    assigned_follow_up_name: member.label,
    assigned_at: assignedAt,
    status: 'assigned' as FollowUpStatus,
  };
}

export function buildFollowUpArchiveUpdate(archivedAt = new Date().toISOString()) {
  return {
    status: 'complete' as FollowUpStatus,
    archived_at: archivedAt,
  };
}
