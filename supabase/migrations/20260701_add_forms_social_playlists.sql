alter table public.site_settings
  add column if not exists social_links jsonb not null default '[]'::jsonb;

alter table public.content_downloads
  add column if not exists title text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.sermon_playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sermon_playlist_items (
  playlist_id uuid not null references public.sermon_playlists(id) on delete cascade,
  sermon_id uuid not null references public.sermons(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (playlist_id, sermon_id)
);

create table if not exists public.custom_forms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft','published')),
  fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.custom_forms
  add column if not exists header_image_url text,
  add column if not exists theme_color text not null default '#173b2f',
  add column if not exists accent_color text not null default '#c59b45',
  add column if not exists background_color text not null default '#f8f7f4',
  add column if not exists style jsonb not null default '{}'::jsonb;

create table if not exists public.custom_form_entries (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.custom_forms(id) on delete cascade,
  values jsonb not null default '{}'::jsonb,
  submitted_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists sermon_playlists_user_idx on public.sermon_playlists(user_id, updated_at desc);
create index if not exists sermon_playlists_public_idx on public.sermon_playlists(is_public, updated_at desc);
create index if not exists custom_form_entries_form_idx on public.custom_form_entries(form_id, created_at desc);

alter table public.sermon_playlists enable row level security;
alter table public.sermon_playlist_items enable row level security;
alter table public.custom_forms enable row level security;
alter table public.custom_form_entries enable row level security;

drop policy if exists "Users manage own sermon playlists" on public.sermon_playlists;
create policy "Users manage own sermon playlists" on public.sermon_playlists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Anyone reads public sermon playlists" on public.sermon_playlists;
create policy "Anyone reads public sermon playlists" on public.sermon_playlists
  for select using (is_public = true or auth.uid() = user_id or public.current_user_is_admin());

drop policy if exists "Users manage own sermon playlist items" on public.sermon_playlist_items;
create policy "Users manage own sermon playlist items" on public.sermon_playlist_items
  for all using (
    exists (select 1 from public.sermon_playlists p where p.id = playlist_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.sermon_playlists p where p.id = playlist_id and p.user_id = auth.uid())
  );

drop policy if exists "Anyone reads public sermon playlist items" on public.sermon_playlist_items;
create policy "Anyone reads public sermon playlist items" on public.sermon_playlist_items
  for select using (
    exists (select 1 from public.sermon_playlists p where p.id = playlist_id and (p.is_public = true or p.user_id = auth.uid() or public.current_user_is_admin()))
  );

drop policy if exists "Admins manage custom forms" on public.custom_forms;
create policy "Admins manage custom forms" on public.custom_forms
  for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

drop policy if exists "Anyone reads published custom forms" on public.custom_forms;
create policy "Anyone reads published custom forms" on public.custom_forms
  for select using (status = 'published' or public.current_user_is_admin());

drop policy if exists "Anyone inserts custom form entries" on public.custom_form_entries;
create policy "Anyone inserts custom form entries" on public.custom_form_entries
  for insert with check (true);

drop policy if exists "Admins read custom form entries" on public.custom_form_entries;
create policy "Admins read custom form entries" on public.custom_form_entries
  for select using (public.current_user_is_admin());
