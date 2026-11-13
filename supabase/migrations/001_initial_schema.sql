-- LINEA Hair Studio — Initial Supabase Schema, RLS & Safe Booking RPCs
-- Run this in Supabase Dashboard -> SQL Editor (or via `supabase db push`).

create extension if not exists pgcrypto;

-- 1. Salon global settings (singleton row id = 1)
create table if not exists public.salon_settings (
  id integer primary key default 1 check (id = 1),
  salon_name text not null default 'LINEA Hair Studio',
  address_ru text not null default 'ул. Мира, 24, 2 этаж',
  address_en text not null default '24 Mira St, 2nd Floor',
  phone text not null default '+7 (700) 123-45-67',
  email text not null default 'hello@linea-studio.example',
  currency text not null default '₸',
  slot_interval_minutes integer not null default 30 check (slot_interval_minutes in (15, 20, 30, 60)),
  booking_horizon_days integer not null default 21 check (booking_horizon_days between 1 and 90),
  updated_at timestamptz not null default now()
);

-- 2. Services catalog
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name_ru text not null,
  name_en text not null,
  description_ru text not null default '',
  description_en text not null default '',
  category_ru text not null,
  category_en text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  price integer not null check (price >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 3. Masters (Stylists)
create table if not exists public.masters (
  id uuid primary key default gen_random_uuid(),
  name_ru text not null,
  name_en text not null,
  role_ru text not null,
  role_en text not null,
  bio_ru text not null default '',
  bio_en text not null default '',
  avatar_url text not null default '',
  experience_years integer not null default 3 check (experience_years >= 0),
  rating numeric(2,1) not null default 4.9 check (rating >= 0 and rating <= 5.0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 4. Master <-> Service mapping
create table if not exists public.master_services (
  master_id uuid not null references public.masters(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (master_id, service_id)
);

-- 5. Weekly master schedule (day_of_week: 0 = Sunday .. 6 = Saturday, matching JS Date.getDay())
create table if not exists public.master_schedules (
  id uuid primary key default gen_random_uuid(),
  master_id uuid not null references public.masters(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  is_working boolean not null default true,
  start_time time not null default '10:00',
  end_time time not null default '20:00',
  break_start time,
  break_end time,
  unique (master_id, day_of_week),
  check (not is_working or end_time > start_time),
  check (
    (break_start is null and break_end is null)
    or (break_start is not null and break_end is not null and break_end > break_start)
  )
);

-- 6. Specific master day-offs / vacations
create table if not exists public.master_time_offs (
  id uuid primary key default gen_random_uuid(),
  master_id uuid not null references public.masters(id) on delete cascade,
  off_date date not null,
  reason text not null default '',
  unique (master_id, off_date)
);

-- 7. Appointments
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique,
  master_id uuid not null references public.masters(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  duration_minutes integer not null check (duration_minutes > 0),
  price integer not null check (price >= 0),
  client_name text not null,
  client_phone text not null,
  client_email text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  created_by text not null default 'client' check (created_by in ('client', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists idx_appointments_master_date_status
  on public.appointments (master_id, appointment_date, status);

create index if not exists idx_appointments_date
  on public.appointments (appointment_date desc, start_time asc);

-- 8. Admin whitelist linked to Supabase Auth users
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

-- Trigger for updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_appointments_updated_at on public.appointments;
create trigger trg_appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

drop trigger if exists trg_salon_settings_updated_at on public.salon_settings;
create trigger trg_salon_settings_updated_at
  before update on public.salon_settings
  for each row execute function public.set_updated_at();

-- Helper: check if current authenticated user is an admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- Enable Row Level Security on all tables
alter table public.salon_settings enable row level security;
alter table public.services enable row level security;
alter table public.masters enable row level security;
alter table public.master_services enable row level security;
alter table public.master_schedules enable row level security;
alter table public.master_time_offs enable row level security;
alter table public.appointments enable row level security;
alter table public.admin_users enable row level security;

-- Public read policies (catalog & schedules only, never client PII)
create policy "Public read salon_settings"
  on public.salon_settings for select
  using (true);

create policy "Admin manage salon_settings"
  on public.salon_settings for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Public read active services"
  on public.services for select
  using (is_active = true or public.is_admin());

create policy "Admin manage services"
  on public.services for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Public read active masters"
  on public.masters for select
  using (is_active = true or public.is_admin());

create policy "Admin manage masters"
  on public.masters for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Public read master_services"
  on public.master_services for select
  using (true);

create policy "Admin manage master_services"
  on public.master_services for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Public read master_schedules"
  on public.master_schedules for select
  using (true);

create policy "Admin manage master_schedules"
  on public.master_schedules for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Public read master_time_offs"
  on public.master_time_offs for select
  using (true);

create policy "Admin manage master_time_offs"
  on public.master_time_offs for all
  using (public.is_admin())
  with check (public.is_admin());

-- Appointments: ONLY admins can read/update/delete rows directly (prevents PII leaks)
create policy "Admin full access to appointments"
  on public.appointments for all
  using (public.is_admin())
  with check (public.is_admin());

-- Admin users: only user themselves or another admin can inspect
create policy "Admin read own membership"
  on public.admin_users for select
  using (auth.uid() = user_id or public.is_admin());

-- Safe RPC: get busy intervals for a master on a specific date WITHOUT exposing client PII
create or replace function public.get_busy_intervals(
  p_master_id uuid,
  p_date date
)
returns table (
  start_time text,
  end_time text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    to_char(a.start_time, 'HH24:MI') as start_time,
    to_char(a.end_time, 'HH24:MI') as end_time
  from public.appointments a
  where a.master_id = p_master_id
    and a.appointment_date = p_date
    and a.status in ('pending', 'confirmed')
  order by a.start_time asc;
$$;

grant execute on function public.get_busy_intervals(uuid, date) to anon, authenticated;

-- Safe RPC: create public client booking with advisory lock & overlap validation
create or replace function public.create_public_booking(
  p_master_id uuid,
  p_service_id uuid,
  p_date date,
  p_start_time time,
  p_client_name text,
  p_client_phone text,
  p_client_email text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service record;
  v_master record;
  v_schedule record;
  v_end_time time;
  v_dow smallint;
  v_overlap boolean;
  v_code text;
  v_created public.appointments%rowtype;
begin
  if trim(coalesce(p_client_name, '')) = '' then
    raise exception 'Client name is required';
  end if;

  if trim(coalesce(p_client_phone, '')) = '' then
    raise exception 'Client phone is required';
  end if;

  if p_date < (current_date - interval '1 day')::date then
    raise exception 'Cannot book a past date';
  end if;

  select * into v_service
  from public.services
  where id = p_service_id and is_active = true;

  if not found then
    raise exception 'Service is not available';
  end if;

  select * into v_master
  from public.masters
  where id = p_master_id and is_active = true;

  if not found then
    raise exception 'Stylist is not available';
  end if;

  if not exists (
    select 1 from public.master_services
    where master_id = p_master_id and service_id = p_service_id
  ) then
    raise exception 'Selected stylist does not perform this service';
  end if;

  -- Lock per master + date to prevent race-condition double bookings
  perform pg_advisory_xact_lock(hashtext(p_master_id::text || ':' || p_date::text));

  if exists (
    select 1 from public.master_time_offs
    where master_id = p_master_id and off_date = p_date
  ) then
    raise exception 'Stylist is unavailable on this date';
  end if;

  v_dow := extract(dow from p_date)::smallint;

  select * into v_schedule
  from public.master_schedules
  where master_id = p_master_id and day_of_week = v_dow;

  if not found or not v_schedule.is_working then
    raise exception 'Stylist does not work on this weekday';
  end if;

  v_end_time := p_start_time + make_interval(mins => v_service.duration_minutes);

  if p_start_time < v_schedule.start_time or v_end_time > v_schedule.end_time then
    raise exception 'Selected time is outside working hours';
  end if;

  if v_schedule.break_start is not null and v_schedule.break_end is not null then
    if p_start_time < v_schedule.break_end and v_end_time > v_schedule.break_start then
      raise exception 'Selected time overlaps stylist break';
    end if;
  end if;

  select exists (
    select 1
    from public.appointments a
    where a.master_id = p_master_id
      and a.appointment_date = p_date
      and a.status in ('pending', 'confirmed')
      and a.start_time < v_end_time
      and a.end_time > p_start_time
  ) into v_overlap;

  if v_overlap then
    raise exception 'Selected time slot is already booked';
  end if;

  v_code := 'LN-' || upper(substr(md5(gen_random_uuid()::text), 1, 5));

  insert into public.appointments (
    booking_code,
    master_id,
    service_id,
    appointment_date,
    start_time,
    end_time,
    duration_minutes,
    price,
    client_name,
    client_phone,
    client_email,
    notes,
    status,
    created_by
  )
  values (
    v_code,
    p_master_id,
    p_service_id,
    p_date,
    p_start_time,
    v_end_time,
    v_service.duration_minutes,
    v_service.price,
    trim(p_client_name),
    trim(p_client_phone),
    nullif(trim(coalesce(p_client_email, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    'pending',
    'client'
  )
  returning * into v_created;

  return jsonb_build_object(
    'id', v_created.id,
    'booking_code', v_created.booking_code,
    'master_id', v_created.master_id,
    'service_id', v_created.service_id,
    'appointment_date', v_created.appointment_date,
    'start_time', to_char(v_created.start_time, 'HH24:MI'),
    'end_time', to_char(v_created.end_time, 'HH24:MI'),
    'duration_minutes', v_created.duration_minutes,
    'price', v_created.price,
    'client_name', v_created.client_name,
    'client_phone', v_created.client_phone,
    'status', v_created.status
  );
end;
$$;

grant execute on function public.create_public_booking(uuid, uuid, date, time, text, text, text, text) to anon, authenticated;

-- Safe RPC: admin booking creation with optional overlap override
create or replace function public.create_admin_booking(
  p_master_id uuid,
  p_service_id uuid,
  p_date date,
  p_start_time time,
  p_client_name text,
  p_client_phone text,
  p_client_email text default null,
  p_notes text default null,
  p_status text default 'confirmed',
  p_allow_overlap boolean default false
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service record;
  v_end_time time;
  v_overlap boolean;
  v_code text;
  v_created public.appointments%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Forbidden: admin access required';
  end if;

  if p_status not in ('pending', 'confirmed', 'completed', 'cancelled') then
    raise exception 'Invalid status';
  end if;

  select * into v_service from public.services where id = p_service_id;
  if not found then
    raise exception 'Service not found';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_master_id::text || ':' || p_date::text));

  v_end_time := p_start_time + make_interval(mins => v_service.duration_minutes);

  if not p_allow_overlap then
    select exists (
      select 1
      from public.appointments a
      where a.master_id = p_master_id
        and a.appointment_date = p_date
        and a.status in ('pending', 'confirmed')
        and a.start_time < v_end_time
        and a.end_time > p_start_time
    ) into v_overlap;

    if v_overlap then
      raise exception 'Selected time slot overlaps an existing booking';
    end if;
  end if;

  v_code := 'LN-' || upper(substr(md5(gen_random_uuid()::text), 1, 5));

  insert into public.appointments (
    booking_code,
    master_id,
    service_id,
    appointment_date,
    start_time,
    end_time,
    duration_minutes,
    price,
    client_name,
    client_phone,
    client_email,
    notes,
    status,
    created_by
  )
  values (
    v_code,
    p_master_id,
    p_service_id,
    p_date,
    p_start_time,
    v_end_time,
    v_service.duration_minutes,
    v_service.price,
    trim(p_client_name),
    trim(p_client_phone),
    nullif(trim(coalesce(p_client_email, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    p_status,
    'admin'
  )
  returning * into v_created;

  return v_created;
end;
$$;

grant execute on function public.create_admin_booking(uuid, uuid, date, time, text, text, text, text, text, boolean) to authenticated;

