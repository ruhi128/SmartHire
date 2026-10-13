# SmartHire mobile release runbook

**Scope:** release the SmartHire mobile app with private profile photos, backend-backed DSA practice, an authenticated persisted notification inbox, and Android device alerts delivered through Expo Push Service and Firebase Cloud Messaging (FCM). The inbox remains authoritative; remote delivery is an optional, best-effort alert layer.

A successful build is not a successful release. Complete the checks in sequence and save the stated evidence for the institution/team that owns the app. Do not record passwords, bearer tokens, Firebase service-account JSON, or other secrets in this runbook evidence.

## 1. Establish ownership and final identities

Before publishing a development, preview, or production build, record:

- Android application ID: `com.ruvai.smarthire`
- iOS bundle ID: `com.ruvai.smarthire` (do not claim iOS remote delivery unless APNs setup is separately completed)
- organization owner for the Expo/EAS project, Firebase project, Android signing key, Google Play record, Apple Developer/App Store Connect record, domain, Supabase project, SMTP account, and JDoodle account
- at least two authorized maintainers for every owner-controlled account
- the Firebase Android app package name, which must exactly equal `com.ruvai.smarthire`

Do not create a second store record under a different identifier. Treat any identifier change as a product/release decision, not a routine build configuration change.

For Android push, the Firebase project must be controlled by the release owner and linked to the intended EAS project. The Express backend does **not** need a Firebase Admin key: it sends opaque Expo tokens to Expo Push Service.

## 2. Deploy the database safely

1. Back up the target Supabase database and note its project reference.
2. Apply `backend/db/schema.sql` only for a new empty project.
3. Apply migrations, one at a time, in exact order:

   ```text
   001_phase1.sql
   002_dsa_submissions_columns.sql
   003_proctoring.sql
   004_job_docs.sql
   005_mobile_push_devices.sql
   006_profile_avatars.sql
   007_remove_mobile_push_registry.sql
   008_seed_dsa_practice_problems.sql
   009_enable_mobile_push_devices.sql
   010_add_expo_push_receipt_jobs.sql
   ```

4. Record the operator, date/time, target project, and SQL Editor result for every file.
5. Verify the final state:

   ```sql
   select to_regclass('public.notifications') as notifications_table;
   select to_regclass('public.dsa_problems') as dsa_problems_table;
   select to_regclass('public.mobile_devices') as mobile_devices_table;
   select to_regclass('public.expo_push_receipt_jobs') as expo_push_receipt_jobs_table;
   select id, public from storage.buckets where id = 'avatars';
   ```

   Expected: notification, DSA, `mobile_devices`, and `expo_push_receipt_jobs` tables exist, and `avatars.public` is `false`.

6. Check that the DSA catalogue has content after migration `008`:

   ```sql
   select count(*) as dsa_problem_count from public.dsa_problems;
   ```

Migrations `005` and `007` are historical deployment history. Do not edit them. Migration `009` forward-safely restores the private device registry required by the current Expo/FCM design and revokes direct anon/authenticated table access. Migration `010` adds a separate, private short-lived receipt queue; it does not replace or expose the persisted inbox.

## 3. Configure and validate the API deployment

Configure these as server-side deployment environment values:

```dotenv
NODE_ENV=production
PORT=5000
CLIENT_URL=https://web.your-domain.example
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_KEY=server_only_service_role_key
JWT_SECRET=long_random_secret
EMAIL_USER=production_sender@example.com
EMAIL_PASS=production_smtp_or_app_password
JDOODLE_CLIENT_ID=...
JDOODLE_CLIENT_SECRET=...
ALLOW_LOCAL_CODE_RUNNER=false
# Keep false until migrations, Firebase/EAS, scheduler, and physical-device verification are ready.
EXPO_PUSH_ENABLED=false
# Optional: only if Expo Push access-token security is enabled for the EAS project.
# EXPO_PUSH_ACCESS_TOKEN=server_only_expo_push_access_token
```

Before enabling remote delivery:

