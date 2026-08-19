alter table public.prayer_requests
  add column if not exists status text not null default 'new',
  add column if not exists assigned_team text null,
  add column if not exists assigned_person text null,
  add column if not exists assigned_person_id uuid null references public.profiles(id) on delete set null;

alter table public.counseling_requests
  add column if not exists status text not null default 'new',
  add column if not exists assigned_team text null,
  add column if not exists assigned_person text null,
  add column if not exists assigned_person_id uuid null references public.profiles(id) on delete set null;

alter table public.custom_forms
  add column if not exists header_image_url text,
  add column if not exists theme_color text not null default '#173b2f',
  add column if not exists accent_color text not null default '#c59b45',
  add column if not exists background_color text not null default '#f8f7f4',
  add column if not exists style jsonb not null default '{}'::jsonb;

update public.prayer_requests
set assigned_team = 'prayer_team'
where assigned_team is null;

update public.counseling_requests
set assigned_team = 'counseling_team'
where assigned_team is null;

create index if not exists prayer_requests_status_idx on public.prayer_requests(status, created_at desc);
create index if not exists prayer_requests_team_status_idx on public.prayer_requests(assigned_team, status, created_at desc);
create index if not exists counseling_requests_status_idx on public.counseling_requests(status, created_at desc);
create index if not exists counseling_requests_team_status_idx on public.counseling_requests(assigned_team, status, created_at desc);

alter table public.prayer_requests enable row level security;
alter table public.counseling_requests enable row level security;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

drop policy if exists "Anyone inserts prayer requests" on public.prayer_requests;
create policy "Anyone inserts prayer requests" on public.prayer_requests
  for insert with check (true);

drop policy if exists "Assigned teams read prayer requests" on public.prayer_requests;
create policy "Assigned teams read prayer requests" on public.prayer_requests
  for select using (
    assigned_person_id = auth.uid()
    or (assigned_team = 'prayer_team' and public.current_profile_role() = 'prayer')
    or (assigned_team = 'follow_up' and public.current_profile_role() = 'follow_up')
    or (assigned_team = 'admin' and public.current_profile_role() = 'admin')
  );

drop policy if exists "Assigned teams update prayer requests" on public.prayer_requests;
create policy "Assigned teams update prayer requests" on public.prayer_requests
  for update using (
    assigned_person_id = auth.uid()
    or public.current_profile_role() in ('admin','prayer','follow_up')
  ) with check (
    assigned_person_id = auth.uid()
    or public.current_profile_role() in ('admin','prayer','follow_up')
  );

drop policy if exists "Assigned teams delete prayer requests" on public.prayer_requests;
create policy "Assigned teams delete prayer requests" on public.prayer_requests
  for delete using (
    assigned_person_id = auth.uid()
    or public.current_profile_role() in ('admin','prayer')
  );

drop policy if exists "Anyone inserts counseling requests" on public.counseling_requests;
create policy "Anyone inserts counseling requests" on public.counseling_requests
  for insert with check (true);

drop policy if exists "Assigned teams read counseling requests" on public.counseling_requests;
create policy "Assigned teams read counseling requests" on public.counseling_requests
  for select using (
    assigned_person_id = auth.uid()
    or (assigned_team = 'counseling_team' and public.current_profile_role() = 'counselor')
    or (assigned_team = 'follow_up' and public.current_profile_role() = 'follow_up')
    or (assigned_team = 'admin' and public.current_profile_role() = 'admin')
  );

drop policy if exists "Assigned teams update counseling requests" on public.counseling_requests;
create policy "Assigned teams update counseling requests" on public.counseling_requests
  for update using (
    assigned_person_id = auth.uid()
    or public.current_profile_role() in ('admin','counselor','follow_up')
  ) with check (
    assigned_person_id = auth.uid()
    or public.current_profile_role() in ('admin','counselor','follow_up')
  );

drop policy if exists "Assigned teams delete counseling requests" on public.counseling_requests;
create policy "Assigned teams delete counseling requests" on public.counseling_requests
  for delete using (
    assigned_person_id = auth.uid()
    or public.current_profile_role() in ('admin','counselor')
  );
