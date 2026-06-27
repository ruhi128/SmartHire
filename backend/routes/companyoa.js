console.log('✅ companyoa routes loaded');
const express  = require('express');
const router   = express.Router();
const auth     = require('../middleware/auth');
const roles    = require('../middleware/roles');
const supabase = require('../config/supabase');

// ─────────────────────────────────────────────────────────────────────────────
// RECRUITER ROUTES — Submit OA tests
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/companyoa/submit — recruiter submits a new OA test with questions
router.post('/submit', auth, roles('recruiter'), async (req, res) => {
  console.log('✅ /submit route hit');
  const {
    title, description, test_type, duration, target_branches,
    min_cgpa, instructions, questions
  } = req.body;

  if (!title?.trim())     return res.status(400).json({ error: 'Title is required' });
  if (!test_type)         return res.status(400).json({ error: 'Test type is required' });
  if (!questions?.length) return res.status(400).json({ error: 'At least 1 question is required' });

  // Validate questions
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.question_text?.trim())
      return res.status(400).json({ error: `Question ${i + 1}: text is required` });
    if (q.question_type === 'mcq') {
      if (!q.options || q.options.length !== 4)
        return res.status(400).json({ error: `Question ${i + 1}: MCQ must have exactly 4 options` });
      if (q.correct_index === undefined || q.correct_index === null || q.correct_index < 0 || q.correct_index > 3)
        return res.status(400).json({ error: `Question ${i + 1}: correct answer must be selected (0-3)` });
    }
  }

  // Get recruiter's company
const { data: company, error: companyErr } = await supabase
  .from('companies')
  .select('*')
  .eq('recruiter_id', req.user.id)
  .maybeSingle();

console.log('REQ USER:', req.user);
console.log('COMPANY:', company);
console.log('COMPANY ERROR:', companyErr);

  // Insert test
  const { data: test, error: testErr } = await supabase
    .from('company_oa_tests')
    .insert({
      company_id:      company.id,
      submitted_by:    req.user.id,
      title:           title.trim(),
      description:     description || '',
      test_type,
      duration:        parseInt(duration) || 60,
      target_branches: target_branches || [],
      min_cgpa:        parseFloat(min_cgpa) || 0,
      instructions:    instructions || '',
      approval_status: 'pending',
    })
    .select().single();

  if (testErr) return res.status(400).json({ error: testErr.message });

  // Insert questions
  const qRows = questions.map((q, i) => ({
    test_id:        test.id,
    ordering:       i + 1,
    section:        q.section || 'General',
    question_type:  q.question_type || 'mcq',
    marks:          parseInt(q.marks) || 1,
    negative_marks: parseFloat(q.negative_marks) || 0.25,
    question_text:  q.question_text.trim(),
    options:        q.options || null,
    correct_index:  q.correct_index !== undefined ? parseInt(q.correct_index) : null,
    explanation:    q.explanation || '',
    placeholder:    q.placeholder || '',
    word_limit:     parseInt(q.word_limit) || 200,
  }));

  const { error: qErr } = await supabase.from('company_oa_questions').insert(qRows);
  if (qErr) {
    await supabase.from('company_oa_tests').delete().eq('id', test.id);
    return res.status(400).json({ error: qErr.message });
  }

  // Notify admin
  // ✅ Fix - wrap in try/catch instead
try {
  await supabase.from('announcements').insert({
    title: `📝 New OA Test Pending Approval: ${title} by ${company.name}`,
    content: `${company.name} has submitted "${title}" (${test_type}, ${questions.length} questions, ${duration} min). Review it in Admin → Company OA Approvals.`,
    priority: 'high',
    type: 'oa_pending',
  });
} catch (_) {}

  res.status(201).json({
    message: 'OA test submitted for admin approval. It will be visible to students once approved.',
    test_id: test.id,
    question_count: questions.length,
  });
});

