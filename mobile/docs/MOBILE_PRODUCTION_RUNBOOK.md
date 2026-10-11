# SmartHire Mobile — Production-Readiness Runbook

**Status:** implementation and static checks are complete enough to begin controlled integration work. This is **not** evidence that the API, database, native binaries, FCM/APNs, physical-device workflows, or store submissions have been tested or released.

Use this runbook in order. It deliberately keeps Expo push disabled until a real device has registered successfully and a real SmartHire workflow has delivered a notification.

---

## 0. Inputs to collect before changing production configuration

| Item | Why it is needed | Do not put it in |
|---|---|---|
| Final API HTTPS domain | `EXPO_PUBLIC_API_URL` compiled into preview/production mobile builds | Source code if it is not final; it is public but should be controlled in EAS environment variables |
| Supabase project URL and **service-role key** | Backend-only data/storage access and migration target | `mobile/`, EAS public variables, screenshots, git |
| Long random JWT secret | Backend authentication | Git, mobile app, client-side variables |
| JDoodle Client ID and Client Secret | Server-only live DSA execution and grading | `mobile/`, EAS public variables, source code, git, screenshots |
| Organization-controlled Expo account/owner | Immutable EAS project linkage and signing ownership | A personal account that the organization may lose access to |
| Final Android package and iOS bundle ID | Firebase/APNs/store records; cannot be changed after store records exist | Placeholder values in `mobile/app.json` |
| Firebase project and Android `google-services.json` | Android FCM V1 credentials | A public service-account key or mobile environment variable |
| Apple Developer membership / App Store Connect access | APNs, signing, TestFlight, App Store submission | Git or chat logs containing private keys |
| Google Play Console access | Android signing and release tracks | Git or chat logs containing signing material |
| At least one physical Android device; iPhone if iOS will ship | Native notification, PDF/share, upload, and deep-link validation | — |

> **Public-versus-secret rule:** Every `EXPO_PUBLIC_*` value can be extracted from a built app. The Supabase service-role key, JWT secret, email password, Firebase service-account JSON, Android keystore, APNs key, and provisioning credentials must remain server/EAS secrets.

---

## 1. Lock application identity first

Do this before creating Firebase or store records. The current identifiers are deliberately placeholders.

