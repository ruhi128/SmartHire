const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

// JDoodle language/version mappings. versionIndex is the index shown in
// JDoodle's supported-languages table, not a literal language version number.
// Keep these pinned deliberately so assessment output remains reproducible.
const JDOODLE_LANGUAGES = Object.freeze({
  python:       { language: 'python3',    versionIndex: '6' },
  python3:      { language: 'python3',    versionIndex: '6' },
  javascript:   { language: 'nodejs',     versionIndex: '7' },
  js:           { language: 'nodejs',     versionIndex: '7' },
  nodejs:       { language: 'nodejs',     versionIndex: '7' },
  java:         { language: 'java',       versionIndex: '6' },
  cpp:          { language: 'cpp17',      versionIndex: '3' },
  'c++':        { language: 'cpp17',      versionIndex: '3' },
  cplusplus:    { language: 'cpp17',      versionIndex: '3' },
  c:            { language: 'c',          versionIndex: '7' },
  go:           { language: 'go',         versionIndex: '6' },
  golang:       { language: 'go',         versionIndex: '6' },
  rust:         { language: 'rust',       versionIndex: '6' },
  typescript:   { language: 'typescript', versionIndex: '1' },
});

class CodeRunnerError extends Error {
  constructor(message, { status = 503, code = 'CODE_RUNNER_UNAVAILABLE' } = {}) {
    super(message);
    this.name = 'CodeRunnerError';
    this.status = status;
    this.code = code;
  }
}

function hasJDoodleConfig() {
  return Boolean(
    String(process.env.JDOODLE_CLIENT_ID || '').trim() &&
    String(process.env.JDOODLE_CLIENT_SECRET || '').trim()
  );
}

// The local runner executes arbitrary code on the API host. It is therefore
// deliberately opt-in and never enabled in production. JDoodle is the normal
// execution path for SmartHire users.
function isLocalRunnerEnabled() {
  return String(process.env.NODE_ENV || '').toLowerCase() === 'development' &&
    String(process.env.ALLOW_LOCAL_CODE_RUNNER || '').toLowerCase() === 'true';
}

function getRunnerStatus() {
  const configured = hasJDoodleConfig();
  const localFallback = isLocalRunnerEnabled();

  if (configured) {
    return {
      available: true,
      configured: true,
      engine: 'JDoodle Cloud API',
      localFallback: false,
      message: 'JDoodle credentials are configured. Run a sample program to verify account access and available credits.',
    };
  }

  if (localFallback) {
    return {
      available: true,
      configured: false,
      engine: 'Local development runner',
      localFallback: true,
      message: 'JDoodle is not configured. Local execution is enabled only for development.',
    };
  }

  return {
    available: false,
    configured: false,
    engine: 'JDoodle Cloud API',
    localFallback: false,
    message: 'JDoodle is not configured. Set JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET on the backend, then restart it.',
  };
}

function shortProviderMessage(value) {
  if (typeof value === 'string') return value.slice(0, 800).trim();
  if (!value || typeof value !== 'object') return '';
  return String(value.error || value.message || value.output || '').slice(0, 800).trim();
}

function normalizeJDoodleHttpError(error) {
  if (error instanceof CodeRunnerError) return error;

  const upstreamStatus = error.response?.status;
  const providerMessage = shortProviderMessage(error.response?.data);

  if (upstreamStatus === 401 || upstreamStatus === 403) {
    return new CodeRunnerError(
      'JDoodle rejected the configured credentials. Check JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET in the backend environment.',
      { status: 502, code: 'JDOODLE_AUTH_FAILED' }
    );
  }

  if (upstreamStatus === 429) {
    return new CodeRunnerError(
      'JDoodle execution quota has been reached. Check the JDoodle API plan and available credits.',
      { status: 429, code: 'JDOODLE_QUOTA_EXHAUSTED' }
    );
  }

  if (error.code === 'ECONNABORTED') {
    return new CodeRunnerError(
      'JDoodle did not respond before the execution timeout.',
      { status: 504, code: 'JDOODLE_TIMEOUT' }
    );
  }

  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return new CodeRunnerError(
      'The backend could not reach JDoodle. Check the server network or firewall configuration.',
      { status: 502, code: 'JDOODLE_NETWORK_ERROR' }
    );
  }

  return new CodeRunnerError(
    `JDoodle execution failed${providerMessage ? `: ${providerMessage}` : '.'}`,
    { status: 502, code: 'JDOODLE_REQUEST_FAILED' }
  );
}

function looksLikeExecutionError(output) {
  return /(^|\n)(?:error:|syntaxerror:|traceback \(most recent call last\):|exception in thread|uncaught exception|fatal error:)/im.test(output);
}

