# SmartHire — Setup Guide (Phase 1)

Smart Campus Recruitment & Assessment System. This guide gets **Phase 1** running
locally: email-OTP authentication, in-app notifications, the application pipeline,
and company-on-campus emails.

---

## 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | **20 LTS** | Required — `@supabase/supabase-js` v2 needs global `fetch`/`Headers`. Node 16 will crash. |
| npm | 9+ | Ships with Node 20 |
| A **Supabase** project | — | Free tier is fine |
| A Gmail (or SMTP) account | — | For sending OTP + campus emails |

Check your version:

```bash
node -v   # must print v20.x
```

If you use volta: `volta install node@20`.

---

## 2. Database

1. Open your Supabase project → **SQL Editor**.
2. **Fresh project?** Run the full baseline:
   - Paste and run [`backend/db/schema.sql`](backend/db/schema.sql).
3. **Existing SmartHire DB?** Apply the Phase 1 migration instead:
   - Paste and run [`backend/db/migrations/001_phase1.sql`](backend/db/migrations/001_phase1.sql).
   - This adds `users.email_verified`, `applications.stage` + `stage_history`,
     the `notifications` and `email_verifications` tables, plus constraints/indexes.
4. **Also run** [`backend/db/migrations/002_dsa_submissions_columns.sql`](backend/db/migrations/002_dsa_submissions_columns.sql)
   — adds `status`, `memory_mb`, `test_cases_passed` to `dsa_submissions` (needed for
   DSA submissions + the DSA Performance tab). Older "basic" DBs are missing these.
5. **Also run** [`backend/db/migrations/003_proctoring.sql`](backend/db/migrations/003_proctoring.sql)
   — adds the `proctoring_violations` table and integrity columns
   (`integrity_score`, `violation_count`, `terminated`, `proctoring_summary`) to
   `mock_oa_attempts` (needed to persist Mock OA proctoring results). Submissions still
   work without it, but violations won't be saved until this is applied.

6. **Also run** [`backend/db/migrations/004_job_docs.sql`](backend/db/migrations/004_job_docs.sql)
   — adds `jd_doc_url` and `eval_doc_url` columns to `job_postings` so recruiters can
   attach a Job Description PDF and an Evaluation Details PDF when posting a job. Job posting
   still works without it (the URLs are silently skipped), but the documents won't be saved
   or shown to officers/students until this is applied.

All scripts are idempotent (`IF NOT EXISTS`), so re-running is safe.

---

## 3. Backend

```bash
cd backend
cp .env.example .env      # then edit .env with your real values
npm install
npm run dev               # or: node server.js
```

> 💡 **Filled-in values:** the exact working values for both `.env` files are kept in
> `ENV_VALUES.local.md` at the repo root (git-ignored — it holds live secrets and must
> never be committed to the public repo). Copy from there, or follow the guidance below.

Fill in `.env`:

- **SUPABASE_URL / SUPABASE_SERVICE_KEY** — Supabase → Project Settings → API
  (use the **service_role** key here, backend only).
- **JWT_SECRET** — any long random string.
- **EMAIL_USER / EMAIL_PASS** — for Gmail, create an
  [App Password](https://myaccount.google.com/apppasswords) (not your login password).
- **CLIENT_URL** — `http://localhost:3000` in dev.

You should see `Server running on port 5000`. If email creds are missing, the server
still boots — OTP emails are simply skipped and logged.

---

## 4. Frontend

```bash
cd frontend
cp .env.example .env      # then edit with your Supabase URL + anon key
npm install
npm start
```

- **REACT_APP_SUPABASE_URL** — same project URL.
- **REACT_APP_SUPABASE_ANON_KEY** — the **anon/public** key (safe for the browser).
- **REACT_APP_API_URL** — `http://localhost:5000`.

App opens at `http://localhost:3000`.

---

## 5. Verify Phase 1 end-to-end

1. **Register** a student → you're taken to the **Verify Email** screen.
2. Check your inbox for the **6-digit code** → enter it → redirected to login.
   *(No email? Check the backend console — the code path logs failures. Use **Resend code**.)*
3. **Log in** — unverified accounts are blocked and bounced back to verification.
4. As a **recruiter**, post a job. As an **admin**, approve it →
   eligible students receive an **email** + an **in-app notification** (🔔 top-right).
5. A student **applies**; the recruiter opens **Applicants** and advances the
   candidate through the pipeline (Applied → OA → Interview 1/2 → Selected).
6. The student sees the live **status timeline** update under **My Applications**,
   and gets a notification at each stage.

---

## 6. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Backend crashes on boot with `Headers is not defined` | You're on Node < 20. Switch to Node 20. |
| OTP email never arrives | Verify `EMAIL_USER`/`EMAIL_PASS` (Gmail App Password), check backend logs, use **Resend code**. |
| `column ... does not exist` errors | Run the Phase 1 migration (step 2). |
| Notifications bell empty | Confirm the `notifications` table exists and you're logged in. |
| Realtime timeline not updating | Set the frontend Supabase env vars; Realtime uses the anon key. |

---

See [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md) for the full 3-phase roadmap.
