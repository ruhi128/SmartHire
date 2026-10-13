-- 007_remove_mobile_push_registry.sql
--
-- SmartHire now uses the persisted in-app notifications inbox only. No Expo,
-- FCM, APNs, or other remote device-token delivery is part of this deployment.
--
-- Deploy the matching backend/mobile code before running this migration so no
-- active server still queries the obsolete registry. This is intentionally
-- idempotent: projects that never applied migration 005 are safe to upgrade.

drop table if exists public.mobile_devices;

-- Refresh the API schema cache after removing the legacy table.
notify pgrst, 'reload schema';
