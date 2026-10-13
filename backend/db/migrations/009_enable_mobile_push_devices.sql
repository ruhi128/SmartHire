-- 009_enable_mobile_push_devices.sql
--
-- Re-enable the private mobile-device registry for Expo Push / FCM delivery.
-- Notification rows in public.notifications remain the authoritative inbox;
-- this table only stores opaque Expo device tokens for best-effort OS delivery.
--
-- This is intentionally forward-only. Migration 007 removed the historical
-- registry, so do not edit prior migration files when enabling remote push.

create table if not exists public.mobile_devices (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  expo_push_token text not null unique,
  platform        text not null check (platform in ('ios', 'android')),
  device_name     text,
  app_version     text,
  last_seen_at    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index if not exists idx_mobile_devices_user on public.mobile_devices(user_id);
create index if not exists idx_mobile_devices_last_seen on public.mobile_devices(last_seen_at desc);

-- Tokens are device identifiers. Only the service-role backend accesses this
-- table; authenticated clients use protected Express endpoints instead.
alter table public.mobile_devices enable row level security;
revoke all on table public.mobile_devices from anon, authenticated;

-- Make the table visible to the PostgREST schema cache after running this
-- migration in the Supabase SQL editor.
notify pgrst, 'reload schema';
