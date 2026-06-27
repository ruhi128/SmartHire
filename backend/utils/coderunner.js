const axios = require('axios');

// ── Judge0 CE Language IDs ──────────────────────────────────────────────────
const LANGUAGE_IDS = {
  javascript: 63,
  python:     71,
  java:       62,
  cpp:        54,
  c:          50,
  typescript: 74,
  go:         60,
  rust:       73,
};

// ── Config ──────────────────────────────────────────────────────────────────
// Self-hosted Judge0 CE (Docker) runs on localhost:2358 by default.
// Set JUDGE0_URL in your backend/.env to override.
// No API key needed for self-hosted instance.
const JUDGE0_URL = process.env.JUDGE0_URL || 'http://localhost:2358';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  // Only add API key header if explicitly set (for RapidAPI fallback)
  ...(process.env.JUDGE0_API_KEY && {
    'X-RapidAPI-Key':  process.env.JUDGE0_API_KEY,
    'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
  }),
});

// ── Health check ─────────────────────────────────────────────────────────────
exports.isAvailable = async () => {
  try {
    await axios.get(`${JUDGE0_URL}/system_info`, { timeout: 3000 });
    return true;
  } catch { return false; }
};

// ── Submit + Poll ─────────────────────────────────────────────────────────────
exports.execute = async (code, language, stdin = '') => {
  const langId = LANGUAGE_IDS[language.toLowerCase()];
  if (!langId) throw new Error(`Unsupported language: ${language}`);

  // Submit
  const submitRes = await axios.post(
    `${JUDGE0_URL}/submissions?base64_encoded=true&wait=false`,
    {
      source_code: Buffer.from(code).toString('base64'),
      language_id: langId,
      stdin:       Buffer.from(stdin).toString('base64'),
    },
    { headers: getHeaders(), timeout: 10000 }
  );

  const token = submitRes.data.token;
  if (!token) throw new Error('Judge0 did not return a submission token');

  // Poll (max 20 × 1s = 20s)
  let result, retries = 0;
  do {
    await new Promise(r => setTimeout(r, 1000));
    const poll = await axios.get(
      `${JUDGE0_URL}/submissions/${token}?base64_encoded=true`,
      { headers: getHeaders(), timeout: 10000 }
    );
    result = poll.data;
    retries++;
  } while (result.status?.id <= 2 && retries < 20);

  if (retries >= 20)
    return { verdict: 'Time Limit Exceeded', stdout: '', stderr: 'Polling timed out', time: '0s', memory: '0 KB' };

  const decode = b64 => b64 ? Buffer.from(b64, 'base64').toString('utf-8') : '';

  return {
    verdict: result.status?.description || 'Unknown',
    stdout:  decode(result.stdout),
    stderr:  decode(result.stderr) || decode(result.compile_output),
    time:    result.time    ? `${result.time}s`      : '0s',
    memory:  result.memory  ? `${result.memory} KB`  : '0 KB',
  };
};

// ── Run against multiple test cases ──────────────────────────────────────────
exports.runTestCases = async (code, language, testCases) => {
  const results = [];
  for (const tc of testCases) {
    try {
      const res = await exports.execute(code, language, tc.input || '');
      results.push({
        ...res,
        passed:   res.stdout.trim() === String(tc.expected_output).trim(),
        input:    tc.input,
        expected: tc.expected_output,
      });
    } catch (err) {
      results.push({ verdict: 'Error', passed: false, stderr: err.message, stdout: '', time: '0s', memory: '0 KB' });
    }
  }
  return results;
};
