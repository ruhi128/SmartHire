# SmartHire local setup and deployment guide

This guide starts the Express API, React web app, and Expo mobile app against one Supabase project. SmartHire keeps a persisted, pull-based authenticated inbox as the source of truth and adds optional Android remote delivery through **Expo Notifications, Expo Push Service, and Firebase Cloud Messaging (FCM)**.

## 1. Prerequisites

Install the following before beginning:

- Node.js **20 LTS or newer** and npm
- A Supabase project you control
- Git (if cloning the repository)
- For Android native development: Android Studio, Android SDK Platform + Build Tools, an Android emulator or USB-debuggable Android device, and **JDK 17 or newer**
- An SMTP account/app password if email OTP delivery is needed
- A JDoodle account/client credentials if live DSA Run/Submit execution is needed
- For Android background/closed-app alerts: an Expo account/EAS project you control, a Firebase project you control, and one physical Android device. Expo Go is not sufficient for Android remote push.

Open three terminals at the repository root. The commands below use `npm ci` because lockfiles are committed; use `npm install` only when deliberately updating dependencies.

## 2. Create the Supabase database

1. In Supabase, create a project and keep its **Project URL**, **anon key**, and **service_role key** available.
2. In **SQL Editor**, run `backend/db/schema.sql` for a new empty project.
3. Run each migration as a separate SQL operation, in this exact order:

   1. `backend/db/migrations/001_phase1.sql`
   2. `backend/db/migrations/002_dsa_submissions_columns.sql`
   3. `backend/db/migrations/003_proctoring.sql`
   4. `backend/db/migrations/004_job_docs.sql`
   5. `backend/db/migrations/005_mobile_push_devices.sql`
   6. `backend/db/migrations/006_profile_avatars.sql`
   7. `backend/db/migrations/007_remove_mobile_push_registry.sql`
   8. `backend/db/migrations/008_seed_dsa_practice_problems.sql`
   9. `backend/db/migrations/009_enable_mobile_push_devices.sql`
   10. `backend/db/migrations/010_add_expo_push_receipt_jobs.sql`

   For an existing SmartHire database, apply the same `001`–`010` sequence without re-running the baseline schema unless you have reviewed it against that database. The migration files are idempotent, but back up production data and retain a record of each execution.

4. Migrations `005` and `007` are historical deployment history: `005` originally created the registry and `007` later removed it. The forward-only `009` migration safely recreates the private `mobile_devices` table for the selected Expo/FCM design. Do not edit or skip old migration files to achieve this.
5. Migration `006` creates the private `avatars` Storage bucket and avatar metadata columns. Keep that bucket private.
6. Migration `008` seeds/upgrades the DSA catalogue and the verified runner metadata used by web and mobile DSA screens.
7. Migration `009` enables row-level security on `mobile_devices` and revokes direct anon/authenticated-table access. Only the authenticated Express endpoints use the server-side Supabase service-role client.
8. Migration `010` creates the private, short-lived `expo_push_receipt_jobs` queue used only by a trusted backend scheduler to confirm Expo delivery receipts and retire stale device tokens. It does not replace the `notifications` inbox.

### Supabase key boundaries

| Value | Where it belongs |
| --- | --- |
| Project URL | backend, frontend, and mobile public configuration as appropriate |
| `anon` key | frontend only where `REACT_APP_SUPABASE_ANON_KEY` is requested |
| `service_role` key | `backend/.env` only |
| JWT secret, SMTP password, JDoodle credentials | `backend/.env` only |

Anything prefixed `REACT_APP_` or `EXPO_PUBLIC_` can be exposed to a browser or app bundle. Never place server secrets there.

## 3. Configure and start the backend

```bash
cd backend
cp .env.example .env
npm ci
npm run dev
```

Edit `backend/.env` before starting. At minimum, configure:

```dotenv
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_KEY=your_server_only_service_role_key
JWT_SECRET=a_long_random_value
```