1. Deploy/restart the backend using HTTPS.
2. Confirm `GET https://api.your-domain.example/health` returns `status: ok`.
3. Confirm the configured web origin exactly matches `CLIENT_URL`.
4. Confirm `ALLOW_LOCAL_CODE_RUNNER` is false or absent.
5. Run backend source contract checks in the build workspace:

   ```bash
   cd backend
   npm ci
   npm run validate:interview-route
   npm run validate:student-route
   npm run validate:auth-avatar-route
   npm run validate:notifications-push
   npm --prefix ../mobile run validate:notification-taps
   ```

Never expose the Supabase service-role key, JWT secret, SMTP password, JDoodle credentials, or a Firebase service-account private key through `EXPO_PUBLIC_*`, `REACT_APP_*`, source control, screenshots, chat, or `backend/.env`. `EXPO_PUSH_ENABLED` is a delivery gate, not a Firebase credential. `EXPO_PUSH_ACCESS_TOKEN`, when used, is an Expo server-side access token and belongs only in the deployment secret manager/environment—not in a mobile build.

### 3.1 Schedule Expo receipt processing

After migration `010` is applied and before turning on the delivery gate, configure the hosting platform's **trusted scheduler** to run this one-shot command with the same private backend environment every **15 minutes**:

```bash
cd /path/to/SmartHire/backend
npm run process:expo-push-receipts
```

Do not expose this worker as a public HTTP endpoint and do not run it in the mobile app. It reads the service-role Supabase environment only on the server. A successful Expo send ticket means that Expo accepted the request, not that FCM finished processing it. The worker checks ticket receipts after an initial 15-minute delay.

Operational behavior is intentionally bounded:

- Transient Expo network, `429`, and `5xx` responses retry with a short exponential backoff inside a worker invocation.
- An unavailable receipt is deferred for another 15 minutes. After four checks it is discarded with a count-only warning, so the private queue cannot grow forever.
- `DeviceNotRegistered` in either an Expo ticket or later receipt removes only that stale opaque device token. The app registers again on a later eligible foreground session.
- An Expo outage, receipt-job failure, or cleanup failure never deletes or rolls back the persisted inbox row. The next scheduled run retries pending receipt work.

For an investigation, first confirm migration `010`, `EXPO_PUSH_ENABLED=true`, and the scheduler's service-role environment. Then run the command once manually from that trusted environment and inspect only count-based logs. Never paste raw Expo tokens, ticket IDs, request bodies, Firebase service-account JSON, or `EXPO_PUSH_ACCESS_TOKEN` into logs or support tickets.

## 4. Configure Firebase, EAS, and the mobile release environment

Use an HTTPS API URL for preview/production builds:

```dotenv
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_API_URL=https://api.your-domain.example
EXPO_PUBLIC_WEB_URL=https://web.your-domain.example
```

For Android remote push:

1. In Firebase Console, register/select the Android app with package `com.ruvai.smarthire`.
2. Download its public Firebase app configuration and place it only at `mobile/google-services.json`, matching `android.googleServicesFile` in `mobile/app.json`.
3. Confirm the `expo.extra.eas.projectId` and owner refer to the Expo project the release team controls.
4. Generate the FCM V1 service-account key in Firebase only as needed, then upload it using Expo/EAS Android credential management. Do not save that private key in the repository or app configuration.
5. Delete the temporary downloaded key after upload or retain it only in an organization secret manager.

Then run:

```bash
cd mobile
npm ci
npm run preflight -- --release
npm run validate:demo-api
npx eas-cli@latest project:info
```

The release preflight must report an HTTPS API URL, Firebase `google-services.json`, compatible Expo notification/device packages, notification and Image Picker config plugins, a real EAS project ID, and Image Picker support. It does not read or validate private FCM credentials.

Build with the organization-owned EAS account:

```bash
# Development/preview build used for real-device validation
npm run build:android:preview

# Production artifact after acceptance succeeds
npm run build:android:production
```

A local Android SDK/JDK build may be used for development, but a new installed binary is required after changing native modules, config plugins, `google-services.json`, or application identity. Expo Go does not establish Android remote-push support for this SDK generation.

