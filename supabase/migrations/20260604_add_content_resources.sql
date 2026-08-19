create table if not exists public.content_resources (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('sermon','post','devotional','event','audio','series','podcast')),
  content_id text not null,
  title text not null,
  resource_url text not null,
  resource_type text not null default 'cloudflare',
  downloadable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_resources_content_idx on public.content_resources(content_type, content_id);

alter table public.content_resources enable row level security;

drop policy if exists "Public read content resources" on public.content_resources;
create policy "Public read content resources" on public.content_resources
  for select using (true);

drop policy if exists "Admins manage content resources" on public.content_resources;
create policy "Admins manage content resources" on public.content_resources
  for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());
