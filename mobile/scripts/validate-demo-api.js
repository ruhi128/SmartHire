#!/usr/bin/env node

/**
 * Fast, network-free contract check for the intentionally local demo adapter.
 * It transpiles only mobile src files in-process so it can load Expo ES modules
 * under Node, and it never starts Expo, accesses the HTTP client, or needs .env.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');

const root = path.resolve(__dirname, '..');
const srcRoot = `${path.join(root, 'src')}${path.sep}`;
const originalJsLoader = Module._extensions['.js'];

// Transform only this app's ES-module source. Dependencies retain Node's normal
// loader, avoiding an application-wide require hook.
Module._extensions['.js'] = function compileMobileSource(mod, filename) {
  if (!filename.startsWith(srcRoot)) return originalJsLoader(mod, filename);
  const source = fs.readFileSync(filename, 'utf8');
  const output = babel.transformSync(source, {
    filename,
    babelrc: false,
    configFile: false,
    presets: [[require.resolve('babel-preset-expo'), { lazyImports: false }]],
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
  });
  mod._compile(output.code, filename);
};

// Set this before loading any source file: mockApi imports runtime metadata.
process.env.EXPO_PUBLIC_DEMO_MODE = 'true';
const { mockApi } = require(path.join(root, 'src/api/mockApi.js'));
// Load the exported adapter too: demo mode must expose the same protected
// timed-assessment entry points that native attempt screens call.
const {
  mockOaApi: publicMockOaApi,
  companyOaApi: publicCompanyOaApi,
  interviewApi: publicInterviewApi,
} = require(path.join(root, 'src/api/index.js'));

async function expectError(operation, messagePattern) {
  await assert.rejects(operation, (error) => {
    assert.match(error?.message || '', messagePattern);
    return true;
  });
}

async function run() {
  // The public mobile adapter must not hide attempt methods in local demo mode.
  assert.equal(typeof publicMockOaApi.test, 'function');
  assert.equal(typeof publicMockOaApi.submit, 'function');
  assert.equal(typeof publicCompanyOaApi.take, 'function');
  assert.equal(typeof publicCompanyOaApi.attempt, 'function');
  assert.equal(typeof publicInterviewApi.save, 'function');
  assert.equal(typeof publicInterviewApi.history, 'function');
  assert.equal(typeof publicInterviewApi.session, 'function');
  assert.equal(typeof publicInterviewApi.analytics, 'function');

  // Student/Mock OA: local session, answer redaction, scoring, result history.
  const login = await mockApi.authApi.login({ email: 'student@demo.invalid' });
  assert.equal(login.user.role, 'student');

  const mockTests = await mockApi.mockOaApi.tests();
  assert.equal(mockTests.tests.length, 1);
  const mockTestId = mockTests.tests[0].id;
  const mockTake = await mockApi.mockOaApi.test(mockTestId);
  assert.equal(mockTake.questions.length, 3);
  assert.equal(Object.hasOwn(mockTake.questions[0], 'correct_index'), false);
  assert.equal(Object.hasOwn(mockTake.questions[0], 'explanation'), false);

  const mockResult = await mockApi.mockOaApi.submit({
    testId: mockTestId,
    answers: {
      'demo-mock-q1': 1,
      'demo-mock-q2': 1,
      'demo-mock-q3': 2,
    },
    proctoring: { integrityScore: 93, violations: [{ type: 'tab_hidden' }] },
  });
  assert.deepEqual(
    (({ score, totalPossible, percentage, correct, wrong, skipped, integrityScore, violationCount }) => ({
      score, totalPossible, percentage, correct, wrong, skipped, integrityScore, violationCount,
    }))(mockResult),
    { score: 6, totalPossible: 6, percentage: 100, correct: 3, wrong: 0, skipped: 0, integrityScore: 93, violationCount: 1 },
  );
  const mockHistory = await mockApi.mockOaApi.history();
  assert.equal(mockHistory.history[0].percentage, 100);

  // Company OA: eligibility, redacted take payload, scoring, one attempt.
  const available = await mockApi.companyOaApi.available();
  assert.equal(available.tests.length, 1);
  const companyTestId = available.tests[0].id;
  const companyTake = await mockApi.companyOaApi.take(companyTestId);
  assert.equal(companyTake.questions.length, 3);
  assert.equal(Object.hasOwn(companyTake.questions[0], 'correct_index'), false);
  assert.equal(Object.hasOwn(companyTake.questions[0], 'explanation'), false);

  const companyResult = await mockApi.companyOaApi.attempt(companyTestId, {
    answers: {
      'demo-company-q1': 1,
      'demo-company-q2': 2,
      'demo-company-q3': 2,
    },
    timeTaken: 123,
  });
  assert.deepEqual(
    (({ score, maxScore, pct, grade, correct, wrong, skipped }) => ({ score, maxScore, pct, grade, correct, wrong, skipped }))(companyResult),
    { score: 6, maxScore: 6, pct: 100, grade: 'A+', correct: 3, wrong: 0, skipped: 0 },
  );
  await expectError(() => mockApi.companyOaApi.take(companyTestId), /already attempted/i);
  await expectError(() => mockApi.companyOaApi.attempt(companyTestId, { answers: {} }), /already submitted/i);

  // Recruiter/admin Company OA lifecycle: submit, view queue, approve, review.
  const created = await mockApi.companyOaApi.create({
    title: 'Validation local OA',
    test_type: 'Technical',
    duration: 10,
    questions: [{
      question_text: 'Pick the local option.',
      question_type: 'mcq',
      options: ['A', 'B', 'C', 'D'],
      correct_index: 0,
      marks: 1,
    }],
  });
  assert.equal(created.question_count, 1);
  const pending = await mockApi.companyOaApi.pending();
  assert(pending.tests.some((item) => item.id === created.test_id));
  const approved = await mockApi.companyOaApi.approve(created.test_id, 'approve', 'Checked locally');
  assert.equal(approved.test.approval_status, 'approved');
  const allTests = await mockApi.companyOaApi.all();
  assert(allTests.tests.some((item) => item.id === created.test_id && item.question_count === 1));
  const reviewQuestions = await mockApi.companyOaApi.questions(created.test_id);
  assert.equal(reviewQuestions.questions[0].correct_index, 0);

  // Stage histories use live-like `{ stage, at }`, and selection updates the
  // record for the actual applicant rather than the active demo student.
  await mockApi.adminApi.updatePlacement('demo-student-002', { placement_status: 'seeking' });
  const stageResult = await mockApi.applicationsApi.stage('demo-app-002', 'selected');
  assert.equal(stageResult.application.stage_history.at(-1).stage, 'selected');
  assert.ok(stageResult.application.stage_history.at(-1).at);
  assert.match(stageResult.message, /Selected/);

  const students = await mockApi.adminApi.students();
  const aarav = students.students.find((item) => item.id === 'demo-student-001');
  const priya = students.students.find((item) => item.id === 'demo-student-002');
  assert.equal(aarav.placement_status, 'seeking');
  assert.equal(priya.placement_status, 'placed');

  // Native mock interviews persist transparent typed-response scores. Historic
  // sample/browser sessions must not be blended into typed-practice averages.
  const typedInterview = await publicInterviewApi.save({
    durationSeconds: 137,
    overallScore: 82,
    eyeContactScore: null,
    confidenceScore: null,
    attentionScore: null,
    stressScore: null,
    transcript: [
      { question: 'Describe a project.', answer: 'I built a tested dashboard and measured its performance.', timestamp: 61 },
      { question: 'How do you debug?', answer: 'I reproduce the issue, inspect logs, isolate the cause, and verify the fix.', timestamp: 137 },
    ],
    aiFeedback: {
      mode: 'typed-practice',
      summary: 'Text-only local practice feedback.',
      strengths: ['Uses concrete technical detail.'],
      improvements: ['Add measurable outcomes.'],
      tips: ['Use Situation–Action–Result.'],
      scores: { overall: 82, content: 80, fluency: 90, confidence: 76, structure: 78, relevance: 84 },
    },
  });
  assert.equal(typedInterview.session.practiceMode, 'typed-practice');
  assert.equal(typedInterview.session.feedback.scores.overall, 82);
  assert.equal(typedInterview.session.transcript[0].timestamp, 61);

  const interviewHistory = await publicInterviewApi.history();
  assert.equal(interviewHistory.history[0].practiceMode, 'typed-practice');
  assert.equal(interviewHistory.history[0].questionCount, 2);
  const interviewDetail = await publicInterviewApi.session(typedInterview.session.id);
  assert.equal(interviewDetail.session.feedback.mode, 'typed-practice');
  assert.equal(interviewDetail.session.feedback.scores.confidence, 76);
  const interviewAnalytics = await publicInterviewApi.analytics();
  assert.deepEqual(interviewAnalytics.averages, {
    sessions: 1, overall: 82, relevance: 84, content: 80, structure: 78, wording: 76,
  });

  console.log('Demo API behavioral contracts: PASS');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
