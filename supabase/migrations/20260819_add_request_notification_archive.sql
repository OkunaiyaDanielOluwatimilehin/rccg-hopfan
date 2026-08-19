alter table if exists public.request_notifications
  add column if not exists archived_at timestamptz;

create index if not exists request_notifications_recipient_archived_idx
  on public.request_notifications (recipient_profile_id, archived_at, created_at desc);
