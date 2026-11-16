#!/usr/bin/env node

/**
 * Non-secret deployment guard for the optional mobile push pathway.
 * It intentionally never prints credential values.
 *
 * Usage: npm run check:mobile-push-config
 * In hosted environments, export the variables and run this command in the
 * deployment shell instead of relying on a local .env file.
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = process.env.ENV_FILE || path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const errors = [];
const warnings = [];
const placeholder = (value) => !value || /YOUR-|change-me|your-service-role|example/i.test(value);

if (placeholder(process.env.SUPABASE_URL) || !/^https:\/\//i.test(process.env.SUPABASE_URL || '')) {
  errors.push('SUPABASE_URL is missing, a placeholder, or not HTTPS.');
}
if (placeholder(process.env.SUPABASE_SERVICE_KEY)) errors.push('SUPABASE_SERVICE_KEY is missing or still a placeholder.');
if (placeholder(process.env.JWT_SECRET) || String(process.env.JWT_SECRET || '').length < 32) {
  errors.push('JWT_SECRET is missing, a placeholder, or shorter than 32 characters.');
}

const pushEnabled = process.env.EXPO_PUSH_ENABLED === 'true';
const rawFlag = process.env.EXPO_PUSH_ENABLED;
if (rawFlag && !['true', 'false'].includes(rawFlag)) {
  errors.push('EXPO_PUSH_ENABLED must be exactly true or false.');
}

console.log('\nSmartHire backend mobile-push configuration check');
console.log(`• Environment source: ${fs.existsSync(envPath) ? '.env file loaded' : 'process environment only'}`);
console.log(`• Push delivery: ${pushEnabled ? 'ENABLED' : 'disabled (safe default)'}`);

if (pushEnabled) {
  warnings.push('Confirm that migrations 009_enable_mobile_push_devices.sql and 010_add_expo_push_receipt_jobs.sql are applied to this exact Supabase project (005/007 are historical only).');
  warnings.push('Confirm a physical device shows “Enabled” in Account → Notifications and has received a real workflow notification.');
  warnings.push('Confirm the API deployment logs show no [expo-push] delivery failures for the test, and that `npm run process:expo-push-receipts` is scheduled every 15 minutes.');
} else {
  warnings.push('In-app notifications remain active. Do not enable push until the physical-device validation checklist is complete.');
}

if (warnings.length) {
  console.log('\nManual verification:');
  warnings.forEach((message) => console.log(`  • ${message}`));
}
if (errors.length) {
  console.error('\nBlocking items:');
  errors.forEach((message) => console.error(`  • ${message}`));
  process.exit(1);
}

console.log('\nConfiguration values passed local checks. This does not prove credential validity or push delivery.\n');