async function runViaJDoodle(code, language, stdin = '') {
  const normalizedLanguage = String(language || '').trim().toLowerCase();
  const config = JDOODLE_LANGUAGES[normalizedLanguage];

  if (!config) {
    throw new CodeRunnerError(
      `Unsupported JDoodle language: ${language}`,
      { status: 400, code: 'JDOODLE_UNSUPPORTED_LANGUAGE' }
    );
  }

  if (!hasJDoodleConfig()) {
    throw new CodeRunnerError(
      'JDoodle is not configured. Set JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET in the backend environment.',
      { status: 503, code: 'JDOODLE_NOT_CONFIGURED' }
    );
  }

  const payload = {
    clientId: process.env.JDOODLE_CLIENT_ID,
    clientSecret: process.env.JDOODLE_CLIENT_SECRET,
    script: code,
    stdin: stdin || '',
    language: config.language,
    versionIndex: config.versionIndex,
  };

  let response;
  try {
    response = await axios.post('https://api.jdoodle.com/v1/execute', payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000,
    });
  } catch (error) {
    throw normalizeJDoodleHttpError(error);
  }

  const data = response.data || {};
  const providerStatus = Number(data.statusCode);
  const rawOutput = typeof data.output === 'string' ? data.output : String(data.output || '');

  // JDoodle can send an API failure in a JSON response. Do not disguise this
  // as local execution or a student-code failure.
  if (Number.isFinite(providerStatus) && providerStatus !== 200) {
    const providerMessage = shortProviderMessage(data) || rawOutput;
    if (providerStatus === 429) {
      throw new CodeRunnerError(
        'JDoodle execution quota has been reached. Check the JDoodle API plan and available credits.',
        { status: 429, code: 'JDOODLE_QUOTA_EXHAUSTED' }
      );
    }

    throw new CodeRunnerError(
      `JDoodle could not execute this request${providerMessage ? `: ${providerMessage}` : '.'}`,
      { status: 502, code: 'JDOODLE_EXECUTION_REJECTED' }
    );
  }

  const executionFailed = looksLikeExecutionError(rawOutput);
  return {
    verdict: executionFailed ? 'Runtime Error' : 'Accepted',
    stdout: executionFailed ? '' : rawOutput,
    stderr: executionFailed ? rawOutput : '',
    time: data.cpuTime != null ? `${data.cpuTime}s` : 'N/A',
    memory: data.memory != null ? `${data.memory} KB` : 'N/A',
    engine: 'JDoodle Cloud',
  };
}

