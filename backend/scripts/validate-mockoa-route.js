#!/usr/bin/env node
/**
 * Network-free regression tests for the Mock OA merge: server-side grading,
 * private grading cases, legacy questions, runner failures and author writes.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const { getQuestionTestCases, normalizeIO, evaluateCodeHeuristics } = require('../utils/testcaseExtractor');

const codeQuestion = {
  id: 'code-1', type: 'coding', marks: 10, starter_code: '// starter',
  description: 'Write a solver.', question_text: 'Echo values', explanation: 'Author solution',
  test_cases: [
    { input: 'A', expected_output: 'A' },
    { input: 'B', expected_output: 'WRONG' },
  ],
};
const mcqQuestion = { id: 'mcq-1', type: 'mcq', marks: 4, correct_index: 1, explanation: 'Correct index is 1' };
const test = { id: 'test-1', title: 'Example OA', type: 'technical', status: 'approved', total_marks: 14 };
const clone = (value) => JSON.parse(JSON.stringify(value));

function createResponse() {
  return {
    statusCode: 200, body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
  };
}

function createSupabase(state) {
  return {
    from(table) {
      let mutation = null;
      let payload = null;
      const query = {
        select(columns) {
          if (columns && table === 'mock_oa_questions') state.questionSelects.push(columns);
          return this;
        },
        eq() { return this; },
        order() { return this; },
        update(data) { mutation = 'update'; payload = data; return this; },
        insert(data) { mutation = 'insert'; payload = data; return this; },
        single() { return Promise.resolve(read()); },
        then(resolve, reject) { return Promise.resolve(read()).then(resolve, reject); },
      };
      function read() {
        if (mutation === 'insert') {
          if (table === 'mock_oa_attempts') state.attempts.push(clone(payload));
          if (table === 'mock_oa_questions') state.questionInserts.push(clone(payload));
          if (table === 'mock_oa_tests') state.testInserts.push(clone(payload));
          return { data: { id: table === 'mock_oa_attempts' ? `attempt-${state.attempts.length}` : 'test-1' }, error: null };
        }
        if (mutation === 'update') return { data: null, error: null };
        if (table === 'mock_oa_tests') return { data: state.test, error: null };
        if (table === 'mock_oa_questions') return { data: clone(state.questions), error: null };
        if (table === 'companies') return { data: { id: 'company-1' }, error: null };
        return { data: null, error: null };
      }
      return query;
    },
  };
}

function loadRoute() {
  const state = {
    test: clone(test), questions: [clone(codeQuestion), clone(mcqQuestion)],
    attempts: [], questionInserts: [], testInserts: [], questionSelects: [], executions: [],
    executor: async (_code, _lang, stdin) => ({ verdict: 'Accepted', stdout: stdin, stderr: '', time: '0.1s' }),
  };
  const db = createSupabase(state);
  const router = {
    getHandlers: {}, postHandlers: {}, patchHandlers: {},
    get(route, ...handlers) { this.getHandlers[route] = handlers; return this; },
    post(route, ...handlers) { this.postHandlers[route] = handlers; return this; },
    patch(route, ...handlers) { this.patchHandlers[route] = handlers; return this; },
  };
  const target = path.resolve(__dirname, '../routes/mockoa.js');
  const originalLoad = Module._load;
  const auth = (_req, _res, next) => next?.();
  Module._load = function mockedLoad(request, parent, isMain) {
    if (parent?.filename === target) {
      if (request === 'express') return { Router: () => router };
      if (request === '../config/supabase') return { supabaseAdmin: db };
      if (request === '../middleware/auth') return auth;
      if (request === '../middleware/roles') return () => auth;
      if (request === '../utils/coderunner') {
        return { execute: async (code, language, stdin) => {
          state.executions.push({ code, language, stdin });
          return state.executor(code, language, stdin);
        } };
      }
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    delete require.cache[target];
    assert.equal(require(target), router);
    return { router, state, auth };
  } finally {
    Module._load = originalLoad;
    delete require.cache[target];
  }
}

async function run() {
  assert.equal(normalizeIO('A  \r\nB\n'), 'A\nB');
  assert.equal(getQuestionTestCases({ test_cases: [{ input: '', expected_output: '' }] }).length, 1);
  assert.equal(getQuestionTestCases({ sample_input: '7', sample_output: '49' })[0].hidden, false);
  assert.equal(getQuestionTestCases({ test_cases: [{ input: 'a' }] }).length, 0, 'case without expected output is not gradable');
  assert.ok(evaluateCodeHeuristics('for x in values:\n print(x)', 'python', '').scoreRatio <= 0.25);

  const { router, state, auth } = loadRoute();
  assert.equal(router.postHandlers['/submit'][0], auth);
  const getTest = router.getHandlers['/tests/:id'].at(-1);
  const submit = router.postHandlers['/submit'].at(-1);
  const upload = router.postHandlers['/upload'].at(-1);
  const createAdmin = router.postHandlers['/tests'].at(-1);
  const request = (answers, extra = {}) => ({
    body: { testId: test.id, answers, codeLangs: { 'code-1': 'python3' }, ...extra },
    user: { id: 'student-1', role: 'student' },
  });

  let result = createResponse();
  await getTest({ params: { id: test.id }, user: { role: 'student' } }, result);
  assert.equal(result.statusCode, 200);
  assert.ok(!Object.hasOwn(result.body.questions[0], 'test_cases'), 'private cases never exposed by GET');
  assert.ok(!Object.hasOwn(result.body.questions[1], 'correct_index'), 'MCQ answer key never exposed by GET');
  assert.ok(!Object.hasOwn(result.body.questions[0], 'explanation'));
  assert.ok(!state.questionSelects[0].includes('test_cases'));

  // A forged client-side "Accepted" must not give full marks. Only one of two
  // server-executed inputs matches its stored expected output: partial credit.
  result = createResponse();
  await submit(request({ 'code-1': 'value = input(); print(value)', 'mcq-1': 1 },
    { codeRuns: { 'code-1': { verdict: 'Accepted', stdout: 'forged' } } }), result);
  assert.equal(result.statusCode, 200);
  assert.equal(state.executions.length, 2);
  assert.equal(result.body.scoredAnswers['code-1'].result, 'partial');
  assert.equal(result.body.scoredAnswers['code-1'].points, 5);
  assert.equal(result.body.scoredAnswers['code-1'].testCasesPassed, 1);
  assert.equal(result.body.scoredAnswers['mcq-1'].points, 4);
  assert.equal(result.body.score, 9);
  assert.equal(result.body.correct, 1);
  assert.equal(state.attempts.length, 1);
  const privateResult = result.body.scoredAnswers['code-1'].testCaseResults[0];
  for (const privateField of ['input', 'expected', 'actual', 'stderr']) {
    assert.ok(!Object.hasOwn(privateResult, privateField), `${privateField} must not reveal hidden cases`);
  }
  assert.ok(!JSON.stringify(state.attempts[0]).includes('WRONG'), 'stored attempt must not include private expected outputs');

  // A concise valid solution must not be mistaken for an empty template.
  state.questions = [{ ...codeQuestion, test_cases: [{ input: 'A', expected_output: 'A' }] }];
  result = createResponse();
  await submit(request({ 'code-1': 'print(input())' }), result);
  assert.equal(result.body.scoredAnswers['code-1'].result, 'correct');

  // Empty expected output is a real expectation, not a wildcard for any stdout.
  state.questions = [{ ...codeQuestion, test_cases: [{ input: 'nonempty', expected_output: '' }] }];
  result = createResponse();
  await submit(request({ 'code-1': 'value = input(); print(value)' }), result);
  assert.equal(result.body.scoredAnswers['code-1'].points, 0);
  assert.equal(result.body.scoredAnswers['code-1'].verdict, 'Wrong Answer');

  state.questions = [{ ...codeQuestion, test_cases: [{ input: 'A', expected_output: 'A', hidden: false }] }];
  result = createResponse();
  await submit(request({ 'code-1': 'value = input(); print(value)' }), result);
  assert.equal(result.body.scoredAnswers['code-1'].points, 10);
  assert.equal(result.body.scoredAnswers['code-1'].result, 'correct');
  assert.equal(result.body.scoredAnswers['code-1'].testCaseResults[0].actual, 'A');

  // A visible public sample can be hard-coded; passing it alone earns at most
  // partial credit, even though the program executed correctly.
  state.questions = [{ ...codeQuestion, test_cases: [], sample_input: 'A', sample_output: 'A' }];
  result = createResponse();
  await submit(request({ 'code-1': 'print(input())' }), result);
  assert.equal(result.body.correct, 0);
  assert.ok(result.body.scoredAnswers['code-1'].points <= 3);
  assert.match(result.body.scoredAnswers['code-1'].verdict, /Sample passed/);

  // With no cases, a successful code run is explicitly not a correct answer.
  state.questions = [{ ...codeQuestion, test_cases: [], sample_output: null }];
  result = createResponse();
  await submit(request({ 'code-1': 'for x in values:\n print(x)' }, { codeRuns: { 'code-1': { verdict: 'Accepted' } } }), result);
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.correct, 0);
  assert.equal(result.body.scoredAnswers['code-1'].staticAnalysis, true);
  assert.ok(result.body.scoredAnswers['code-1'].points <= Math.floor(10 * 0.25));

  // A provider outage returns an actionable error and never writes an attempt.
  const beforeFailure = state.attempts.length;
  state.executor = async () => {
    const error = new Error('JDoodle not configured');
    error.status = 503;
    error.code = 'JDOODLE_NOT_CONFIGURED';
    throw error;
  };
  result = createResponse();
  await submit(request({ 'code-1': 'value = input(); print(value)' }), result);
  assert.equal(result.statusCode, 503);
  assert.equal(result.body.code, 'JDOODLE_NOT_CONFIGURED');
  assert.equal(state.attempts.length, beforeFailure);
  state.executor = async (_code, _language, stdin) => ({ verdict: 'Accepted', stdout: stdin, stderr: '' });

  const uploadBody = {
    companyId: 'company-1', testType: 'technical', title: 'New test', durationMinutes: 45,
    questions: [{ questionText: 'Echo', questionType: 'coding', marks: 10, starterCode: '// starter',
      testCases: [{ input: '1', expected_output: '1' }], sampleInput: '2', sampleOutput: '2' }],
  };
  result = createResponse();
  await upload({ body: uploadBody, user: { id: 'recruiter-1' } }, result);
  assert.equal(result.statusCode, 201);
  assert.equal(state.questionInserts.at(-1)[0].starter_code, '// starter');
  assert.equal(state.questionInserts.at(-1)[0].test_cases[0].expected_output, '1');
  assert.equal(state.questionInserts.at(-1)[0].sample_output, '2');

  result = createResponse();
  await createAdmin({ body: uploadBody, user: { id: 'admin-1' } }, result);
  assert.equal(result.statusCode, 201);
  assert.equal(state.questionInserts.at(-1)[0].test_cases[0].input, '1');

  const beforeInvalid = state.testInserts.length;
  result = createResponse();
  await upload({ body: { ...uploadBody, questions: [{ ...uploadBody.questions[0], testCases: Array.from({ length: 11 }, () => ({ input: 'x', output: 'y' })) }] }, user: { id: 'recruiter-1' } }, result);
  assert.equal(result.statusCode, 400);
  assert.equal(state.testInserts.length, beforeInvalid, 'invalid case batch never writes a test');

  const migration = fs.readFileSync(path.resolve(__dirname, '../db/migrations/012_mock_oa_coding_grading.sql'), 'utf8');
  for (const column of ['description', 'explanation', 'starter_code', 'test_cases', 'sample_input', 'sample_output']) {
    assert.match(migration, new RegExp(`add column if not exists ${column}\\b`));
  }
  // Website UI is intentionally unchanged in this mobile-only rollout. This
  // validator covers backend grading/privacy/upload contracts only; manually
  // regression-test the existing website before deploying the backend.
  console.log('Mock OA backend grading, privacy, upload/schema and error contracts: PASS');
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
