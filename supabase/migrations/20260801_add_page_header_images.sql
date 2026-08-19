alter table public.site_settings
  add column if not exists page_header_images jsonb not null default '{}'::jsonb;
