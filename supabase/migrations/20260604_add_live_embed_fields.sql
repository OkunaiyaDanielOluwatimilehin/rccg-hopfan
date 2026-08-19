alter table public.site_settings
  add column if not exists live_embed_enabled boolean not null default false,
  add column if not exists live_embed_url text null,
  add column if not exists live_embed_title text null,
  add column if not exists live_embed_note text null;

