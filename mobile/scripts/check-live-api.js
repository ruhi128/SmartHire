#!/usr/bin/env node
// Read-only public deployment audit. Sends no bearer token and cannot mutate
// account data: each protected route must reject the request with HTTP 401.
// A 404 means that route is not installed on the chosen backend deployment.
// Usage: EXPO_PUBLIC_API_URL=https://your-api.example npm run check:live-api
//        npm run check:live-api -- --url https://your-api.example
const argIndex = process.argv.indexOf('--url');
const origin = (argIndex >= 0 ? process.argv[argIndex + 1] : process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');
if (!/^https:\/\/[a-z0-9.-]+(?::\d{1,5})?$/i.test(origin)) {
  console.error('Set an HTTPS EXPO_PUBLIC_API_URL origin, or pass --url https://your-api.example (no /api path).');
  process.exit(2);
}

const protectedRoutes = [
  ['POST', '/api/students/ats/extract-pdf', 'ATS resume/JD PDF extraction'],
  ['POST', '/api/notifications/devices', 'Android push registration'],
  ['GET', '/api/notifications', 'In-app inbox'],
  ['GET', '/api/notifications/unread-count', 'In-app unread count'],
  ['GET', '/api/dsa/problems', 'DSA problem bank'],
  ['POST', '/api/dsa/run', 'DSA run'],
  ['POST', '/api/dsa/submit', 'DSA submit'],
  ['GET', '/api/dsa/performance', 'DSA performance'],
  ['GET', '/api/students/profile', 'Student profile'],
  ['GET', '/api/auth/avatar', 'Profile photos'],
  ['GET', '/api/jobs', 'Shared jobs'],
  ['GET', '/api/mockoa/history', 'Mock OA laptop-attempt history'],
  ['GET', '/api/mockoa/history/route-audit-only', 'Mock OA attempt result detail'],
  ['GET', '/api/companyoa/my', 'Recruiter OA'],
  ['GET', '/api/companyoa/history', 'Company OA laptop-attempt history'],
  ['GET', '/api/admin/stats', 'Admin stats'],
];

async function request(method, path) {
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: { Accept: 'application/json', ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
    ...(method === 'POST' ? { body: '{}' } : {}),
    signal: AbortSignal.timeout(75000), // allow a cold hosted API to wake up
  });
  const body = await response.text();
  let data;
  try { data = JSON.parse(body); } catch { data = null; }
  return { status: response.status, data };
}

async function main() {
  console.log(`Auditing public route availability at ${origin} (NO credentials, account data, or writes)`);
  const health = await request('GET', '/health');
  if (health.status !== 200 || health.data?.status !== 'ok') {
    throw new Error(`The chosen origin did not return a SmartHire /health OK response (HTTP ${health.status}).`);
  }
  console.log('  GET  /health: 200 OK');
  let failures = 0;
  for (const [method, path, label] of protectedRoutes) {
    try {
      const response = await request(method, path);
      const result = response.status === 401 ? 'installed; auth required'
        : response.status === 404 ? 'NOT DEPLOYED'
          : `UNEXPECTED (expected HTTP 401)`;
      if (response.status !== 401) failures += 1;
      console.log(`  ${method.padEnd(4)} ${path}: ${response.status} ${result} — ${label}`);
    } catch (error) {
      failures += 1;
      console.log(`  ${method.padEnd(4)} ${path}: UNREACHABLE (${error.message}) — ${label}`);
    }
  }
  try {
    const runner = await request('GET', '/api/code/status');
    if (runner.status !== 200 || runner.data?.available !== true) failures += 1;
    console.log(`  GET  /api/code/status: ${runner.status}, available=${runner.data?.available === true} — code runner`);
  } catch (error) {
    failures += 1;
    console.log(`  GET  /api/code/status: UNREACHABLE (${error.message})`);
  }
  console.log('A 401 only proves the route is installed; authentication, DB migrations, DSA metadata, and actual push delivery still require signed-in/device tests.');
  if (failures) {
    console.error(`${failures} route/runner check(s) failed. Do not distribute a connected preview APK until the backend is updated and tested.`);
    process.exitCode = 1;
  } else {
    console.log('Public route availability: PASS (authenticated workflows still unverified)');
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
