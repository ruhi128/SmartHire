# SmartHire Mobile App — Implementation, Setup, and Release Guide

> For the credential-dependent production sequence, use [`MOBILE_PRODUCTION_RUNBOOK.md`](./MOBILE_PRODUCTION_RUNBOOK.md). It distinguishes completed source work from actions that must be performed in the institution's Supabase, Expo/EAS, Firebase, Apple, Google Play, hosting, and physical-device environments.

## 1. Architecture and scope

SmartHire now has a **separate React Native + Expo client** in `mobile/`. It shares the existing Express REST API, Supabase database/storage, JWT authentication, and business rules with the web application.

```text
React web client ──┐
                   ├── Express REST API ── Supabase Auth / PostgreSQL / Storage
Expo mobile client ┘
```

The website is preserved: no web client source is replaced by this work. The mobile app never contains a Supabase service-role key and reaches data only through the same authenticated API used by the web application.

## 2. Implementation status

### Built in the mobile codebase

| Role | Mobile coverage |
|---|---|
| Shared | Login, registration, email verification, SecureStore session, notifications, announcement list, error/empty/loading states, logout, role-aware navigation |
| Student | Dashboard; job discovery/detail/application; application history; profile; resume upload and mobile resume builder (local draft, native PDF creation/sharing, and profile upload); aptitude; LeetCode-style DSA function/class practice with typed Run/Submit; Mock OA; Company OA; ATS guidance; typed mock-interview practice, history, result, and transcript screens |
| Recruiter | Dashboard, company job list, post job, applicant list and stage changes, Company OA creation/submission, account screen |
| Administrator | Dashboard, job approval, Company OA/Mock OA approval, Android/iOS-safe student-placement status management, announcements, company list, native placement-report viewing and PDF export, account screen |
| Notifications | In-app notification center with focus/foreground refresh, Expo device registration, backend device registry/migration, and opt-in push delivery with role-aware tap navigation and read-state synchronization |

### Important capability boundary

The mock-interview flow is **typed-answer practice only**. Its local feedback is about typed content, relevance, fluency, structure, and wording. It does not record or infer camera, microphone, facial expression, eye contact, attention, emotion, identity, employment suitability, or hiring outcomes.

### Remaining before calling it production-ready

- Live integration tests against the real backend/Supabase data and three role accounts.
- A native device test for document upload, push permissions/token registration, foreground/background push delivery, and notification deep links.
- Physical-device validation of native PDF creation, sharing, and resume upload; the web preview intentionally does not provide native-share validation.
- Accessibility audit, real-device review of the configured app icons/splash assets, store metadata/privacy disclosures, production signing, and release review.

## 3. Step-by-step backend and database setup

1. **Create the backend environment file.**

   ```bash
   cd backend
   cp .env.example .env
   npm install
   ```

2. **Set the existing backend variables** in `backend/.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`, email configuration, and the production web `CLIENT_URL`.

   For live mobile DSA execution, also set the server-only JDoodle credentials below. Do not place either value in `mobile/.env`, EAS public variables, source code, or the app bundle:

   ```dotenv
   JDOODLE_CLIENT_ID=YOUR_SERVER_SIDE_JDOODLE_CLIENT_ID
   JDOODLE_CLIENT_SECRET=YOUR_SERVER_SIDE_JDOODLE_CLIENT_SECRET
   ```

   Without both values, the API deliberately returns a clear JDoodle configuration error rather than silently running learner code on the production API host.

3. **Keep push delivery disabled during initial deployment.** Set this server-only deployment variable in `backend/.env`:

   ```dotenv
   MOBILE_PUSH_ENABLED=false
   ```

   In-app notifications continue working without Expo push delivery. Change this to `true` only after migration 005, EAS/Firebase or APNs setup, and physical-device registration/delivery tests have passed. Run `npm run check:mobile-push-config` before deployment; the detailed controlled-enablement sequence is in [`MOBILE_PRODUCTION_RUNBOOK.md`](./MOBILE_PRODUCTION_RUNBOOK.md).

