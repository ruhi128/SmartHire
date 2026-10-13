-- 010_add_expo_push_receipt_jobs.sql
--
-- Expo accepts a push request before FCM/APNs finishes processing it. Store
-- opaque Expo ticket IDs briefly so a trusted backend worker can fetch the
-- later receipt, retire DeviceNotRegistered tokens, and keep the device
-- registry healthy. The persisted notifications table remains the source of
-- truth for every user-visible inbox event.

create table if not exists public.expo_push_receipt_jobs (
  id               uuid primary key default gen_random_uuid(),
  expo_ticket_id   text not null unique,
  expo_push_token  text not null,
  available_after  timestamptz not null,
  check_attempts   integer not null default 0 check (check_attempts >= 0),
  last_checked_at  timestamptz,
  last_error       text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_expo_push_receipt_jobs_due
  on public.expo_push_receipt_jobs (available_after asc);

-- Ticket IDs and Expo push tokens are device identifiers. The service-role
-- backend and its trusted scheduler are the only readers/writers; native
-- clients continue to use only the protected Express device endpoints.
alter table public.expo_push_receipt_jobs enable row level security;
revoke all on table public.expo_push_receipt_jobs from anon, authenticated;

-- Make the table visible to the PostgREST schema cache after running this
-- migration in the Supabase SQL editor.
notify pgrst, 'reload schema';
