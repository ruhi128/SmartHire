const express = require('express');
const router = express.Router();
const { execute, getStatus } = require('../utils/coderunner');
const auth = require('../middleware/auth');

// Public, non-secret health/configuration status for the code runner.
// `configured` only means both server-side JDoodle variables are present; a
// real execution is still required to validate credentials and API credits.
router.get('/status', (_req, res) => {
  const status = getStatus();
  res.status(status.available ? 200 : 503).json(status);
});

// Execute a single code snippet through the configured runner.
router.post('/run', auth, async (req, res) => {
  const { code, language, stdin, input } = req.body || {};

  if (typeof code !== 'string' || !code.trim() || typeof language !== 'string' || !language.trim()) {
    return res.status(400).json({ error: 'code and language are required', code: 'INVALID_CODE_REQUEST' });
  }

  // Keep `input` as a backward-compatible alias for callers that predate the
  // current `stdin` field.
  const standardInput = typeof stdin === 'string'
    ? stdin
    : typeof input === 'string'
      ? input
      : '';

  try {
    const result = await execute(code, language, standardInput);
    return res.json(result);
  } catch (err) {
    const status = Number.isInteger(err.status) ? err.status : 500;
    const errorCode = err.code || 'CODE_EXECUTION_FAILED';

    // Keep provider responses actionable for the UI while never logging or
    // returning the JDoodle client ID/secret.
    if (status >= 500) {
      console.error('POST /api/code/run failed:', { code: errorCode, message: err.message });
    }

    return res.status(status).json({
      error: err.message || 'Code execution failed',
      code: errorCode,
      engine: 'JDoodle Cloud API',
    });
  }
});

// POST /api/code/run-tests — run a caller-supplied set of sample cases.
// These are not trusted DSA/assessment hidden tests; graded submissions use
// their own server-side routes. Limit cases to protect JDoodle API credits.
const MAX_RUN_TEST_CASES = 10;
const normalizeOutput = (value) => String(value ?? '')
  .replace(/\r\n/g, '\n')
  .split('\n')
  .map((line) => line.trimEnd())
  .join('\n')
  .trim();

router.post('/run-tests', auth, async (req, res) => {
  const { code, language, testCases, stdin, input } = req.body || {};
  if (typeof code !== 'string' || !code.trim() || typeof language !== 'string' || !language.trim()) {
    return res.status(400).json({ error: 'code and language are required', code: 'INVALID_CODE_REQUEST' });
  }
  if (testCases != null && !Array.isArray(testCases)) {
    return res.status(400).json({ error: 'testCases must be an array', code: 'INVALID_TEST_CASES' });
  }
  if (testCases?.length > MAX_RUN_TEST_CASES) {
    return res.status(400).json({
      error: `Run at most ${MAX_RUN_TEST_CASES} sample test cases at a time.`,
      code: 'TOO_MANY_TEST_CASES',
    });
  }

  // With no cases, behave like a single Run (stdin/input are aliases). An
  // omitted expected output means "executed" rather than an output comparison.
  const standardInput = typeof stdin === 'string' ? stdin : typeof input === 'string' ? input : '';
  const cases = testCases?.length ? testCases : [{ input: standardInput }];
  if (cases.some((tc) => !tc || typeof tc !== 'object' || Array.isArray(tc)
    || (tc.input != null && typeof tc.input !== 'string')
    || (tc.stdin != null && typeof tc.stdin !== 'string'))) {
    return res.status(400).json({ error: 'Each test case must have a string input.', code: 'INVALID_TEST_CASES' });
  }

  const results = [];
  let passedCount = 0;
  let overallVerdict = 'Accepted';
  let totalTime = '0s';
  let engine = getStatus().engine;

  for (const [index, tc] of cases.entries()) {
    const tcInput = tc.input ?? tc.stdin ?? '';
    const hasExpected = Object.hasOwn(tc, 'expected_output') || Object.hasOwn(tc, 'expected');
    const expected = normalizeOutput(tc.expected_output ?? tc.expected ?? '');

    let execution;
    try {
      execution = await execute(code, language, tcInput);
    } catch (err) {
      // Provider/configuration failures are NOT incorrect student answers.
      // Return the actionable runner error, as /run does, instead of a
      // misleading 200 response containing failed test results.
      const status = Number.isInteger(err?.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
      const errorCode = err?.code || 'CODE_EXECUTION_FAILED';
      if (status >= 500) {
        console.error('POST /api/code/run-tests failed:', { code: errorCode, message: err?.message });
      }
      return res.status(status).json({
        error: Number.isInteger(err?.status) ? err.message : 'Code execution failed',
        code: errorCode,
        engine,
      });
    }

    const actual = normalizeOutput(execution.stdout);
    const passed = execution.verdict === 'Accepted' && (!hasExpected || actual === expected);
    const verdict = execution.verdict === 'Accepted'
      ? (hasExpected ? (passed ? 'Passed' : 'Wrong Answer') : 'Executed')
      : execution.verdict;
    if (passed) passedCount += 1;
    else if (overallVerdict === 'Accepted') overallVerdict = verdict;

    results.push({
      testCase: index + 1,
      passed,
      verdict,
      input: tcInput,
      expected,
      actual,
      got: actual,
      stderr: execution.stderr || '',
      time: execution.time || '0.05s',
    });
    totalTime = execution.time || totalTime;
    engine = execution.engine || engine;
  }

  const allPassed = passedCount === cases.length;
  return res.json({
    verdict: allPassed ? 'Accepted' : overallVerdict,
    passedCount,
    totalCount: cases.length,
    allPassed,
    results,
    time: totalTime,
    engine,
  });
});

module.exports = router;