4. **Apply database changes in Supabase.** For an existing database, run prior migrations in their established order and then run:

   ```text
   backend/db/migrations/005_mobile_push_devices.sql
   ```

   The migration creates `public.mobile_devices`, which stores an Expo push token per physical device, and enables RLS with no direct client policy. The authenticated Express backend uses its server-only service-role client to manage this registry. For a new database, `backend/db/schema.sql` also includes the table and the same RLS protection.

5. **Start the backend.**

   ```bash
   npm run dev
   ```

   The mobile device routes are:

   - `POST /api/mobile/devices` — authenticated token registration
   - `DELETE /api/mobile/devices` — authenticated logout/device removal

6. **Security change included with this implementation.** Recruiters are now checked against the company that owns a job before they can list applicants or update an application's status/stage. Administrators retain placement-wide access.

## 4. Step-by-step mobile setup

1. Install Node.js 20 LTS or newer. Expo Go is suitable only for basic non-push exploration; Android remote-push testing on this SDK requires the included `expo-dev-client` development build.
2. Configure the app environment:

   ```bash
   cd mobile
   cp .env.example .env
   ```

3. Set `EXPO_PUBLIC_API_URL` in `mobile/.env`.

   | Target | Development API URL |
   |---|---|
   | Android emulator | `http://10.0.2.2:5000` |
   | iOS simulator | `http://localhost:5000` |
   | Physical device on LAN | `http://YOUR_COMPUTER_LAN_IP:5000` |
   | Production build | Your HTTPS API URL |

   `localhost` on a physical phone points to the phone itself, not the computer running Express. If the variable is missing, the mobile client now fails API calls with a configuration error instead of silently falling back to `localhost`.

4. Install the lockfile-pinned Expo-compatible dependencies and start the **live** client:

   ```bash
   npm ci --ignore-scripts
   npm start
   ```

   Use `npm ci` rather than `npm install` so the dependency tree matches `package-lock.json`. After an EAS development client is installed, use `npm run start:dev-client` instead. `npm run preflight` intentionally blocks builds while the application identifiers or API environment remain placeholders.

5. Sign in with a verified SmartHire account. The app registers a device token after a newly authenticated **or restored** live session only if the user grants notification permission. Permission denial never blocks normal login.

## 4A. Live mobile DSA function runner

Use this section only in live integration mode; local demo mode remains offline and uses deterministic sample feedback instead of JDoodle.

1. Configure the server-only JDoodle variables in Section 3, restart the backend, and use a verified student account. The device calls the existing authenticated `/api/dsa/run` and `/api/dsa/submit` endpoints; it never receives a JDoodle credential.
2. Open **Practice → DSA**, then choose a supported problem. On mobile, write only the exact function or design class shown in the starter template. Do not parse stdin, add `main`, or print a final answer.
3. For **Run**, enter a JSON array of function arguments when a custom case is desired, for example `[[2,7,11,15], 9]` for Two Sum. The backend builds the invocation, serializes the return value, and renders the returned value separately from any diagnostic output.
4. For **Submit**, the mobile client sends only code and language. The backend chooses all test cases, expected values, comparison rules, and the persisted submission result; the client cannot send or alter grading expectations.
5. Python and JavaScript are the verified mobile function-runner languages. Other language chips, or a problem with no verified function metadata, are intentionally disabled with an explanation instead of falling back to incorrect stdin grading. If a verified legacy record lacks its own `starter_code`, the API supplies an unfinished Python/JavaScript function or class fallback template; configured problem-specific templates still take precedence.
6. Before a release, test at least one supported function, linked-list/tree/graph helper problem, and design-class problem against a real JDoodle-enabled backend. A local harness smoke test cannot prove JDoodle account access, quota, or network availability.

## 4B. Safe local-demo preview (no backend, no real account, no API URL)

Use this route to view the mobile app as it is currently implemented without touching SmartHire data or requiring a local backend.

1. A local preview does not need an Expo account. If you are already logged in to Expo, **do not run `expo login` again**. If desired, confirm the existing session with:

   ```bash
   npx expo whoami
   ```

2. From `mobile/`, restore dependencies when `node_modules` is not present (workspace restores intentionally omit it):

   ```bash
   npm ci --ignore-scripts
   ```

