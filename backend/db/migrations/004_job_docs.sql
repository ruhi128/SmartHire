-- 004_job_docs.sql
-- Recruiter-uploaded documents attached to a job posting:
--   jd_doc_url   → company Job Description PDF
--   eval_doc_url → evaluation / assessment details PDF
-- Both are public URLs in the existing Supabase Storage `resumes` bucket
-- (stored under a `job-docs/<recruiterId>/` prefix).

alter table public.job_postings add column if not exists jd_doc_url   text;
alter table public.job_postings add column if not exists eval_doc_url text;
