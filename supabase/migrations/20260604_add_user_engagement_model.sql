create table if not exists public.content_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete cascade,
  guest_session_id text null,
  content_type text not null check (content_type in ('sermon','audio','devotional','post','event','series','podcast')),
  content_id text not null,
  action text not null check (action in ('view','play','complete','download','save','like','comment','note')),
  duration_seconds integer not null default 0,
  completion_percentage numeric(5,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.watch_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null check (content_type in ('sermon','audio','devotional','post','event','series','podcast')),
  content_id text not null,
  playback_position_seconds integer not null default 0,
  duration_seconds integer not null default 0,
  completion_percentage numeric(5,2) not null default 0,
  completed boolean not null default false,
  last_viewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, content_type, content_id)
);

create table if not exists public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null check (content_type in ('sermon','audio','devotional','post','event','series','podcast')),
  content_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, content_type, content_id)
);

create table if not exists public.content_downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null check (content_type in ('sermon','audio','devotional','post','event','series','podcast','resource')),
  content_id text not null,
  resource_url text not null,
  resource_type text not null default 'file',
  created_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  new_sermons boolean not null default true,
  new_devotionals boolean not null default true,
  new_audio boolean not null default true,
  upcoming_events boolean not null default true,
  interest_based boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.recommendation_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  categories text[] not null default '{}',
  tags text[] not null default '{}',
  last_rebuilt_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists content_activity_user_idx on public.content_activity(user_id, created_at desc);
create index if not exists content_activity_content_idx on public.content_activity(content_type, content_id, action);
create index if not exists watch_progress_user_recent_idx on public.watch_progress(user_id, last_viewed_at desc);
create index if not exists content_downloads_content_idx on public.content_downloads(content_type, content_id, created_at desc);

alter table public.content_activity enable row level security;
alter table public.watch_progress enable row level security;
alter table public.user_favorites enable row level security;
alter table public.content_downloads enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.recommendation_profile enable row level security;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin','editorial','department_admin')
  );
$$;

drop policy if exists "Users manage own content activity" on public.content_activity;
create policy "Users manage own content activity" on public.content_activity
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Admins read content activity" on public.content_activity;
create policy "Admins read content activity" on public.content_activity
  for select using (public.current_user_is_admin());

drop policy if exists "Guests can add anonymous content activity" on public.content_activity;
create policy "Guests can add anonymous content activity" on public.content_activity
  for insert with check (user_id is null and guest_session_id is not null);

drop policy if exists "Users manage own watch progress" on public.watch_progress;
create policy "Users manage own watch progress" on public.watch_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Admins read watch progress" on public.watch_progress;
create policy "Admins read watch progress" on public.watch_progress
  for select using (public.current_user_is_admin());

drop policy if exists "Users manage own favorites" on public.user_favorites;
create policy "Users manage own favorites" on public.user_favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own downloads" on public.content_downloads;
create policy "Users manage own downloads" on public.content_downloads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Admins read downloads" on public.content_downloads;
create policy "Admins read downloads" on public.content_downloads
  for select using (public.current_user_is_admin());

drop policy if exists "Users manage own notification preferences" on public.notification_preferences;
create policy "Users manage own notification preferences" on public.notification_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own recommendation profile" on public.recommendation_profile;
create policy "Users manage own recommendation profile" on public.recommendation_profile
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
