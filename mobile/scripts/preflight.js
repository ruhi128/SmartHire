#!/usr/bin/env node

/**
 * Local, non-secret checks before building/testing the connected mobile app.
 * Examples:
 *   npm run preflight
 *   npm run preflight -- --device --check-api
 *   npm run preflight -- --release
 *
 * SmartHire preserves a persisted authenticated inbox and adds optional Expo
 * Push / FCM delivery for Android. This script checks only public/native
 * configuration; it never asks for Firebase service-account credentials.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));
const autoEas = args.has('--auto-eas');
const profile = process.env.EAS_BUILD_PROFILE || process.env.EXPO_PUBLIC_APP_ENV || '';
const release = args.has('--release') || (autoEas && ['preview', 'production'].includes(profile));
const physicalDevice = args.has('--device');
const errors = [];
const warnings = [];

add(autoEas && !['development', 'preview', 'production'].includes(profile), 'The EAS build profile is unknown; cannot safely check the release settings.');
add(autoEas && process.env.EXPO_PUBLIC_DEMO_MODE === 'true', 'Do not build the connected app with EXPO_PUBLIC_DEMO_MODE=true.');

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const result = {};
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    result[match[1]] = value;
  }
  return result;
}

function configuredValue(name, localEnv) {
  return process.env[name] || localEnv[name] || '';
}

function placeholder(value) {
  return !value || /YOUR-|REPLACE_WITH|yourorganisation|change-me|example/i.test(value);
}

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isHttpUrl(value) {
  const url = parseUrl(value);
  return Boolean(url?.hostname) && (url.protocol === 'http:' || url.protocol === 'https:');
}

function isLoopbackUrl(value) {
  const hostname = parseUrl(value)?.hostname?.toLowerCase();
  return ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
}

function hasEmbeddedUrlCredentials(value) {
  const url = parseUrl(value);
  return Boolean(url?.username || url?.password);
}

function add(condition, message, bucket = errors) {
  if (condition) bucket.push(message);
}

const appPath = path.join(root, 'app.json');
if (!fs.existsSync(appPath)) {
  console.error('ERROR: mobile/app.json was not found.');
  process.exit(1);
}

let app;
let packageManifest;
try {
  app = JSON.parse(fs.readFileSync(appPath, 'utf8')).expo;
  packageManifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
} catch (error) {
  console.error(`ERROR: Cannot parse mobile configuration: ${error.message}`);
  process.exit(1);
}

const localEnv = readEnvFile(path.join(root, '.env'));
const apiUrl = configuredValue('EXPO_PUBLIC_API_URL', localEnv).replace(/\/$/, '');
const webUrl = configuredValue('EXPO_PUBLIC_WEB_URL', localEnv).replace(/\/$/, '');
const plugins = app?.plugins || [];
const pluginNames = plugins.map((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin));
const dependencies = packageManifest?.dependencies || {};
const projectId = app?.extra?.eas?.projectId || '';
const googleServicesFile = app?.android?.googleServicesFile || '';
const googleServicesPath = googleServicesFile ? path.resolve(root, googleServicesFile) : '';

add(placeholder(app?.ios?.bundleIdentifier), 'Set a permanent ios.bundleIdentifier in app.json. It cannot be changed after the App Store app record is created.');
add(placeholder(app?.android?.package), 'Set a permanent android.package in app.json. It cannot be changed after the Google Play app record is created.');
add(!app?.version, 'Set an app version in app.json.');
add(!Number.isInteger(app?.android?.versionCode) || app.android.versionCode < 1, 'Set android.versionCode to a positive integer in app.json.');
add(!app?.ios?.buildNumber, 'Set ios.buildNumber in app.json.');
add(!apiUrl, 'Set EXPO_PUBLIC_API_URL to the reachable backend origin in mobile/.env (local) or your EAS build environment (APK).');
add(Boolean(apiUrl) && placeholder(apiUrl), 'Replace the EXPO_PUBLIC_API_URL example/placeholder with your actual reachable API address.');
add(Boolean(apiUrl) && !isHttpUrl(apiUrl), 'EXPO_PUBLIC_API_URL must be an absolute http:// or https:// URL with a host.');
add(Boolean(apiUrl) && (hasEmbeddedUrlCredentials(apiUrl) || /[?#]/.test(apiUrl) || (parseUrl(apiUrl)?.pathname || '/') !== '/'),
  'EXPO_PUBLIC_API_URL must be an origin only (no credentials, query, fragment or /api path).');
add(release && apiUrl && !/^https:\/\//i.test(apiUrl), 'A release build must use an HTTPS EXPO_PUBLIC_API_URL.');
add(release && apiUrl && isLoopbackUrl(apiUrl), 'A release build cannot use a localhost or loopback EXPO_PUBLIC_API_URL.');
add(!release && apiUrl && isLoopbackUrl(apiUrl), 'localhost points at the phone on a physical device (unless USB port forwarding is configured).', warnings);
const apiHost = parseUrl(apiUrl)?.hostname?.toLowerCase();
add((release || physicalDevice) && ['localhost', '127.0.0.1', '[::1]', '10.0.2.2', '0.0.0.0'].includes(apiHost),
  'This API address works only locally or in an emulator. On a physical phone use a reachable LAN address (development) or deployed HTTPS origin (release).');
add(!physicalDevice && !release && apiHost === '10.0.2.2', '10.0.2.2 only works from an Android emulator, not a physical phone.', warnings);
// The Mock OA / Company OA / Mock Interview gate displays this laptop URL.
// A placeholder gives students unusable laptop instructions, so block release.
add(release && !webUrl, 'Set EXPO_PUBLIC_WEB_URL to the real deployed website origin in your EAS environment or mobile/.env, then rebuild.');
add(Boolean(webUrl) && placeholder(webUrl), 'Replace the EXPO_PUBLIC_WEB_URL placeholder with your actual deployed website origin.');
add(release && Boolean(webUrl) && !/^https:\/\//i.test(webUrl), 'EXPO_PUBLIC_WEB_URL must be HTTPS for release builds.');
add(Boolean(webUrl) && (hasEmbeddedUrlCredentials(webUrl) || /[?#]/.test(webUrl) || (parseUrl(webUrl)?.pathname || '/') !== '/'), 'EXPO_PUBLIC_WEB_URL must be an origin only (no credentials, query, fragment or path).');
add(Boolean(webUrl) && isLoopbackUrl(webUrl), 'Use a website address reachable from the phone and laptop, not localhost.');

// Image Picker is a native module. Keeping both package and plugin makes a
// clean Android build include ExponentImagePicker.
add(!dependencies['expo-image-picker'], 'Install expo-image-picker: npx expo install expo-image-picker.');
add(!pluginNames.includes('expo-image-picker'), 'Keep the expo-image-picker plugin in mobile/app.json, then make a clean native rebuild.');
add(!dependencies['expo-document-picker'], 'Install expo-document-picker for ATS resume/JD PDF selection.');

// Android remote push requires these SDK-compatible packages, the notification
// config plugin, a stable EAS project ID, and Firebase's public app config.
add(!dependencies['expo-notifications'], 'Install expo-notifications: npx expo install expo-notifications.');
add(!dependencies['expo-device'], 'Install expo-device: npx expo install expo-device.');
add(!pluginNames.includes('expo-notifications'), 'Keep the expo-notifications plugin in mobile/app.json, then make a clean native rebuild.');
add(placeholder(projectId), 'Set expo.extra.eas.projectId in app.json (run npm run eas:init if this project is not linked).');
add(!googleServicesFile, 'Set android.googleServicesFile to your Firebase Android google-services.json path in app.json.');
add(Boolean(googleServicesFile) && !fs.existsSync(googleServicesPath), `Download Firebase's google-services.json for ${app?.android?.package || 'the Android package'} to ${googleServicesFile || './google-services.json'}. Do not use a Firebase service-account key here.`);
if (googleServicesPath && fs.existsSync(googleServicesPath)) {
  try {
    const firebase = JSON.parse(fs.readFileSync(googleServicesPath, 'utf8'));
    const clientMatches = firebase?.client?.some((client) => client?.client_info?.android_client_info?.package_name === app?.android?.package);
    add(!clientMatches, 'The Firebase Android google-services.json client does not match android.package. Download the correct public app config.');
  } catch {
    errors.push('The Firebase Android google-services.json file could not be parsed.');
  }
}
// This repo checks in a prebuilt Android project: app.json alone does not
// update its native manifest during an EAS build.
const nativeManifest = path.join(root, 'android/app/src/main/AndroidManifest.xml');
if (fs.existsSync(nativeManifest)) {
  const manifest = fs.readFileSync(nativeManifest, 'utf8');
  add(!manifest.includes('android.permission.POST_NOTIFICATIONS'), 'The checked-in AndroidManifest.xml lacks Android 13 notification permission.');
  add(!manifest.includes('android:name="com.google.firebase.messaging.default_notification_channel_id" android:value="smarthire-updates"'),
    'The checked-in AndroidManifest.xml must use the same smarthire-updates FCM default channel as app.json and the push sender.');
}

console.log(`\nSmartHire mobile preflight (${release ? 'release' : 'development'})`);
console.log(`• API URL: ${apiUrl ? 'configured' : 'missing'}`);
console.log(`• Website URL (laptop prompt): ${webUrl && !placeholder(webUrl) ? 'configured' : 'missing/placeholder'}`);
console.log(`• Android package: ${app?.android?.package || 'missing'}`);
console.log(`• EAS project ID: ${projectId ? 'configured' : 'missing'}`);
console.log(`• Android Firebase app config: ${googleServicesFile && fs.existsSync(googleServicesPath) ? 'found' : 'missing'}`);
console.log(`• Remote delivery: Expo Push + Firebase Cloud Messaging (Android); backend gate: EXPO_PUSH_ENABLED=true after setup`);
console.log(`• Image picker native setup: ${dependencies['expo-image-picker'] && pluginNames.includes('expo-image-picker') ? 'configured' : 'needs attention'}`);

if (warnings.length) {
  console.log('\nWarnings:');
  warnings.forEach((message) => console.log(`  • ${message}`));
}
if (errors.length) {
  console.error('\nBlocking items:');
  errors.forEach((message) => console.error(`  • ${message}`));
  console.error('\nFix the blocking items before the corresponding build or physical-device test.\n');
  process.exit(1);
}

async function checkApiHealth() {
  const healthUrl = `${apiUrl}/health`;
  try {
    const response = await fetch(healthUrl, {
      headers: { Accept: 'application/json' },
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    if (body?.status !== 'ok') throw new Error('The response was not SmartHire health JSON.');
    console.log(`• ${healthUrl} responded OK from this computer.`);
    console.log('  Still test the same URL in your phone browser; health does not verify the database or authenticated routes.');
  } catch (error) {
    console.error(`\nCannot reach the SmartHire API at ${healthUrl}: ${error?.message || error}`);
    console.error('Start/deploy the backend and set the correct EXPO_PUBLIC_API_URL before building.\n');
    process.exitCode = 1;
  }
}

if (args.has('--check-api')) checkApiHealth();
else console.log('\nPreflight passed. This checks configuration only; verify API reachability and device delivery separately.\n');
