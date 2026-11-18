#!/usr/bin/env node
const assert = require('node:assert/strict');
const { isAllowedWebOrigin } = require('../utils/corsOrigins');
const prod = { clientUrls: 'https://smarthire.example.org, https://preview.example.org/', nodeEnv: 'production' };
assert.equal(isAllowedWebOrigin(undefined, prod), true, 'native/mobile requests carry no browser Origin');
assert.equal(isAllowedWebOrigin('https://smarthire.example.org', prod), true);
assert.equal(isAllowedWebOrigin('https://preview.example.org', prod), true);
for (const origin of ['https://evil.vercel.app', 'https://random.onrender.com', 'https://smarthire.example.org.evil.com', 'http://localhost:3000', 'null']) {
  assert.equal(isAllowedWebOrigin(origin, prod), false, `unexpected CORS grant: ${origin}`);
}
assert.equal(isAllowedWebOrigin('http://localhost:3000', { clientUrls: '', nodeEnv: 'development' }), true);
assert.equal(isAllowedWebOrigin('https://evil.vercel.app', { clientUrls: '', nodeEnv: 'development' }), false);
console.log('Explicit browser CORS allowlist and native-origin support: PASS');
