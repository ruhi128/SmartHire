// routes/mockoa.js
const express = require('express');
const router = express.Router();
const  supabaseAdmin = require('../config/supabase'); // ← named import
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const { execute } = require('../utils/coderunner');

// ── Boilerplate & Empty Code Detector ───────────────────────────────────────
function isBoilerplateOrEmpty(code, lang, starterCode) {
  if (!code || typeof code !== 'string') return true;
  const trimmed = code.trim();
  if (trimmed.length === 0) return true;

  const normalize = (s) => (s || '').replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
  const normCode = normalize(code);

  if (starterCode && normCode === normalize(starterCode)) return true;

  const BOILERPLATES = [
    `# Write your Python 3 solution here\nimport sys\n\ndef solve():\n    # Read from standard input if required\n    # lines = sys.stdin.read().splitlines()\n    print("Program executed successfully")\n\nif __name__ == '__main__':\n    solve()`,
    `// Write your C++ 17 solution here\n#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n\nusing namespace std;\n\nvoid solve() {\n    // Write your solution logic here\n    cout << "Program executed successfully" << endl;\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    solve();\n    return 0;\n}`,
    `// Write your Java solution here\nimport java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Read input using Scanner if required\n        System.out.println("Program executed successfully");\n    }\n}`,
    `// Write your JavaScript (Node.js) solution here\nconst fs = require('fs');\n\nfunction solve() {\n    console.log("Program executed successfully");\n}\n\nsolve();`
  ];

  for (const b of BOILERPLATES) {
    if (normCode === normalize(b)) return true;
  }

  // Strip comments, imports, template prints, and wrapper syntax
  let stripped = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/#[^\n]*/g, '')
    .replace(/["']Program executed successfully["']/gi, '')
    .replace(/import\s+[^\n;]+;?/gi, '')
    .replace(/from\s+\w+\s+import\s+[^\n;]+;?/gi, '')
    .replace(/#include\s+<[^>]+>/gi, '')
    .replace(/using\s+namespace\s+\w+;?/gi, '')
    .replace(/const\s+\w+\s*=\s*require\([^)]+\);?/gi, '')
    .replace(/ios_base::sync_with_stdio\(false\);?/gi, '')
    .replace(/cin\.tie\(NULL\);?/gi, '')
    .replace(/if\s*__name__\s*==\s*['"]__main__['"]\s*:/gi, '')
    .replace(/public\s+class\s+\w+\s*\{?/gi, '')
    .replace(/public\s+static\s+void\s+main\s*\([^)]*\)\s*\{?/gi, '')
    .replace(/def\s+solve\s*\([^)]*\)\s*:\s*(pass)?/gi, '')
    .replace(/void\s+solve\s*\([^)]*\)\s*\{?\s*\}?/gi, '')
    .replace(/function\s+solve\s*\([^)]*\)\s*\{?\s*\}?/gi, '')
    .replace(/return\s+0;?/gi, '')
    .replace(/solve\(\);?/gi, '')
    .replace(/[{}();:\s]/g, '');

  if (stripped.length < 12) {
    return true;
  }

  return false;
}


// ─────────────────────────────────────────────
// GET /api/mockoa/tests
// List APPROVED Mock OA tests (students)
// Query: ?company_id=xxx&type=technical
// ─────────────────────────────────────────────
router.get('/tests', auth, async (req, res) => {
  try {
    const { company_id, type } = req.query;

    let query = supabaseAdmin
      .from('mock_oa_tests')
      .select(`
        id, title, type, duration, total_marks, sections, status,
        created_at, companies(id, name, logo_url),
        mock_oa_questions(count)
      `)
      .eq('status', 'approved');

    if (company_id) query = query.eq('company_id', company_id);
    if (type) query = query.eq('type', type); // was test_type

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    const { data: attempts } = await supabaseAdmin
      .from('mock_oa_attempts')
      .select('test_id, score')
      .eq('student_id', req.user.id);

    const attemptMap = {};
    for (const a of attempts || []) {
      if (!attemptMap[a.test_id]) attemptMap[a.test_id] = [];
      attemptMap[a.test_id].push(a.score);
    }

    const enriched = (data || []).map(t => ({
      ...t,
      question_count: t.mock_oa_questions?.[0]?.count || 0,
      attempts: (attemptMap[t.id] || []).length,
      bestScore: attemptMap[t.id] ? Math.max(...attemptMap[t.id]) : null,
    }));

    res.json({ tests: enriched });
  } catch (err) {
    console.error('GET /mockoa/tests error:', err);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

// ─────────────────────────────────────────────
// GET /api/mockoa/tests/:id
// Get single APPROVED test WITH questions (for taking the test)
// ─────────────────────────────────────────────
router.get('/tests/:id', auth, async (req, res) => {
  try {
    const { data: test, error: tErr } = await supabaseAdmin
      .from('mock_oa_tests')
      .select(`
        id, title, type, duration, status,
        companies(id, name, logo_url)
      `)
      .eq('id', req.params.id)
      .single();

    if (tErr || !test) return res.status(404).json({ error: 'Test not found' });

    if (req.user.role === 'student' && test.status !== 'approved') {
      return res.status(403).json({ error: 'This test is not yet available' });
    }

    const { data: questions, error: qErr } = await supabaseAdmin
      .from('mock_oa_questions')
      .select('id, question_text, description, type, options, marks, ordering, section, placeholder, word_limit, starter_code, examples, code_constraints')
      // correct_index intentionally excluded — sent only after submission
      .eq('test_id', req.params.id)
      .order('ordering', { ascending: true }); // was order_index

    if (qErr) throw qErr;

    res.json({ test, questions: questions || [] });
  } catch (err) {
    console.error('GET /mockoa/tests/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch test' });
  }
});

// ─────────────────────────────────────────────
// POST /api/mockoa/submit
// Submit OA attempt answers & get scored result
// Body: { testId, answers: { questionId: answerValue } }
// ─────────────────────────────────────────────
router.post('/submit', auth, roles('student'), async (req, res) => {
  const { testId, answers, proctoring, codeRuns, codeLangs } = req.body;

  if (!testId || !answers) {
    return res.status(400).json({ error: 'testId and answers are required' });
  }

  // Normalise proctoring payload (optional — older clients may omit it).
  const rawViolations = Array.isArray(proctoring?.violations) ? proctoring.violations : [];
  const violations = rawViolations
    .filter(v => v && typeof v.type === 'string')
    .slice(0, 500); // hard cap to avoid abuse
  const integrityScore = Number.isFinite(proctoring?.integrityScore)
    ? Math.max(0, Math.min(100, Math.round(proctoring.integrityScore)))
    : (violations.length ? Math.max(0, 100 - violations.length * 5) : 100);
  const terminated = !!proctoring?.terminated;
  const violationSummary = violations.reduce((acc, v) => {
    acc[v.type] = (acc[v.type] || 0) + 1;
    return acc;
  }, {});

  try {
    const { data: test, error: tErr } = await supabaseAdmin
      .from('mock_oa_tests')
      .select('id, type, title, status, total_marks')
      .eq('id', testId)
      .single();

    if (tErr || !test) return res.status(404).json({ error: 'Test not found' });
    if (test.status !== 'approved') {
      return res.status(403).json({ error: 'This test is not available for submission' });
    }

    const { data: questions, error: qErr } = await supabaseAdmin
      .from('mock_oa_questions')
      .select('id, type, correct_index, marks, explanation, starter_code')
      .eq('test_id', testId);

    if (qErr) throw qErr;

    let totalScore = 0;
    let totalPossible = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    const scoredAnswers = {};

    for (const q of questions || []) {
      totalPossible += q.marks;
      const studentAnswer = answers[q.id];
      const isMcq = q.type === 'mcq';

      // ── Coding & Technical Evaluation ──
      if (!isMcq) {
        const lang = (codeLangs && codeLangs[q.id]) || 'python3';
        const clientRun = codeRuns && codeRuns[q.id];

        // 1. Unattempted, blank, or unmodified starter boilerplate code => 0 MARKS
        if (isBoilerplateOrEmpty(studentAnswer, lang, q.starter_code)) {
          skippedCount++;
          scoredAnswers[q.id] = {
            answer: studentAnswer || '',
            result: 'skipped',
            points: 0,
            verdict: 'Unattempted',
            explanation: q.explanation || 'No code solution submitted.'
          };
          continue;
        }

        // 2. Custom code was run in client with JDoodle
        if (clientRun && typeof clientRun === 'object') {
          if (clientRun.verdict === 'Accepted') {
            totalScore += q.marks;
            correctCount++;
            scoredAnswers[q.id] = {
              answer: studentAnswer,
              result: 'correct',
              points: q.marks,
              verdict: 'Accepted',
              stdout: clientRun.stdout || '',
              explanation: q.explanation
            };
            continue;
          } else if (clientRun.verdict === 'Runtime Error' || clientRun.verdict === 'Compilation Error' || clientRun.verdict === 'Execution Failed') {
            const partialPts = Math.max(1, Math.round(q.marks * 0.3));
            totalScore += partialPts;
            wrongCount++;
            scoredAnswers[q.id] = {
              answer: studentAnswer,
              result: 'partial',
              points: partialPts,
              verdict: clientRun.verdict,
              stderr: clientRun.stderr || '',
              explanation: q.explanation
            };
            continue;
          }
        }

        // 3. Custom code was written but not executed in client prior to submitting
        let execSuccess = false;
        let execVerdict = 'Unverified';
        try {
          const runRes = await execute(studentAnswer, lang, '');
          if (runRes && runRes.verdict === 'Accepted') {
            execSuccess = true;
            execVerdict = 'Accepted';
          } else if (runRes && (runRes.verdict === 'Runtime Error' || runRes.verdict === 'Compilation Error')) {
            execVerdict = runRes.verdict;
          }
        } catch (_) {
          // Execution engine timed out or offline — fallback to algorithmic heuristics
        }

        if (execSuccess) {
          totalScore += q.marks;
          correctCount++;
          scoredAnswers[q.id] = {
            answer: studentAnswer,
            result: 'correct',
            points: q.marks,
            verdict: 'Accepted',
            explanation: q.explanation
          };
        } else if (execVerdict === 'Runtime Error' || execVerdict === 'Compilation Error') {
          const partialPts = Math.max(1, Math.round(q.marks * 0.3));
          totalScore += partialPts;
          wrongCount++;
          scoredAnswers[q.id] = {
            answer: studentAnswer,
            result: 'partial',
            points: partialPts,
            verdict: execVerdict,
            explanation: q.explanation
          };
        } else {
          // Algorithmic syntax heuristic: check if code has substantive structure
          const hasControlFlow = /(for|while|if|switch|function|def|class|return|int|vector|let|const)\b/i.test(studentAnswer);
          if (hasControlFlow) {
            const partialPts = Math.max(1, Math.round(q.marks * 0.6));
            totalScore += partialPts;
            correctCount++;
            scoredAnswers[q.id] = {
              answer: studentAnswer,
              result: 'answered',
              points: partialPts,
              verdict: 'Code Implemented (Partial)',
              explanation: q.explanation
            };
          } else {
            const partialPts = Math.max(1, Math.round(q.marks * 0.2));
            totalScore += partialPts;
            wrongCount++;
            scoredAnswers[q.id] = {
              answer: studentAnswer,
              result: 'partial',
              points: partialPts,
              verdict: 'Incomplete Logic',
              explanation: q.explanation
            };
          }
        }
        continue;
      }

      // ── MCQ Evaluation ──
      if (studentAnswer === null || studentAnswer === undefined || studentAnswer === '') {
        skippedCount++;
        scoredAnswers[q.id] = { answer: null, result: 'skipped', points: 0, correct: q.correct_index, explanation: q.explanation };
      } else if (parseInt(studentAnswer) === q.correct_index) {
        totalScore += q.marks;
        correctCount++;
        scoredAnswers[q.id] = { answer: parseInt(studentAnswer), result: 'correct', points: q.marks, correct: q.correct_index, explanation: q.explanation };
      } else {
        totalScore -= 1;
        wrongCount++;
        scoredAnswers[q.id] = { answer: parseInt(studentAnswer), result: 'wrong', points: -1, correct: q.correct_index, explanation: q.explanation };
      }
    }

    totalScore = Math.max(0, totalScore);
    const percentage = totalPossible > 0
      ? Math.round((totalScore / totalPossible) * 100)
      : 0;
    const passed = percentage >= 50;

    const { data: attempt, error: aErr } = await supabaseAdmin
      .from('mock_oa_attempts')
      .insert({
        student_id: req.user.id,
        test_id: testId,
        score: totalScore,
        answers: scoredAnswers,
        pct: percentage,
        passed_mcq: correctCount,
        wrong_mcq: wrongCount,
        skipped_mcq: skippedCount,
      })
      .select()
      .single();

    if (aErr) throw aErr;

    // Best-effort integrity update — no-op if migration 003 hasn't been applied.
    const { error: iErr } = await supabaseAdmin
      .from('mock_oa_attempts')
      .update({
        integrity_score: integrityScore,
        violation_count: violations.length,
        terminated,
        proctoring_summary: violationSummary,
      })
      .eq('id', attempt.id);
    if (iErr) console.error('integrity update skipped (run migration 003?):', iErr.message);

    // Persist each proctoring violation, linked to this attempt.
    if (violations.length) {
      const rows = violations.map(v => ({
        attempt_id: attempt.id,
        student_id: req.user.id,
        test_id: testId,
        type: String(v.type).slice(0, 60),
        detail: v.detail ? String(v.detail).slice(0, 300) : null,
        occurred_at: v.at ? new Date(v.at).toISOString() : new Date().toISOString(),
      }));
      const { error: vErr } = await supabaseAdmin
        .from('proctoring_violations')
        .insert(rows);
      if (vErr) console.error('proctoring_violations insert error:', vErr.message);
    }

    res.json({
      attemptId: attempt.id,
      testTitle: test.title,
      testType: test.type,
      score: totalScore,
      totalPossible,
      percentage,
      passed,
      correct: correctCount,
      wrong: wrongCount,
      skipped: skippedCount,
      integrityScore,
      violationCount: violations.length,
      terminated,
      violationSummary,
      scoredAnswers,
    });
  } catch (err) {
    console.error('POST /mockoa/submit error:', err);
    res.status(500).json({ error: 'Failed to submit test' });
  }
});

// ─────────────────────────────────────────────
// GET /api/mockoa/history
// Student's OA attempt history
// ─────────────────────────────────────────────
router.get('/history', auth, roles('student'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('mock_oa_attempts')
      .select(`
        id, score, pct, completed_at,
        mock_oa_tests(id, title, type, duration,
          companies(name, logo_url))
      `)
      .eq('student_id', req.user.id)
      .order('completed_at', { ascending: false }); // was submitted_at

    if (error) throw error;

    const history = (data || []).map(a => ({
      id: a.id,
      testTitle: a.mock_oa_tests?.title,
      testType: a.mock_oa_tests?.type,       // was test_type
      company: a.mock_oa_tests?.companies?.name,
      companyLogo: a.mock_oa_tests?.companies?.logo_url,
      score: a.score,
      percentage: a.pct,                     // was calculated from total_marks
      passed: (a.pct || 0) >= 50,
      submittedAt: a.completed_at,           // was submitted_at
    }));

    res.json({ history });
  } catch (err) {
    console.error('GET /mockoa/history error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ═══════════════════════════════════════════════════════════════
// RECRUITER ROUTES
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// POST /api/mockoa/upload
// Recruiter uploads a new OA test (status = 'pending')
// ─────────────────────────────────────────────
router.post('/upload', auth, roles('recruiter'), async (req, res) => {
  const { companyId, testType, title, durationMinutes, questions } = req.body;

  if (!companyId || !testType || !title || !questions?.length) {
    return res.status(400).json({ error: 'companyId, testType, title, and at least one question are required' });
  }

  try {
    // Verify recruiter belongs to this company
    const { data: company, error: cErr } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .eq('recruiter_id', req.user.id)
      .single();

    console.log('DEBUG upload → companyId:', companyId, '| req.user.id:', req.user.id, '| company:', company, '| cErr:', cErr);

    if (cErr || !company) {
      return res.status(403).json({ error: 'You are not authorized to upload for this company' });
    }

    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 4), 0);
    const sections = [...new Set(questions.map(q => q.section || 'general'))];

    const { data: test, error: tErr } = await supabaseAdmin
      .from('mock_oa_tests')
      .insert({
        company_id: companyId,
        type: testType,              // was test_type
        title,
        duration: durationMinutes || 60,  // was duration_minutes
        status: 'pending',
        total_marks: totalMarks,     // NOT NULL in schema
        sections,                    // NOT NULL in schema
      })
      .select()
      .single();

    if (tErr) throw tErr;

    const qRows = questions.map((q, idx) => ({
      id: crypto.randomUUID(),           // no default on id — must supply
      test_id: test.id,
      question_text: q.questionText,
      type: q.questionType || 'mcq',     // was question_type
      section: q.section || 'general',   // NOT NULL
      options: q.options || null,
      correct_index: q.correctAnswer ?? null, // was correct_answer
      marks: q.marks || 4,
      ordering: idx,                     // was order_index
    }));

    const { error: qErr } = await supabaseAdmin
      .from('mock_oa_questions')
      .insert(qRows);

    if (qErr) throw qErr;

    res.status(201).json({
      message: 'OA test submitted for admin review',
      testId: test.id,
      status: 'pending',
    });
  } catch (err) {
    console.error('POST /mockoa/upload error:', err);
    res.status(500).json({ error: 'Failed to upload OA test' });
  }
});

// ─────────────────────────────────────────────
// GET /api/mockoa/my-uploads
// Recruiter views their own uploaded tests + status
// ─────────────────────────────────────────────
router.get('/my-uploads', auth, roles('recruiter'), async (req, res) => {
  try {
    const { data: companies, error: cErr } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('recruiter_id', req.user.id);

    if (cErr) throw cErr;
    const companyIds = (companies || []).map(c => c.id);

    if (!companyIds.length) return res.json({ tests: [] });

    const { data, error } = await supabaseAdmin
      .from('mock_oa_tests')
      .select(`
        id, title, type, duration, status,
        rejection_reason, created_at, reviewed_at,
        companies(name, logo_url)
      `)                              // was test_type, duration_minutes
      .in('company_id', companyIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ tests: data || [] });
  } catch (err) {
    console.error('GET /mockoa/my-uploads error:', err);
    res.status(500).json({ error: 'Failed to fetch uploads' });
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// GET /api/mockoa/pending
// Admin: fetch all tests awaiting review
// ─────────────────────────────────────────────
router.get('/pending', auth, roles('admin'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('mock_oa_tests')
      .select(`
        id, title, type, duration, created_at,
        companies(id, name, logo_url),
        mock_oa_questions(id, question_text, type, options, correct_index, marks, ordering, section)
      `)                              // all column names corrected
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({ tests: data || [] });
  } catch (err) {
    console.error('GET /mockoa/pending error:', err);
    res.status(500).json({ error: 'Failed to fetch pending tests' });
  }
});

// ─────────────────────────────────────────────
// GET /api/mockoa/all
// Admin: fetch ALL tests with their status
// Query: ?status=pending|approved|rejected
// ─────────────────────────────────────────────
router.get('/all', auth, roles('admin'), async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabaseAdmin
      .from('mock_oa_tests')
      .select(`
        id, title, type, duration, status,
        rejection_reason, created_at, reviewed_at,
        companies(id, name, logo_url)
      `)                              // was test_type, duration_minutes
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ tests: data || [] });
  } catch (err) {
    console.error('GET /mockoa/all error:', err);
    res.status(500).json({ error: 'Failed to fetch all tests' });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/mockoa/:id/approve
// Admin: approve a pending test
// ─────────────────────────────────────────────
router.patch('/:id/approve', auth, roles('admin'), async (req, res) => {
  try {
    const { data: test, error: checkErr } = await supabaseAdmin
      .from('mock_oa_tests')
      .select('id, status, title')
      .eq('id', req.params.id)
      .single();

    if (checkErr || !test) return res.status(404).json({ error: 'Test not found' });
    if (test.status === 'approved') {
      return res.status(400).json({ error: 'Test is already approved' });
    }

    const { data, error } = await supabaseAdmin
      .from('mock_oa_tests')
      .update({
        status: 'approved',
        reviewed_by: req.user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq('id', req.params.id)
      .select('id, title, status, reviewed_at')
      .single();

    if (error) throw error;

    res.json({
      message: `"${data.title}" is now live for students`,
      test: data,
    });
  } catch (err) {
    console.error('PATCH /mockoa/:id/approve error:', err);
    res.status(500).json({ error: 'Failed to approve test' });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/mockoa/:id/reject
// Admin: reject a test with an optional reason
// ─────────────────────────────────────────────
router.patch('/:id/reject', auth, roles('admin'), async (req, res) => {
  const { reason } = req.body;

  try {
    const { data: test, error: checkErr } = await supabaseAdmin
      .from('mock_oa_tests')
      .select('id, status, title')
      .eq('id', req.params.id)
      .single();

    if (checkErr || !test) return res.status(404).json({ error: 'Test not found' });
    if (test.status === 'rejected') {
      return res.status(400).json({ error: 'Test is already rejected' });
    }

    const { data, error } = await supabaseAdmin
      .from('mock_oa_tests')
      .update({
        status: 'rejected',
        reviewed_by: req.user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason?.trim() || 'No reason provided',
      })
      .eq('id', req.params.id)
      .select('id, title, status, rejection_reason, reviewed_at')
      .single();

    if (error) throw error;

    res.json({
      message: `"${data.title}" has been rejected`,
      test: data,
    });
  } catch (err) {
    console.error('PATCH /mockoa/:id/reject error:', err);
    res.status(500).json({ error: 'Failed to reject test' });
  }
});

// ─────────────────────────────────────────────
// POST /api/mockoa/tests
// Admin: Create OA test directly (auto-approved)
// ─────────────────────────────────────────────
router.post('/tests', auth, roles('admin'), async (req, res) => {
  const { companyId, testType, title, durationMinutes, questions } = req.body;

  if (!companyId || !testType || !title || !questions?.length) {
    return res.status(400).json({ error: 'companyId, testType, title, questions required' });
  }

  try {
    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 4), 0);
    const sections = [...new Set(questions.map(q => q.section || 'general'))];

    const { data: test, error: tErr } = await supabaseAdmin
      .from('mock_oa_tests')
      .insert({
        company_id: companyId,
        type: testType,              // was test_type
        title,
        duration: durationMinutes || 60, // was duration_minutes
        status: 'approved',
        total_marks: totalMarks,
        sections,
        reviewed_by: req.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (tErr) throw tErr;

    const qRows = questions.map((q, idx) => ({
      id: crypto.randomUUID(),
      test_id: test.id,
      question_text: q.questionText,
      type: q.questionType || 'mcq',     // was question_type
      section: q.section || 'general',
      options: q.options || null,
      correct_index: q.correctAnswer ?? null, // was correct_answer
      marks: q.marks || 4,
      ordering: idx,                     // was order_index
    }));

    const { error: qErr } = await supabaseAdmin
      .from('mock_oa_questions')
      .insert(qRows);

    if (qErr) throw qErr;

    res.status(201).json({ message: 'OA test created and published', testId: test.id });
  } catch (err) {
    console.error('POST /mockoa/tests error:', err);
    res.status(500).json({ error: 'Failed to create test' });
  }
});

module.exports = router;