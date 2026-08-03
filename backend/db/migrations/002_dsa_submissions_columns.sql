-- Migration 002: fix schema drift on dsa_submissions
-- The live table was created by the older "basic" SmartHire schema and is
-- missing columns that the current backend (routes/dsa.js) relies on.
-- `create table if not exists` never adds columns to an existing table,
-- so they must be added explicitly here.

alter table public.dsa_submissions
  add column if not exists status            text,
  add column if not exists memory_mb         numeric,
  add column if not exists test_cases_passed integer;
