# SmartHire mobile implementation notes

This document describes the current Expo mobile implementation. For runnable local setup and Firebase/EAS account steps, use the repository [setup guide](../../SETUP.md). For a release checklist, use [MOBILE_PRODUCTION_RUNBOOK.md](./MOBILE_PRODUCTION_RUNBOOK.md).

## Architecture at a glance

| Area | Current implementation |
| --- | --- |
| Runtime | Expo / React Native with role-based React Navigation stacks |
| Authentication | SmartHire Express API + persisted SecureStore session |
| API mode | Explicit connected mode via `EXPO_PUBLIC_API_URL`, or strict network-free demo mode |
| Inbox | Authenticated persisted inbox from `/api/notifications`; the source of truth |
| Android alerts | Expo Notifications → Expo Push Service → FCM in an EAS/custom native build |
| DSA | Shared backend catalogue, editor, Run, Submit, and performance endpoints |
| Profile photo | `expo-image-picker` + authenticated private-avatar API routes |

## Runtime modes

### Connected mode

Copy `mobile/.env.example` to `mobile/.env` and set a real API URL reachable from the client.

```dotenv
# Android emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000
```

Use `http://YOUR_LAN_IP:5000` for a physical development device on the same trusted network, and HTTPS for production/release builds. A physical phone cannot use `localhost` to reach a backend on the developer computer.

### Demo mode

```bash
npm run start:demo
npm run validate:demo-api
```

`start:demo` sets `EXPO_PUBLIC_DEMO_MODE=true` for that Expo process. The adapter intentionally blocks network traffic and serves deterministic local flows. It is useful for UI demonstration, not server-backed login, avatar upload, live DSA history, or remote-device-notification verification.

## Persisted inbox and Android device notifications

The inbox is durable and remains available whether remote delivery works or not:

1. Backend business actions persist rows in `public.notifications`.
2. `NotificationProvider` refreshes unread state for the authenticated account after session restoration, foreground activation, and inbox screen focus.
3. `NotificationsScreen` uses authenticated list/read/read-all/delete endpoints.
4. `notificationNavigation.js` resolves supported links once the matching role navigator is mounted.

Android device alerts are additive:

1. On an eligible physical device, `pushNotifications.js` creates the `smarthire-updates` Android channel **before** requesting permission/token.
2. It gets an Expo token using the configured EAS project ID; demo, web, simulators, and Expo Go are explicitly reported as unavailable rather than crashing.
3. The app writes the active `{ userId, expoPushToken }` to SecureStore and registers the token through `POST /api/notifications/devices`. The backend derives the user from the bearer token.
4. A user-initiated logout removes that token through the authenticated delete endpoint before clearing the session. An unauthorized-session logout skips the network cleanup to prevent interceptor recursion but clears the local record.
5. Foreground receipts refresh unread state. Response/launch listeners queue notification taps until authentication and the correct role navigator are ready. The payload recipient must equal the signed-in user before the app marks a row read or navigates.
6. After notification persistence, the backend asynchronously sends a small Expo payload containing only notification ID, inbox link, type, and recipient ID. A delivery failure never blocks the persisted event.
7. Successful Expo ticket IDs are saved to a private, short-lived receipt queue. A trusted server-side worker checks those receipts every 15 minutes, retries transient failures, and removes a token only when Expo reports `DeviceNotRegistered`.

Apply migrations `001` through `010` in order. Migrations `005` and `007` are historical; `009_enable_mobile_push_devices.sql` forward-safely recreates the private registry and `010_add_expo_push_receipt_jobs.sql` adds the receipt queue used only by the server worker. Set backend `EXPO_PUSH_ENABLED=true` only after migrations `009`/`010`, Firebase/EAS configuration, the trusted receipt scheduler, and physical-device testing are complete.

The full Firebase Android app, FCM V1 credential, EAS build, and physical-device test procedure is in [SETUP.md section 6](../../SETUP.md#6-android-device-notifications-expo-push--fcm). Never put a Firebase service-account private key in this repository, an Expo public variable, or `backend/.env`.

## DSA practice

Student DSA screens are implemented at:

- `src/screens/student/DsaListScreen.js` — problem catalogue and filtering
- `src/screens/student/DsaProblemScreen.js` — editor, language selection, Run and Submit
- `src/screens/student/DsaPerformanceScreen.js` — submission/performance view
- `src/api/index.js` — authenticated API adapters

The backend uses verified per-problem metadata seeded by `backend/db/migrations/008_seed_dsa_practice_problems.sql`. This is essential for typed function problems such as arrays, linked lists, trees, and class design; clients do not infer a runner contract from a display title.

Live Run/Submit needs backend-side JDoodle credentials. Missing credentials produce a configuration error; the app must not claim code passed when no runner is available. The developer-only local runner remains disabled outside a trusted local machine because it executes untrusted submission code on the API host.

## Profile photos and Image Picker

Profile photos use the private Supabase `avatars` bucket installed by migration `006_profile_avatars.sql`. The mobile app selects an image with `expo-image-picker` and sends it through an authenticated backend endpoint. The backend validates JPEG, PNG, and WebP uploads with a 2 MB limit, and serves photo bytes through an authenticated avatar route.

`expo-image-picker` and `expo-notifications` are native dependencies with `app.json` config plugins. This app uses **Expo Continuous Native Generation (CNG)** for Android: `android/` is generated output, not a hand-maintained source directory. After adding/updating either—or after an `ExponentImagePicker` native-module error—build a fresh Android binary:

```bash
npm run preflight
npm run android
```

`npm run android` first runs `npm run prebuild:android`, which cleanly regenerates the Android project from `app.json` and config plugins before installing it. An already-installed binary cannot gain a native module from a JavaScript reload.

## Local Android workflow

```bash
cd mobile
cp .env.example .env
# Set EXPO_PUBLIC_API_URL=http://10.0.2.2:5000
npm ci
npm run preflight
npm run android
```

Before this flow, install JDK 17+, Android Studio/SDK, and an Android emulator or connect a USB-debuggable device. For connected remote push, `preflight` additionally requires a Firebase `google-services.json`; a physical EAS development/preview build—not Expo Go—is required to verify alerts. Do not hand-edit the generated `android/` folder: update `app.json` or a config plugin, then rebuild.

## Source-level checks

```bash
npm run validate:demo-api
npm run validate:notification-taps
npm run preflight
```

`validate:demo-api` is network-free. `preflight` requires `mobile/.env` with a non-placeholder `EXPO_PUBLIC_API_URL` plus the Firebase Android app config. For a release check use `npm run preflight -- --release`, which requires HTTPS and rejects loopback URLs.
