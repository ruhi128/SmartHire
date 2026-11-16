-- Mock OA: persist coding-question author data and private grading cases.
-- Apply in the Supabase SQL editor BEFORE deploying the merged mockoa.js.
-- Safe to run repeatedly; does not modify existing questions or answers.
-- Keep test_cases and explanation on the server: GET /api/mockoa/tests/:id
-- only returns public question fields and sample_input/sample_output.

alter table public.mock_oa_questions
  add column if not exists description text,
  add column if not exists explanation text,
  add column if not exists placeholder text,
  add column if not exists word_limit integer default 200,
  add column if not exists starter_code text,
  add column if not exists examples text,
  add column if not exists code_constraints text,
  add column if not exists test_cases jsonb not null default '[]'::jsonb,
  add column if not exists sample_input text,
  add column if not exists sample_output text;