// GET /api/companyoa/my — recruiter sees their own submitted tests
router.get('/my', auth, roles('recruiter'), async (req, res) => {
  const { data: company } = await supabase
    .from('companies').select('id').eq('recruiter_id', req.user.id).single();
  if (!company) return res.json({ tests: [] });

  const { data, error } = await supabase
    .from('company_oa_tests')
    .select('id, title, test_type, duration, approval_status, approval_note, created_at, is_active')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const testsWithCounts = await Promise.all((data || []).map(async t => {
    const { count } = await supabase
      .from('company_oa_questions').select('id', { count: 'exact', head: true }).eq('test_id', t.id);
    return { ...t, question_count: count || 0 };
  }));

  res.json({ tests: testsWithCounts });
});

// DELETE /api/companyoa/:id — recruiter deletes pending test
router.delete('/:id', auth, roles('recruiter'), async (req, res) => {
  const { data: test } = await supabase
    .from('company_oa_tests').select('approval_status, submitted_by').eq('id', req.params.id).single();
  if (!test) return res.status(404).json({ error: 'Test not found' });
  if (test.submitted_by !== req.user.id) return res.status(403).json({ error: 'Not your test' });
  if (test.approval_status === 'approved')
    return res.status(400).json({ error: 'Cannot delete an approved test' });

  await supabase.from('company_oa_tests').delete().eq('id', req.params.id);
  res.json({ message: 'Test deleted' });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES — Review and approve
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES — Review and approve (Fixed & Optimized)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/companyoa/pending — admin sees all pending tests
router.get('/pending', auth, roles('admin'), async (req, res) => {
  try {
    // 1. Fixed the placement of the error check
    // 2. Used explicit relationship targets matching your exact schema keys: 'companies!company_id'
    const { data, error } = await supabase
      .from('company_oa_tests')
      .select(`
        id, 
        title, 
        description, 
        test_type, 
        duration, 
        target_branches, 
        min_cgpa, 
        instructions, 
        approval_status, 
        created_at, 
        companies!company_id (id, name, logo_url),
        users!submitted_by (email)
      `)
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase DB Error:', error.message);
      return res.status(400).json({ error: error.message });
    }

    // Safely attach question counts to each test item
    const result = await Promise.all((data || []).map(async t => {
      const { count, error: countErr } = await supabase
        .from('company_oa_questions')
        .select('*', { count: 'exact', head: true })
        .eq('test_id', t.id);
        
      if (countErr) console.error(`Error counting questions for test ${t.id}:`, countErr.message);
      
      return { ...t, question_count: count || 0 };
    }));

    return res.json({ tests: result });

  } catch (err) {
    console.error('System Crash on /pending route:', err);
    return res.status(500).json({ error: 'Internal Server Error. Check terminal logs.' });
  }
});

// GET /api/companyoa/all — admin sees all tests (all statuses)
router.get('/all', auth, roles('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('company_oa_tests')
      .select(`
        id,
        title,
        description,
        test_type,
        duration,
        target_branches,
        min_cgpa,
        instructions,
        approval_status,
        approval_note,
        created_at,
        companies!company_id (id, name, logo_url),
        users!submitted_by (email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase DB Error:', error.message);
      return res.status(400).json({ error: error.message });
    }

    const result = await Promise.all((data || []).map(async t => {
      const { count } = await supabase
        .from('company_oa_questions')
        .select('*', { count: 'exact', head: true })
        .eq('test_id', t.id);
        
      return { ...t, question_count: count || 0 };
    }));

    return res.json({ tests: result });

  } catch (err) {
    console.error('System Crash on /all route:', err);
    return res.status(500).json({ error: 'Internal Server Error. Check terminal logs.' });
  }
});

// GET /api/companyoa/:id/questions — admin or recruiter previews questions
router.get('/:id/questions', auth, roles('admin', 'recruiter'), async (req, res) => {
  const { data, error } = await supabase
    .from('company_oa_questions')
    .select('*')
    .eq('test_id', req.params.id)
    .order('ordering', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ questions: data || [] });
});

// PATCH /api/companyoa/:id/approve — admin approves or rejects
router.patch('/:id/approve', auth, roles('admin'), async (req, res) => {
  const { action, note } = req.body;
  if (!['approve', 'reject'].includes(action))
    return res.status(400).json({ error: 'action must be approve or reject' });

  const { data: test, error } = await supabase
    .from('company_oa_tests')
    .update({
      approval_status: action === 'approve' ? 'approved' : 'rejected',
      approval_note:   note || '',
      approved_by:     req.user.id,
      approved_at:     new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select('*, companies(name)').single();

  if (error) return res.status(400).json({ error: error.message });

  if (action === 'approve') {
   // ✅ Fix
try {
  await supabase.from('announcements').insert({
    title: `📋 New Practice Test Available: ${test.title} by ${test.companies?.name}`,
    content: `${test.companies?.name} has made available a new ${test.test_type} OA test: "${test.title}" (${test.duration} min). Find it in Company OA section.`,
    priority: 'medium',
    type: 'oa_approved',
  });
} catch (_) {}
  }

  res.json({ message: `Test ${action === 'approve' ? 'approved and published' : 'rejected'}.`, test });
});

// GET /api/companyoa/all — admin sees all tests (all statuses)
router.get('/all', auth, roles('admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('company_oa_tests')
    .select('*, companies(name, logo_url)')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  // Attach question counts for admin view too
  const result = await Promise.all((data || []).map(async t => {
    const { count } = await supabase
      .from('company_oa_questions').select('id', { count: 'exact', head: true }).eq('test_id', t.id);
    return { ...t, question_count: count || 0 };
  }));

  res.json({ tests: result });
});

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT ROUTES — Take approved tests
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/companyoa/available — student sees approved tests for their branch + cgpa
router.get('/available', auth, roles('student'), async (req, res) => {
  // FIX #5: Read from student_profiles (not users) for branch and cgpa
  const { data: student } = await supabase
    .from('student_profiles')
    .select('branch, cgpa')
    .eq('id', req.user.id)
    .single();

  const { data: tests, error } = await supabase
    .from('company_oa_tests')
    .select('id, title, description, test_type, duration, target_branches, min_cgpa, created_at, companies(name, logo_url)')
    .eq('approval_status', 'approved')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // FIX #5: Proper eligibility filtering by branch AND cgpa
  const branch = student?.branch || '';
  const cgpa   = parseFloat(student?.cgpa || 0);

  const eligible = (tests || []).filter(t => {
    const branchOk = !t.target_branches?.length || t.target_branches.includes(branch);
    const cgpaOk   = cgpa >= parseFloat(t.min_cgpa || 0);
    return branchOk && cgpaOk;
  });

  // Attach attempt data
  const { data: attempts } = await supabase
    .from('company_oa_attempts')
    .select('test_id, pct, grade, completed_at')
    .eq('student_id', req.user.id);

  const attMap = {};
  (attempts || []).forEach(a => {
    if (!attMap[a.test_id] || a.pct > attMap[a.test_id].pct) attMap[a.test_id] = a;
  });

  const result = eligible.map(t => ({
    ...t,
    attempt_count: (attempts || []).filter(a => a.test_id === t.id).length,
    best_pct:      attMap[t.id]?.pct || 0,
    best_grade:    attMap[t.id]?.grade || null,
  }));

  res.json({ tests: result });
});

// GET /api/companyoa/:id/take — get test + questions (without answers)
router.get('/:id/take', auth, roles('student'), async (req, res) => {
  const { data: test, error } = await supabase
    .from('company_oa_tests')
    .select('*, companies(name, logo_url)')
    .eq('id', req.params.id)
    .eq('approval_status', 'approved')
    .single();

  if (error || !test)
    return res.status(404).json({ error: 'Test not found or not approved' });

  // FIX #6: Check if student already attempted this test
  const { data: existing } = await supabase
    .from('company_oa_attempts')
    .select('id')
    .eq('test_id', req.params.id)
    .eq('student_id', req.user.id)
    .maybeSingle();

  if (existing) {
    return res.status(400).json({
      error: 'You have already attempted this test. Only one attempt is allowed.'
    });
  }

  // Return questions WITHOUT correct_index (security)
  const { data: questions } = await supabase
    .from('company_oa_questions')
    .select('id, ordering, section, question_type, marks, question_text, options, placeholder, word_limit')
    .eq('test_id', req.params.id)
    .order('ordering', { ascending: true });

  res.json({ test, questions: questions || [] });
});

// POST /api/companyoa/:id/attempt — student submits attempt
router.post('/:id/attempt', auth, roles('student'), async (req, res) => {
  const { answers, timeTaken, autoSubmitted } = req.body;

  // FIX #6: Prevent duplicate attempts
  const { data: existing } = await supabase
    .from('company_oa_attempts')
    .select('id')
    .eq('test_id', req.params.id)
    .eq('student_id', req.user.id)
    .maybeSingle();

  if (existing) {
    return res.status(400).json({
      error: 'You have already submitted this test. Duplicate attempts are not allowed.'
    });
  }

  const { data: test } = await supabase
    .from('company_oa_tests').select('id, title, duration').eq('id', req.params.id).single();
  if (!test) return res.status(404).json({ error: 'Test not found' });

  const { data: questions } = await supabase
    .from('company_oa_questions')
    .select('id, question_type, marks, negative_marks, correct_index, explanation, section')
    .eq('test_id', req.params.id);

  // Score calculation
  let score = 0, maxScore = 0, correct = 0, wrong = 0, skipped = 0;
  const breakdown = {};
  const reviewed  = [];

  (questions || []).forEach(q => {
    const sec = q.section || 'General';
    if (!breakdown[sec]) breakdown[sec] = { correct: 0, wrong: 0, skipped: 0, earned: 0, max: 0 };
    breakdown[sec].max += q.marks;
    maxScore += q.marks;

    const ans = answers?.[q.id];
    if (q.question_type === 'mcq') {
      if (ans === undefined || ans === null || ans === '') {
        skipped++;
        breakdown[sec].skipped++;
        reviewed.push({
          id: q.id, section: q.section, type: 'mcq',
          correct_index: q.correct_index, explanation: q.explanation,
          student_answer: null, is_correct: false,
        });
      } else if (parseInt(ans) === q.correct_index) {
        score += q.marks;
        correct++;
        breakdown[sec].correct++;
        breakdown[sec].earned += q.marks;
        reviewed.push({
          id: q.id, section: q.section, type: 'mcq',
          correct_index: q.correct_index, explanation: q.explanation,
          student_answer: parseInt(ans), is_correct: true,
        });
      } else {
        const deduct = q.marks * (q.negative_marks || 0.25);
        score = Math.max(0, score - deduct);
        wrong++;
        breakdown[sec].wrong++;
        reviewed.push({
          id: q.id, section: q.section, type: 'mcq',
          correct_index: q.correct_index, explanation: q.explanation,
          student_answer: parseInt(ans), is_correct: false,
        });
      }
    } else if (q.question_type === 'text') {
      const words = (ans || '').trim().split(/\s+/).filter(Boolean).length;
      const pts = Math.round(q.marks * Math.min(words / (q.word_limit || 100), 1) * 0.7);
      score += pts;
      breakdown[sec].earned += pts;
      reviewed.push({
        id: q.id, section: q.section, type: 'text',
        student_answer: ans || '', is_correct: null,
      });
    } else {
      reviewed.push({
        id: q.id, section: q.section, type: 'coding',
        student_answer: ans || '', is_correct: null,
      });
    }
  });

  const pct   = maxScore > 0 ? Math.min(100, Math.round((score / maxScore) * 100)) : 0;
  const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F';

  const { error: insertErr } = await supabase.from('company_oa_attempts').insert({
    test_id:        req.params.id,
    student_id:     req.user.id,
    answers:        answers || {},
    score:          Math.round(score * 100) / 100,
    max_score:      maxScore,
    pct,
    grade,
    correct_count:  correct,
    wrong_count:    wrong,
    skipped_count:  skipped,
    time_taken:     timeTaken || 0,
    auto_submitted: autoSubmitted || false,
  });

  if (insertErr) {
    // Handle race condition — duplicate insert
    if (insertErr.code === '23505' || insertErr.message?.includes('duplicate')) {
      return res.status(400).json({ error: 'Duplicate attempt detected. You have already submitted this test.' });
    }
    return res.status(500).json({ error: insertErr.message });
  }

  res.json({
    score: Math.round(score * 100) / 100,
    maxScore, pct, grade, correct, wrong, skipped, breakdown, reviewed,
  });
});

module.exports = router;