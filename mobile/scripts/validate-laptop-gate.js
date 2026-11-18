#!/usr/bin/env node
/** Network-free regression check: Mock OA / Company OA / Mock Interview must
 * stay visible on phone but never start an attempt/session there. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

const gate = read('src/components/LaptopRequired.js');
assert.match(gate, /\/student\/mockoa/, 'Mock OA website path');
assert.match(gate, /\/student\/companyoa/, 'Company OA website path');
assert.match(gate, /\/student\/interview/, 'Mock interview website path');
assert.match(gate, /EXPO_PUBLIC_WEB_URL|WEB_APP_URL/, 'website URL is env-driven');
assert.doesNotMatch(gate, /Linking\.openURL|Open SmartHire website|Open website/, 'the phone must never open a laptop-only attempt in its browser');

for (const [file, label] of [
  ['src/screens/student/MockOaListScreen.js', 'Mock OA list'],
  ['src/screens/student/CompanyOaListScreen.js', 'Company OA list'],
  ['src/screens/student/InterviewHubScreen.js', 'Interview hub'],
  ['src/screens/student/MockOaHistoryScreen.js', 'Mock OA history'],
]) {
  assert.match(read(file), /showLaptopRequired\(/, `${label} must prompt instead of starting`);
}
for (const [file, label] of [
  ['src/screens/student/MockOaAttemptScreen.js', 'Mock OA attempt route'],
  ['src/screens/student/CompanyOaAttemptScreen.js', 'Company OA attempt route'],
  ['src/screens/student/MockInterviewScreen.js', 'Mock interview route'],
  ['src/screens/student/InterviewResultScreen.js', 'Old interview result route'],
]) {
  const src = read(file);
  assert.match(src, /LaptopRequiredNotice/, `${label} must be gated`);
  assert.doesNotMatch(src, /TimedAssessmentAttempt/, `${label} must not run an attempt on phone`);
}
// Lists remain visible: they still fetch and render their data.
assert.match(read('src/screens/student/MockOaListScreen.js'), /mockOaApi\.tests\(\)/);
assert.match(read('src/screens/student/CompanyOaListScreen.js'), /companyOaApi\.available\(\)/);
assert.match(read('src/screens/student/InterviewHubScreen.js'), /InterviewSessionDetail/, 'past sessions stay viewable');
assert.match(read('src/screens/student/MockOaListScreen.js'), /MockOaHistory/, 'tapping a mock test opens its history');
assert.match(read('src/screens/student/CompanyOaListScreen.js'), /CompanyOaResult/, 'saved Company OA results remain viewable');
for (const name of ['MockOaResultScreen', 'CompanyOaResultScreen']) {
  const source = read(`src/screens/student/${name}.js`);
  assert.match(source, /attemptResult\(attemptId\)/, `${name} must fetch a persisted result`);
  assert.doesNotMatch(source, /route\.params\?\.result|route\.params\s*\|\|\s*\{\}/, `${name} must not trust a route-parameter score`);
}
console.log('Laptop-gate and saved-result contracts: PASS');