3. Run the fast local adapter check before opening the demo:

   ```bash
   npm run validate:demo-api
   ```

   It validates the in-memory Mock OA, Company OA, recruiter/admin OA lifecycle, and application-stage contracts without starting Expo, hitting Axios, or reading `.env`.

4. For the quickest browser preview, start the explicit demo-only command:

   ```bash
   npm run start:demo -- --web
   ```

   Open the URL Expo prints or press `w` in the terminal. Choose a Student, Recruiter, or Administrator from the **LOCAL SAMPLE WORKSPACE** login screen.

5. For Android/iOS exploration, start the same explicit demo mode without `--web`:

   ```bash
   npm run start:demo
   ```

   - Press `a` for a running Android emulator.
   - Press `i` for an iOS simulator on macOS.
   - Scan the displayed QR code from Expo Go while the device and computer are on the same Wi-Fi network. If LAN discovery is unavailable, restart with `npm run start:demo -- --tunnel`.

6. Confirm the safety boundary before demonstrating the app: the amber local-demo disclosure/banner must be present. The demo uses only in-memory non-sensitive sample data, blocks Axios dispatches, disables file upload and device-push work, never calls the backend, and resets all changes after reload/restart. It deliberately does **not** require `EXPO_PUBLIC_API_URL`.

7. Expo Go/browser preview verifies navigation and local UI flows only. It does not prove native file sharing/picking, secure storage, push, native build configuration, a real backend, database migrations, deployment, or store readiness.

## 5. Expo push and native-build setup

1. Choose permanent iOS/Android identifiers, then sign into the organization-controlled Expo account and link the project:

   ```bash
   cd mobile
   npx eas-cli@latest login
   npm run eas:init
   ```

   `eas init` writes the real EAS UUID to `app.json`; copy it to local `EXPO_PUBLIC_EAS_PROJECT_ID` as well.

2. The repository provides `eas.json` profiles and `expo-dev-client`. Create an Android/iOS development client with the matching `npm run build:<platform>:development` script, then run `npm run start:dev-client`.

3. For Android remote push, register the final Android package in Firebase, place `google-services.json` in `mobile/`, add `android.googleServicesFile` to `app.json`, and upload the FCM V1 service-account credential through EAS. For iOS, enable Push Notifications for the final bundle ID and configure APNs through Apple/EAS.

4. Run `npm run preflight -- --push --android` or `--ios` before the corresponding push build. The command checks local configuration only; it cannot validate cloud credentials or delivery.

5. The existing backend `notify` and `notifyMany` helpers first persist an in-app notification, then asynchronously mirror it to registered devices when `MOBILE_PUSH_ENABLED=true`. Bulk delivery places the **recipient's own inserted notification UUID** in every Expo payload for that recipient, including multiple devices; a push tap can therefore mark the matching inbox row read before route navigation. The client queues a tap until the authenticated role navigator has mounted (not just until `NavigationContainer` is ready) and clears that queue on session cleanup, preventing an old tap from routing a later account. A failed Expo delivery does not erase or block the in-app notification. Tokens marked `DeviceNotRegistered` by Expo are removed. Follow the staged enablement/test sequence in [`MOBILE_PRODUCTION_RUNBOOK.md`](./MOBILE_PRODUCTION_RUNBOOK.md).

## 6. Mobile-native adaptations

| Web/browser mechanism | Mobile approach |
|---|---|
| `localStorage` | Expo SecureStore |
| Browser file input | Expo Document Picker |
| Browser notification polling | Existing notification API plus optional Expo native push |
| Monaco editor | Native multiline code editor that calls the same server runner |
| PDF.js/jsPDF export | Expo Print creates a native PDF, then the Android/iOS share sheet exports it; generated student resumes can also be uploaded through the existing authenticated resume endpoint |
| Browser fullscreen/tab detection | App foreground/background signals only; not a secure proctoring claim |
| Browser media/face models | Not part of the current typed interview-practice scope |

## 7. Ordered verification checklist

Run these checks before deployment, in this order:

