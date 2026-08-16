-- ─────────────────────────────────────────────────────────────────────────
-- 003_proctoring.sql
-- Full proctoring support for Mock OA: per-violation log + attempt integrity.
-- Run in Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────

-- Per-violation event log (one row per proctoring event).
create table if not exists public.proctoring_violations (
  id          uuid primary key default gen_random_uuid(),
  attempt_id  uuid references public.mock_oa_attempts(id) on delete cascade,
  student_id  uuid references public.users(id) on delete cascade,
  test_id     uuid,
  type        text not null,          -- tab_switch | fullscreen_exit | copy | cut | paste | context_menu | no_face | multiple_faces | camera_blocked
  detail      text,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_proctoring_attempt on public.proctoring_violations(attempt_id);
create index if not exists idx_proctoring_student on public.proctoring_violations(student_id);

-- Integrity summary columns on the attempt itself.
alter table public.mock_oa_attempts add column if not exists integrity_score    integer;
alter table public.mock_oa_attempts add column if not exists violation_count    integer default 0;
alter table public.mock_oa_attempts add column if not exists terminated         boolean default false;
alter table public.mock_oa_attempts add column if not exists proctoring_summary jsonb;
