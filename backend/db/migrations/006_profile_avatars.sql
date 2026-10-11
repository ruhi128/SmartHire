-- SmartHire authenticated profile-photo schema.
-- Apply in the Supabase SQL Editor after migrations 001–005 and before
-- deploying backend code that reads users.avatar_path/avatar_updated_at.
-- This migration is idempotent and is safe for existing user records.

-- Avatar metadata belongs to the shared account row so students, recruiters,
-- and administrators use the same private-photo capability.
alter table public.users add column if not exists avatar_path       text;
alter table public.users add column if not exists avatar_updated_at timestamptz;

-- Files are deliberately private. The Express backend uses its server-only
-- service-role client and exposes bytes only through authenticated
-- /api/auth/avatar; do not make this bucket public or add client access rules.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do update set public = false;

-- Preserve the private-only contract even if a broad storage policy was added
-- previously. This restrictive policy does not affect other buckets.
drop policy if exists "avatars_backend_only" on storage.objects;
create policy "avatars_backend_only"
  on storage.objects as restrictive
  for all
  to public
  using (bucket_id <> 'avatars')
  with check (bucket_id <> 'avatars');

-- Ask PostgREST to refresh its schema cache immediately after adding columns.
-- This prevents a transient PGRST204 response while the cache is stale.
notify pgrst, 'reload schema';
