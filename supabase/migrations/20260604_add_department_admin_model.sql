alter table public.departments
  add column if not exists head_profile_id uuid null references public.profiles(id) on delete set null,
  add column if not exists member_profile_ids uuid[] not null default '{}',
  add column if not exists admin_profile_ids uuid[] not null default '{}';

alter table public.prayer_requests
  add column if not exists assigned_team text null,
  add column if not exists assigned_person text null,
  add column if not exists assigned_person_id uuid null references public.profiles(id) on delete set null;

alter table public.counseling_requests
  add column if not exists assigned_team text null,
  add column if not exists assigned_person text null,
  add column if not exists assigned_person_id uuid null references public.profiles(id) on delete set null;

alter table public.department_requests
  add column if not exists assigned_team text null,
  add column if not exists assigned_person text null,
  add column if not exists assigned_person_id uuid null references public.profiles(id) on delete set null;

create index if not exists prayer_requests_assigned_person_idx on public.prayer_requests(assigned_person_id);
create index if not exists counseling_requests_assigned_person_idx on public.counseling_requests(assigned_person_id);
create index if not exists department_requests_assigned_person_idx on public.department_requests(assigned_person_id);

comment on column public.departments.head_profile_id is 'Department head profile. Can lead department work without full admin rights.';
comment on column public.departments.admin_profile_ids is 'Department-level admins. Scoped department managers, not full site admins.';
comment on column public.departments.member_profile_ids is 'Assigned department members.';
