# SmartHire — Mobile App Deployment Guide

*Prepared 13 Oct 2026 after the laptop-gate / avatar / DSA-parity / notification changes below.
Everything that could be verified without your live accounts was verified in-repo (see
"Verification results"). The steps that need your Supabase / EAS / Firebase accounts and a
physical phone are marked 👉 **you do this**.*

---

## 1. What changed in this round

| # | Change | Where |
|---|--------|-------|
| 1 | **Mock OA, Company OA, Mock Interview are visible on phone but laptop-gated.** Lists, eligibility, history and past results still open in the app; tapping *Start / a test / a session* shows a prompt: *"For the best experience … please take the Mock OA on the SmartHire website using a laptop"* with an **Open website** button (deep-links to `/student/mockoa`, `/student/companyoa`, `/student/interview`). The attempt routes themselves (`MockOaAttempt`, `CompanyOaAttempt`, and Mock Interview's Start) are gated too, so old links can't start a phone attempt — important for Company OA, where a phone tap would otherwise consume the student's single attempt. | `mobile/src/components/LaptopRequired.js` (new), `PracticeHubScreen`, `MockOaListScreen`, `CompanyOaListScreen`, `InterviewHubScreen`, `InterviewResultScreen`, `MockInterviewScreen`, `MockOaAttemptScreen`, `CompanyOaAttemptScreen` |
| 2 | **Profile-photo upload fixed for the app.** Root causes found: (a) `apiUrl()` was imported by 6 screens but **never exported** from `src/api/client.js` — avatar display would crash/fail as soon as a user had a photo; (b) uploads manually set `Content-Type: multipart/form-data` without a boundary, which makes Android uploads unparseable by the backend's multer — removed from avatar, resume, ATS-PDF and job-doc uploads (React Native/axios must generate the boundary); (c) unsupported picker types now fall back to `image/jpeg` with a matching file extension instead of `application/octet-stream`. Student + Recruiter + Admin account screens all benefit. | `mobile/src/api/client.js`, `mobile/src/api/index.js`, `ProfileScreen`, `AdminAccountScreen`, `RecruiterAccountScreen` |
| 3 | **DSA practice now matches the website exactly.** The website (`frontend/.../DSACoding.jsx`) uses a hardcoded 40-problem bank with its own starters; the app read a different 13-problem DB seed with different snippets. New migration `011_sync_dsa_practice_with_website.sql` syncs the DB catalogue to the website bank — same 40 titles, descriptions, examples, constraints, **hints**, typed test cases and **starter code snippets** — upgrading existing rows by title (UUIDs/submissions preserved). The app editor also gained the website's missing pieces: **Hints**, **Reset to starter code**, **Your submissions** list, and **per-problem/per-language draft auto-save** (website uses `localStorage`; app uses AsyncStorage). ⚠️ Note: the website's "starter" snippets currently contain complete worked solutions; they were copied verbatim so app ≡ website. If you blank them on the website, regenerate the migration values too. | `backend/db/migrations/011_*.sql` (new), `mobile/.../DsaProblemScreen.js` |
| 4 | **DSA runner hardening found via the (previously failing) validator.** `backend/scripts/validate-dsa-practice.js` failed on a clean checkout before this round. Fixing it surfaced real bugs, all fixed: per-run random result marker restored (learner code printing the old static `__SMARTHIRE_RESULT__` marker, or patching `json.dumps`/`stdout.write`, could spoof a result); `GET /dsa/problems/:id` no longer leaks trusted `test_cases`; graded submit results no longer leak private test inputs/expected values (app UI now renders expected/arguments only when present); performance stats now count a problem as solved if *any* attempt was Accepted. | `backend/routes/dsa.js`, `backend/scripts/validate-dsa-practice.js` |
| 5 | **Notifications audited + closed-app fixes.** See §3. Fixes: Android manifest now declares `POST_NOTIFICATIONS` (required on Android 13+ before the permission can even be requested) and the FCM default channel now points at `smarthire-updates` (the high-importance channel the backend actually sends on) instead of `default`; the dead legacy `backend/utils/pushNotifications.js` (old `MOBILE_PUSH_ENABLED` flag, wrong `default` channel, unused) was removed; `check-mobile-push-config.js` now checks the real `EXPO_PUSH_ENABLED` flag and migrations 009/010. | `mobile/android/.../AndroidManifest.xml`, `backend/scripts/check-mobile-push-config.js`, deleted `backend/utils/pushNotifications.js` |
| 6 | **Regression guards added:** `npm run validate:laptop-gate` and `npm run validate:avatar-upload` in `mobile/`; `preflight --release` now **blocks** if `EXPO_PUBLIC_WEB_URL` is missing/placeholder. | `mobile/scripts/validate-*.js`, `mobile/scripts/preflight.js` |

---

## 2. Before you build — the one thing only you can supply 👉

You chose "placeholder for now" for the website URL. **Replace it before building**, in both places:

```bash
# mobile/.env  (copy from mobile/.env.example)
EXPO_PUBLIC_WEB_URL=https://YOUR-DEPLOYED-SITE.example   # ← your real deployed website, no trailing slash

# mobile/eas.json  →  build.preview.env and build.production.env
"EXPO_PUBLIC_WEB_URL": "https://YOUR-DEPLOYED-SITE.example"  # ← same real URL
```

`EXPO_PUBLIC_*` values are baked into the app bundle at build time — changing them later
requires a new build. `npm run preflight -- --release` refuses to pass with the placeholder.

---

## 3. Notifications — audit result (closed-app delivery)

**How it works (verified in code):** backend `utils/notify.js` first persists the
notification row (in-app inbox = source of truth), then fire-and-forget calls
`utils/expoPush.js`, which sends via Expo Push → FCM with `channelId: "smarthire-updates"`,
`priority: "high"`, and a small payload `{notificationId, recipientUserId, link, type}`.
The app registers its Expo push token at `POST /api/notifications/devices` (token derived
server-side from the bearer token), handles taps both live
(`addNotificationResponseReceivedListener`) and cold-started from a killed state
(`getLastNotificationResponseAsync` in `NotificationContext`), de-duplicates taps, and
re-checks the signed-in user before navigating. Because delivery goes through FCM (not the
app process), **notifications do arrive when the app is closed/swiped away** — as long as
the checklist below holds. Expo Go cannot receive them; a physical device with an EAS
build is required.

**Verified here:** `validate:notifications-push` PASS (device registry, ticket handling,
`DeviceNotRegistered` pruning), `validate-notification-taps` PASS, manifest/EAS/Firebase
config present (`google-services.json` matches `com.ruvai.smarthire`, EAS project ID set).

**Cannot be verified from here** (needs your accounts + phone): real FCM delivery.
Before enabling, confirm on the server: migrations **009 + 010 applied**, and

```bash
EXPO_PUSH_ENABLED=true        # backend env only — never an EXPO_PUBLIC_* value
cd backend && node scripts/check-mobile-push-config.js
npm run process:expo-push-receipts   # schedule this every 15 min (cron / host scheduler)
```

**Closed-app acceptance test 👉 (5 min, physical Android phone, preview build):**
1. Sign in, Profile → Notifications → shows *Enabled*; kill the app from Recents.
2. Trigger a real event for that user (e.g. admin announcement / application status change).
3. ✅ A banner arrives in the tray with the app closed; tapping it opens the app, marks the
   item read and navigates to the right screen. Airplane-mode the phone, trigger again,
   reconnect — the inbox still shows it (persisted), even if the push was missed.

---

## 4. Deploy — step by step 👉

### 4.1 Database (Supabase SQL editor, in order)
Existing deployments that already ran 001–010 need only the new one:
`backend/db/migrations/011_sync_dsa_practice_with_website.sql`
(Fresh installs: `backend/db/schema.sql`, then 001 → 011.) Take a backup first; 011 is
idempotent and preserves problem UUIDs/submissions.

### 4.2 Backend (your existing host)
Deploy the updated backend (`routes/dsa.js` + deleted legacy push util + config-check
script). Required env (server-only): `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`,
`JDOODLE_CLIENT_ID`/`JDOODLE_CLIENT_SECRET` (DSA Run/Submit), `EXPO_PUSH_ENABLED=true`
(after §3), optional `EXPO_PUSH_ACCESS_TOKEN`. Schedule
`cd backend && npm run process:expo-push-receipts` every 15 minutes.
Smoke-test: `npm run validate:dsa-practice && npm run validate:notifications-push && npm run validate:auth-avatar-route`.

### 4.3 Mobile — configure
```bash
cd mobile
cp .env.example .env
# EXPO_PUBLIC_API_URL=https://<your deployed API>     (HTTPS, no trailing slash)
# EXPO_PUBLIC_WEB_URL=https://<your deployed website> (see §2 — also set in eas.json)
npm ci
npm run validate:laptop-gate && npm run validate:avatar-upload
npm run preflight -- --release     # must PASS before a release build
```

### 4.4 Mobile — build & ship (EAS)
```bash
npx eas-cli@latest login
npm run build:android:preview      # internal APK — install on a physical phone, run §3 + §5 tests
npm run build:android:production   # Play Store AAB
npm run build:ios:production       # if shipping iOS (needs Apple Developer account)
npx eas-cli@latest submit --platform android --profile production   # after Play Console app record exists
```
Notes: bundle ID / package `com.ruvai.smarthire` is permanent once a store record exists.
Any change to `app.json` plugins or native deps (e.g. image-picker, notifications) requires
a **new native build** — it cannot be delivered as a JS-only update to an already-installed
old build. Android `versionCode`/iOS `buildNumber` auto-increment via EAS (`appVersionSource: remote`).

### 4.5 Website
No website changes were needed (the app now matches it). Just make sure the deployed site
serves `/student/mockoa`, `/student/companyoa`, `/student/interview` — the laptop prompt
deep-links there — and that students sign in with the same account.

---

## 5. Pre-launch phone checklist 👉
- [ ] Practice tab shows Mock OA / Company OA / Mock Interview with a "Laptop to start" tag; lists open; tapping a test/session shows the laptop prompt; **Open website** lands on the right website page.
- [ ] Past Company OA results and past interview sessions still open on the phone.
- [ ] Profile → *Add/Change profile photo*: pick, crop, save; photo appears immediately, survives re-login, and shows on the website profile.
- [ ] DSA: same 40 problems as the website, same starter snippet per language, Hints + Reset work, draft code is still there after leaving/reopening a problem, Run/Submit grade correctly.
- [ ] §3 closed-app notification test passes.
- [ ] `EXPO_PUBLIC_WEB_URL` in the shipped build is the real site (open the prompt and check the button).

## 6. Verification results (run in this workspace, 13 Oct 2026)
| Check | Result |
|---|---|
| `mobile/scripts/validate-laptop-gate.js` (new) | ✅ PASS |
| `mobile/scripts/validate-avatar-upload.js` (new) | ✅ PASS |
| `mobile/scripts/validate-demo-api.js`, `validate-notification-taps.js` | ✅ PASS |
| Backend `validate:dsa-practice` | ✅ PASS *(failed on clean checkout before this round — see change #4)* |
| Backend `validate:notifications-push`, `validate:auth-avatar-route`, `validate:student-route`, `validate:interview-route` | ✅ PASS |
| Babel syntax check over all `mobile/src/**/*.js` | ✅ 0 failures |
| `npx expo export --platform android` | ✅ Android bundle exported (3.66 MB Hermes) |
| `preflight --release` with real-shaped URLs | ✅ PASS; with placeholder web URL correctly **blocked** |
| Real push delivery / store submission | 👉 Yours — needs Firebase/EAS accounts + physical device (§3, §4.4) |
