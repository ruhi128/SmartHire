#!/usr/bin/env node

/**
 * Local, non-secret checks before building/testing the connected mobile app.
 * Examples:
 *   npm run preflight
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
const release = args.has('--release');
const errors = [];
const warnings = [];

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
add(!apiUrl, 'Create mobile/.env from .env.example and set EXPO_PUBLIC_API_URL.');
add(Boolean(apiUrl) && !isHttpUrl(apiUrl), 'EXPO_PUBLIC_API_URL must be an absolute http:// or https:// URL with a host.');
add(Boolean(apiUrl) && hasEmbeddedUrlCredentials(apiUrl), 'Do not embed credentials in EXPO_PUBLIC_API_URL; every EXPO_PUBLIC value is included in the app bundle.');
add(release && apiUrl && !/^https:\/\//i.test(apiUrl), 'A release build must use an HTTPS EXPO_PUBLIC_API_URL.');
add(release && apiUrl && isLoopbackUrl(apiUrl), 'A release build cannot use a localhost or loopback EXPO_PUBLIC_API_URL.');
add(!release && apiUrl && isLoopbackUrl(apiUrl), 'localhost only works in a simulator/emulator, not on a physical device.', warnings);

// Image Picker is a native module. Keeping both package and plugin makes a
// clean Android build include ExponentImagePicker.
add(!dependencies['expo-image-picker'], 'Install expo-image-picker: npx expo install expo-image-picker.');
add(!pluginNames.includes('expo-image-picker'), 'Keep the expo-image-picker plugin in mobile/app.json, then make a clean native rebuild.');

// Android remote push requires these SDK-compatible packages, the notification
// config plugin, a stable EAS project ID, and Firebase's public app config.
add(!dependencies['expo-notifications'], 'Install expo-notifications: npx expo install expo-notifications.');
add(!dependencies['expo-device'], 'Install expo-device: npx expo install expo-device.');
add(!pluginNames.includes('expo-notifications'), 'Keep the expo-notifications plugin in mobile/app.json, then make a clean native rebuild.');
add(placeholder(projectId), 'Set expo.extra.eas.projectId in app.json (run npm run eas:init if this project is not linked).');
add(!googleServicesFile, 'Set android.googleServicesFile to your Firebase Android google-services.json path in app.json.');
add(Boolean(googleServicesFile) && !fs.existsSync(googleServicesPath), `Download Firebase's google-services.json for ${app?.android?.package || 'the Android package'} to ${googleServicesFile || './google-services.json'}. Do not use a Firebase service-account key here.`);

console.log(`\nSmartHire mobile preflight (${release ? 'release' : 'development'})`);
console.log(`• API URL: ${apiUrl ? 'configured' : 'missing'}`);
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

console.log('\nPreflight passed. This checks configuration only; verify delivery on a physical Android device installed from an EAS development/preview build.\n');