1. Choose reverse-DNS identifiers owned by the institution, for example a format such as `edu.institution.smarthire` (**replace with the institution's actual domain/namespace; do not copy the example blindly**).
2. Edit these values in `mobile/app.json`:

   ```json
   {
     "expo": {
       "ios": { "bundleIdentifier": "YOUR_FINAL_IOS_BUNDLE_ID", "buildNumber": "1" },
       "android": { "package": "YOUR_FINAL_ANDROID_PACKAGE", "versionCode": 1 }
     }
   }
   ```

3. Keep the initial native version values at `1`. The supplied `eas.json` increments native release versions for production builds. Increase the user-visible `expo.version` for each public release.
4. Do **not** create a Play/App Store listing with the placeholder IDs. Package and bundle identifiers are effectively permanent once the store record exists.

The repository now contains a configured app icon, Android adaptive icon, splash image, and notification icon under `mobile/assets/`, derived from the existing SmartHire favicon styling. Treat them as **provisional brand assets**: obtain institutional/marketing approval and test them on physical devices before store submission.

---

## 2. Configure Supabase and deploy the backend safely

### 2.1 Apply the mobile device migration

1. Select the intended **staging** Supabase project first; use production only after staging validation.
2. In Supabase Dashboard → **SQL Editor**, open a new query.
3. Paste and run the exact contents of:

   ```text
   backend/db/migrations/005_mobile_push_devices.sql
   ```

4. Verify the table and index without exposing push tokens:

   ```sql
   select to_regclass('public.mobile_devices') as mobile_devices_table;

   select indexname
   from pg_indexes
   where schemaname = 'public' and tablename = 'mobile_devices';

   select relrowsecurity
   from pg_class
   where oid = 'public.mobile_devices'::regclass;
   ```

   Expected: `mobile_devices_table` resolves to `mobile_devices`, an index named `idx_mobile_devices_user` is present, and `relrowsecurity` is `true`. The table has no direct client policy; only the server-only Supabase service-role client should manage Expo tokens.

5. After a device-register test, verify only metadata:

   ```sql
   select user_id, platform, device_name, app_version, last_seen_at, created_at
   from public.mobile_devices
   order by last_seen_at desc
   limit 20;
   ```

   Do not export or paste `expo_push_token` values into tickets, chat, or documentation.

### 2.2 Configure backend deployment variables

Create `backend/.env` locally only for local development, or set the same values in the deployment provider's secret manager:

```bash
cd backend
cp .env.example .env
npm install
npm run check:mobile-push-config
```

Set the existing server-side values:

```dotenv
NODE_ENV=production
PORT=5000
CLIENT_URL=https://YOUR_WEB_DOMAIN
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=SERVER_ONLY_SERVICE_ROLE_KEY
JWT_SECRET=A_LONG_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
EMAIL_USER=...
EMAIL_PASS=...
# JDoodle values are server-only. Never use EXPO_PUBLIC_ names for either.
JDOODLE_CLIENT_ID=...
JDOODLE_CLIENT_SECRET=...
MOBILE_PUSH_ENABLED=false
```

Keep `MOBILE_PUSH_ENABLED=false` for the first deployment. JDoodle credentials are required for live mobile LeetCode-style Run/Submit; without them the backend returns an explicit configuration error rather than executing learner code on the API host. Keep `ALLOW_LOCAL_CODE_RUNNER` disabled outside deliberate local development. The code runner pins its JDoodle language/version mappings, but a real staging call is still required to verify account access, network reachability, timeout behavior, and available provider credits. The new `npm run check:mobile-push-config` command checks for obvious missing/placeholder server configuration without printing secrets. It does **not** prove that credentials work or that a migration has run.

Deploy the unchanged Express service plus the mobile route/helper changes. Confirm:

```bash
curl -fsS https://YOUR_API_DOMAIN/health
```

Expected response shape:

```json
{"status":"ok","timestamp":"..."}
```

Then use real test accounts to verify login and at least one authenticated API request. A healthy `/health` response alone does not prove Supabase, JWT, upload, or role authorization behavior.

### 2.3 Protect the API boundary

- Use an HTTPS API URL in every preview/production native build. Android cleartext HTTP is not an acceptable release setup.
- Keep the Supabase service-role key on the backend only. The mobile client already uses the authenticated Express API rather than direct service-role access.
- Keep `CLIENT_URL` set to the web origin for browser CORS. Native React Native requests do not rely on browser CORS, but the web application still does.
- Preserve the existing server logs during rollout. Search for `POST /mobile/devices` and `[push] delivery failed` while testing.

### 2.4 Dependency-review release gate

Before each staging or production release, record a current production-dependency audit from both clients:

```bash
cd backend && npm audit --omit=dev
cd ../mobile && npm audit --omit=dev
```

The current workspace has unresolved upstream advisories, so audit evidence is not a clean release sign-off. Review direct and transitive fixes in a dedicated, SDK-compatible dependency update, then repeat static and device testing. Do **not** use `npm audit fix --force` as a release shortcut: it can select incompatible Expo/React Native or major backend upgrades.

---

## 3. Link the Expo/EAS project

The repository now includes:

- `mobile/eas.json` with **development**, **preview**, and **production** profiles;
- `expo-dev-client`, required for Android remote-push testing on Expo SDK 54;
- `mobile/scripts/preflight.js`, a non-secret build-configuration checker;
- account-level **Notifications** controls for student, recruiter, and administrator users, so registration state is visible without exposing a push token.

From `mobile/`:

```bash
cp .env.example .env
npm install
npx eas-cli@latest login
npm run eas:init
```

`eas init` creates/links an EAS project under the signed-in owner and writes a real UUID to `expo.extra.eas.projectId` in `app.json`. Review the owner and UUID before continuing; do not invent a UUID.

Copy that same UUID to the local development environment:

```dotenv
EXPO_PUBLIC_EAS_PROJECT_ID=THE_UUID_CREATED_BY_EAS
```

Set a reachable API URL in the same `mobile/.env`:

```dotenv
# Development on a physical phone on the same LAN only:
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:5000

# Preview/production build:
# EXPO_PUBLIC_API_URL=https://api.your-domain.example
```

For cloud preview/production builds, set `EXPO_PUBLIC_API_URL` through EAS environment variables or the EAS dashboard for the corresponding environment. It is okay for this value to be public; it is not okay to use the service-role key or JWT secret as an EAS public variable.

Run the local configuration gate after the final identifiers and environment have been supplied:

```bash
npm run preflight -- --release
```

The command is expected to fail today until the placeholder app identifiers and local API URL have been replaced. It also rejects malformed API URLs, embedded URL credentials, and loopback/HTTP release URLs. That failure is intentional; do not bypass it by committing fake values.

`npm run eas:configure` is available if EAS asks for build configuration, but `eas.json` is already supplied. Review any resulting diff rather than allowing generated configuration to overwrite the explicit profiles silently.

---

## 4. Configure Android FCM V1 (before Android remote-push testing)

Do not perform this against the placeholder application ID.

1. In Firebase Console, create/select the controlled Firebase project.
2. Add an **Android app** using the exact final `android.package` in `mobile/app.json`.
3. Download `google-services.json` and place it at:

   ```text
   mobile/google-services.json
   ```

4. Add this one line inside `expo.android` in `mobile/app.json` (keep the existing package/version/adaptive icon fields):

   ```json
   "googleServicesFile": "./google-services.json"
   ```

   `google-services.json` identifies the Firebase Android app and needs to be available to EAS during builds. It is not a substitute for the private FCM V1 service-account credential.

5. In Firebase, create/download the FCM V1 service-account credential only in the secure setup session. Upload it through EAS Android push credentials (`npx eas-cli@latest credentials -p android`), following the EAS prompt for FCM V1. Do not commit that service-account JSON.
6. Validate the configuration and package match:

   ```bash
   npm run preflight -- --push --android
   ```

The preflight checks that the Firebase file is configured, exists, parses, and names the same Android package. It cannot validate the server-side FCM credential uploaded to EAS.

---

## 5. Configure iOS APNs (if iOS will ship)

1. Enrol/use the institution's Apple Developer account.
2. Register the exact final iOS bundle ID and enable **Push Notifications** for it in Apple Developer.
3. Create the App Store Connect record only after the bundle ID is final.
4. Run an EAS iOS build and follow `npx eas-cli@latest credentials -p ios` to create/select managed distribution and APNs credentials. Keep `.p8` files out of the repository.
5. Run:

   ```bash
   npm run preflight -- --push --ios
   ```

The iOS preflight emits a manual reminder because APNs configuration lives in Apple/EAS rather than a safe local file that the script can inspect.

---

## 6. Build and install a real development client

### Android

After the API, EAS project, Firebase file, and FCM V1 credential are configured:

```bash
cd mobile
npm run preflight -- --push --android
npm run build:android:development
```

Install the APK from the EAS build link on a **physical Android device**. Then run Metro for the development client:

```bash
npm run start:dev-client
```

Expo Go is fine for basic JavaScript/UI exploration but is not evidence of Android remote-push support on this SDK. Use the development client for the push test.

### iOS

After Apple/EAS APNs configuration:

```bash
cd mobile
npm run preflight -- --push --ios
npm run build:ios:development
npm run start:dev-client
```

Install through the method EAS/Apple presents for the development build. A simulator is useful for basic UI checks but does not replace a physical iPhone notification test.

### What the user should see

After a successful sign-in on the installed native build, open **Profile/Account → Notifications**:

- **Enabled** means an Expo token was obtained and the authenticated API accepted device registration.
- **Permission off** means the operating-system permission needs to be enabled in device settings.
- **Setup required** means the build is not linked to an EAS project, is not a physical native device, or is the web preview.
- **Needs attention** means token acquisition or API registration failed; inspect the API URL, backend logs, EAS/Firebase/APNs setup, and device network.

The screen intentionally never displays the token.

---

## 7. Controlled push enablement and physical-device test plan

### 7.1 Stage first

Use a staging API/Supabase project and only test accounts wherever possible. Keep the backend variable below false until device registration is verified:

```dotenv
MOBILE_PUSH_ENABLED=false
```

1. Install the development client on a physical device.
2. Sign in and grant permission.
3. Confirm the account screen shows **Enabled**.
4. Query `public.mobile_devices` using the metadata-only SQL in section 2.1.
5. Confirm backend logs show a successful `POST /api/mobile/devices` response.
6. Sign out. Confirm the device row is removed for that user/token; sign in again and confirm a new/current registration.

Only then set the **staging backend** variable and restart/redeploy that backend:

```dotenv
MOBILE_PUSH_ENABLED=true
```

Run the server configuration check again:

```bash
cd backend
npm run check:mobile-push-config
```

### 7.2 Send notifications through normal workflows—not a public test endpoint

The backend deliberately has no unauthenticated “send test push” endpoint. Trigger a real workflow with controlled test data instead:

| Recipient device | Controlled trigger | Expected mobile route after tap |
|---|---|---|
| Administrator | A recruiter test account submits a test job | Job approvals review tab |
| Recruiter | An administrator approves/rejects that test job | Recruiter dashboard/jobs context |
| Student | A recruiter/admin moves a test application to a new stage/status | Student jobs/applications context |

For each case test all of the following:

1. **Foreground:** banner/list behavior; in-app notification is still present.
2. **Background:** lock/background the phone before triggering; receive the system notification.
3. **Tap:** notification opens the intended role-aware area and marks that exact persisted inbox item read. Reopen the inbox after the tap to verify the matching item changed state. The mobile link mapper covers student jobs/applications/practice, recruiter jobs/dashboard, and administrator review/student/report paths, with a safe inbox fallback for unknown links.
4. **Multiple devices:** when a recipient has two registered test devices, trigger one bulk-recipient workflow and verify both payloads refer to that recipient's own inbox item (not another recipient's UUID).
5. **Permission denied:** normal login and in-app notifications still work; the Account screen points the user to operating-system settings.
6. **Logout:** the device deregisters; no later notification for the previous account should reach it.
7. **Failure behavior:** temporarily use a network failure scenario. The triggering business action and in-app notification must remain intact even when push delivery fails.

