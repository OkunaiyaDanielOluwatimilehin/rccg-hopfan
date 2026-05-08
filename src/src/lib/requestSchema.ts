export function isMissingColumnError(error: unknown, column: string) {
  const err = error as any;
  const message = [err?.message, err?.details, err?.hint, err?.code].filter(Boolean).join(' ').toLowerCase();
  const columnName = column.toLowerCase();
  return (
    message.includes(columnName) ||
    message.includes('does not exist') ||
    message.includes('unknown') ||
    message.includes('42703')
  );
}

export function stripAssignedPersonId<T extends Record<string, unknown>>(patch: T) {
  const { assigned_person_id: _assignedPersonId, ...rest } = patch as T & { assigned_person_id?: unknown };
  return rest as Omit<T, 'assigned_person_id'>;
}
