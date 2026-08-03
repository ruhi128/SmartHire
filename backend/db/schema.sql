-- ============================================================================
-- SmartHire — Full Baseline Schema (PostgreSQL / Supabase)
-- ----------------------------------------------------------------------------
-- Recreates the entire application schema. SAFE to run on an existing Supabase
-- project: every statement is idempotent (IF NOT EXISTS), so it only creates
-- what is missing.
--
-- Auth model: rows in public.users mirror auth.users (same id). Supabase Auth
-- owns credentials; public.users holds role + activation/verification flags.
--
-- Apply: Supabase Dashboard -> SQL Editor -> paste & run.
-- For Phase-1-only additions on an already-populated DB, run
--   db/migrations/001_phase1.sql
-- ============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- USERS (mirrors auth.users) --------------------------------------------------
create table if not exists public.users (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text unique not null,
  role           text not null check (role in ('student','recruiter','admin')),
  is_active      boolean not null default true,
  email_verified boolean not null default false,   -- Phase 1: email-OTP gate
  created_at     timestamptz not null default now()
);

-- STUDENT PROFILES ------------------------------------------------------------
create table if not exists public.student_profiles (
  id               uuid primary key references public.users(id) on delete cascade,
  full_name        text,
  email            text,
  roll_number      text,
  branch           text,
  semester         integer,
  cgpa             numeric(4,2),
  phone            text,
  skills           jsonb  default '[]'::jsonb,
  certifications   jsonb  default '[]'::jsonb,
  linkedin_url     text,
  github_url       text,
  tenth_percent    numeric(5,2),
  twelfth_percent  numeric(5,2),
  backlogs         integer default 0,
  placement_status text default 'unplaced'
                   check (placement_status in ('placed','unplaced','opted_out')),
  resume_url       text,
  created_at       timestamptz not null default now()
);
create index if not exists idx_student_branch on public.student_profiles(branch);
create index if not exists idx_student_status on public.student_profiles(placement_status);
create index if not exists idx_student_cgpa   on public.student_profiles(cgpa);

