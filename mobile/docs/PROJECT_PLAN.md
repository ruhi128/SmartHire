# SmartHire — current delivery plan

> **Status:** source implementation is organized around a React web app, Express/Supabase API, and Expo mobile app. This document separates source-delivered work from work that still needs credentials, Supabase access, native Android configuration, and physical-device evidence.

## 1. Product scope

SmartHire supports campus recruitment workflows for three roles:

| Role | Primary workflows |
| --- | --- |
| Student | Profile/resume, jobs and applications, aptitude/OA/interview workflows, DSA practice, announcements, and notification inbox |
| Recruiter | Company/jobs, applicants, OA workflows, and candidate-stage actions |
| Administrator | Students/companies, approvals, reports, announcements, and assessment oversight |

The web and mobile clients share the Express API and Supabase-backed data model. Mobile is not a separate feature subset: its connected flows include role navigation, dashboard/profile/application data, notifications, DSA practice, and the supported assessment/job flows exposed by its API adapters.

## 2. Architecture decisions fixed for this release

### Persisted inbox plus Android remote delivery

`public.notifications` and the authenticated `/api/notifications` routes are the authoritative notification store. Web and mobile list/read/delete rows there, derive unread counts there, and resolve supported in-app links from the persisted payload.

Android adds an optional delivery layer:

- the mobile app uses Expo Notifications to request permission, obtain an Expo token, react to receipts, and safely handle notification taps;
- the token is registered only through bearer-authenticated Express routes and stored in the private `mobile_devices` registry;
- after the backend has persisted the inbox row, it best-effort sends a minimal payload to Expo Push Service, which delivers through Firebase Cloud Messaging (FCM);
- successful Expo ticket IDs are checked by a private trusted-scheduler receipt queue; `DeviceNotRegistered` retires only the stale opaque token;
- an unavailable device, token, Expo/FCM issue, receipt-worker issue, or disabled backend gate never rolls back or blocks the persisted inbox event.

Migration `009_enable_mobile_push_devices.sql` forward-safely restores the private device registry after historical migrations `005` and `007`; `010_add_expo_push_receipt_jobs.sql` adds the private receipt queue. `EXPO_PUSH_ENABLED` defaults to false until migrations, the 15-minute trusted receipt worker, Firebase/EAS configuration, and a physical-device test are complete. `EXPO_PUSH_ACCESS_TOKEN` is optional and server-only. Firebase service-account private keys are managed in Firebase/EAS credentials—not source control, mobile public variables, or the Express environment.

### Private profile photos

Migration `006` creates a private `avatars` Storage bucket. The Express server, using its server-only Supabase service-role key, controls upload/read routes. Web and mobile clients never receive a public Storage URL or service-role credential.

### Shared DSA contracts

Migration `008` seeds/upgrades DSA problems with explicit typed-runner metadata for Python and JavaScript. Web and mobile consume the same API contracts for problem listing, editor actions, submissions, and performance. JDoodle credentials remain backend-only; the local runner is intentionally development-only because it can execute untrusted code on the API host.

## 3. Delivered source work

| Area | Delivered in source | Evidence / entry point |
| --- | --- | --- |
| Backend baseline | Express routes, JWT auth, Supabase integration, health endpoint, role workflows | `backend/server.js`, `backend/routes/` |
| Schema lifecycle | Baseline schema plus ordered migrations `001`–`010` | `backend/db/schema.sql`, `backend/db/migrations/` |
| Notification inbox | Persist/list/count/read/delete APIs and mobile/web inbox behavior | `backend/routes/notifications.js`, `mobile/src/context/NotificationContext.js` |
| Android remote push | Capability-aware Expo registration, bounded tap deduplication, secure token lifecycle, response routing, protected device API, persist-first receipt-aware Expo sender, and trusted one-shot receipt worker | `mobile/src/notifications/`, `mobile/src/storage/pushRegistration.js`, `backend/utils/expoPush.js`, `backend/scripts/process-expo-push-receipts.js` |
| Mobile navigation | Auth, student/recruiter/admin navigators and notification navigation | `mobile/src/navigation/` |
| Android Image Picker | `expo-image-picker` dependency + config plugin and clean-build preflight checks | `mobile/app.json`, `mobile/scripts/preflight.js` |
| Avatar protection | Private bucket schema and authenticated avatar API validation | migration `006`, `backend/routes/auth.js` |
| DSA | Catalog/listing, typed Run/Submit contracts, submission/performance support | migration `008`, `backend/routes/dsa.js`, mobile DSA screens |
| Demo capability | Explicit strict network-free demo adapter and contract validator | `mobile/scripts/start-demo.js`, `mobile/scripts/validate-demo-api.js` |
| Setup templates | Backend/web/mobile environment templates with public/secret separation | `backend/.env.example`, `frontend/.env.example`, `mobile/.env.example` |

## 4. Delivery milestones

### Milestone A — environment foundation

**Goal:** one controlled Supabase project and locally reachable API support the web and mobile apps.

1. Apply `schema.sql` for a new project, then migrations `001`–`010` in order.
2. Configure backend secrets in `backend/.env` or a deployment secret store.
3. Configure `frontend/.env` and `mobile/.env` with the correct API addresses.
4. Run backend route contract checks, mobile demo validation, and mobile preflight.
5. Verify `/health`, web login/dashboard/profile, and an Android emulator login.

