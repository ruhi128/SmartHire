# SmartHire mobile implementation

This legacy top-level entry point is retained for links from older project material. The current mobile implementation documentation lives at:

- [Mobile implementation notes](./mobile/docs/MOBILE_APP_IMPLEMENTATION.md)
- [Mobile release runbook](./mobile/docs/MOBILE_PRODUCTION_RUNBOOK.md)
- [Repository setup guide](./SETUP.md)

## Current architecture summary

- SmartHire mobile uses Expo/React Native with role-based navigation and the shared Express/Supabase backend.
- `public.notifications` and authenticated `/api/notifications` inbox routes are authoritative for notification history and unread state.
- Android adds optional, best-effort device alerts through Expo Notifications, Expo Push Service, and Firebase Cloud Messaging (FCM). Protected device registration stores only an opaque Expo token; remote delivery never replaces or blocks the persisted inbox.
- Android background/closed-app delivery requires Firebase configuration, an EAS/custom native physical-device build, the EAS FCM V1 credential, migration `009`, and the backend `EXPO_PUSH_ENABLED=true` gate. Expo Go is not sufficient for this SDK generation.
- DSA list/editor/Run/Submit/performance use the shared backend contracts and migration `008` catalogue.
- Profile photos use `expo-image-picker`, authenticated backend avatar routes, and the private Supabase `avatars` bucket from migration `006`.
- `expo-image-picker` and `expo-notifications` require a fresh Android native rebuild after native dependency/config changes.

For an Android emulator, use `EXPO_PUBLIC_API_URL=http://10.0.2.2:5000`; for a physical development device, use a reachable LAN address; use HTTPS for release builds. Apply database migrations `001` through `009` in order. Migrations `005` and `007` remain historical deployment history; migration `009` forward-safely restores the private device registry for the selected Expo/FCM design.

See [SETUP.md](./SETUP.md) for credential-safe Firebase/EAS provisioning. Firebase service-account private keys belong only in Firebase/EAS credential management or a secret manager—never in source control, app configuration, or public environment variables.
