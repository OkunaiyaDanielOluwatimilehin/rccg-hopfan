alter table public.site_settings
  add column if not exists visit_title text,
  add column if not exists visit_intro text,
  add column if not exists visit_items jsonb,
  add column if not exists giving_accounts jsonb;