Inspect the backend for `[push] delivery failed` messages. Expo delivery tickets are asynchronous; a successful request does not by itself prove a device displayed a notification. Record device model/OS/build profile, API environment, user role, trigger, observed result, and failure evidence.

### 7.3 Promote only after staging evidence

Repeat the successful configuration against production, with at least one controlled production test account. Only then set production `MOBILE_PUSH_ENABLED=true`, redeploy/restart, and repeat one background/tap test. In-app notifications remain the canonical record; push is a convenience delivery channel.

---

## 8. Native functional validation matrix

Complete this after the API is reachable from a real device and before an internal store build:

| Area | Minimum acceptance evidence |
|---|---|
| Auth | Verified login, logout, expired-session handling for student/recruiter/admin |
| Student | Browse/apply flow, duplicate-application message, profile update, direct PDF upload, resume draft, native PDF share, generated-resume upload, aptitude/OA submission, typed interview history, and JDoodle-backed DSA Run/Submit for function, helper-node, and design-class problems |
| Recruiter | Post job stays pending, only own-company applicants are visible, stage/status change, Company OA submission |
| Administrator | Approve/reject job and assessments, update placement status, announcements, company list, placement-report PDF share |
| Documents | Android and iOS native PDF creation/share where supported; upload error and 5 MB validation behavior |
| Push | Section 7 foreground/background/tap/logout/denial evidence on each intended platform |
| Accessibility | Screen-reader focus/labels, large text, contrast, keyboard behavior, non-touch navigation where applicable |
| Resilience | Offline/slow network, API 401, API 5xx, upload failure, retry and destructive-action confirmation paths |
| Security | No secrets in app bundle/repository, release API HTTPS, role boundaries, no real user data in test screenshots/logs |

