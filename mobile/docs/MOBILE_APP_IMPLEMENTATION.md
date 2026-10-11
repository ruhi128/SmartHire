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
| Student | Dashboard; job discovery/detail/application; application history; profile; resume upload and mobile resume builder (local draft, native PDF creation/sharing, and profile upload); aptitude; DSA; Mock OA; Company OA; ATS guidance; typed mock-interview practice, history, result, and transcript screens |
| Recruiter | Dashboard, company job list, post job, applicant list and stage changes, Company OA creation/submission, account screen |
| Administrator | Dashboard, job approval, Company OA/Mock OA approval, Android/iOS-safe student-placement status management, announcements, company list, native placement-report viewing and PDF export, account screen |
| Notifications | Expo device-registration client code, backend device registry route/migration, and opt-in delivery from the existing notification helper |

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

4. Install the declared Expo-compatible dependencies and start Metro:

   ```bash
   npm install
   npx expo start
   ```

   After an EAS development client is installed, use `npm run start:dev-client` instead. `npm run preflight` intentionally blocks builds while the application identifiers or API environment remain placeholders.

5. Sign in with a verified SmartHire account. The app registers a device token only after successful sign-in and only if the user grants notification permission. Permission denial never blocks normal login.

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

5. The existing backend `notify` and `notifyMany` helpers first persist an in-app notification, then asynchronously mirror it to registered devices when `MOBILE_PUSH_ENABLED=true`. A failed Expo delivery does not erase or block the in-app notification. Tokens marked `DeviceNotRegistered` by Expo are removed. Follow the staged enablement/test sequence in [`MOBILE_PRODUCTION_RUNBOOK.md`](./MOBILE_PRODUCTION_RUNBOOK.md).

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
4. Recruiter: create a job, confirm it remains pending, view only company-owned applicants, change a stage, and submit Company OA with/without a company association.
5. Admin: approve/reject jobs and both OA types, update student placement status through the native selector, publish/delete an announcement, inspect company records, and create/share the placement-report PDF.
6. Confirm a recruiter cannot read or modify another company's application.
7. Apply the push migration while delivery is still disabled, then validate permission grant/denial, device-token registration, logout token deletion, foreground/background delivery, and notification deep links on Android and iOS physical development builds. Enable `MOBILE_PUSH_ENABLED` only after that evidence exists.
8. Exercise API failure states, slow connection behavior, upload-size limits, screen-reader labels, text scaling, and keyboard navigation.
9. Produce signed EAS builds, use an HTTPS production API, and complete privacy/store review before public distribution.

## 8. Deployment outline

1. Deploy the unchanged Express backend with production environment variables and an HTTPS domain.
2. Apply migrations to the production Supabase project and verify the backend service-role key remains server-only.
3. Set the production `EXPO_PUBLIC_API_URL` at build time.
4. Link the organization-owned EAS project, configure Firebase/APNs credentials, set the production `EXPO_PUBLIC_API_URL` as an EAS environment value, and build with the provided `npm run build:<platform>:production` scripts.
5. Test signed builds with production-like accounts before submitting to stores; complete the privacy, asset, store-listing, and review tasks in [`MOBILE_PRODUCTION_RUNBOOK.md`](./MOBILE_PRODUCTION_RUNBOOK.md).

## 9. Validation performed in this workspace

- Mobile dependencies, including Expo Print, Expo Sharing, and AsyncStorage for mobile-native PDF/draft flows, were installed using Expo SDK-compatible versions.
- `npx expo-doctor` completed with all checks passing.
- Expo public-config validation, a managed Android prebuild, and a web export bundle completed successfully. They verify configuration/plugin resolution and Metro source resolution/parsing; the generated Android directory was removed so the repository remains an Expo managed project. Native PDF sharing is intentionally guarded as an Android/iOS-only action.
- Backend JavaScript syntax was checked for the modified route/helper files, and the non-secret backend/mobile preflight guards were exercised with the expected missing-credential/placeholder blockers.

This is static/build validation only. It is not a substitute for live API, database, native binary, or physical-device testing.
