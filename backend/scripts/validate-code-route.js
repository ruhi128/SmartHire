#!/usr/bin/env node
/** Network-free contracts for the merged JDoodle code routes. */
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

function loadRouter() {
  const router = {
    getHandlers: {}, postHandlers: {},
    get(pathName, ...handlers) { this.getHandlers[pathName] = handlers; return this; },
    post(pathName, ...handlers) { this.postHandlers[pathName] = handlers; return this; },
  };
  const state = { available: false, runs: [], nextExecution: null };
  const target = path.resolve(__dirname, '../routes/code.js');
  const originalLoad = Module._load;
  const auth = (_req, _res, next) => next();
  Module._load = function mockedLoad(request, parent, isMain) {
    if (parent?.filename === target) {
      if (request === 'express') return { Router: () => router };
      if (request === '../middleware/auth') return auth;
      if (request === '../utils/coderunner') return {
        getStatus: () => ({
          available: state.available,
          configured: state.available,
          engine: 'JDoodle Cloud API',
          message: state.available ? 'Configured, not validated.' : 'Not configured.',
        }),
        execute: async (code, language, stdin) => {
          state.runs.push({ code, language, stdin });
          return state.nextExecution(code, language, stdin);
        },
      };
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
  const { router, state, auth } = loadRouter();
  assert.equal(Object.keys(router.getHandlers).filter((p) => p === '/status').length, 1);
  assert.equal(router.postHandlers['/run'][0], auth);
  assert.equal(router.postHandlers['/run-tests'][0], auth);
  const status = router.getHandlers['/status'].at(-1);
  const single = router.postHandlers['/run'].at(-1);
  const tests = router.postHandlers['/run-tests'].at(-1);

  let result = response();
  status({}, result);
  assert.equal(result.statusCode, 503);
  assert.equal(result.body.available, false);
  state.available = true;
  result = response();
  status({}, result);
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.configured, true);

  result = response();
  await single({ body: {} }, result);
  assert.equal(result.statusCode, 400);
  assert.equal(result.body.code, 'INVALID_CODE_REQUEST');

  state.nextExecution = async (_code, _language, stdin) => ({ stdout: stdin, verdict: 'Accepted', engine: 'JDoodle Cloud' });
  result = response();
  await single({ body: { code: 'print()', language: 'python', stdin: 'new', input: 'old' } }, result);
  assert.equal(result.body.stdout, 'new');
  result = response();
  await single({ body: { code: 'print()', language: 'python', input: 'old' } }, result);
  assert.equal(result.body.stdout, 'old');

  const args = { code: 'print()', language: 'python' };
  result = response();
  await tests({ body: { ...args, testCases: [
    { input: 'one', expected_output: 'one\r\n' },
    { input: 'two', expected: 'two' },
  ] } }, result);
  assert.equal(result.body.allPassed, true);
  assert.equal(result.body.passedCount, 2);
  assert.equal(result.body.results[0].verdict, 'Passed');
  assert.equal(result.body.engine, 'JDoodle Cloud');

  result = response();
  await tests({ body: { ...args, testCases: [{ input: 'wrong', expected_output: '' }] } }, result);
  assert.equal(result.body.allPassed, false, 'explicitly empty expected output is checked');
  assert.equal(result.body.verdict, 'Wrong Answer');

  state.nextExecution = async () => ({ verdict: 'Runtime Error', stdout: '', stderr: 'boom', engine: 'JDoodle Cloud' });
  result = response();
  await tests({ body: { ...args, testCases: [{ input: 'one', expected: 'one' }] } }, result);
  assert.equal(result.body.allPassed, false);
  assert.equal(result.body.verdict, 'Runtime Error');
  state.nextExecution = async (_code, _language, stdin) => ({ stdout: stdin, verdict: 'Accepted', engine: 'JDoodle Cloud' });

  result = response();
  await tests({ body: { ...args, stdin: 'single run' } }, result);
  assert.equal(result.body.allPassed, true);
  assert.equal(result.body.results[0].verdict, 'Executed');
  assert.equal(result.body.results[0].input, 'single run');

  const runCount = state.runs.length;
  result = response();
  await tests({ body: { ...args, testCases: Array.from({ length: 11 }, () => ({ input: 'x' })) } }, result);
  assert.equal(result.statusCode, 400);
  assert.equal(result.body.code, 'TOO_MANY_TEST_CASES');
  assert.equal(state.runs.length, runCount, 'oversized batch never calls JDoodle');
  result = response();
  await tests({ body: { ...args, testCases: [{ input: 42 }] } }, result);
  assert.equal(result.statusCode, 400);
  assert.equal(result.body.code, 'INVALID_TEST_CASES');

  state.nextExecution = async () => {
    const error = new Error('JDoodle is not configured.');
    error.status = 503;
    error.code = 'JDOODLE_NOT_CONFIGURED';
    throw error;
  };
  const originalError = console.error;
  console.error = () => {};
  try {
    result = response();
    await tests({ body: { ...args, testCases: [{ input: 'a', expected: 'a' }] } }, result);
    assert.equal(result.statusCode, 503, 'provider failures are HTTP errors, not student wrong answers');
    assert.equal(result.body.code, 'JDOODLE_NOT_CONFIGURED');
    assert.equal(result.body.results, undefined);
  } finally {
    console.error = originalError;
  }
  console.log('JDoodle code route merge contracts: PASS');
}

run().catch((err) => { console.error(err); process.exitCode = 1; });
