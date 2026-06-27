// routes/dsa.js
const express = require('express');
const router = express.Router();
const supabaseAdmin = require('../config/supabase');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const { execute } = require('../utils/coderunner');

// ─────────────────────────────────────────────
// GET /api/dsa/problems
// List all DSA problems (with optional filters)
// Query: ?difficulty=Easy&tag=Array&search=two+sum
// ─────────────────────────────────────────────
router.get('/problems', auth, async (req, res) => {
  try {
    const { difficulty, tag, search } = req.query;

    let query = supabaseAdmin
      .from('dsa_problems')
      .select('id, title, difficulty, tags, created_at');

    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) throw error;

    // For each problem, check if this student has solved it
    const { data: solved } = await supabaseAdmin
      .from('dsa_submissions')
      .select('problem_id')
      .eq('student_id', req.user.id)
      .eq('status', 'Accepted');

    const solvedIds = new Set((solved || []).map(s => s.problem_id));

    const enriched = (data || []).map(p => ({
      ...p,
      solved: solvedIds.has(p.id),
    }));

    res.json({ problems: enriched });
  } catch (err) {
    console.error('GET /dsa/problems error:', err);
    res.status(500).json({ error: 'Failed to fetch problems' });
  }
});

// ─────────────────────────────────────────────
// GET /api/dsa/problems/:id
// Get a single problem with full details
// ─────────────────────────────────────────────
router.get('/problems/:id', auth, async (req, res) => {
  try {
    const { data: problem, error } = await supabaseAdmin
      .from('dsa_problems')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Fetch this student's previous submissions for this problem
    const { data: submissions } = await supabaseAdmin
      .from('dsa_submissions')
      .select('id, language, status, runtime_ms, memory_mb, submitted_at')
      .eq('student_id', req.user.id)
      .eq('problem_id', req.params.id)
      .order('submitted_at', { ascending: false })
      .limit(10);

    res.json({ problem, submissions: submissions || [] });
  } catch (err) {
    console.error('GET /dsa/problems/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch problem' });
  }
});

// ─────────────────────────────────────────────
// POST /api/dsa/submit
// Submit code → run against test cases → save result
// Body: { problemId, code, language }
// ─────────────────────────────────────────────
router.post('/submit', auth, roles('student'), async (req, res) => {
  const { problemId, code, language } = req.body;

  if (!problemId || !code || !language) {
    return res.status(400).json({ error: 'problemId, code, and language are required' });
  }

  try {
    // Fetch problem test cases
    const { data: problem, error: pErr } = await supabaseAdmin
      .from('dsa_problems')
      .select('test_cases, title')
      .eq('id', problemId)
      .single();

    if (pErr || !problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    const testCases = problem.test_cases || [];
    let passedCount = 0;
    let totalRuntime = 0;
    let totalMemory = 0;
    let firstError = null;
    let overallStatus = 'Accepted';
    const results = [];

    // Run each test case through Judge0
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      try {
        const result = await execute(code, language, tc.input);
        const output = (result.stdout || '').trim();
        const expected = (tc.expected_output || '').trim();
        const passed = output === expected;

        if (passed) passedCount++;

        totalRuntime += parseFloat(result.time) || 0;
        totalMemory += parseFloat(result.memory) || 0;

        results.push({
          testCase: i + 1,
          passed,
          input: tc.input,
          expected,
          output,
          runtime: result.time,
          memory: result.memory,
        });

        if (!passed && overallStatus === 'Accepted') {
          overallStatus = result.verdict === 'Accepted'
            ? 'Wrong Answer'
            : result.verdict;
          if (!firstError) firstError = result.stderr || result.verdict;
        }
      } catch (execErr) {
        overallStatus = 'Runtime Error';
        firstError = execErr.message;
        results.push({
          testCase: i + 1,
          passed: false,
          input: tc.input,
          expected: tc.expected_output,
          output: '',
          error: execErr.message,
        });
      }
    }

    const avgRuntime = testCases.length > 0
      ? Math.round((totalRuntime / testCases.length) * 1000)
      : 0;
    const avgMemory = testCases.length > 0
      ? parseFloat((totalMemory / testCases.length).toFixed(2))
      : 0;

    // Save submission to DB
    const { data: submission, error: subErr } = await supabaseAdmin
      .from('dsa_submissions')
      .insert({
        student_id: req.user.id,
        problem_id: problemId,
        language,
        code,
        status: overallStatus,
        runtime_ms: avgRuntime,
        memory_mb: avgMemory,
        test_cases_passed: passedCount,
      })
      .select()
      .single();

    if (subErr) throw subErr;

    res.json({
      submissionId: submission.id,
      status: overallStatus,
      passed: passedCount,
      total: testCases.length,
      runtime: `${avgRuntime}ms`,
      memory: `${avgMemory}KB`,
      results,
      error: firstError,
    });
  } catch (err) {
    console.error('POST /dsa/submit error:', err);
    res.status(500).json({ error: 'Submission failed' });
  }
});

