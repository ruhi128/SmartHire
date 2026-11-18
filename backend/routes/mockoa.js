// routes/mockoa.js
const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const supabaseAdmin = require('../config/supabase').supabaseAdmin;
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const { execute } = require('../utils/coderunner');
const { MAX_OA_TEST_CASES, getQuestionTestCases, normalizeIO, evaluateCodeHeuristics } = require('../utils/testcaseExtractor');

function gradingUnavailable(res, error) {
  const status = Number.isInteger(error?.status) && error.status >= 400 && error.status < 600
    ? error.status : 503;
  const code = error?.code || 'CODE_GRADING_UNAVAILABLE';
  // Do not persist an attempt with a made-up score if JDoodle cannot run.
  return res.status(status).json({
    error: error?.code ? error.message : 'Code grading could not finish. Please retry; your attempt has not been saved.',
    code,
  });
}

function questionUploadFields(question) {
  const rawCases = question.testCases ?? question.test_cases ?? [];
  return {
    description: question.description || '',
    explanation: question.explanation || null,
    starter_code: question.starterCode || question.starter_code || null,
    code_constraints: question.constraints || question.code_constraints || null,
    examples: typeof question.examples === 'string' ? question.examples : (question.examples ? JSON.stringify(question.examples) : null),
    placeholder: question.placeholder || null,
    word_limit: question.wordLimit ?? question.word_limit ?? 200,
    test_cases: rawCases,
    sample_input: question.sampleInput ?? question.sample_input ?? null,
    sample_output: question.sampleOutput ?? question.sample_output ?? null,
  };
}

