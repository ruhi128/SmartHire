#!/usr/bin/env node

/**
 * Local, non-secret checks before creating an EAS build.
 * Examples:
 *   npm run preflight
 *   npm run preflight -- --release
 *   npm run preflight -- --release --push --android
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));
const release = args.has('--release');
const requirePush = args.has('--push');
const checkAndroid = args.has('--android') || (!args.has('--ios') && !args.has('--android'));
const checkIos = args.has('--ios') || (!args.has('--ios') && !args.has('--android'));
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
try {
  app = JSON.parse(fs.readFileSync(appPath, 'utf8')).expo;
} catch (error) {
  console.error(`ERROR: Cannot parse app.json: ${error.message}`);
  process.exit(1);
}

const localEnv = readEnvFile(path.join(root, '.env'));
const apiUrl = configuredValue('EXPO_PUBLIC_API_URL', localEnv).replace(/\/$/, '');
const envProjectId = configuredValue('EXPO_PUBLIC_EAS_PROJECT_ID', localEnv);
const appProjectId = app?.extra?.eas?.projectId || '';
const projectId = envProjectId || appProjectId;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

if (requirePush) {
  add(!uuid.test(projectId) || placeholder(projectId), 'Run `npm run eas:init`, keep the generated EAS project UUID in app.json, and set EXPO_PUBLIC_EAS_PROJECT_ID in mobile/.env before push testing.');
  if (checkAndroid) {
    const configuredGoogleServices = app?.android?.googleServicesFile;
    add(!configuredGoogleServices, 'For Android push, add android.googleServicesFile (normally "./google-services.json") to app.json.');
    if (configuredGoogleServices) {
      const googleServicesPath = path.resolve(root, configuredGoogleServices);
      add(!fs.existsSync(googleServicesPath), `Android Firebase configuration is missing: ${configuredGoogleServices}`);
      if (fs.existsSync(googleServicesPath)) {
        try {
          const googleServices = JSON.parse(fs.readFileSync(googleServicesPath, 'utf8'));
          const firebasePackage = googleServices?.client?.[0]?.client_info?.android_client_info?.package_name;
          add(Boolean(firebasePackage && firebasePackage !== app?.android?.package), `google-services.json is registered for ${firebasePackage}, but app.json uses ${app?.android?.package}.`);
        } catch {
          add('Could not parse the configured google-services.json file.');
        }
      }
    }
  }
  if (checkIos) {
    warnings.push('For iOS push, confirm that the final bundle ID has Push Notifications enabled in Apple Developer and that APNs credentials are configured in EAS.');
  }
}

console.log(`\nSmartHire mobile preflight (${release ? 'release' : 'development'}${requirePush ? ', push' : ''})`);
console.log(`• API URL: ${apiUrl ? 'configured' : 'missing'}`);
console.log(`• EAS project ID: ${uuid.test(projectId) ? 'valid UUID' : 'not configured / placeholder'}`);
console.log(`• Android package: ${app?.android?.package || 'missing'}`);
console.log(`• iOS bundle ID: ${app?.ios?.bundleIdentifier || 'missing'}`);

if (warnings.length) {
  console.log('\nWarnings:');
  warnings.forEach((message) => console.log(`  • ${message}`));
}
if (errors.length) {
  console.error('\nBlocking items:');
  errors.forEach((message) => console.error(`  • ${message}`));
  console.error('\nFix the blocking items before the corresponding build or test.\n');
  process.exit(1);
}

console.log('\nPreflight passed. This checks configuration only; it does not replace device, API, or store-review testing.\n');
