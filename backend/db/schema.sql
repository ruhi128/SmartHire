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
-- For an already-populated database, prefer the ordered incremental files in
--   db/migrations/001_phase1.sql through db/migrations/008_seed_dsa_practice_problems.sql
-- so deployment history remains explicit.
-- ============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- USERS (mirrors auth.users) --------------------------------------------------
create table if not exists public.users (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text unique not null,
  role           text not null check (role in ('student','recruiter','admin')),
  is_active         boolean not null default true,
  email_verified    boolean not null default false,   -- Phase 1: email-OTP gate
  avatar_path       text,                              -- private Storage object path
  avatar_updated_at timestamptz,
  created_at        timestamptz not null default now()
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

-- ── Proctoring (Phase 2) ──────────────────────────────────────────────────
create table if not exists public.proctoring_violations (
  id          uuid primary key default gen_random_uuid(),
  attempt_id  uuid references public.mock_oa_attempts(id) on delete cascade,
  student_id  uuid references public.users(id) on delete cascade,
  test_id     uuid,
  type        text not null,
  detail      text,
  occurred_at timestamptz not null default now()
);
create index if not exists idx_proctoring_attempt on public.proctoring_violations(attempt_id);
create index if not exists idx_proctoring_student on public.proctoring_violations(student_id);

alter table public.mock_oa_attempts add column if not exists integrity_score    integer;
alter table public.mock_oa_attempts add column if not exists violation_count    integer default 0;
alter table public.mock_oa_attempts add column if not exists terminated         boolean default false;
alter table public.mock_oa_attempts add column if not exists proctoring_summary jsonb;

-- ── Job documents (Phase 2) ────────────────────────────────────────────────
-- Recruiter-uploaded PDFs (JD + evaluation details), public URLs in `resumes` bucket.
alter table public.job_postings add column if not exists jd_doc_url   text;
alter table public.job_postings add column if not exists eval_doc_url text;

-- ── Mobile notification delivery ────────────────────────────────────────────
-- Mobile uses the shared `public.notifications` inbox above as its authoritative
-- store. The optional private Expo-device registry and short-lived receipt queue
-- are introduced later by forward-only migrations `009_enable_mobile_push_devices.sql`
-- and `010_add_expo_push_receipt_jobs.sql`; do not add them to this baseline
-- schema or edit historical migrations to enable remote push.

-- ── Authenticated profile avatars (all roles) ──────────────────────────────
-- Keep image metadata with the common account row rather than only the student
-- profile, since recruiters and administrators can also use a profile photo.
alter table public.users add column if not exists avatar_path       text;
alter table public.users add column if not exists avatar_updated_at timestamptz;

-- The backend accesses this bucket with the service-role client and returns
-- bytes only through /api/auth/avatar after JWT verification. It must remain
-- private: no public or signed storage URL is stored in user profile data.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do update set public = false;

-- Do not create an authenticated-client read/upload policy for this bucket.
-- The Express service-role client bypasses RLS after it validates SmartHire's
-- JWT; all browsers/mobile apps use /api/auth/avatar instead of Storage APIs.
-- This restrictive guard also wins over any accidental future permissive
-- storage policy and leaves policies for all non-avatar buckets unaffected.
drop policy if exists "avatars_backend_only" on storage.objects;
create policy "avatars_backend_only"
  on storage.objects as restrictive
  for all
  to public
  using (bucket_id <> 'avatars')
  with check (bucket_id <> 'avatars');

-- ── Seeded DSA practice catalogue (mirrors migration 008) ─────────────────

WITH seed(title, description, difficulty, tags, examples, constraints, test_cases, starter_code) AS (
  VALUES
  (
    $seed$Two Sum$seed$,
    $seed$Given an array of integers nums and an integer target, return the indices of the two numbers whose sum is target. You may assume exactly one answer exists, and you may not use the same element twice.$seed$,
    $seed$Easy$seed$,
    $json$["Array","Hash Table"]$json$::jsonb,
    $json$[{"input":"nums = [2, 7, 11, 15], target = 9","output":"[0, 1]","explanation":"nums[0] + nums[1] equals 9."}]$json$::jsonb,
    $json$["2 <= nums.length <= 10^4","Each input has exactly one solution."]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"twoSum","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[2,7,11,15],9],"expected":[0,1]},{"args":[[3,2,4],6],"expected":[1,2]},{"args":[[3,3],6],"expected":[0,1]}]}$json$::jsonb,
    $json${"python":"def twoSum(nums, target):\n    # Return the indices of the two values that add to target.\n    pass\n","javascript":"function twoSum(nums, target) {\n  // Return the indices of the two values that add to target.\n}\n"}$json$::jsonb
  ),
  (
    $seed$Valid Parentheses$seed$,
    $seed$Given a string containing only parentheses characters, determine whether the input string is valid. Open brackets must be closed by the same type of bracket and in the correct order.$seed$,
    $seed$Easy$seed$,
    $json$["String","Stack"]$json$::jsonb,
    $json$[{"input":"s = \"()[]{}\"","output":"true","explanation":"Every opening bracket is closed in the proper order."}]$json$::jsonb,
    $json$["1 <= s.length <= 10^4","s contains only ()[]{} characters."]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"isValid","compare":"strict","languages":["python","javascript"]},"cases":[{"args":["()[]{}"],"expected":true},{"args":["(]"],"expected":false},{"args":["{[]}"],"expected":true}]}$json$::jsonb,
    $json${"python":"def isValid(s):\n    # Return True when every bracket is matched correctly.\n    pass\n","javascript":"function isValid(s) {\n  // Return true when every bracket is matched correctly.\n}\n"}$json$::jsonb
  ),
  (
    $seed$Reverse Linked List$seed$,
    $seed$Given the head of a singly linked list, reverse the list and return its new head. The runner provides a ListNode class with val and next fields.$seed$,
    $seed$Easy$seed$,
    $json$["Linked List","Recursion"]$json$::jsonb,
    $json$[{"input":"head = [1, 2, 3, 4, 5]","output":"[5, 4, 3, 2, 1]","explanation":"The links are reversed from tail to head."}]$json$::jsonb,
    $json$["The number of nodes is in the range [0, 5000].","-5000 <= Node.val <= 5000."]$json$::jsonb,
    $json${"execution":{"kind":"linked-list","method":"reverseList","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[1,2,3,4,5]],"expected":[5,4,3,2,1]},{"args":[[1,2]],"expected":[2,1]},{"args":[[]],"expected":[]}]}$json$::jsonb,
    $json${"python":"def reverseList(head):\n    # ListNode has .val and .next. Return the reversed head.\n    pass\n","javascript":"function reverseList(head) {\n  // ListNode has .val and .next. Return the reversed head.\n}\n"}$json$::jsonb
  ),
  (
    $seed$Maximum Depth of Binary Tree$seed$,
    $seed$Given the root of a binary tree, return its maximum depth: the number of nodes along the longest path from the root down to a leaf. The runner provides TreeNode values with left and right fields.$seed$,
    $seed$Easy$seed$,
    $json$["Tree","Depth-First Search","Breadth-First Search"]$json$::jsonb,
    $json$[{"input":"root = [3, 9, 20, null, null, 15, 7]","output":"3","explanation":"The longest root-to-leaf path contains three nodes."}]$json$::jsonb,
    $json$["The number of nodes is in the range [0, 10^4].","-100 <= Node.val <= 100."]$json$::jsonb,
    $json${"execution":{"kind":"tree-call","method":"maxDepth","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[3,9,20,null,null,15,7]],"expected":3},{"args":[[1,null,2]],"expected":2},{"args":[[]],"expected":0}]}$json$::jsonb,
    $json${"python":"def maxDepth(root):\n    # TreeNode has .val, .left, and .right.\n    pass\n","javascript":"function maxDepth(root) {\n  // TreeNode has .val, .left, and .right.\n}\n"}$json$::jsonb
  ),
  (
    $seed$Binary Search$seed$,
    $seed$Given a sorted array of distinct integers and a target value, return the target index if it exists; otherwise return -1. Your algorithm should run in logarithmic time.$seed$,
    $seed$Easy$seed$,
    $json$["Array","Binary Search"]$json$::jsonb,
    $json$[{"input":"nums = [-1, 0, 3, 5, 9, 12], target = 9","output":"4","explanation":"9 appears at index 4."}]$json$::jsonb,
    $json$["1 <= nums.length <= 10^4","nums is sorted in ascending order with distinct values."]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"search","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[-1,0,3,5,9,12],9],"expected":4},{"args":[[-1,0,3,5,9,12],2],"expected":-1},{"args":[[5],5],"expected":0}]}$json$::jsonb,
    $json${"python":"def search(nums, target):\n    # Return target index, or -1 when target is absent.\n    pass\n","javascript":"function search(nums, target) {\n  // Return target index, or -1 when target is absent.\n}\n"}$json$::jsonb
  ),
  (
    $seed$Number of Islands$seed$,
    $seed$Given a grid of 1s (land) and 0s (water), return the number of islands. An island is formed by horizontally or vertically adjacent land cells.$seed$,
    $seed$Medium$seed$,
    $json$["Array","Depth-First Search","Breadth-First Search","Matrix"]$json$::jsonb,
    $json$[{"input":"grid = [[\"1\",\"1\",\"0\"],[\"0\",\"1\",\"0\"],[\"0\",\"0\",\"1\"]]","output":"2","explanation":"There is one island in the upper-left and one in the lower-right."}]$json$::jsonb,
    $json$["1 <= grid.length, grid[0].length <= 300","grid[i][j] is \"0\" or \"1\"."]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"numIslands","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[["1","1","0"],["0","1","0"],["0","0","1"]]],"expected":2},{"args":[[["1","1","0","0"],["1","0","0","1"],["0","0","1","1"]]],"expected":3},{"args":[[["0"]]],"expected":0}]}$json$::jsonb,
    $json${"python":"def numIslands(grid):\n    # Return the number of connected land regions.\n    pass\n","javascript":"function numIslands(grid) {\n  // Return the number of connected land regions.\n}\n"}$json$::jsonb
  ),
  (
    $seed$Merge Intervals$seed$,
    $seed$Given an array of intervals where intervals[i] = [start, end], merge all overlapping intervals and return the non-overlapping intervals that cover the input.$seed$,
    $seed$Medium$seed$,
    $json$["Array","Sorting","Intervals"]$json$::jsonb,
    $json$[{"input":"intervals = [[1,3],[2,6],[8,10],[15,18]]","output":"[[1,6],[8,10],[15,18]]","explanation":"[1,3] and [2,6] overlap and are combined."}]$json$::jsonb,
    $json$["1 <= intervals.length <= 10^4","0 <= start <= end <= 10^4."]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"merge","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[[1,3],[2,6],[8,10],[15,18]]],"expected":[[1,6],[8,10],[15,18]]},{"args":[[[1,4],[4,5]]],"expected":[[1,5]]},{"args":[[[1,4],[0,0]]],"expected":[[0,0],[1,4]]}]}$json$::jsonb,
    $json${"python":"def merge(intervals):\n    # Return the merged intervals in ascending order.\n    pass\n","javascript":"function merge(intervals) {\n  // Return the merged intervals in ascending order.\n}\n"}$json$::jsonb
  ),
  (
    $seed$LRU Cache$seed$,
    $seed$Design a least recently used cache with get and put operations. get returns the value for a key or -1 when absent. When the cache exceeds capacity, remove the least recently used key.$seed$,
    $seed$Medium$seed$,
    $json$["Hash Table","Linked List","Design"]$json$::jsonb,
    $json$[{"input":"capacity = 2; put(1,1); put(2,2); get(1); put(3,3); get(2)","output":"[1, -1]","explanation":"Adding key 3 evicts key 2 because it is least recently used."}]$json$::jsonb,
    $json$["1 <= capacity <= 3000","0 <= key, value <= 10^4."]$json$::jsonb,
    $json${"execution":{"kind":"lru-cache","className":"LRUCache","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[2,[["put",1,1],["put",2,2],["get",1],["put",3,3],["get",2],["put",4,4],["get",1],["get",3],["get",4]]],"expected":[1,-1,-1,3,4]},{"args":[1,[["put",2,1],["get",2],["put",3,2],["get",2],["get",3]]],"expected":[1,-1,2]}]}$json$::jsonb,
    $json${"python":"class LRUCache:\n    def __init__(self, capacity):\n        # Initialize the cache.\n        pass\n\n    def get(self, key):\n        # Return the value or -1.\n        return -1\n\n    def put(self, key, value):\n        # Store or update key.\n        pass\n","javascript":"class LRUCache {\n  constructor(capacity) {\n    // Initialize the cache.\n  }\n\n  get(key) {\n    // Return the value or -1.\n    return -1;\n  }\n\n  put(key, value) {\n    // Store or update key.\n  }\n}\n"}$json$::jsonb
  ),
  (
    $seed$Min Stack$seed$,
    $seed$Design a stack that supports push, pop, top, and retrieving the minimum element in constant time. The runner records results from top and getMin operations.$seed$,
    $seed$Medium$seed$,
    $json$["Stack","Design"]$json$::jsonb,
    $json$[{"input":"push(-2); push(0); push(-3); getMin(); pop(); top(); getMin()","output":"[-3, 0, -2]","explanation":"The minimum changes after the top element is removed."}]$json$::jsonb,
    $json$["-2^31 <= val <= 2^31 - 1","pop, top and getMin are called only on non-empty stacks."]$json$::jsonb,
    $json${"execution":{"kind":"min-stack","className":"MinStack","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[["push",-2],["push",0],["push",-3],["getMin"],["pop"],["top"],["getMin"]]],"expected":[-3,0,-2]},{"args":[[["push",5],["push",2],["push",4],["getMin"],["pop"],["getMin"]]],"expected":[2,2]}]}$json$::jsonb,
    $json${"python":"class MinStack:\n    def __init__(self):\n        # Initialize the stack.\n        pass\n\n    def push(self, value):\n        pass\n\n    def pop(self):\n        pass\n\n    def top(self):\n        return None\n\n    def getMin(self):\n        return None\n","javascript":"class MinStack {\n  constructor() {\n    // Initialize the stack.\n  }\n\n  push(value) {}\n\n  pop() {}\n\n  top() { return null; }\n\n  getMin() { return null; }\n}\n"}$json$::jsonb
  ),
  (
    $seed$Clone Graph$seed$,
    $seed$Given a reference to a node in a connected undirected graph, return a deep copy of the graph. The graph is serialized as an adjacency list and the runner provides Node objects with val and neighbors.$seed$,
    $seed$Medium$seed$,
    $json$["Hash Table","Depth-First Search","Breadth-First Search","Graph"]$json$::jsonb,
    $json$[{"input":"adjList = [[2,4],[1,3],[2,4],[1,3]]","output":"[[2,4],[1,3],[2,4],[1,3]]","explanation":"Return a new graph with the same connections."}]$json$::jsonb,
    $json$["The graph has at most 100 nodes.","Each node value is unique."]$json$::jsonb,
    $json${"execution":{"kind":"clone-graph","method":"cloneGraph","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[[2,4],[1,3],[2,4],[1,3]]],"expected":[[2,4],[1,3],[2,4],[1,3]]},{"args":[[]],"expected":[]}]}$json$::jsonb,
    $json${"python":"def cloneGraph(node):\n    # Node has .val and .neighbors. Return a deep copy.\n    pass\n","javascript":"function cloneGraph(node) {\n  // Node has .val and .neighbors. Return a deep copy.\n}\n"}$json$::jsonb
  ),
  (
    $seed$Lowest Common Ancestor of a Binary Search Tree$seed$,
    $seed$Given a binary search tree and two nodes p and q, return their lowest common ancestor. The runner passes p and q as values that exist in the tree.$seed$,
    $seed$Medium$seed$,
    $json$["Tree","Binary Search Tree","Depth-First Search"]$json$::jsonb,
    $json$[{"input":"root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 8","output":"6","explanation":"6 is the lowest node with p and q in separate subtrees."}]$json$::jsonb,
    $json$["The number of nodes is in the range [2, 10^5].","p and q exist in the tree."]$json$::jsonb,
    $json${"execution":{"kind":"tree-lca","method":"lowestCommonAncestor","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[6,2,8,0,4,7,9,null,null,3,5],2,8],"expected":6},{"args":[[6,2,8,0,4,7,9,null,null,3,5],2,4],"expected":2}]}$json$::jsonb,
    $json${"python":"def lowestCommonAncestor(root, p, q):\n    # Return the TreeNode that is the lowest common ancestor.\n    pass\n","javascript":"function lowestCommonAncestor(root, p, q) {\n  // Return the TreeNode that is the lowest common ancestor.\n}\n"}$json$::jsonb
  ),
  (
    $seed$House Robber$seed$,
    $seed$You are planning to rob houses along a street. Adjacent houses cannot both be robbed. Return the maximum amount of money you can rob without alerting the police.$seed$,
    $seed$Medium$seed$,
    $json$["Array","Dynamic Programming"]$json$::jsonb,
    $json$[{"input":"nums = [2, 7, 9, 3, 1]","output":"12","explanation":"Rob houses with values 2, 9, and 1."}]$json$::jsonb,
    $json$["1 <= nums.length <= 100","0 <= nums[i] <= 400."]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"rob","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[1,2,3,1]],"expected":4},{"args":[[2,7,9,3,1]],"expected":12},{"args":[[2,1,1,2]],"expected":4}]}$json$::jsonb,
    $json${"python":"def rob(nums):\n    # Return the maximum non-adjacent sum.\n    pass\n","javascript":"function rob(nums) {\n  // Return the maximum non-adjacent sum.\n}\n"}$json$::jsonb
  )
), upgraded AS (
  UPDATE public.dsa_problems AS existing
  SET
    title = seed.title,
    description = seed.description,
    difficulty = seed.difficulty,
    tags = seed.tags,
    examples = seed.examples,
    constraints = seed.constraints,
    test_cases = seed.test_cases,
    starter_code = seed.starter_code
  FROM seed
  WHERE lower(trim(existing.title)) = lower(trim(seed.title))
  RETURNING existing.id
)
INSERT INTO public.dsa_problems (
  title, description, difficulty, tags, examples, constraints, test_cases, starter_code
)
SELECT
  seed.title, seed.description, seed.difficulty, seed.tags, seed.examples,
  seed.constraints, seed.test_cases, seed.starter_code
FROM seed
WHERE NOT EXISTS (
  SELECT 1
  FROM public.dsa_problems AS existing
  WHERE lower(trim(existing.title)) = lower(trim(seed.title))
);

-- Data-modifying CTEs execute once even when their RETURNING rows are not
-- consumed. New installs receive all rows; repeated runs upgrade canonical
-- rows rather than inserting title duplicates.
