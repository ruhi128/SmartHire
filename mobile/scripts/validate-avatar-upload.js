#!/usr/bin/env node
/** Network-free regression check for profile-photo upload/display wiring. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

const client = read('src/api/client.js');
assert.match(client, /export \{[^}]*apiUrl[^}]*\} from '\.\/config'/, 'apiUrl must be re-exported for avatar <Image> sources');
assert.match(read('src/api/config.js'), /export function apiUrl\(/, 'apiUrl must resolve avatar paths against the configured origin');
const api = read('src/api/index.js');
assert.doesNotMatch(api, /'Content-Type': 'multipart\/form-data'/, 'RN uploads must not set multipart Content-Type manually (no boundary on Android)');
assert.match(api, /uploadAvatar: \(formData\) => result\(api\.post\('\/api\/auth\/avatar', formData, LONG_OPERATION\)\)/);
for (const file of ['src/screens/student/ProfileScreen.js','src/screens/admin/AdminAccountScreen.js','src/screens/recruiter/RecruiterAccountScreen.js']) {
  const src = read(file);
  assert.match(src, /apiUrl\(avatarPath\)/, `${file} displays the avatar via apiUrl`);
  assert.match(src, /uploadAvatar\(body\)/, `${file} uploads via authApi.uploadAvatar`);
  assert.match(src, /requestMediaLibraryPermissionsAsync/, `${file} requests photo permission`);
}
console.log('Avatar upload contracts: PASS');
