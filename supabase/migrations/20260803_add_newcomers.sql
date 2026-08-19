create table if not exists public.newcomer_form_fields (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  field_key text not null unique,
  field_type text not null default 'short_text',
  required boolean not null default false,
  options jsonb not null default '[]'::jsonb,
  order_index integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.newcomers (
  id uuid primary key default gen_random_uuid(),
  submitted_at timestamptz not null default now(),
  visit_date date,
  first_name text not null,
  middle_name text,
  last_name text not null,
  marital_status text,
  gender text,
  occupation text,
  birth_month integer check (birth_month between 1 and 12),
  birth_day integer check (birth_day between 1 and 31),
  home_address text,
  time_available_for_visit text,
  phone_number text,
  whatsapp_number text,
  email text,
  prayer_request text,
  consent_events_checkups boolean not null default false,
  consent_newsletter_calls boolean not null default false,
  extra_fields jsonb not null default '{}'::jsonb,
  status text not null default 'new',
  assigned_follow_up_id uuid null references public.profiles(id) on delete set null,
  assigned_follow_up_name text,
  assigned_at timestamptz,
  archived_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.newcomers
  add column if not exists assigned_follow_up_id uuid null references public.profiles(id) on delete set null,
  add column if not exists assigned_follow_up_name text,
  add column if not exists assigned_at timestamptz,
  add column if not exists archived_at timestamptz;

create index if not exists newcomers_status_created_idx on public.newcomers(status, created_at desc);
create index if not exists newcomers_assigned_follow_up_idx on public.newcomers(assigned_follow_up_id, status, created_at desc);

alter table public.newcomers enable row level security;
alter table public.newcomer_form_fields enable row level security;

drop policy if exists "Anyone can submit newcomers" on public.newcomers;
create policy "Anyone can submit newcomers" on public.newcomers
  for insert with check (true);

drop policy if exists "Admins can read newcomers" on public.newcomers;
create policy "Admins can read newcomers" on public.newcomers
  for select using (
    assigned_follow_up_id = auth.uid()
    or
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'follow_up')
    )
  );

drop policy if exists "Admins can update newcomers" on public.newcomers;
create policy "Admins can update newcomers" on public.newcomers
  for update using (
    assigned_follow_up_id = auth.uid()
    or
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'follow_up')
    )
  ) with check (
    assigned_follow_up_id = auth.uid()
    or
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'follow_up')
    )
  );

drop policy if exists "Anyone can read active newcomer fields" on public.newcomer_form_fields;
create policy "Anyone can read active newcomer fields" on public.newcomer_form_fields
  for select using (active = true or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role in ('admin', 'follow_up')
  ));

drop policy if exists "Admins can manage newcomer fields" on public.newcomer_form_fields;
create policy "Admins can manage newcomer fields" on public.newcomer_form_fields
  for all using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'follow_up')
    )
  );

insert into public.newcomer_form_fields (label, field_key, field_type, required, options, order_index)
values
  ('Date', 'visit_date', 'date', true, '[]', 10),
  ('First Name', 'first_name', 'short_text', true, '[]', 20),
  ('Middle Name', 'middle_name', 'short_text', false, '[]', 30),
  ('Last Name', 'last_name', 'short_text', true, '[]', 40),
  ('Marital Status', 'marital_status', 'select', false, '["Single","Married","Widowed","Divorced"]', 50),
  ('Gender', 'gender', 'select', false, '["Female","Male"]', 60),
  ('Occupation', 'occupation', 'short_text', false, '[]', 70),
  ('DOB Month', 'birth_month', 'number', false, '[]', 80),
  ('DOB Day', 'birth_day', 'number', false, '[]', 90),
  ('Home Address', 'home_address', 'long_text', false, '[]', 100),
  ('Time Available for Visit', 'time_available_for_visit', 'short_text', false, '[]', 110),
  ('Phone Number', 'phone_number', 'phone', false, '[]', 120),
  ('Whatsapp Number', 'whatsapp_number', 'phone', false, '[]', 130),
  ('Email', 'email', 'email', false, '[]', 140),
  ('Prayer Request', 'prayer_request', 'long_text', false, '[]', 150),
  ('Receive emails about church events and occasional check-up visits', 'consent_events_checkups', 'checkbox', false, '["Yes"]', 160),
  ('Subscribe to newsletter and receive calls', 'consent_newsletter_calls', 'checkbox', false, '["Yes"]', 170)
on conflict (field_key) do nothing;
