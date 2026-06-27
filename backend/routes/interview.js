// routes/interview.js
const express = require('express');
const router = express.Router();
const supabaseAdmin = require('../config/supabase');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

// ─────────────────────────────────────────────
// POST /api/interview/save
// Save completed mock interview session + AI metrics
// Body: {
//   companyId?, durationSeconds,
//   overallScore, eyeContactScore, confidenceScore,
//   attentionScore, stressScore,
//   transcript: [{ question, answer, timestamp }],
//   expressionLog: [{ timestamp, expression, confidence }],
//   aiFeedback: { strengths:[], improvements:[], tips:[] }
// }
// ─────────────────────────────────────────────
router.post('/save', auth, roles('student'), async (req, res) => {
  const {
    durationSeconds,
    overallScore,
    eyeContactScore,
    confidenceScore,
    attentionScore,
    stressScore,
    transcript,
    expressionLog,
    aiFeedback,
  } = req.body;

  if (overallScore === undefined || durationSeconds === undefined) {
    return res.status(400).json({ error: 'overallScore and durationSeconds are required' });
  }

  try {
    const { data: session, error } = await supabaseAdmin
      .from('interview_sessions')
      .insert({
        student_id: req.user.id,
        // ✅ Removed company_id - column doesn't exist in schema
        duration_seconds: durationSeconds,
        overall_score: overallScore,
        eye_contact_score: eyeContactScore || 0,
        confidence_score: confidenceScore || 0,
        attention_score: attentionScore || 0,
        stress_score: stressScore || 0,
        ai_feedback: {
          transcript: transcript || [],
          expressionLog: expressionLog || [],
          feedback: aiFeedback || {},
        },
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      sessionId: session.id,
      message: 'Interview session saved',
      summary: {
        overallScore: session.overall_score,
        eyeContactScore: session.eye_contact_score,
        confidenceScore: session.confidence_score,
        attentionScore: session.attention_score,
        stressScore: session.stress_score,
        durationSeconds: session.duration_seconds,
        conductedAt: session.conducted_at,
      },
    });
  } catch (err) {
    console.error('POST /interview/save error:', err);
    res.status(500).json({ error: 'Failed to save interview session' });
  }
});

// ─────────────────────────────────────────────
// GET /api/interview/history
// Get all past interview sessions for a student
// ─────────────────────────────────────────────
router.get('/history', auth, roles('student'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('interview_sessions')
      .select(`
        id, duration_seconds, overall_score,
        eye_contact_score, confidence_score,
        attention_score, stress_score, conducted_at
      `)
      // ✅ Removed companies(name, logo_url) - no company_id foreign key
      .eq('student_id', req.user.id)
      .order('conducted_at', { ascending: false });

    if (error) throw error;

    const history = (data || []).map(s => ({
      id: s.id,
      company: 'General', // ✅ Hardcoded since no company relation
      companyLogo: null,
      overallScore: s.overall_score,
      eyeContact: s.eye_contact_score,
      confidence: s.confidence_score,
      attention: s.attention_score,
      stress: s.stress_score,
      duration: formatDuration(s.duration_seconds),
      conductedAt: s.conducted_at,
      grade: getGrade(s.overall_score),
    }));

    res.json({ history });
  } catch (err) {
    console.error('GET /interview/history error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});
// ─────────────────────────────────────────────
// GET /api/interview/session/:id
// Get full details of one interview session (with transcript)
// ─────────────────────────────────────────────
router.get('/session/:id', auth, async (req, res) => {
  try {
    const { data: session, error } = await supabaseAdmin
      .from('interview_sessions')
      .select(`
        *, companies(name, logo_url)
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Only the student who owns this session or an admin can view it
    if (session.student_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      session: {
        id: session.id,
        company: session.companies?.name || 'General',
        companyLogo: session.companies?.logo_url,
        overallScore: session.overall_score,
        eyeContactScore: session.eye_contact_score,
        confidenceScore: session.confidence_score,
        attentionScore: session.attention_score,
        stressScore: session.stress_score,
        durationSeconds: session.duration_seconds,
        conductedAt: session.conducted_at,
        transcript: session.ai_feedback?.transcript || [],
        expressionLog: session.ai_feedback?.expressionLog || [],
        feedback: session.ai_feedback?.feedback || {},
        grade: getGrade(session.overall_score),
      },
    });
  } catch (err) {
    console.error('GET /interview/session/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// ─────────────────────────────────────────────
// GET /api/interview/analytics
// Aggregated interview performance over time
// ─────────────────────────────────────────────
router.get('/analytics', auth, roles('student'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('interview_sessions')
      .select(
        'overall_score, eye_contact_score, confidence_score, attention_score, stress_score, conducted_at'
      )
      .eq('student_id', req.user.id)
      .order('conducted_at', { ascending: true });

    if (error) throw error;

    const sessions = data || [];

    if (sessions.length === 0) {
      return res.json({ message: 'No sessions yet', sessions: [], averages: null });
    }

    // Compute rolling averages for trend charts
    const trend = sessions.map((s, i) => ({
      session: i + 1,
      date: s.conducted_at,
      overall: s.overall_score,
      eyeContact: s.eye_contact_score,
      confidence: s.confidence_score,
      attention: s.attention_score,
      stress: s.stress_score,
    }));

    const avg = (arr) =>
      arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    const averages = {
      overall: avg(sessions.map(s => s.overall_score)),
      eyeContact: avg(sessions.map(s => s.eye_contact_score)),
      confidence: avg(sessions.map(s => s.confidence_score)),
      attention: avg(sessions.map(s => s.attention_score)),
      stress: avg(sessions.map(s => s.stress_score)),
    };

    res.json({
      totalSessions: sessions.length,
      averages,
      trend,
      latestGrade: getGrade(sessions[sessions.length - 1]?.overall_score || 0),
    });
  } catch (err) {
    console.error('GET /interview/analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ─────────────────────────────────────────────
// POST /api/interview/flag-violation
// Log a proctoring violation (face not detected, tab switch, etc.)
// Body: { sessionId?, violationType, timestamp }
// ─────────────────────────────────────────────
router.post('/flag-violation', auth, roles('student'), async (req, res) => {
  const { sessionId, violationType, timestamp } = req.body;

  // For now log to console; in production save to a violations table
  console.warn(`[PROCTOR VIOLATION] student=${req.user.id} type=${violationType} time=${timestamp}`);

  // Optional: insert into an interview_violations table
  // await supabaseAdmin.from('interview_violations').insert({...})

  res.json({ logged: true });
});

// ── Helpers ──
function formatDuration(seconds) {
  if (!seconds) return '0m';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function getGrade(score) {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

module.exports = router;