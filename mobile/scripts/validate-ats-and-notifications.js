#!/usr/bin/env node
// Network-free checks for Android ATS PDF selection and protected inbox links.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
let count = 0;
const loadPure = (file) => import(`data:text/javascript;base64,${Buffer.from(read(file)).toString('base64')}#${++count}`);

async function run() {
  const pdf = await loadPure('src/utils/atsPdfImport.js');
  class FakeFormData {
    fields = [];
    append(key, value) { this.fields.push([key, value]); }
  }
  const originalFormData = global.FormData;
  global.FormData = FakeFormData;
  try {
    let extractCalls = 0;
    const extractPdf = async (formData) => {
      extractCalls += 1;
      assert.equal(formData.fields.length, 1, 'the PDF must not be sent to profile storage');
      assert.equal(formData.fields[0][0], 'document');
      assert.equal(formData.fields[0][1].type, 'application/pdf');
      return { text: 'A sufficiently detailed resume with experience, education, skills and relevant project examples. We also mention SQL, Python, and Git.' };
    };
    const pickDocument = async (options) => {
      assert.deepEqual(options, { type: 'application/pdf', copyToCacheDirectory: true, multiple: false });
      return { canceled: false, assets: [{ uri: 'file:///cache/resume.pdf', name: 'resume.pdf', mimeType: 'application/pdf', size: 1234 }] };
    };
    const selectedResume = await pdf.pickAndExtractAtsPdf({ pickDocument, extractPdf });
    assert.equal(selectedResume.name, 'resume.pdf');
    assert.match(selectedResume.text, /experience/);
    assert.equal(extractCalls, 1);

    const selectedJd = await pdf.pickAndExtractAtsPdf({
      pickDocument: async () => ({ assets: [{ uri: 'content://documents/123', name: 'job.pdf', size: 5012, mimeType: null }] }),
      extractPdf,
    });
    assert.equal(selectedJd.name, 'job.pdf');
    assert.equal(extractCalls, 2);

    assert.equal(await pdf.pickAndExtractAtsPdf({ pickDocument: async () => ({ canceled: true }), extractPdf }), null);
    await assert.rejects(pdf.pickAndExtractAtsPdf({
      pickDocument: async () => ({ assets: [{ uri: 'file:///image.png', name: 'image.png', mimeType: 'image/png' }] }), extractPdf,
    }), /Choose a PDF/);
    await assert.rejects(pdf.pickAndExtractAtsPdf({
      pickDocument: async () => ({ assets: [{ uri: 'file:///huge.pdf', name: 'huge.pdf', size: pdf.MAX_ATS_PDF_BYTES + 1 }] }), extractPdf,
    }), /8 MB/);
    await assert.rejects(pdf.pickAndExtractAtsPdf({
      pickDocument, extractPdf: async () => ({ text: 'image scan' }),
    }), /readable text/);
    assert.equal(extractCalls, 2, 'cancel/invalid/oversize files are not uploaded');
  } finally {
    global.FormData = originalFormData;
  }

  const ats = read('src/screens/student/AtsGuideScreen.js');
  for (const part of ["importPdf('resume')", "importPdf('jd')", 'studentApi.extractAtsPdf', 'setOriginalResume(\'\')', 'setResult(null)']) {
    assert(ats.includes(part), `ATS screen is missing ${part}`);
  }
  assert.match(read('src/api/index.js'), /extractAtsPdf: \(formData\) => result\(api\.post\('\/api\/students\/ats\/extract-pdf'/);

  const { navigateFromInboxLink } = await loadPure('src/navigation/notificationNavigation.js');
  const calls = [];
  const navigation = { navigate: (...args) => calls.push(args) };
  const examples = [
    ['/student/jobs', 'student', 'StudentApp', 'JobsTab'],
    ['/student/applications', 'student', 'StudentApp', 'JobsTab'],
    ['/student/dsa', 'student', 'StudentApp', 'PracticeTab'],
    ['/recruiter/dashboard', 'recruiter', 'RecruiterApp', 'RecruiterHomeTab'],
    ['/admin/job-approvals', 'admin', 'AdminApp', 'AdminReviewsTab'],
  ];
  for (const [link, role, rootRoute, tab] of examples) {
    calls.length = 0;
    assert.equal(navigateFromInboxLink(navigation, link, role), true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], rootRoute);
    assert.equal(calls[0][1].screen, tab);
  }
  calls.length = 0;
  for (const [link, role] of [
    ['/admin/job-approvals', 'student'], ['/student/jobs', 'recruiter'],
    ['https://untrusted.example/student/jobs', 'student'], ['/studentish/jobs', 'student'],
    ['//untrusted.example/student/jobs', 'student'], ['', 'admin'],
  ]) {
    assert.equal(navigateFromInboxLink(navigation, link, role), false);
  }
  assert.equal(calls.length, 0, 'invalid and cross-role links cannot switch navigation trees');
  const screen = read('src/screens/common/NotificationsScreen.js');
  assert.match(screen, /navigateFromInboxLink\(navigation, item\.link, user\?\.role\)/);
  assert.doesNotMatch(screen, /navigateFromNotification/);
  assert.match(screen, /markNotificationReadLocally\(item\)/);
  assert.match(screen, /markAllNotificationsReadLocally\(\)/);
  assert.match(screen, /removeNotificationLocally\(item\)/);
  assert.match(read('src/context/NotificationContext.js'), /navigateFromInboxLink\(navigationRef, tap\.link, user\.role\)/);
  console.log('ATS PDF pickers and role-scoped inbox navigation contracts: PASS');
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