// Development-only fallback. Keep this isolated from the normal JDoodle path.
function runLocal(code, language, stdin = '', timeoutMs = 5000) {
  return new Promise((resolve) => {
    const lang = String(language || '').toLowerCase();
    const start = Date.now();

    // 1. Python
    if (lang === 'python' || lang === 'python3') {
      const proc = spawn('python', ['-c', code], { windowsHide: true });
      let stdout = '', stderr = '', killed = false;

      const timer = setTimeout(() => {
        killed = true;
        proc.kill();
        resolve({ verdict: 'Time Limit Exceeded', stdout: '', stderr: 'Time Limit Exceeded (>5s)', time: '>5s', memory: 'N/A', engine: 'Local Native' });
      }, timeoutMs);

      if (stdin) proc.stdin.write(stdin);
      proc.stdin.end();

      proc.stdout.on('data', d => stdout += d);
      proc.stderr.on('data', d => stderr += d);

      proc.on('close', (exitCode) => {
        if (killed) return;
        clearTimeout(timer);
        const elapsed = ((Date.now() - start) / 1000).toFixed(2);
        resolve({
          verdict: exitCode === 0 ? 'Accepted' : 'Runtime Error',
          stdout,
          stderr,
          time: `${elapsed}s`,
          memory: 'N/A',
          engine: 'Local Native (Python)',
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        resolve({ verdict: 'Runner Error', stdout: '', stderr: err.message, time: '0s', memory: 'N/A', engine: 'Local Native' });
      });
      return;
    }

    // 2. JavaScript / Node.js
    if (lang === 'javascript' || lang === 'nodejs' || lang === 'js') {
      const proc = spawn('node', ['-e', code], { windowsHide: true });
      let stdout = '', stderr = '', killed = false;

      const timer = setTimeout(() => {
        killed = true;
        proc.kill();
        resolve({ verdict: 'Time Limit Exceeded', stdout: '', stderr: 'Time Limit Exceeded (>5s)', time: '>5s', memory: 'N/A', engine: 'Local Native' });
      }, timeoutMs);

      if (stdin) proc.stdin.write(stdin);
      proc.stdin.end();

      proc.stdout.on('data', d => stdout += d);
      proc.stderr.on('data', d => stderr += d);

      proc.on('close', (exitCode) => {
        if (killed) return;
        clearTimeout(timer);
        const elapsed = ((Date.now() - start) / 1000).toFixed(2);
        resolve({
          verdict: exitCode === 0 ? 'Accepted' : 'Runtime Error',
          stdout,
          stderr,
          time: `${elapsed}s`,
          memory: 'N/A',
          engine: 'Local Native (Node.js)',
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        resolve({ verdict: 'Runner Error', stdout: '', stderr: err.message, time: '0s', memory: 'N/A', engine: 'Local Native' });
      });
      return;
    }

    // 3. C++
    if (lang === 'cpp' || lang === 'c++') {
      const tmpDir = os.tmpdir();
      const id = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const srcFile = path.join(tmpDir, `code_${id}.cpp`);
      const binFile = path.join(tmpDir, `code_${id}.exe`);

      fs.writeFileSync(srcFile, code);

      try {
        execSync(`g++ "${srcFile}" -O2 -o "${binFile}"`, { timeout: 8000, stdio: 'pipe' });
      } catch (compileErr) {
        try { fs.unlinkSync(srcFile); } catch (_) {}
        return resolve({
          verdict: 'Compilation Error',
          stdout: '',
          stderr: compileErr.stderr ? compileErr.stderr.toString() : compileErr.message,
          time: '0s',
          memory: 'N/A',
          engine: 'Local Native (g++)',
        });
      }

      const proc = spawn(binFile, [], { windowsHide: true });
      let stdout = '', stderr = '', killed = false;

      const timer = setTimeout(() => {
        killed = true;
        proc.kill();
        try { fs.unlinkSync(srcFile); fs.unlinkSync(binFile); } catch (_) {}
        resolve({ verdict: 'Time Limit Exceeded', stdout: '', stderr: 'Time Limit Exceeded (>5s)', time: '>5s', memory: 'N/A', engine: 'Local Native' });
      }, timeoutMs);

      if (stdin) proc.stdin.write(stdin);
      proc.stdin.end();

      proc.stdout.on('data', d => stdout += d);
      proc.stderr.on('data', d => stderr += d);

      proc.on('close', (exitCode) => {
        if (killed) return;
        clearTimeout(timer);
        try { fs.unlinkSync(srcFile); fs.unlinkSync(binFile); } catch (_) {}
        const elapsed = ((Date.now() - start) / 1000).toFixed(2);
        resolve({
          verdict: exitCode === 0 ? 'Accepted' : 'Runtime Error',
          stdout,
          stderr,
          time: `${elapsed}s`,
          memory: 'N/A',
          engine: 'Local Native (g++)',
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        try { fs.unlinkSync(srcFile); fs.unlinkSync(binFile); } catch (_) {}
        resolve({ verdict: 'Runner Error', stdout: '', stderr: err.message, time: '0s', memory: 'N/A', engine: 'Local Native' });
      });
      return;
    }

    resolve({
      verdict: 'Unsupported Language',
      stdout: '',
      stderr: `Language "${language}" is not available in the optional local development runner.`,
      time: '0s',
      memory: 'N/A',
      engine: 'Local Native',
    });
  });
}

exports.CodeRunnerError = CodeRunnerError;
exports.hasJDoodleConfig = hasJDoodleConfig;
exports.getStatus = getRunnerStatus;
exports.isAvailable = async () => getRunnerStatus().available;

exports.execute = async (code, language, stdin = '') => {
  if (!hasJDoodleConfig()) {
    if (isLocalRunnerEnabled()) {
      return runLocal(code, language, stdin);
    }

    throw new CodeRunnerError(
      'JDoodle is not configured. Set JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET in backend/.env or in the backend deployment secrets, then restart the backend.',
      { status: 503, code: 'JDOODLE_NOT_CONFIGURED' }
    );
  }

  try {
    return await runViaJDoodle(code, language, stdin);
  } catch (error) {
    const normalizedError = normalizeJDoodleHttpError(error);

    // A developer may explicitly opt in to local execution for offline local
    // work. Do not use this escape hatch in production.
    if (isLocalRunnerEnabled()) {
      console.warn('JDoodle API failed; using the explicitly enabled local development runner:', normalizedError.message);
      return runLocal(code, language, stdin);
    }

    throw normalizedError;
  }
};

exports.runTestCases = async (code, language, testCases = []) => {
  const results = [];
  for (const tc of testCases) {
    try {
      const res = await exports.execute(code, language, tc.input || '');
      const expected = String(tc.expected_output || tc.output || '').trim();
      const actual = String(res.stdout || '').trim();
      results.push({
        ...res,
        passed: actual === expected,
        input: tc.input,
        expected,
      });
    } catch (error) {
      results.push({
        verdict: 'Error',
        passed: false,
        stderr: error.message,
        stdout: '',
        time: 'N/A',
        memory: 'N/A',
      });
    }
  }
  return results;
};