-- COMPANIES -------------------------------------------------------------------
create table if not exists public.companies (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  website      text,
  logo_url     text,
  recruiter_id uuid references public.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_company_recruiter on public.companies(recruiter_id);

-- JOB POSTINGS ----------------------------------------------------------------
create table if not exists public.job_postings (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid references public.companies(id) on delete cascade,
  title             text not null,
  description       text,
  min_cgpa          numeric(4,2) default 0,
  eligible_branches jsonb default '[]'::jsonb,
  required_skills   jsonb default '[]'::jsonb,
  package_lpa       numeric(6,2),
  job_type          text default 'full-time',
  deadline          timestamptz,
  drive_date        date,
  max_backlogs      integer default 0,
  rounds            text,
  status            text default 'active'  check (status in ('active','closed')),
  approval_status   text default 'pending' check (approval_status in ('pending','approved','rejected')),
  approval_note     text,
  posted_by         uuid references public.users(id) on delete set null,
  created_at        timestamptz not null default now()
);
create index if not exists idx_job_company  on public.job_postings(company_id);
create index if not exists idx_job_approval on public.job_postings(approval_status);
create index if not exists idx_job_status   on public.job_postings(status);

-- APPLICATIONS (includes Phase-1 pipeline columns) ----------------------------
create table if not exists public.applications (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid references public.users(id) on delete cascade,
  job_id        uuid references public.job_postings(id) on delete cascade,
  status        text default 'applied'
                check (status in ('applied','shortlisted','rejected','selected','on_hold')),
  stage         text default 'applied'
                check (stage in ('applied','oa_cleared','interview_1_cleared',
                                 'interview_2_cleared','selected','rejected')),
  stage_history jsonb default '[]'::jsonb,   -- [{stage, at}]
  applied_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (student_id, job_id)
);
create index if not exists idx_app_student on public.applications(student_id);
create index if not exists idx_app_job     on public.applications(job_id);

-- ANNOUNCEMENTS ---------------------------------------------------------------
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  content    text not null,
  priority   text default 'info',
  type       text,
  company_id uuid references public.companies(id) on delete set null,
  job_id     uuid references public.job_postings(id) on delete set null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- APTITUDE --------------------------------------------------------------------
create table if not exists public.aptitude_tests (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  duration_minutes integer,
  total_questions  integer,
  created_at       timestamptz not null default now()
);
create table if not exists public.aptitude_questions (
  id             uuid primary key default gen_random_uuid(),
  test_id        uuid references public.aptitude_tests(id) on delete cascade,
  question_text  text not null,
  options        jsonb not null,
  correct_answer integer not null,      -- 0-indexed
  topic          text default 'General',
  marks          integer default 4,
  negative_marks numeric(4,2) default 1,
  difficulty     text default 'medium'
);
create index if not exists idx_aptq_test on public.aptitude_questions(test_id);
create table if not exists public.aptitude_attempts (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid references public.users(id) on delete cascade,
  test_id      uuid references public.aptitude_tests(id) on delete cascade,
  score        numeric,
  total_marks  numeric,
  correct      integer,
  wrong        integer,
  unattempted  integer,
  answers      jsonb,
  started_at   timestamptz,
  submitted_at timestamptz not null default now()
);
create index if not exists idx_apta_student on public.aptitude_attempts(student_id);

-- DSA -------------------------------------------------------------------------
create table if not exists public.dsa_problems (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  difficulty   text check (difficulty in ('Easy','Medium','Hard')),
  tags         jsonb default '[]'::jsonb,
  examples     jsonb default '[]'::jsonb,
  constraints  jsonb default '[]'::jsonb,
  test_cases   jsonb default '[]'::jsonb,
  starter_code jsonb default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create table if not exists public.dsa_submissions (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid references public.users(id) on delete cascade,
  problem_id        uuid references public.dsa_problems(id) on delete cascade,
  language          text,
  code              text,
  status            text,
  runtime_ms        integer,
  memory_mb         numeric,
  test_cases_passed integer,
  submitted_at      timestamptz not null default now()
);
create index if not exists idx_dsa_sub_student on public.dsa_submissions(student_id);
create index if not exists idx_dsa_sub_problem on public.dsa_submissions(problem_id);

-- MOCK OA (recruiter-uploaded, admin-approved practice tests) ------------------
create table if not exists public.mock_oa_tests (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid references public.companies(id) on delete cascade,
  type             text,
  title            text not null,
  duration         integer default 60,
  status           text default 'pending' check (status in ('pending','approved','rejected')),
  total_marks      integer not null default 0,
  sections         jsonb   not null default '[]'::jsonb,
  rejection_reason text,
  reviewed_at      timestamptz,
  reviewed_by      uuid references public.users(id) on delete set null,
  created_at       timestamptz not null default now()
);
create table if not exists public.mock_oa_questions (
  id            uuid primary key default gen_random_uuid(),
  test_id       uuid references public.mock_oa_tests(id) on delete cascade,
  question_text text not null,
  type          text default 'mcq',
  section       text not null default 'general',
  options       jsonb,
  correct_index integer,
  marks         integer default 4,
  ordering      integer default 0
);
create index if not exists idx_moaq_test on public.mock_oa_questions(test_id);
create table if not exists public.mock_oa_attempts (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid references public.users(id) on delete cascade,
  test_id      uuid references public.mock_oa_tests(id) on delete cascade,
  score        numeric,
  answers      jsonb,
  pct          integer,
  passed_mcq   integer,
  wrong_mcq    integer,
  skipped_mcq  integer,
  completed_at timestamptz not null default now()
);
create index if not exists idx_moa_att_student on public.mock_oa_attempts(student_id);

-- COMPANY OA (recruiter-submitted, admin-approved; single attempt) ------------
create table if not exists public.company_oa_tests (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid references public.companies(id) on delete cascade,
  submitted_by    uuid references public.users(id) on delete set null,
  title           text not null,
  description     text,
  test_type       text,
  duration        integer default 60,
  target_branches jsonb default '[]'::jsonb,
  min_cgpa        numeric(4,2) default 0,
  instructions    text,
  approval_status text default 'pending' check (approval_status in ('pending','approved','rejected')),
  approval_note   text,
  approved_by     uuid references public.users(id) on delete set null,
  approved_at     timestamptz,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);
create table if not exists public.company_oa_questions (
  id             uuid primary key default gen_random_uuid(),
  test_id        uuid references public.company_oa_tests(id) on delete cascade,
  ordering       integer default 0,
  section        text default 'General',
  question_type  text default 'mcq',
  marks          integer default 1,
  negative_marks numeric(4,2) default 0.25,
  question_text  text not null,
  options        jsonb,
  correct_index  integer,
  explanation    text,
  placeholder    text,
  word_limit     integer default 200
);
create index if not exists idx_coaq_test on public.company_oa_questions(test_id);
create table if not exists public.company_oa_attempts (
  id             uuid primary key default gen_random_uuid(),
  test_id        uuid references public.company_oa_tests(id) on delete cascade,
  student_id     uuid references public.users(id) on delete cascade,
  answers        jsonb,
  score          numeric,
  max_score      numeric,
  pct            integer,
  grade          text,
  correct_count  integer,
  wrong_count    integer,
  skipped_count  integer,
  time_taken     integer,
  auto_submitted boolean default false,
  completed_at   timestamptz not null default now(),
  unique (test_id, student_id)          -- one attempt per student
);
create index if not exists idx_coa_att_student on public.company_oa_attempts(student_id);

-- INTERVIEW SESSIONS (AI mock interview) --------------------------------------
create table if not exists public.interview_sessions (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid references public.users(id) on delete cascade,
  duration_seconds  integer,
  overall_score     integer,
  eye_contact_score integer,
  confidence_score  integer,
  attention_score   integer,
  stress_score      integer,
  ai_feedback       jsonb,
  conducted_at      timestamptz not null default now()
);
create index if not exists idx_interview_student on public.interview_sessions(student_id);

-- ============================================================================
-- PHASE 1 additions (also in db/migrations/001_phase1.sql)
-- ============================================================================

-- In-app notification centre
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users(id) on delete cascade,
  title      text not null,
  body       text,
  type       text,        -- job_posted | stage_advanced | selected | rejected | oa_approved | system
  link       text,        -- in-app route, e.g. /student/jobs
  is_read    boolean not null default false,
  metadata   jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_notif_user   on public.notifications(user_id);
create index if not exists idx_notif_unread on public.notifications(user_id, is_read);

-- Email OTP verification codes
create table if not exists public.email_verifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users(id) on delete cascade,
  email      text not null,
  code_hash  text not null,          -- bcrypt hash of the 6-digit code
  expires_at timestamptz not null,
  attempts   integer not null default 0,
  consumed   boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_emailver_user  on public.email_verifications(user_id);
create index if not exists idx_emailver_email on public.email_verifications(email);
