-- SmartHire mobile push-notification device registry.
-- Apply in the Supabase SQL editor after the earlier migrations.

create table if not exists public.mobile_devices (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  expo_push_token text not null unique,
  platform        text check (platform in ('ios', 'android')),
  device_name     text,
  app_version     text,
  last_seen_at    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index if not exists idx_mobile_devices_user on public.mobile_devices(user_id);

-- Expo tokens are sensitive device identifiers. The backend uses the Supabase
-- service-role client (which bypasses RLS), so clients do not need any policy
-- granting direct access to this registry.
alter table public.mobile_devices enable row level security;
