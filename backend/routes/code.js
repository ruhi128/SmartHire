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

module.exports = router;