Static checks and a web bundle export do not satisfy any native row in this table.

---

## 9. Signing, internal distribution, privacy, and store preparation

### Signing and release tracks

- Use **EAS managed credentials** under the organization-controlled Expo account where appropriate. Do not commit `.jks`, `.keystore`, `.p8`, `.p12`, provisioning profiles, or service-account JSON.
- Use the **development** profile for native debugging and push setup, **preview** for internal stakeholders/testers, and **production** for store-ready Android App Bundle/iOS archive builds.
- Android preview profile produces an installable APK; production EAS builds should be used for the signed store artifact.
- Use closed/internal testing tracks before a public Google Play rollout; use TestFlight before App Store release.
- Build history, signing ownership, Firebase, and store records must be accessible to more than one authorized institutional administrator.

### Privacy-policy and store-disclosure inputs

Have the institution/privacy owner prepare a public privacy-policy URL and store disclosures based on the actual implementation. At minimum review disclosure of:

- account identifiers and contact information;
- student profile, academic/eligibility, resume, application, assessment, and typed interview-practice data;
- recruiter/company and placement workflow data;
- files uploaded to the SmartHire service;
- notification permission state and Expo push-device token used to deliver updates;
- data purpose, retention, deletion/correction contact, access control, and third-party processors (hosting, Supabase, Expo/Firebase/Apple/Google as applicable).

Do not state that the application performs camera, microphone, facial-expression, emotion, identity, automated hiring, or secure-proctoring analysis: the current typed interview-practice implementation does not do those things.

### Store assets and content that still need real-device preparation

- approved 1024×1024 app icon review;
- Android/iPhone screenshots captured from the signed build (no personal student data);
- app name, short/full descriptions, category, support URL/email, privacy-policy URL, copyright/contact;
- Google Play Data safety and content rating responses;
- Apple App Privacy nutrition labels, age rating, export-compliance questions, review notes, demo/test account if required;
- accessibility review and a release note; and
- institutional authorization to publish placement-related data processing.

No store-release completion claim should be made until the relevant console review/approval has actually occurred.

---

## 10. Suggested release sequence and realistic effort

Assuming the API is already deployable and the required accounts/credentials are available:

1. **Half day–1 day:** choose identifiers, apply migration to staging, configure/redeploy staging backend, link EAS, configure public API build variables.
2. **Half day–1 day per platform:** Firebase/APNs, development build, device registration, push test, document/share test, fix discovered issues.
3. **1–3 days:** complete the role-based functional/accessibility/resilience matrix and produce internal builds/screenshots/privacy answers.
4. **External time:** Google Play/TestFlight/App Store account verification and review are outside engineering control and can range from hours to days or longer.

If credentials, a deployed HTTPS API, and physical test devices are not available, the process stops at static readiness. Nothing in this repository can safely replace those accounts, credentials, devices, or approvals.