**Exit evidence:** SQL execution record, redacted configuration record, successful checks, and a connected local Android emulator test.

### Milestone B — core student feature acceptance

**Goal:** prove the feature-parity paths against live infrastructure.

1. Profile: read/update data, select/upload/reload a private avatar.
2. Notifications: create a real backend event, see it in the mobile/web inbox, mark it read, and follow a supported in-app route.
3. DSA: load the migration-008 catalogue, Run/Submit Python and JavaScript, then inspect performance history.
4. Jobs/applications and assessment workflows: exercise representative student/recruiter/admin actions using test accounts.

**Exit evidence:** role-specific test scripts/results and screenshots/logs that exclude secrets and personally sensitive data.

### Milestone C — Android remote-push validation

**Goal:** turn the source integration into a proven Android device result without weakening inbox reliability or credential boundaries.

1. Create/link an Expo/EAS project under an account the team controls.
2. Register Firebase Android package `com.ruvai.smarthire`, place only `google-services.json` at `mobile/google-services.json`, and register the FCM V1 service-account key in Expo/EAS credentials.
3. Apply migrations `009` and `010`; schedule `npm run process:expo-push-receipts` every 15 minutes in the private backend environment; set `EXPO_PUSH_ENABLED=true` only in the tested backend environment.
4. Run `npm run preflight`, build an EAS development/preview APK, and install it on a physical Android device. Expo Go and an emulator do not prove remote delivery.
5. Trigger a real workflow event and verify foreground, background, and terminated-app delivery, then verify the tap marks/opens the same authenticated inbox record.
6. Verify logout/login account switching does not let another user’s token or notification response route into the current session.

**Exit evidence:** build version, EAS project identity, Firebase/EAS setup record without secrets, device/OS, notification event IDs, all three delivery-state results, and backend/Expo receipt evidence where available.

### Milestone D — controlled release

**Goal:** publish a secure HTTPS-backed preview/production build only after end-to-end validation.

1. Deploy API and web app with correct HTTPS origins.
2. Run migrations and release preflight against production configuration.
3. Build under organization-owned Android/EAS credentials.
4. Complete privacy/store disclosures accurately, including persisted inbox data and Android notification permission/FCM processing.
5. Monitor authentication, avatar upload, notification registration/delivery, and DSA execution errors after rollout.

**Exit evidence:** release checklist in `mobile/docs/MOBILE_PRODUCTION_RUNBOOK.md`, migration log, physical-device acceptance results, and rollback artifact location.

## 5. Current external dependencies and blockers

| Item | Why it is not proven by source review alone | Owner/action |
| --- | --- | --- |
| Supabase project | Requires project URL/keys, schema execution, Storage state, and real test accounts | Project administrator applies schema/migrations and configures secrets |
| SMTP | OTP/email delivery requires an actual configured sender | Email owner provides/validates production-safe credentials |
| JDoodle | Live code execution requires valid credentials, quota, and network access | Backend owner configures and tests server-side credentials |
| Android build environment | Native Image Picker/device behavior needs JDK 17+, Android SDK, and a build/device | Local developer completes native build tests |
| Firebase/EAS Android credentials | FCM V1 registration and Expo project ownership are account-bound | Authorized mobile owner completes the documented Firebase/EAS flow outside the repository |
| Physical Android device | Background/terminated-app FCM delivery cannot be established by static/source checks | Tester completes Milestone C on a real installed build |
| Production hosts/domains | HTTPS, CORS/browser origin, and release API address require deployment ownership | Deployment owner configures Milestone D |

## 6. Explicitly out of scope or prohibited

- placing Firebase Admin/service-account keys in source control, `app.json`, public mobile environment values, or backend `.env`;
- enabling `ALLOW_LOCAL_CODE_RUNNER` on a shared or production host;
- making the private `avatars` bucket public;
- claiming remote notification delivery is proven before the Firebase/EAS physical-device test has passed;
- iOS remote-push rollout unless separate APNs/EAS setup and iOS physical-device validation are completed.

## 7. Quality gates

Run the following before claiming a source milestone is complete:

```bash
# backend
cd backend
npm ci
npm run validate:interview-route
npm run validate:student-route
npm run validate:auth-avatar-route
npm run validate:notifications-push

# mobile
cd ../mobile
npm ci
npm run validate:demo-api
npm run preflight
```

`npm run preflight` requires a non-placeholder `EXPO_PUBLIC_API_URL`, the configured EAS project ID, and Firebase Android `google-services.json`. For a release candidate, run `npm run preflight -- --release`; it also requires HTTPS and rejects loopback values. The source-level checks do not replace a physical Android build/delivery test.

## 8. Documentation ownership

- Local setup and Firebase/EAS provisioning: [`SETUP.md`](../SETUP.md)
- Mobile implementation: [`mobile/docs/MOBILE_APP_IMPLEMENTATION.md`](../mobile/docs/MOBILE_APP_IMPLEMENTATION.md)
- Release checks: [`mobile/docs/MOBILE_PRODUCTION_RUNBOOK.md`](../mobile/docs/MOBILE_PRODUCTION_RUNBOOK.md)
- Cleanup decisions: [`docs/UNUSED_FILES_REVIEW.md`](./UNUSED_FILES_REVIEW.md)

Update this plan when a milestone gains environment/device evidence or when a material architecture decision changes.