// ─────────────────────────────────────────────
// POST /api/dsa/run  (Run without saving — "Run Code" button)
// Body: { code, language, customInput }
// ─────────────────────────────────────────────
router.post('/run', auth, roles('student'), async (req, res) => {
  const { code, language, customInput = '' } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: 'code and language are required' });
  }

  try {
    const result = await execute(code, language, customInput);
    res.json({
      stdout: result.stdout,
      stderr: result.stderr,
      verdict: result.verdict,
      time: result.time,
      memory: result.memory,
    });
  } catch (err) {
    console.error('POST /dsa/run error:', err);
    res.status(500).json({ error: 'Code execution failed' });
  }
});

// ─────────────────────────────────────────────
// GET /api/dsa/performance
// Student's DSA performance analytics
// ─────────────────────────────────────────────
router.get('/performance', auth, roles('student'), async (req, res) => {
  try {
    const { data: submissions, error } = await supabaseAdmin
      .from('dsa_submissions')
      .select(`
        id, status, language, runtime_ms, memory_mb,
        test_cases_passed, submitted_at,
        dsa_problems(id, title, difficulty, tags)
      `)
      .eq('student_id', req.user.id)
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    // Aggregate stats
    const totalAttempts = submissions.length;
    const accepted = submissions.filter(s => s.status === 'Accepted').length;
    const accuracy = totalAttempts > 0
      ? Math.round((accepted / totalAttempts) * 100)
      : 0;

    // By difficulty
    const difficultyMap = { Easy: { solved: 0, total: 0 }, Medium: { solved: 0, total: 0 }, Hard: { solved: 0, total: 0 } };
    const seenProblems = new Map();

    for (const sub of submissions) {
      const prob = sub.dsa_problems;
      if (!prob) continue;
      const diff = prob.difficulty;
      if (!seenProblems.has(prob.id)) {
        seenProblems.set(prob.id, sub.status);
        difficultyMap[diff].total++;
        if (sub.status === 'Accepted') difficultyMap[diff].solved++;
      }
    }

    // Topic-wise performance from tags
    const topicMap = {};
    for (const sub of submissions) {
      const tags = sub.dsa_problems?.tags || [];
      for (const tag of tags) {
        if (!topicMap[tag]) topicMap[tag] = { attempted: 0, solved: 0 };
        topicMap[tag].attempted++;
        if (sub.status === 'Accepted') topicMap[tag].solved++;
      }
    }

    const topicStats = Object.entries(topicMap).map(([topic, stats]) => ({
      topic,
      attempted: stats.attempted,
      solved: stats.solved,
      accuracy: Math.round((stats.solved / stats.attempted) * 100),
    }));

    // Recent 10 submissions for activity feed
    const recent = submissions.slice(0, 10).map(s => ({
      id: s.id,
      title: s.dsa_problems?.title,
      difficulty: s.dsa_problems?.difficulty,
      status: s.status,
      language: s.language,
      runtime: s.runtime_ms,
      submittedAt: s.submitted_at,
    }));

    res.json({
      totalAttempts,
      accepted,
      accuracy,
      uniqueProblemsSolved: [...seenProblems.values()].filter(v => v === 'Accepted').length,
      byDifficulty: difficultyMap,
      topicStats,
      recentSubmissions: recent,
    });
  } catch (err) {
    console.error('GET /dsa/performance error:', err);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

// ─────────────────────────────────────────────
// POST /api/dsa/problems  (Admin: Add new problem)
// ─────────────────────────────────────────────
router.post('/problems', auth, roles('admin'), async (req, res) => {
  const { title, description, difficulty, tags, examples, constraints, testCases, starterCode } = req.body;

  if (!title || !description || !difficulty) {
    return res.status(400).json({ error: 'title, description, difficulty required' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('dsa_problems')
      .insert({
        title,
        description,
        difficulty,
        tags: tags || [],
        examples: examples || [],
        constraints: constraints || [],
        test_cases: testCases || [],
        starter_code: starterCode || {},
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ problem: data });
  } catch (err) {
    console.error('POST /dsa/problems error:', err);
    res.status(500).json({ error: 'Failed to create problem' });
  }
});

module.exports = router;