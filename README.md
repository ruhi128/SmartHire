# SmartHire

SmartHire is a campus recruitment and assessment platform with a React web app, an Express/Supabase API, and an Expo mobile app. Students can manage their profile and applications, practice DSA, take assessments, and read their notification inbox. Recruiters and administrators manage jobs, candidates, assessments, and announcements.

## What is in this repository

| Directory | Purpose |
| --- | --- |
| `backend/` | Express API, Supabase integration, auth, notifications, DSA execution, and SQL migrations |
| `frontend/` | React web application |
| `mobile/` | Expo / React Native application for Android, iOS, and web preview |
| `docs/` | Current project plan and maintenance notes |

## Notification architecture — persisted inbox + Android remote delivery

SmartHire notifications are **persisted first in the `notifications` table** and shown through the authenticated in-app inbox on web and mobile. That database row remains the source of truth for unread counts, list data, read state, and in-app navigation.

Android adds best-effort OS delivery through **Expo Notifications → Expo Push Service → Firebase Cloud Messaging (FCM)**. The app registers an opaque Expo push token through an authenticated API route; the backend looks up the private `mobile_devices` registry only after a notification row is safely persisted. Successful Expo ticket IDs enter a private, short-lived receipt queue so a trusted backend worker can later confirm receipts and remove stale `DeviceNotRegistered` tokens. Expo/FCM delivery is intentionally fire-and-forget: a delivery outage never rolls back or blocks the inbox event.

Remote Android delivery needs Firebase/EAS configuration and a physical device running an EAS development, preview, or production build. Expo Go cannot receive Android remote push notifications for this SDK generation. The inbox itself continues to work when notification permission is denied, Firebase is incomplete, or remote delivery is disabled.

> Migrations `005` and `007` are retained as history. Apply the forward-only `009_enable_mobile_push_devices.sql` and then `010_add_expo_push_receipt_jobs.sql` after `008`; do not edit old migration files.

## Quick start

Use **Node.js 20 LTS or newer**, npm, a Supabase project, and three terminal windows. Full setup—including Supabase schema, Android API addresses, avatars, DSA runner configuration, and verification—is in [SETUP.md](./SETUP.md).

```bash
# 1. API
cd backend
cp .env.example .env
# Fill the required values in .env, then:
npm ci
npm run dev

# 2. Web app (new terminal)
cd frontend
cp .env.example .env
# Set REACT_APP_API_URL and the browser Supabase values, then:
npm ci
npm start

# 3. Mobile app (new terminal)
cd mobile
cp .env.example .env
# Android emulator: EXPO_PUBLIC_API_URL=http://10.0.2.2:5000
npm ci
npm run preflight
npm run android
```

For a UI-only local demonstration that makes no network requests, run `npm run start:demo` in `mobile`. For connected mobile functionality, set `EXPO_PUBLIC_API_URL` and use the normal `npm start` / `npm run android` flow.

## Database migrations

The migration order is part of the deployment contract:

```text
001_phase1.sql
002_dsa_submissions_columns.sql
003_proctoring.sql
004_job_docs.sql
005_mobile_push_devices.sql          # historical; creates legacy registry
006_profile_avatars.sql
007_remove_mobile_push_registry.sql  # removes the legacy registry
008_seed_dsa_practice_problems.sql
009_enable_mobile_push_devices.sql   # re-enables private Expo device registry
010_add_expo_push_receipt_jobs.sql   # private Expo ticket/receipt lifecycle queue
```

For a blank Supabase project, apply `backend/db/schema.sql` first, then apply `001` through `010` in the order above. For an existing SmartHire database, apply `001` through `010` in order. The files are designed to be idempotent, but record successful execution in your deployment log and take a database backup before changing a production project.

## DSA practice

The mobile and web DSA experiences use the same backend contracts: problem catalogue, editor, Run, Submit, submissions, and performance data. Migration `008` installs/upgrades the verified DSA problem catalogue and metadata required by the typed Python/JavaScript runners.

For live code execution, configure `JDOODLE_CLIENT_ID` and `JDOODLE_CLIENT_SECRET` in **`backend/.env` only**. The app reports a clear service configuration error when they are absent. `ALLOW_LOCAL_CODE_RUNNER=true` is a trusted-development-only escape hatch that executes submitted code on the API host; never enable it on a shared, preview, or production server.

## Profile photos

Profile photos require migration `006_profile_avatars.sql`. It creates a private Supabase Storage bucket named `avatars`; bytes are served only by authenticated backend routes. Do not make the bucket public and do not put a Supabase service-role key in web or mobile environment variables.

The mobile Image Picker module is configured in `mobile/app.json`. Android uses Expo Continuous Native Generation: `mobile/android/` is regenerated from configuration, not hand-maintained. After changing native Expo dependencies or app configuration, run `npm run android` (or make an EAS development build) rather than expecting Expo Go to load a newly added native module.

## Useful checks

```bash
# Backend route contracts
cd backend
npm run validate:interview-route
npm run validate:student-route
npm run validate:auth-avatar-route
npm run validate:notifications-push
# Trusted one-shot worker; schedule every 15 minutes only after migration 010.
npm run process:expo-push-receipts

# Mobile setup and offline demo contracts
cd mobile
npm run preflight
npm run validate:demo-api
npm run validate:notification-taps
```

`npm run preflight` intentionally fails until `mobile/.env` contains a real `EXPO_PUBLIC_API_URL` **and** the Firebase Android `google-services.json` is in the configured path. It verifies the compatible Expo notification packages, config plugin, EAS project ID, Firebase app config, and Image Picker native setup; it never reads a Firebase service-account key.

### Push delivery operations

Keep `EXPO_PUSH_ENABLED=false` until migrations `009`/`010`, FCM/EAS setup, a trusted scheduler, and physical-device acceptance are complete. Set `EXPO_PUSH_ENABLED=true` only in the server deployment environment. `EXPO_PUSH_ACCESS_TOKEN` is optional and, if Expo Push access-token security is enabled, must also be server-only—not an `EXPO_PUBLIC_*` value.

Schedule `cd backend && npm run process:expo-push-receipts` every **15 minutes** in the trusted backend environment. The worker checks accepted Expo tickets after 15 minutes, retries transient Expo/network failures with bounded backoff, rechecks unavailable receipts up to four times, and removes only tokens reported as `DeviceNotRegistered`. The persisted inbox is never rolled back. Detailed rollout and recovery steps are in the [mobile production runbook](./mobile/docs/MOBILE_PRODUCTION_RUNBOOK.md#31-schedule-expo-receipt-processing).

## Documentation

- [Setup guide](./SETUP.md) — local web/backend/mobile setup and deployment prerequisites
- [Current project plan](./docs/PROJECT_PLAN.md) — delivered architecture, validation plan, and remaining environment-dependent work
- [Unused-file review](./docs/UNUSED_FILES_REVIEW.md) — evidence-based deletion candidates and confirmation-only items

## Security reminders

- Do not commit `.env` files, Supabase service-role keys, JWT secrets, SMTP passwords, or JDoodle credentials.
- Browser and mobile `REACT_APP_*` / `EXPO_PUBLIC_*` variables are public at runtime. They must never contain server secrets.
- Use HTTPS for a physical-device release build; local LAN HTTP is only suitable for trusted development.
