#!/usr/bin/env node
/** Network-free regression check: every dashboard bell shows an unread badge. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

const bell = read('src/components/NotificationBell.js');
assert.match(bell, /useNotifications\(\)/, 'bell reads the shared unread count');
assert.match(bell, /99\+/, 'badge caps at 99+ like the website');
assert.match(bell, /count > 0/, 'badge hidden at zero');
for (const f of ['src/screens/student/StudentDashboardScreen.js', 'src/screens/recruiter/RecruiterDashboardScreen.js', 'src/screens/admin/AdminDashboardScreen.js']) {
  assert.match(read(f), /<NotificationBell navigation=\{navigation\}/, `${f} uses the badged bell`);
}
assert.match(read('src/context/NotificationContext.js'), /setInterval/, 'unread count polls while signed in');
console.log('Notification bell badge contracts: PASS');
