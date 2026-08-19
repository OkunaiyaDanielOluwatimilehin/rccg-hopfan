alter table public.site_settings
  add column if not exists whatsapp_phone text,
  add column if not exists google_maps_url text,
  add column if not exists social_links jsonb default '[]'::jsonb;
