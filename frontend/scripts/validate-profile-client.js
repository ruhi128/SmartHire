#!/usr/bin/env node
// Network-free profile UI checks. Backend numeric/authorization checks are in
// backend/scripts/validate-profile-authorization.js.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '../src/pages/student/Profile.jsx'), 'utf8');
for (const field of ['linkedin_url', 'github_url']) {
  assert(source.includes(`${field}: p.${field} || ''`), `${field} must load from the saved profile before editing`);
  assert(source.includes(`${field}: form.${field}?.trim() || null`), `${field} must survive a save`);
}
assert(!source.includes("key: 'location'"), 'do not offer a profile field that the API never persists');
assert(source.includes('const saved = r.data?.profile;') && !source.includes('r.data?.profile || form'),
  'do not claim an unconfirmed save succeeded');
assert(source.includes("value={F.cgpa ?? ''}"), 'zero CGPA must remain visible in the form');
assert(source.includes('cgpa,\n        tenth_percent: tenth,'), 'save numeric zero without a truthy fallback');
const payload = source.slice(source.indexOf('const payload = {'), source.indexOf('const r = await studentAPI.updateProfile(payload)'));
assert(!/placement_status\s*:|roll_number\s*:/.test(payload), 'students must not edit admin-managed fields');
console.log('Website profile field persistence and authorization contracts: PASS');
