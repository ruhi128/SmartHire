-- ============================================================================
-- SmartHire — Migration 001: Phase 1 (notifications, email-OTP, pipeline)
-- ----------------------------------------------------------------------------
-- Run this on an EXISTING Supabase project that already has the base tables.
-- Idempotent: safe to run more than once.
-- Apply: Supabase Dashboard -> SQL Editor -> paste & run.
-- ============================================================================

create extension if not exists pgcrypto;

-- 1) users.email_verified — gate login until email OTP is confirmed -----------
alter table public.users
  add column if not exists email_verified boolean not null default false;

-- Existing accounts were created with Supabase email_confirm=true, so treat
-- them as already verified (avoid locking out current users):
update public.users set email_verified = true where email_verified = false;

-- 2) applications pipeline ----------------------------------------------------
alter table public.applications
  add column if not exists stage text default 'applied';
alter table public.applications
  add column if not exists stage_history jsonb default '[]'::jsonb;

-- Backfill stage from existing flat status
update public.applications
   set stage = case
                 when status = 'selected' then 'selected'
                 when status = 'rejected' then 'rejected'
                 else 'applied'
               end
 where stage is null;

-- Add the CHECK constraint only if it isn't already present
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'applications_stage_check'
  ) then
    alter table public.applications
      add constraint applications_stage_check
      check (stage in ('applied','oa_cleared','interview_1_cleared',
                       'interview_2_cleared','selected','rejected'));
  end if;
end $$;

-- Ensure one application per (student, job)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'applications_student_id_job_id_key'
  ) then
    begin
      alter table public.applications
        add constraint applications_student_id_job_id_key unique (student_id, job_id);
    exception when others then
      raise notice 'Could not add unique(student_id, job_id) — resolve duplicates first.';
    end;
  end if;
end $$;

-- 3) notifications ------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users(id) on delete cascade,
  title      text not null,
  body       text,
  type       text,
  link       text,
  is_read    boolean not null default false,
  metadata   jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_notif_user   on public.notifications(user_id);
create index if not exists idx_notif_unread on public.notifications(user_id, is_read);

-- 4) email_verifications ------------------------------------------------------
create table if not exists public.email_verifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users(id) on delete cascade,
  email      text not null,
  code_hash  text not null,
  expires_at timestamptz not null,
  attempts   integer not null default 0,
  consumed   boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_emailver_user  on public.email_verifications(user_id);
create index if not exists idx_emailver_email on public.email_verifications(email);

-- 5) helpful indexes/constraints on existing tables --------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_oa_attempts_test_id_student_id_key'
  ) then
    begin
      alter table public.company_oa_attempts
        add constraint company_oa_attempts_test_id_student_id_key unique (test_id, student_id);
    exception when others then
      raise notice 'Could not add unique(test_id, student_id) on company_oa_attempts.';
    end;
  end if;
end $$;
