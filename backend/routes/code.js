// routes/code.js — Code execution proxy to self-hosted Judge0 CE
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { execute, isAvailable } = require('../utils/coderunner');

// GET /api/code/status — check if Judge0 is running
router.get('/status', async (req, res) => {
  const available = await isAvailable();
  res.json({
    available,
    judge0_url: process.env.JUDGE0_URL || 'http://localhost:2358',
    message: available
      ? '✅ Judge0 CE is running and ready'
      : '❌ Judge0 CE not running. Start it with: docker-compose up -d (see judge0/ folder)',
  });
});

// POST /api/code/run — execute code
router.post('/run', auth, async (req, res) => {
  const { code, language, stdin = '' } = req.body;

  if (!code || !language)
    return res.status(400).json({ error: 'code and language are required' });

  try {
    const result = await execute(code, language, stdin);
    res.json(result);
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(503).json({
        error: 'Judge0 CE is not running.',
        fix:   'Run: cd judge0 && docker-compose up -d',
        verdict: 'Judge0 Offline',
      });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
