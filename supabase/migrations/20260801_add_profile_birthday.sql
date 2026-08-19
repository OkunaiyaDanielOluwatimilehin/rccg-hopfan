alter table public.profiles
  add column if not exists birth_month integer check (birth_month between 1 and 12),
  add column if not exists birth_day integer check (birth_day between 1 and 31);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, birth_month, birth_day)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    nullif(new.raw_user_meta_data->>'birth_month', '')::integer,
    nullif(new.raw_user_meta_data->>'birth_day', '')::integer
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    birth_month = coalesce(excluded.birth_month, public.profiles.birth_month),
    birth_day = coalesce(excluded.birth_day, public.profiles.birth_day),
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;