1. Start backend and mobile app with a reachable `EXPO_PUBLIC_API_URL`.
2. Verify login, OTP, logout, and expired-token handling for student, recruiter, and administrator accounts.
3. Student: test eligibility, duplicate application handling, focus refresh after applying, direct resume upload, local resume-draft save, native PDF share, generated-PDF upload, assessment submission, and typed interview save/history.
4. With JDoodle configured server-side, test a supported DSA function, linked-list/tree/graph helper problem, and design-class problem in both Run and Submit. Confirm custom JSON arguments, returned-value display, server-authoritative grading, and the clear unavailable state for unsupported languages/problems.
5. Recruiter: create a job, confirm it remains pending, view only company-owned applicants, change a stage, and submit Company OA with/without a company association.
6. Admin: approve/reject jobs and both OA types, update student placement status through the native selector, publish/delete an announcement, inspect company records, and create/share the placement-report PDF.
7. Confirm a recruiter cannot read or modify another company's application.
8. Apply the push migration while delivery is still disabled, then validate permission grant/denial, device-token registration, logout token deletion, foreground/background delivery, and notification deep links on Android and iOS physical development builds. Confirm a foreground arrival refreshes the inbox and a tapped persisted push marks its matching notification read without blocking navigation. Enable `MOBILE_PUSH_ENABLED` only after that evidence exists.
9. Exercise API failure states, slow connection behavior, upload-size limits, screen-reader labels, text scaling, and keyboard navigation.
10. Produce signed EAS builds, use an HTTPS production API, and complete privacy/store review before public distribution.

## 8. Deployment outline

1. Deploy the unchanged Express backend with production environment variables and an HTTPS domain.
2. Apply migrations to the production Supabase project and verify the backend service-role key remains server-only.
3. Set the production `EXPO_PUBLIC_API_URL` at build time.
4. Link the organization-owned EAS project, configure Firebase/APNs credentials, set the production `EXPO_PUBLIC_API_URL` as an EAS environment value, and build with the provided `npm run build:<platform>:production` scripts.
5. Test signed builds with production-like accounts before submitting to stores; complete the privacy, asset, store-listing, and review tasks in [`MOBILE_PRODUCTION_RUNBOOK.md`](./MOBILE_PRODUCTION_RUNBOOK.md).

## 9. Validation performed in this workspace

- Mobile dependencies, including Expo Print, Expo Sharing, and AsyncStorage for mobile-native PDF/draft flows, were installed using Expo SDK-compatible versions.
- `npx expo-doctor` completed with all checks passing at the earlier configuration-validation stage.
- `node --check src/api/mockApi.js` and `npm run validate:demo-api` passed after the demo OA/application-stage contract repairs. The latter checks local Mock OA and Company OA answer redaction/scoring/attempt limits, OA approval lifecycle, and stage-history/selected-applicant behavior without any HTTP request.
- `EXPO_PUBLIC_DEMO_MODE=true npx expo export --platform web` completed successfully after those repairs. A running `npm run start:demo -- --web` Metro instance also served HTTP 200 and compiled the explicit local-demo disclosure into the web bundle.
- Expo public-config validation, a managed Android prebuild, and an earlier web export bundle completed successfully. They verify configuration/plugin resolution and Metro source resolution/parsing; the generated Android directory was removed so the repository remains an Expo managed project. Native PDF sharing is intentionally guarded as an Android/iOS-only action.
- Backend JavaScript syntax was checked for the modified route/helper files, and the non-secret backend/mobile preflight guards were exercised with the expected missing-credential/placeholder blockers.
- Current DSA validation generated and executed all 47 built-in typed problem aliases in both Python and JavaScript harnesses (94 generated drivers), plus representative correct linked-list, tree, graph, and design-class implementations. Follow-up harness checks also covered malformed typed metadata and a non-completing runner result. This exercised driver construction, return-marker parsing, and typed comparison locally; it did not call JDoodle.
- Current notification validation exercised bulk insertion/push mapping with two recipients and multiple devices, confirming each device receives its owner's persisted notification UUID. The selected mobile notification/auth/navigation sources were Babel-parsed, `npm run validate:demo-api` passed, `npx expo-doctor` reported 18/18 checks passing, and a demo-mode Expo web export bundled successfully.

This is local static/build/demo-adapter validation only. It is not a substitute for interactive browser verification, live API/database testing, migration execution, native binary, physical-device, push-delivery, deployment, or store-review testing.