## 5. Physical-device acceptance test

Run this with a fresh production-like account on a real Android device using an EAS development/preview build. Repeat non-push paths on iOS if iOS will ship. Record device model/OS, app build/version, API revision, test account IDs (not passwords), and migration evidence.

### Session and profile

- Register/verify/sign in, then sign out and sign back in.
- Load dashboard and profile data.
- Pick a valid JPEG, PNG, or WebP under 2 MB.
- Upload it, reload the Profile screen, restart the app, and verify the owner can still view it.
- Verify an unauthenticated request cannot read the private avatar endpoint/object.

### Persisted inbox

- Trigger an application-stage update, announcement, job event, or other server workflow that creates a notification row.
- Bring SmartHire to foreground or open the inbox.
- Confirm the unread count/list reflects the persisted row.
- Open the item, verify the row becomes read, and verify supported in-app navigation.
- Sign out/in as a different account and ensure notification state does not leak between users.

### Android device alerts

Before this test, confirm migrations `009` **and** `010` are applied, the trusted 15-minute receipt worker is deployed, the device has granted notification permission, Profile → Notifications reports device alerts enabled, and the deployed backend has `EXPO_PUSH_ENABLED=true`.

1. Trigger a real workflow event for the signed-in test account.
2. In the foreground, verify the alert behavior and an unread-inbox refresh.
3. Put the app in the background and verify a tray/banner alert.
4. Fully close the app, trigger a fresh event, and verify an alert can launch SmartHire.
5. Tap each alert. Verify the response belongs to the signed-in account, opens a supported route when available, and reads the same persisted notification row.
6. Verify an event for account B is not surfaced or routed when account A is signed in.
7. Repeat after a sign-out/sign-in cycle to ensure device registration is ownership-safe.

Expected: the inbox contains every server-persisted event even if the alert is delayed, denied, unavailable, or fails. A remote-delivery failure must not make the originating job/application/assessment workflow fail.

### DSA

- Open DSA Practice and verify the seeded catalogue loads.
- Open problems across the supported typed runner categories.
- Run and submit valid Python and JavaScript solutions.
- Confirm failures show feedback and successful submissions appear in performance/history.
- Confirm missing/invalid JDoodle configuration yields an explicit error rather than a false passing result.

### Networking and recovery

- Verify HTTPS works on Wi-Fi and mobile data.
- Temporarily remove network access and verify a clear recoverable error is shown.
- Restore connectivity, return to the app, and confirm the inbox refreshes.

## 6. Release controls and rollback

- Promote the backend/database before distributing a client that requires new API/schema behavior.
- Retain the last known-good Android artifact and backend deployment revision.
- Keep `EXPO_PUSH_ENABLED=false` during staged rollout until the Android device-alert acceptance test passes. If remote delivery degrades, set it false and restart the backend; the receipt worker safely no-ops while inbox persistence and in-app notification behavior continue.
- Do not delete `mobile_devices`, notification rows, or avatar objects as an alert-delivery rollback action.
- If a client issue occurs, stop distribution/promote the previous binary where possible, and roll back backend code only after checking schema compatibility.
- Revoke/rotate any secret that was exposed accidentally.
- Monitor API errors, authentication failures, avatar upload failures, DSA runner failures/quota responses, token registration/removal errors, and Expo delivery errors after release.

## 7. Privacy and store readiness

Prepare a privacy notice and store disclosures that accurately state the deployed behavior:

- account/contact/profile data used for campus placement workflows;
- private profile images stored in Supabase and served through authenticated API access;
- assessment, DSA, and application activity used to present progress/performance;
- persisted in-app notifications and unread status;
- Android notification permission, opaque device/Expo push token handling, and Firebase Cloud Messaging/Expo Push processing when remote alerts are enabled;
- third-party processors actually used (for example hosting, Supabase, SMTP, JDoodle, Expo, and Firebase);
- the fact that notification history remains in the authenticated inbox even when an operating-system alert is unavailable.

Do not claim iOS remote alerts until APNs/EAS configuration and an iOS physical-device test have been completed.
