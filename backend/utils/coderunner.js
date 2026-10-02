const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

// ── JDoodle Language Mappings ───────────────────────────────────────────────
const JDOODLE_LANGUAGES = {
  python:     { language: 'python3', versionIndex: '4' },
  python3:    { language: 'python3', versionIndex: '4' },
  javascript: { language: 'nodejs',  versionIndex: '4' },
  nodejs:     { language: 'nodejs',  versionIndex: '4' },
  cpp:        { language: 'cpp17',   versionIndex: '1' },
  'c++':      { language: 'cpp17',   versionIndex: '1' },
  c:          { language: 'c',       versionIndex: '5' },
  java:       { language: 'java',    versionIndex: '4' },
  go:         { language: 'go',      versionIndex: '4' },
  rust:       { language: 'rust',    versionIndex: '4' },
  typescript: { language: 'typescript', versionIndex: '0' },
};

// ── Check if JDoodle credentials are configured ────────────────────────────
function hasJDoodleConfig() {
  return !!(process.env.JDOODLE_CLIENT_ID && process.env.JDOODLE_CLIENT_SECRET);
}

// ── Execute via JDoodle Cloud API ──────────────────────────────────────────
async function runViaJDoodle(code, language, stdin = '') {
  const normLang = language.toLowerCase();
  const config = JDOODLE_LANGUAGES[normLang];
  if (!config) {
    throw new Error(`Unsupported JDoodle language: ${language}`);
  }

  const payload = {
    clientId:     process.env.JDOODLE_CLIENT_ID,
    clientSecret: process.env.JDOODLE_CLIENT_SECRET,
    script:       code,
    language:     config.language,
    versionIndex: config.versionIndex,
    stdin:        stdin || '',
  };

  const res = await axios.post('https://api.jdoodle.com/v1/execute', payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  });

  const data = res.data;
  const rawOutput = data.output || '';

  // Check for compilation / runtime error patterns
  const isError =
    data.statusCode !== 200 ||
    /error:|syntaxerror:|traceback|exception in thread/i.test(rawOutput);

  return {
    verdict: isError ? 'Runtime Error' : 'Accepted',
    stdout:  isError ? '' : rawOutput,
    stderr:  isError ? rawOutput : '',
    time:    data.cpuTime != null ? `${data.cpuTime}s` : '0.05s',
    memory:  data.memory != null ? `${data.memory} KB` : 'N/A',
    engine:  'JDoodle Cloud',
  };
}

// ── Local Fallback Runner (Instant execution for Python, JS, C++) ──────────
function runLocal(code, language, stdin = '', timeoutMs = 5000) {
  return new Promise((resolve) => {
    const lang = language.toLowerCase();
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
      stderr: `Language "${language}" requires JDoodle API credentials. Set JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET in backend/.env`,
      time: '0s',
      memory: 'N/A',
      engine: 'None',
    });
  });
}

// ── Health Check ─────────────────────────────────────────────────────────────
exports.isAvailable = async () => {
  return true; // Always available (JDoodle or Local Native Runner)
};

// ── Main Execute Function ───────────────────────────────────────────────────
exports.execute = async (code, language, stdin = '') => {
  // If JDoodle is configured, try JDoodle first
  if (hasJDoodleConfig()) {
    try {
      return await runViaJDoodle(code, language, stdin);
    } catch (err) {
      console.warn('JDoodle API failed, falling back to local runner:', err.message);
    }
  }

  // Fallback to instant local execution
  return await runLocal(code, language, stdin);
};

// ── Run against multiple test cases ──────────────────────────────────────────
exports.runTestCases = async (code, language, testCases = []) => {
  const results = [];
  for (const tc of testCases) {
    try {
      const res = await exports.execute(code, language, tc.input || '');
      const expected = String(tc.expected_output || tc.output || '').trim();
      const actual = String(res.stdout || '').trim();
      results.push({
        ...res,
        passed:   actual === expected,
        input:    tc.input,
        expected: expected,
      });
    } catch (err) {
      results.push({
        verdict: 'Error',
        passed: false,
        stderr: err.message,
        stdout: '',
        time: '0s',
        memory: 'N/A',
      });
    }
  }
  return results;
};