For email verification and email notifications, also set `EMAIL_USER` and `EMAIL_PASS`. For live DSA execution, set `JDOODLE_CLIENT_ID` and `JDOODLE_CLIENT_SECRET`.

Leave `EXPO_PUSH_ENABLED=false` until the Firebase/EAS steps in [section 6](#6-android-device-notifications-expo-push--fcm), migrations `009` and `010`, and the trusted receipt scheduler are complete. Then set `EXPO_PUSH_ENABLED=true` in the backend deployment environment and restart the API. This is an explicit delivery gate, not a credential; Firebase service-account keys never belong in this repository or backend `.env`.

`EXPO_PUSH_ACCESS_TOKEN` is optional. Set it only as a **server-side deployment secret** when Expo Push access-token security is enabled for the EAS project; it must never be an `EXPO_PUBLIC_*` value or mobile configuration. See the [production runbook](./mobile/docs/MOBILE_PRODUCTION_RUNBOOK.md#31-schedule-expo-receipt-processing) for the 15-minute one-shot receipt worker, retry behavior, and incident procedure.

Verify the API in a browser or terminal:

```bash
curl http://localhost:5000/health
```

It should return JSON with `"status":"ok"`.

### DSA execution safety

The normal DSA runner uses the backend-only JDoodle credentials. If they are missing, live Run/Submit responds with a configuration error rather than silently pretending execution succeeded.

`ALLOW_LOCAL_CODE_RUNNER=true` is supported only for a trusted local developer machine and executes submitted learner code on the API host. Leave it `false` for shared development, preview, and production environments.

## 4. Configure and start the web app

```bash
cd frontend
cp .env.example .env
npm ci
npm start
```

Set these values in `frontend/.env`:

```dotenv
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The web app opens at `http://localhost:3000`. Its origin must match `CLIENT_URL` in `backend/.env`; restart the backend after changing that value. For a deployed web app, set both values to their HTTPS deployment URLs.

## 5. Configure and run the mobile app

```bash
cd mobile
cp .env.example .env
npm ci
npm run preflight
```

Set `EXPO_PUBLIC_API_URL` in `mobile/.env` based on where the Android/iOS client runs:

| Client | Value during local API development |
| --- | --- |
| Android emulator | `http://10.0.2.2:5000` |
| iOS simulator | `http://localhost:5000` |
| Physical device on the same trusted Wi-Fi/LAN | `http://YOUR_COMPUTER_LAN_IP:5000` |
| Release/production build | `https://api.your-domain.example` |

Do **not** use `localhost` on a physical device: it points to the phone, not your computer. For a LAN device test, ensure the backend machine firewall allows TCP port `5000`, both devices use the same reachable network, and use the computer's actual LAN address (for example `http://192.168.1.25:5000`). Avoid exposing a local HTTP API to an untrusted network.

`npm run preflight` must pass before a connected Android build. It intentionally rejects a missing API URL, a release HTTP/loopback URL, missing Expo notification/device packages, a missing notification/Image Picker config plugin, a missing EAS project ID, or a missing Firebase `google-services.json`. It checks public/native configuration only and never asks for a Firebase service-account private key.

### Android-first local development

1. In Android Studio, install an emulator image or connect a device with Developer Options and USB debugging enabled.
2. Ensure JDK 17+ and Android SDK environment variables are available to your shell (`ANDROID_HOME` or `ANDROID_SDK_ROOT`; add platform-tools to `PATH`).
3. With the backend already running and `EXPO_PUBLIC_API_URL=http://10.0.2.2:5000` in `mobile/.env`, run:

   ```bash
   cd mobile
   npm run android
   ```

   This regenerates the CNG Android project from `app.json` and installs a development build. It is the right path for `expo-image-picker`, because Image Picker is a native module.

4. SmartHire deliberately treats `mobile/android/` as generated CNG output. `npm run android` always runs the clean `prebuild:android` step first, so after native dependency, Firebase config, or `app.json` plugin changes, run the same command again rather than hand-editing generated Gradle/manifest files or relying on an existing Expo Go session.

The app uses package `com.ruvai.smarthire`. Do not change that identifier after distributing a build under it.

### Demo mode versus connected mode

```bash
# Strict network-free mobile demonstration
npm run start:demo

# Verify the demo adapters without starting Expo
npm run validate:demo-api
```

Demo mode is deliberate: it sets `EXPO_PUBLIC_DEMO_MODE=true` for that process and blocks direct network traffic. Use it for UI/flow demonstrations only. Do not set demo mode when testing backend-backed login, notifications, profile photos, DSA execution, or performance history.

## 6. Android device notifications (Expo Push + FCM)

The `notifications` table and authenticated inbox remain the source of truth. This section adds an **optional, best-effort** Android alert after that row has been written. If any push step fails, the inbox still has the notification.

### 6.1 Create/link the Expo EAS project

`mobile/app.json` already contains an EAS project ID. Confirm that it belongs to an Expo account you can use:

```bash
cd mobile
npx eas-cli@latest whoami
npx eas-cli@latest project:info
```

If you do not have access to the configured owner/project, sign in to your own Expo account and run `npm run eas:init`. Review the resulting owner/project ID before committing it; do not guess or copy another team's project ID.

### 6.2 Create the Firebase Android app

1. In [Firebase Console](https://console.firebase.google.com/), create or select a Firebase project.
2. Click **Add app** → **Android**.
3. Enter this Android package name exactly: `com.ruvai.smarthire`. It must match `mobile/app.json`; changing it after release creates a different Android app identity.
4. Download the Firebase Android configuration file named **`google-services.json`**.
5. Put it at `mobile/google-services.json` (the path referenced by `android.googleServicesFile` in `mobile/app.json`). This file has public app identifiers, not a service-account private key. Do not substitute any service-account JSON for it.
6. Run `npm run preflight` from `mobile`. It should now recognize the Firebase app config after `EXPO_PUBLIC_API_URL` is also set.

### 6.3 Give Expo permission to send through FCM V1

Expo Push Service needs a Firebase **service-account key** registered with your EAS project so Expo can deliver to FCM. Generate it only in Firebase and upload it only through Expo/EAS credential management:

1. In Firebase Console, open **Project settings** → **Service accounts**.
2. Generate a Firebase Admin SDK private key when prompted, and keep the downloaded key in a private, temporary location.
3. In the Expo dashboard for the linked project, open **Credentials** → **Android** and add the FCM V1 service-account credential; or run `npx eas-cli@latest credentials -p android` and follow the credential-management prompts.
4. Delete the temporary download when the EAS upload is confirmed (or retain it only in your organization’s secret manager). **Never** paste it into chat, `app.json`, `.env`, the repository, or a mobile `EXPO_PUBLIC_*` value.

The Express backend does not need this private key. It sends only opaque Expo tokens to the Expo Push API.

### 6.4 Build an installable Android client

A newly installed native build is required after adding `expo-notifications`, `expo-device`, the notification config plugin, or `google-services.json`. Expo Go cannot test Android remote push in this SDK generation.

```bash
cd mobile
npm ci
npm run preflight
# EAS development APK for a physical Android device
npm run build:android:development
```

Install the completed APK on a physical Android device. For a local Android Studio workflow, keep `google-services.json` in place and let the CNG command regenerate native files before installing:

```bash
npm run android
```

Use the EAS development/preview build for the actual remote-push test, because its credentials and project association match Expo Push delivery.

### 6.5 Enable the backend gate and test delivery

1. Apply migrations `009_enable_mobile_push_devices.sql` and `010_add_expo_push_receipt_jobs.sql` in Supabase after migrations `001`–`008`.
2. Configure a trusted platform scheduler to run `cd backend && npm run process:expo-push-receipts` every **15 minutes** with the same private backend environment. Do not expose this as a public route.
3. In the backend deployment environment, set `EXPO_PUSH_ENABLED=true`, then restart the backend.
4. Open the installed Android build, sign in, and go to Profile → **Notifications**. Grant Android notification permission. The card should say **Device alerts enabled**.
5. Trigger a real event that calls `notify`/`notifyMany` (for example an application-stage update, announcement, job action, or assessment workflow event).
6. Verify all three states on the same device: foreground alert, background/tray alert, and an alert that launches the closed app.
7. Tap the alert. SmartHire verifies the payload recipient matches the signed-in account, marks that persisted inbox row read through the scoped API, and routes to its supported native link. A response for another account is discarded.
8. Open the inbox and confirm the same notification is present even if the alert was delayed or never arrived.

If the Profile card reports an unavailable build, install the EAS development/preview APK rather than Expo Go. If it reports a Firebase/token error, recheck the package name, `google-services.json` path, EAS FCM V1 credential, and whether the installed binary was rebuilt after those changes. Do not solve delivery failures by adding Firebase secrets to mobile or backend source files.

A send ticket is not a delivery confirmation: the scheduler first checks it after 15 minutes. It retries transient Expo/network/`429`/`5xx` failures with bounded backoff; missing receipts are retried every 15 minutes and abandoned after four checks. `DeviceNotRegistered` automatically removes the affected opaque device token. These outcomes cannot remove the persisted inbox row. For detailed recovery steps, use the production runbook rather than logging device tokens or ticket IDs.

## 7. Profile-photo upload prerequisites

1. Run migration `006_profile_avatars.sql`.
2. Confirm the Supabase Storage bucket `avatars` exists and is **private**.
3. Configure and start the backend with its Supabase service-role key.
4. Make a clean Android rebuild after installing/changing `expo-image-picker` or the config plugin.
5. Sign in and select a JPEG, PNG, or WebP image no larger than 2 MB from the Profile screen.

The client uploads through authenticated API routes. It must not use a public Supabase Storage URL or direct service-role credentials. If the app reports `Cannot find native module 'ExponentImagePicker'`, stop the old client, run a clean native build as shown above, and install that rebuilt app; changing JavaScript alone cannot add a native module to an already-installed binary.

## 8. End-to-end smoke test

After configuration, verify the following in order:

1. `curl http://localhost:5000/health` succeeds.
2. Web login/profile/dashboard requests succeed using the configured API URL.
3. Mobile `npm run preflight` passes with the intended API URL and Firebase `google-services.json`.
4. An Android build can sign in to the same local API (the emulator uses `10.0.2.2`; use a physical EAS development/preview build for remote push).
5. Create/open a notification and confirm persisted inbox/read/navigation behavior.
6. With `EXPO_PUSH_ENABLED=true` and the 15-minute receipt worker deployed, trigger the same event on a physical Android build and verify foreground, background, and closed-app alert delivery plus tap routing.
7. Upload, reload, and view a profile avatar as the same authenticated user.
8. Open DSA Practice, load the problem list, run a Python or JavaScript solution, submit it, and check performance history. This requires migration `008` and backend JDoodle credentials for live execution.

Useful source-level contract checks:

```bash
cd backend
npm run validate:interview-route
npm run validate:student-route
npm run validate:auth-avatar-route
npm run validate:notifications-push

cd ../mobile
npm run validate:demo-api
npm run validate:notification-taps
```

## 9. Production differences

- Use HTTPS for API, web, and release mobile traffic.
- Set deployed API/browser origins in `EXPO_PUBLIC_API_URL`, `REACT_APP_API_URL`, and `CLIENT_URL` respectively.
- Store backend secrets in the host's secret manager, not a checked-in `.env` file.
- Use production SMTP and JDoodle credentials with quotas/monitoring.
- Build and test signed Android/iOS binaries on physical devices.
- Keep `EXPO_PUSH_ENABLED` explicitly enabled only in environments where migrations `009` and `010`, the trusted 15-minute receipt worker, Expo/EAS FCM V1 credentials, and device testing are complete. Leave it false during staged rollout or incident response; the persisted inbox remains available.
- Keep Firebase service-account keys in Firebase/EAS credential management or your secret manager only. Never put them in mobile source, mobile public environment values, backend `.env`, or version control.
