const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const supabase = require('../config/supabase');

// ────────────────────────────────────────────────
// GET /api/aptitude/tests
// List all available aptitude tests
// ────────────────────────────────────────────────
router.get('/tests', auth, roles('student'), async (req, res) => {
  const { data, error } = await supabase
    .from('aptitude_tests')
    .select('id, title, duration_minutes, total_questions, created_at')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Add attempt count per test for this student
  const { data: attempts } = await supabase
    .from('aptitude_attempts')
    .select('test_id, score, total_marks')
    .eq('student_id', req.user.id);

  const attemptsMap = {};
  attempts?.forEach(a => {
    if (!attemptsMap[a.test_id]) attemptsMap[a.test_id] = [];
    attemptsMap[a.test_id].push({ score: a.score, total: a.total_marks });
  });

  const tests = data.map(t => ({
    ...t,
    attempts: attemptsMap[t.id] || [],
    best_score: attemptsMap[t.id]
      ? Math.max(...attemptsMap[t.id].map(a => a.score))
      : null,
  }));

  res.json(tests);
});

// ────────────────────────────────────────────────
// GET /api/aptitude/tests/:id/start
// Get questions for a test (options only, no answers)
// ────────────────────────────────────────────────
router.get('/tests/:id/start', auth, roles('student'), async (req, res) => {
  const { data: test } = await supabase
    .from('aptitude_tests')
    .select('id, title, duration_minutes, total_questions')
    .eq('id', req.params.id)
    .single();

  if (!test) return res.status(404).json({ error: 'Test not found.' });

  const { data: questions } = await supabase
    .from('aptitude_questions')
    .select('id, question_text, options, marks, negative_marks, topic, difficulty')
    .eq('test_id', req.params.id)
    .order('id');
    // NOTE: correct_answer is NOT selected — students can't see answers during the test

  res.json({ test, questions: questions || [] });
});

// ────────────────────────────────────────────────
// POST /api/aptitude/submit
// Student submits answers — calculate and store score
// ────────────────────────────────────────────────
router.post('/submit', auth, roles('student'), async (req, res) => {
  const { test_id, answers, started_at } = req.body;
  // answers = { [question_id]: selected_option_index | null }

  if (!test_id || !answers)
    return res.status(400).json({ error: 'test_id and answers are required.' });

  // Fetch correct answers
  const { data: questions } = await supabase
    .from('aptitude_questions')
    .select('id, correct_answer, marks, negative_marks, topic')
    .eq('test_id', test_id);

  if (!questions) return res.status(404).json({ error: 'Test not found.' });

  // Calculate score
  let score = 0, correct = 0, wrong = 0, unattempted = 0;
  let total_marks = 0;
  const topicResults = {};

  questions.forEach(q => {
    total_marks += q.marks;
    const selected = answers[q.id];
    const topic = q.topic || 'General';

    if (!topicResults[topic]) topicResults[topic] = { correct: 0, wrong: 0, unattempted: 0 };

    if (selected === null || selected === undefined) {
      unattempted++;
      topicResults[topic].unattempted++;
    } else if (parseInt(selected) === q.correct_answer) {
      score += q.marks;
      correct++;
      topicResults[topic].correct++;
    } else {
      score -= q.negative_marks;
      wrong++;
      topicResults[topic].wrong++;
    }
  });

  // Save attempt
  const { data: attempt, error } = await supabase
    .from('aptitude_attempts')
    .insert({
      student_id: req.user.id,
      test_id,
      score: Math.max(0, score), // score can't go below 0
      total_marks,
      correct,
      wrong,
      unattempted,
      answers: answers,
      started_at: started_at || null,
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  res.json({
    attempt_id: attempt.id,
    score: Math.max(0, score),
    total_marks,
    correct,
    wrong,
    unattempted,
    percentage: Math.round((Math.max(0, score) / total_marks) * 100),
    topic_results: topicResults,
  });
});

// ────────────────────────────────────────────────
// GET /api/aptitude/analysis
// Topic-wise performance across all attempts
// ────────────────────────────────────────────────
router.get('/analysis', auth, roles('student'), async (req, res) => {
  // All attempts with answers
  const { data: attempts } = await supabase
    .from('aptitude_attempts')
    .select('id, score, total_marks, correct, wrong, unattempted, submitted_at, test_id, answers')
    .eq('student_id', req.user.id)
    .order('submitted_at');

  if (!attempts?.length) return res.json({ attempts: [], topicAnalysis: [] });

  // Get all questions attempted
  const testIds = [...new Set(attempts.map(a => a.test_id))];
  const { data: questions } = await supabase
    .from('aptitude_questions')
    .select('id, topic, marks, correct_answer, negative_marks')
    .in('test_id', testIds);

  // Build topic map
  const qMap = {};
  questions?.forEach(q => (qMap[q.id] = q));

  const topicStats = {};

  attempts.forEach(attempt => {
    const answerMap = attempt.answers || {};
    Object.entries(answerMap).forEach(([qid, selected]) => {
      const q = qMap[qid];
      if (!q) return;
      const topic = q.topic || 'General';
      if (!topicStats[topic]) topicStats[topic] = { correct: 0, wrong: 0, unattempted: 0, total: 0 };
      topicStats[topic].total++;
      if (selected === null || selected === undefined) topicStats[topic].unattempted++;
      else if (parseInt(selected) === q.correct_answer) topicStats[topic].correct++;
      else topicStats[topic].wrong++;
    });
  });

  // Format topic analysis
  const topicAnalysis = Object.entries(topicStats).map(([topic, s]) => ({
    topic,
    correct: s.correct,
    wrong: s.wrong,
    unattempted: s.unattempted,
    total: s.total,
    accuracy: s.total ? Math.round((s.correct / (s.correct + s.wrong || 1)) * 100) : 0,
    strength: s.correct / (s.total || 1) >= 0.7 ? 'Strong' :
              s.correct / (s.total || 1) >= 0.4 ? 'Average' : 'Weak',
  }));

  res.json({
    attempts: attempts.map(a => ({
      id: a.id,
      score: a.score,
      total_marks: a.total_marks,
      percentage: Math.round((a.score / a.total_marks) * 100),
      correct: a.correct,
      wrong: a.wrong,
      submitted_at: a.submitted_at,
    })),
    topicAnalysis,
  });
});

// ────────────────────────────────────────────────
// POST /api/aptitude/tests  (admin only — seed questions)
// ────────────────────────────────────────────────
router.post('/tests', auth, roles('admin'), async (req, res) => {
  const { title, duration_minutes, questions } = req.body;

  const { data: test } = await supabase
    .from('aptitude_tests')
    .insert({ title, duration_minutes, total_questions: questions.length })
    .select()
    .single();

  if (questions?.length) {
    await supabase.from('aptitude_questions').insert(
      questions.map(q => ({ ...q, test_id: test.id }))
    );
  }

  res.status(201).json({ message: 'Test created.', test });
});

module.exports = router;