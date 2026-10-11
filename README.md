# SmartHire Mobile

A React Native + Expo companion app for the existing SmartHire React/Express/Supabase platform.

## What is shared

- The existing Express API, Supabase database, JWT workflow, email OTP flow, and business data remain the source of truth in **live mode**.
- This is a separate native client. It does **not** replace or modify the website.
- The mobile app stores a live session with Expo SecureStore instead of browser `localStorage`.
- Resume drafts are stored locally with AsyncStorage. On Android/iOS, the resume builder can create/share a PDF and can upload it through the existing authenticated API in live mode.

## Two deliberately separate ways to run the app

| Mode | Start command | Uses | Does not use |
|---|---|---|---|
| **Local demo** | `npm run start:demo` | In-memory, non-sensitive sample data and the three visible demo-role buttons | SmartHire accounts, backend/API calls, Supabase, file uploads, email, push registration/delivery, or saved data after reload |
| **Live integration** | `npm start` | The configured Express/Supabase-backed API | Demo accounts or local sample-data adapters |

The amber **LOCAL SAMPLE WORKSPACE** disclosure and the in-app demo banner must be visible in demo mode. Reloading or restarting the app resets local changes.

## Fastest preview: local demo (no backend required)

### Prerequisites

- Node.js **20 LTS or newer**.
- An Android/iOS device with Expo Go for basic exploration, an emulator/simulator, or a desktop browser for the web preview.
- Expo login is not required for a local web preview or basic LAN Expo Go preview. If you are already signed in to Expo, do **not** run `expo login` again; you may optionally confirm the current account with `npx expo whoami`.

### 1. Install exactly the lockfile-pinned packages

```bash
cd smarthire-github-updated/mobile
npm ci --ignore-scripts
```

Use `npm ci` rather than `npm install` for a repeatable preview. If this workspace was restored and `node_modules` is absent, run the command again.

### 2. Verify the local-data adapter (recommended)

```bash
npm run validate:demo-api
```

This is a fast, network-free contract check for the demo Mock OA, Company OA, recruiter/admin OA lifecycle, and application-stage behavior. It is not a device or live-backend test.

### 3. Open the browser preview

```bash
npm run start:demo -- --web
```

Wait for Expo to print a URL, then:

1. Press `w` in the Expo terminal if it is offered, **or** open the displayed `http://localhost:…` web URL on the same computer.
2. On the first screen, choose **Enter** for Student, Recruiter, or Administrator.
3. The data is local to the running demo. Use the role buttons again after logging out to explore another role.

The web preview is useful for navigation, layout, and local-data flows. It cannot validate Android/iOS-only features such as native document picking/sharing, secure storage behavior, or device push notifications.

### 4. Open the same local demo in Expo Go or an emulator

Start Expo without the `--web` flag:

```bash
npm run start:demo
```

Then choose one route from Expo's terminal/UI:

- **Android emulator:** press `a` after an emulator is running.
- **iOS simulator (macOS only):** press `i`.
- **Physical Android/iPhone with Expo Go:** keep the phone and computer on the same Wi-Fi network, open Expo Go, and scan the QR code. If LAN discovery is blocked, stop Expo and retry with `npm run start:demo -- --tunnel`.

This demo mode never needs `EXPO_PUBLIC_API_URL`, because it deliberately blocks the API client and uses no network data.

## Live integration preview (requires backend setup)

Use this only when you want to test real SmartHire accounts and data.

1. In `backend/`, install dependencies, configure non-secret and secret server variables in `backend/.env`, apply the required existing migrations, and start the API.
2. In `mobile/`, copy the environment template and set a reachable API URL:

   ```bash
   cp .env.example .env
   ```

   Set `EXPO_PUBLIC_API_URL` for the chosen target:

   | Target | API URL |
   |---|---|
   | Android emulator | `http://10.0.2.2:5000` |
   | iOS simulator | `http://localhost:5000` |
   | Phone on the same LAN | `http://YOUR_COMPUTER_LAN_IP:5000` |
   | Production build | Your HTTPS API URL |

   A phone's `localhost` is the phone itself, not the development computer.

3. Start the live client:

   ```bash
   npm start
   ```

4. Sign in with a verified SmartHire account. Do **not** use the local demo buttons in this mode.

### Live DSA/JDoodle boundary

- Set `JDOODLE_CLIENT_ID` and `JDOODLE_CLIENT_SECRET` on the **backend only**, then restart the API. Never add either credential to `mobile/.env`, `app.json`, EAS public variables, or source code.
- In **Practice → DSA**, mobile learners implement only the supplied function or design class. Run accepts a JSON array of typed arguments; Submit uses server-owned tests and grading.
- Python and JavaScript are the verified mobile function-runner languages. Configured problem-specific starter code is used first; verified legacy problems without it receive an unfinished safe fallback function/class template from the backend. Unsupported language/problem combinations are shown as unavailable rather than silently using stdin/stdout grading.
- `npm run start:demo` intentionally does not call JDoodle or the backend. It provides local deterministic sample feedback only.

## Expo Go and push boundary

Expo Go is appropriate for basic UI exploration and non-push development. It is **not** evidence that native release features work. In particular, Android remote push notification testing for this Expo SDK requires an EAS development build with `expo-dev-client`, a real EAS project ID, final package identifiers, Firebase credentials, and physical-device testing. See the production runbook before enabling push delivery.

For native push preparation, first apply `backend/db/migrations/005_mobile_push_devices.sql` while backend push delivery remains disabled. In a live build, a restored or newly signed-in session owns registration; local demo sessions never request permission, register a token, or call the API. Each bulk push contains its recipient's persisted notification ID, so a tap can mark the matching inbox item read. The response queue waits for the authenticated role navigator—not merely `NavigationContainer` readiness—and is discarded when that session ends, so an old tap cannot navigate a later account. Do not substitute placeholders for an API URL, EAS project ID, or application identifiers.

See [`../docs/MOBILE_APP_IMPLEMENTATION.md`](../docs/MOBILE_APP_IMPLEMENTATION.md) for the complete setup and implementation sequence, and [`../docs/MOBILE_PRODUCTION_RUNBOOK.md`](../docs/MOBILE_PRODUCTION_RUNBOOK.md) for EAS, Firebase/APNs, physical-device, and release steps.
