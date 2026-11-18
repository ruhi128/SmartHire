#!/usr/bin/env node
// Network-free phone-loading regression: missing/stale API settings fail clearly,
// ordinary requests cannot spin for two minutes, and stalled loaders settle.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { createServer } = require('node:http');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
let importSequence = 0;

async function loadPureModule(file, apiUrl, demoMode = '') {
  if (apiUrl === null) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = apiUrl;
  process.env.EXPO_PUBLIC_DEMO_MODE = demoMode;
  const source = Buffer.from(read(file)).toString('base64');
  return import(`data:text/javascript;base64,${source}#${++importSequence}`);
}

function preflight(args, env) {
  return spawnSync(process.execPath, ['scripts/preflight.js', ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, EXPO_PUBLIC_API_URL: 'https://api.smarthire.test', EXPO_PUBLIC_WEB_URL: '', ...env },
  });
}

function preflightAsync(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/preflight.js', ...args], {
      cwd: root,
      env: { ...process.env, EXPO_PUBLIC_API_URL: 'https://api.smarthire.test', EXPO_PUBLIC_WEB_URL: '', ...env },
    });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, output }));
  });
}

async function main() {
  const missing = await loadPureModule('src/api/config.js', null);
  assert.match(missing.API_CONFIGURATION_ERROR, /no SmartHire API address/);
  const badPath = await loadPureModule('src/api/config.js', 'https://api.smarthire.test/api');
  assert.match(badPath.API_CONFIGURATION_ERROR, /invalid SmartHire API address/);
  const placeholder = await loadPureModule('src/api/config.js', 'https://api.your-domain.example');
  assert(placeholder.API_CONFIGURATION_ERROR);
  const live = await loadPureModule('src/api/config.js', 'https://api.smarthire.test/');
  assert.equal(live.API_CONFIGURATION_ERROR, null);
  assert.equal(live.apiUrl('/health'), 'https://api.smarthire.test/health');
  assert.match(live.apiErrorMessage({ code: 'ERR_NETWORK' }), /https:\/\/api\.smarthire\.test\/health/);
  assert.match(live.apiErrorMessage({ code: 'ETIMEDOUT' }), /did not respond in time/);
  const local = await loadPureModule('src/api/config.js', 'http://10.0.2.2:5000');
  assert.match(local.apiErrorMessage({ code: 'ERR_NETWORK' }), /physical phone/);
  const demo = await loadPureModule('src/api/config.js', null, 'true');
  assert.equal(demo.API_CONFIGURATION_ERROR, null);
  assert.equal(demo.apiErrorMessage(new Error('Local demo failure')), 'Local demo failure');

  const { withDeadline } = await loadPureModule('src/utils/withDeadline.js', null);
  assert.equal(await withDeadline(async () => 42, 40, 'timeout'), 42);
  await assert.rejects(withDeadline(() => new Promise(() => {}), 30, 'Loading timed out'), /Loading timed out/);
  await assert.rejects(withDeadline(() => { throw new Error('loader failed'); }, 50, 'timeout'), /loader failed/);

  assert.match(read('App.js'), /if \(!DEMO_MODE && API_CONFIGURATION_ERROR\) return <ApiConfigurationNotice/);
  assert.match(read('src/utils/useAsyncData.js'), /await withDeadline\(loader, SCREEN_LOAD_DEADLINE_MS/);
  assert.match(read('src/context/AuthContext.js'), /withDeadline\(getStoredSession, 12000/);
  assert.match(read('src/context/AuthContext.js'), /withDeadline\(\(\) => saveStoredSession\(nextSession\), 12000/);
  assert.match(read('src/api/client.js'), /timeout: 20000/);
  assert.match(read('src/api/index.js'), /LONG_OPERATION = \{ timeout: 120000 \}/);
  assert.match(read('src/components/Ui.js'), /setTimeout\(\(\) => setTakingLong\(true\), 6000\)/);
  const packageManifest = JSON.parse(read('package.json'));
  assert.match(packageManifest.scripts.prestart, /preflight/);
  assert.match(packageManifest.scripts.preandroid, /preflight/);
  assert.match(packageManifest.scripts['eas-build-post-install'], /auto-eas/);

  const emulatorOnly = preflight(['--device'], { EXPO_PUBLIC_API_URL: 'http://10.0.2.2:5000' });
  assert.notEqual(emulatorOnly.status, 0);
  assert.match(emulatorOnly.stderr, /only locally or in an emulator/);
  const badApiPath = preflight([], { EXPO_PUBLIC_API_URL: 'https://api.smarthire.test/api' });
  assert.notEqual(badApiPath.status, 0);
  assert.match(badApiPath.stderr, /origin only/);
  const missingEasWeb = preflight(['--auto-eas'], { EAS_BUILD_PROFILE: 'preview' });
  assert.notEqual(missingEasWeb.status, 0);
  assert.match(missingEasWeb.stderr, /EXPO_PUBLIC_WEB_URL/);
  const configuredEas = preflight(['--auto-eas'], {
    EAS_BUILD_PROFILE: 'preview', EXPO_PUBLIC_WEB_URL: 'https://smarthire.test',
  });
  assert.equal(configuredEas.status, 0, configuredEas.stderr);

  // Health probes must check JSON, not mistake an arbitrary login/404 page
  // for a working backend. Loopback is used here only by this local test.
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: req.url === '/health' ? 'ok' : 'wrong endpoint' }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const probe = await preflightAsync(['--check-api'], {
      EXPO_PUBLIC_API_URL: `http://127.0.0.1:${server.address().port}`,
    });
    assert.equal(probe.code, 0, probe.output);
    assert.match(probe.output, /responded OK from this computer/);
  } finally {
    server.close();
  }
  console.log('Connected-device API configuration and bounded-loading contracts: PASS');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
