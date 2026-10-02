# SmartHire — Smart Campus Recruitment & Assessment System
## 3‑Phase Development Plan

> **Purpose of this document:** a mentor‑presentable roadmap that turns the current
> basic prototype into a complete, production‑style campus placement platform with a
> student mobile app. Each phase ends in a **self‑contained, demoable milestone**.

---

## 1. Product Vision

SmartHire is a single portal that connects the three parties in campus placements:

| Interface | Primary user | What they do |
|-----------|--------------|--------------|
| **Student** | Final‑year students | Build profile & resume, apply to on‑campus jobs, take **Mock OA** (proctored), give **AI Mock Interviews**, practice **DSA**, track application status, get notified. |
| **Placement Officer (Admin)** | T&P cell | Approve recruiter jobs & OA tests, manage students branch‑wise (placed/unplaced filters, CGPA filters), view placement statistics, broadcast announcements. |
| **Recruiter (Company)** | Visiting companies | Post job (JD, stipend/CTC, #positions, OA/interview dates), upload OA tests, review applicants, advance candidates through rounds. |

A **student mobile app** (Phase 3) delivers push notifications, live status tracking,
upcoming‑company deadlines, one‑tap *Easy Apply*, and study/OA recommendations.

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend (web)** | React 19 (CRA), React Router 7, Tailwind CSS, Recharts, Monaco Editor, face‑api.js |
| **Backend** | Node.js + Express 5, JWT, express‑validator, Helmet, rate‑limiting |
| **Database & Auth** | Supabase (PostgreSQL + Supabase Auth + Storage) |
| **Email** | Nodemailer (SMTP) |
| **Code execution** | Self‑hosted Judge0 CE (Docker) |
| **AI features** | OpenAI / Gemini API (interview questions, speech analysis, smart OA) |
| **Mobile (Phase 3)** | React Native + Expo (push notifications via Expo/FCM/APNs) |

---

## 3. Current State vs. Target (Gap Analysis)

| Capability | Today (prototype) | Target |
|------------|-------------------|--------|
| DB schema | Tables exist in Supabase but **no migration/SQL in repo** | Versioned, documented migrations |
| Authentication | Supabase Auth, **email auto‑confirmed — no verification** | **Email OTP (code) verification** + secure login |
| "Company on campus" email | Only an in‑app announcement row | **Email to all eligible students** + in‑app + push |
| Application tracking | Flat status (`applied/shortlisted/selected/rejected`) | **Staged pipeline** with tick‑mark timeline |
| Notifications | Email only, ad‑hoc | **In‑app notification centre** + push (mobile) |
| Mock OA questions | Manually uploaded to DB | Question bank + **fetch real questions from open GitHub resources** + AI generation |
| Proctoring | MockOA only listens to window `blur`; violations `console.log` only | **Fullscreen enforce + tab‑switch + copy/paste + camera face‑presence**, persisted |
| Mock Interview | Heuristic text analysis, face metrics | **AI question generation + speech‑to‑text + AI answer analysis + detailed report** |
| Admin analytics | Basic counts | Salary/CTC bands, branch heatmaps, PDF/CSV export |
| Mobile app | None | React Native + Expo companion app |

---

## 4. Cross‑Cutting Foundation (built at the start of Phase 1)

These unblock everything and must land first.

### 4.1 Database migrations
- Reverse‑engineer the full schema (18 tables) into `backend/db/schema.sql`.
- **Review every table against requirements** and adjust column types / constraints
  where the prototype was inconsistent (e.g. missing NOT NULLs, missing indexes,
  missing unique constraints on `applications(student_id, job_id)` and
  `company_oa_attempts(test_id, student_id)`).
- New Phase‑1 tables: `notifications`, `email_verifications`; new columns:
  `applications.stage`, `applications.stage_history`.
- Apply as an incremental migration on the existing Supabase project (idempotent,
  `IF NOT EXISTS`).

### 4.2 Environment & docs
- `backend/.env.example`, `frontend/.env.example`, and `SETUP.md` so the project runs
  end‑to‑end on the user's Supabase project.

---

## 5. Phase 1 — "The Recruitment Loop, Done Right" (Web)

**Goal:** a complete, trustworthy recruiter → admin → student flow with real email
verification and live notifications.

### 5.1 Deliverables

1. **Foundation** (Section 4): migrations, `.env.example`, `SETUP.md`.

2. **Email‑OTP Authentication** *(new requirement)*
   - Registration no longer auto‑confirms. Flow:
     `Register → 6‑digit code emailed → Verify code → account activated → Login`.
   - New `email_verifications` table (hashed code, `expires_at` ≈ 10 min, attempt
     counter, resend cooldown).
   - Endpoints: `POST /auth/register` (creates inactive user + sends code),
     `POST /auth/verify-email`, `POST /auth/resend-code`.
   - Login blocked until verified; clear error + resend option in UI.
   - Uses existing Nodemailer + a branded OTP email template.

3. **"Company on campus" email** *(new requirement)*
   - When admin **approves a job**, email **all eligible students** (branch + CGPA +
     backlog filter), plus create in‑app notifications. Fire‑and‑forget, non‑blocking.

4. **In‑app notification centre**
   - New `notifications` table + REST API (`list`, `unread-count`, `mark-read`,
     `mark-all-read`).
   - Bell icon + dropdown feed in all three layouts.
   - Auto‑fires on: job approved/posted, OA approved, application stage advanced,
     selected/rejected.

5. **Application pipeline stages**
   - Replace flat status with an ordered pipeline:
     `Applied → OA Cleared → Interview 1 Cleared → Interview 2 Cleared → Selected / Rejected`.
   - `stage_history` records timestamps → renders a **tick‑mark timeline** for the
     student and a stage‑advance control for the recruiter.

### 5.2 Data model changes
- `notifications(id, user_id, title, body, type, link, is_read, metadata, created_at)`
- `email_verifications(id, user_id, email, code_hash, expires_at, attempts, consumed, created_at)`
- `applications`: add `stage TEXT`, `stage_history JSONB`.

### 5.3 Mentor demo (end of Phase 1)
1. Register a student → receive a **verification code by email** → verify → log in.
2. Recruiter posts a job → admin approves → **eligible students get an email** and an
   in‑app notification instantly.
3. Student applies → recruiter advances them OA → Interview 1 → the student watches
   their **status timeline fill with ✓** and gets notified at each step.

---

## 6. Phase 2 — "The Assessment Engine" (Web)

**Goal:** proctored assessments and an AI‑driven mock interview with detailed reports.

### 6.1 Deliverables

1. **Mock OA content pipeline**
   - Curated question bank + **fetcher that pulls real OA questions from open GitHub
     resources**, normalised into `mock_oa_questions`.
   - Optional **AI question generation** (OpenAI/Gemini) by company/topic/difficulty.
   - Student selects which company's OA to attempt.

2. **Full proctoring** (`proctoring_violations` table)
   - Enforced **fullscreen**; exit → warning/auto‑submit.
   - **Tab‑switch / window‑blur / copy‑paste** detection with strike counting.
   - **Camera face‑presence** via face‑api.js (no face / multiple faces flags).
   - Every event persisted and shown in a post‑test integrity report.

3. **AI Mock Interview**
   - **OpenAI/Gemini** generates role‑specific questions.
   - **Speech‑to‑text** captures spoken answers.
   - AI analyses content, relevance, and communication → **detailed score report**
     (strengths, improvement areas, per‑answer feedback), stored in `interview_sessions`.

4. **DSA practice** section fully wired on Judge0 (run/submit, verdicts, performance).

### 6.2 Mentor demo (end of Phase 2)
- Student starts a company Mock OA → goes fullscreen → switching tabs is caught and
  logged → submits → sees a scored report **with an integrity summary**.
- Student does an **AI voice interview** and receives a detailed analysis.

---

## 7. Phase 3 — "Analytics + Mobile App"

**Goal:** decision‑grade admin analytics and a real student mobile app.

### 7.1 Deliverables

1. **Admin analytics**
   - Placement rate, salary/CTC bands, branch‑wise heatmaps, top companies.
   - **PDF / CSV export** for reports.

2. **Student mobile app (React Native + Expo)**
   - Supabase login (reuses backend + auth).
   - **Push notifications** (Expo → FCM/APNs) for every event from Phase 1.
   - **Status tracker** with tick marks (cleared OA ✓, interview 1 ✓ …).
   - **Upcoming companies + application deadlines**.
   - **Easy Apply** — one tap, using the profile already in the DB.
   - **Recommendations** — which OA to practice / which topics to study, derived from
     the student's aptitude, DSA, and mock‑OA performance.

### 7.2 Mentor demo (end of Phase 3)
- On a real phone: a **push notification** arrives when a recruiter advances the
  student → open the app → status timeline, upcoming deadlines, **Easy Apply**, and
  personalised practice recommendations.

---

## 8. Milestones Summary

| Phase | Theme | Headline demo |
|-------|-------|---------------|
| **1** | Recruitment loop + real auth | Email‑code signup, company‑on‑campus emails, live status timeline |
| **2** | Assessment engine | Proctored Mock OA + AI voice interview with reports |
| **3** | Analytics + mobile | Admin dashboards + student app with push notifications & Easy Apply |

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| SMTP deliverability for OTP emails | Use a verified sender; short‑expiry codes; resend with cooldown; log failures. |
| AI API cost / rate limits | Cache prompts, cap tokens, allow a mock/offline fallback for demos. |
| Proctoring false positives | Strike thresholds + warnings before auto‑submit; store evidence, don't hard‑fail. |
| Scraped OA question quality/licensing | Only use openly‑licensed sources; review/normalise before storing. |
| Scope creep across phases | Each phase is independently demoable; features gate on the foundation. |

---

## 10. Immediate Next Steps (Phase 1 kickoff)

1. Author & **review** the schema migration against these requirements (adjust types,
   add constraints/indexes, add `notifications`, `email_verifications`, `stage`).
2. Add `.env.example` files + `SETUP.md`.
3. Implement email‑OTP auth (backend + login/register UI).
4. Add "company on campus" eligible‑student emails on job approval.
5. Build the notification centre + application pipeline timeline.
6. Verify the full loop end‑to‑end and prepare the Phase‑1 demo.

*Document owner: SmartHire team · Living document — update at each phase boundary.*
