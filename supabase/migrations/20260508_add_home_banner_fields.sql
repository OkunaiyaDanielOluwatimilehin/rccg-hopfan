alter table public.site_settings
  add column if not exists home_banner_enabled boolean not null default false,
  add column if not exists home_banner_event_ids uuid[] not null default '{}',
  add column if not exists home_banner_title text null,
  add column if not exists home_banner_message text null,
  add column if not exists home_banner_button_label text null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'site_settings'
      and column_name = 'home_banner_event_id'
  ) then
    execute '
      update public.site_settings
      set home_banner_event_ids = case
        when home_banner_event_id is not null and cardinality(home_banner_event_ids) = 0
          then array[home_banner_event_id]
        else home_banner_event_ids
      end
    ';
  end if;
end $$;