function invalidQuestionTestCases(questions) {
  for (const [index, q] of questions.entries()) {
    if (!q || typeof q !== 'object' || Array.isArray(q)) {
      return `Question ${index + 1}: provide a valid question object.`;
    }
    const cases = q.testCases ?? q.test_cases ?? [];
    if (!Array.isArray(cases) || cases.length > MAX_OA_TEST_CASES || cases.some((tc) =>
      !tc || typeof tc !== 'object' || Array.isArray(tc)
      || typeof (tc.input ?? tc.stdin ?? '') !== 'string'
      || (tc.expected_output ?? tc.output ?? tc.expected) == null
    )) {
      return `Question ${index + 1}: provide up to ${MAX_OA_TEST_CASES} test cases, each with string input and expected output.`;
    }
  }
  return null;
}

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
    // Short but real programs such as print(input()) can solve an echo case.
    // Leave correctness to the server-side tests instead of skipping them.
    const withoutComments = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*(?:\/\/|#)[^\n]*/gm, '');
    const hasWork = /\b(?:input|stdin|read|print|printf|cout|return)\b|console\.log|System\.out\.print/.test(withoutComments);
    return !hasWork || /Program executed successfully/i.test(withoutComments);
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

    const { data: attempts, error: attemptError } = await supabaseAdmin
      .from('mock_oa_attempts')
      .select('test_id, score')
      .eq('student_id', req.user.id);
    if (attemptError) throw attemptError;

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
      .select('id, question_text, description, type, options, marks, ordering, section, placeholder, word_limit, starter_code, examples, code_constraints, sample_input, sample_output')
      // correct_index, explanation and private test_cases intentionally excluded
      .eq('test_id', req.params.id)
      .order('ordering', { ascending: true }); // was order_index

    if (qErr) throw qErr;

    // Explicit public projection in addition to the narrow Supabase select:
    // never expose correct_index, explanation or private grading cases before
    // submission, even if the query is broadened in a later refactor.
    const publicQuestions = (questions || []).map((q) => ({
      id: q.id, question_text: q.question_text, description: q.description,
      type: q.type, options: q.options, marks: q.marks, ordering: q.ordering,
      section: q.section, placeholder: q.placeholder, word_limit: q.word_limit,
      starter_code: q.starter_code, examples: q.examples,
      code_constraints: q.code_constraints,
      sample_input: q.sample_input, sample_output: q.sample_output,
    }));
    res.json({ test, questions: publicQuestions });
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
  // codeRuns from old web clients is intentionally ignored: a client can forge
  // "Accepted". Only server-executed reference cases may prove correctness.
  const { testId, answers, proctoring, codeLangs } = req.body || {};

  if (!testId || !answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return res.status(400).json({ error: 'testId and an answers object are required' });
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
  }, Object.create(null));

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
      .select('id, type, correct_index, marks, explanation, starter_code, test_cases, sample_input, sample_output, description, question_text')
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
        const testCases = getQuestionTestCases(q);

        if (isBoilerplateOrEmpty(studentAnswer, lang, q.starter_code)) {
          skippedCount++;
          scoredAnswers[q.id] = {
            answer: studentAnswer || '', result: 'skipped', points: 0,
            verdict: 'Unattempted', testCasesPassed: 0,
            totalTestCases: testCases.length,
            explanation: q.explanation || 'No code solution submitted.',
          };
          continue;
        }

        if (testCases.length) {
          let passedCount = 0;
          let firstFailure = null;
          const tcDetails = [];

          for (const [index, tc] of testCases.entries()) {
            let execRes;
            try {
              execRes = await execute(studentAnswer, lang, tc.input);
            } catch (error) {
              // An offline/quota-limited runner is not a wrong student answer.
              // No attempt is stored; the student can retry after service recovers.
              return gradingUnavailable(res, error);
            }

            const actual = normalizeIO(execRes.stdout);
            const expected = normalizeIO(tc.expected_output);
            const passed = execRes.verdict === 'Accepted' && actual === expected;
            const verdict = passed ? 'Passed'
              : execRes.verdict === 'Accepted' ? 'Wrong Answer' : (execRes.verdict || 'Execution Error');
            if (passed) passedCount++;
            else if (!firstFailure) firstFailure = verdict;

            // Hidden test input/output (and stderr, which can echo input) must
            // not leak through the attempt response or persisted answers.
            tcDetails.push({
              testCase: index + 1, passed, verdict,
              ...(!tc.hidden ? { expected, actual, stderr: execRes.stderr || '' } : {}),
            });
          }

          const allPassed = passedCount === testCases.length;
          // The public sample is useful feedback but can be hard-coded by a
          // student; it must never certify full correctness by itself.
          const sampleOnly = testCases.every((tc) => tc.source === 'sample');
          const fullCredit = allPassed && !sampleOnly;
          const points = fullCredit ? q.marks : passedCount > 0
            ? Math.max(0, Math.min(q.marks - 1,
              sampleOnly ? Math.floor(q.marks * 0.25)
                : Math.round((passedCount / testCases.length) * q.marks)))
            : 0;
          totalScore += points;
          if (fullCredit) correctCount++;
          else wrongCount++;
          scoredAnswers[q.id] = {
            answer: studentAnswer,
            result: fullCredit ? 'correct' : points > 0 ? 'partial' : 'wrong',
            points,
            verdict: fullCredit ? 'Accepted'
              : sampleOnly && allPassed ? 'Sample passed (not proof of correctness)'
                : passedCount > 0 ? `${passedCount}/${testCases.length} Test Cases Passed` : firstFailure || 'Wrong Answer',
            testCasesPassed: passedCount,
            totalTestCases: testCases.length,
            testCaseResults: tcDetails,
            explanation: q.explanation,
          };
        } else {
          // Legacy OA coding questions have no reference output. Running a
          // program successfully alone is NOT proof of correctness. Grant
          // at most small, labelled static-review credit (never full marks).
          let runRes;
          try {
            runRes = await execute(studentAnswer, lang, '');
          } catch (error) {
            return gradingUnavailable(res, error);
          }
          wrongCount++;
          if (runRes?.verdict !== 'Accepted') {
            scoredAnswers[q.id] = {
              answer: studentAnswer, result: 'wrong', points: 0,
              verdict: runRes?.verdict || 'Execution Error',
              details: runRes?.stderr || 'Code did not execute cleanly.',
              testCasesPassed: 0, totalTestCases: 0,
              explanation: q.explanation,
            };
          } else {
            const evaluation = evaluateCodeHeuristics(studentAnswer, lang, q.starter_code);
            const points = Math.max(0, Math.min(q.marks, Math.floor(evaluation.scoreRatio * q.marks)));
            totalScore += points;
            scoredAnswers[q.id] = {
              answer: studentAnswer,
              result: points > 0 ? 'partial' : 'wrong',
              points,
              verdict: evaluation.verdict,
              staticAnalysis: true,
              details: evaluation.details,
              testCasesPassed: 0, totalTestCases: 0,
              explanation: q.explanation,
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

// Only return persisted, student-owned summaries. Legacy answer blobs might
// contain hidden grading cases, so no raw answers or private cases leave this
// history API (even after the attempt has completed).
function mockAttemptSummary(attempt) {
  const test = attempt.mock_oa_tests || {};
  return {
    id: attempt.id,
    testId: attempt.test_id || test.id,
    testTitle: test.title || 'Mock OA',
    testType: test.type || null,
    company: test.companies?.name || null,
    companyLogo: test.companies?.logo_url || null,
    score: attempt.score,
    totalPossible: test.total_marks ?? null,
    percentage: attempt.pct,
    passed: Number(attempt.pct || 0) >= 50,
    correct: attempt.passed_mcq ?? 0,
    wrong: attempt.wrong_mcq ?? 0,
    skipped: attempt.skipped_mcq ?? 0,
    submittedAt: attempt.completed_at,
    integrityScore: attempt.integrity_score ?? null,
    violationCount: attempt.violation_count ?? null,
    terminated: attempt.terminated ?? false,
  };
}

// GET /api/mockoa/history — completed attempts, newest first.
router.get('/history', auth, roles('student'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('mock_oa_attempts')
      .select('id, test_id, score, pct, passed_mcq, wrong_mcq, skipped_mcq, completed_at, mock_oa_tests(id, title, type, total_marks, companies(name, logo_url))')
      .eq('student_id', req.user.id)
      .order('completed_at', { ascending: false });
    if (error) throw error;
    res.json({ history: (data || []).map(mockAttemptSummary) });
  } catch (err) {
    console.error('GET /mockoa/history error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// GET /api/mockoa/history/:attemptId — read-only result, scoped to the owner.
router.get('/history/:attemptId', auth, roles('student'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('mock_oa_attempts')
      .select('id, test_id, score, pct, passed_mcq, wrong_mcq, skipped_mcq, completed_at, mock_oa_tests(id, title, type, total_marks, companies(name, logo_url))')
      .eq('id', req.params.attemptId)
      .eq('student_id', req.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Attempt not found' });
    res.json({ attempt: mockAttemptSummary(data) });
  } catch (err) {
    console.error('GET /mockoa/history/:attemptId error:', err);
    res.status(500).json({ error: 'Failed to fetch attempt' });
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

  if (!companyId || !testType || !title || !Array.isArray(questions) || !questions.length) {
    return res.status(400).json({ error: 'companyId, testType, title, and at least one question are required' });
  }
  const invalidCases = invalidQuestionTestCases(questions);
  if (invalidCases) return res.status(400).json({ error: invalidCases });

  try {
    // Verify recruiter belongs to this company
    const { data: company, error: cErr } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .eq('recruiter_id', req.user.id)
      .single();

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
      question_text: q.questionText ?? q.question_text,
      type: q.questionType ?? q.question_type ?? q.type ?? 'mcq',
      section: q.section || 'general',   // NOT NULL
      options: q.options || null,
      correct_index: q.correctAnswer ?? q.correct_index ?? q.correct_answer ?? null,
      marks: q.marks || 4,
      ordering: idx,                     // was order_index
      ...questionUploadFields(q),
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

  if (!companyId || !testType || !title || !Array.isArray(questions) || !questions.length) {
    return res.status(400).json({ error: 'companyId, testType, title, questions required' });
  }
  const invalidCases = invalidQuestionTestCases(questions);
  if (invalidCases) return res.status(400).json({ error: invalidCases });

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
      question_text: q.questionText ?? q.question_text,
      type: q.questionType ?? q.question_type ?? q.type ?? 'mcq',
      section: q.section || 'general',
      options: q.options || null,
      correct_index: q.correctAnswer ?? q.correct_index ?? q.correct_answer ?? null,
      marks: q.marks || 4,
      ordering: idx,                     // was order_index
      ...questionUploadFields(q),
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