// routes/interview.js
const express = require('express');
const router = express.Router();
const supabaseAdmin = require('../config/supabase');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

// ─────────────────────────────────────────────
// POST /api/interview/save
// Save completed mock-interview session plus client-side practice feedback.
// A typed mobile session may intentionally send null for unavailable
// camera/attention/stress signals; null is preserved rather than fabricated.
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
        // Null means the capability was not collected (for example a
        // text-only mobile practice session); it must not be displayed as a
        // fabricated camera/attention/stress score. Existing web sessions
        // continue to persist their numeric values.
        eye_contact_score: eyeContactScore ?? null,
        confidence_score: confidenceScore ?? null,
        attention_score: attentionScore ?? null,
        stress_score: stressScore ?? null,
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
        attention_score, stress_score, ai_feedback, conducted_at
      `)
      // ✅ Removed companies(name, logo_url) - no company_id foreign key
      .eq('student_id', req.user.id)
      .order('conducted_at', { ascending: false });

    if (error) throw error;

    const history = (data || []).map((s) => {
      const feedback = s.ai_feedback?.feedback || {};
      const textScores = feedback.scores || null;
      return {
        id: s.id,
        company: 'General', // The current schema has no company relation.
        companyLogo: null,
        overallScore: s.overall_score,
        eyeContact: s.eye_contact_score,
        confidence: s.confidence_score,
        attention: s.attention_score,
        stress: s.stress_score,
        // A mode is additive and lets clients accurately label a session
        // without breaking established web history consumers.
        practiceMode: feedback.mode || 'browser-media',
        textScores,
        duration: formatDuration(s.duration_seconds),
        conductedAt: s.conducted_at,
        grade: getGrade(s.overall_score),
      };
    });

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
      // interview_sessions has no company_id foreign key in the current schema.
      // Do not request a nonexistent Supabase relationship here.
      .select('*')
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
        company: 'General',
        companyLogo: null,
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
        practiceMode: session.ai_feedback?.feedback?.mode || 'browser-media',
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
        'overall_score, eye_contact_score, confidence_score, attention_score, stress_score, ai_feedback, conducted_at'
      )
      .eq('student_id', req.user.id)
      .order('conducted_at', { ascending: true });

    if (error) throw error;

    const sessions = data || [];

    if (sessions.length === 0) {
      return res.json({ message: 'No sessions yet', sessions: [], averages: null });
    }

    // Compute rolling averages for trend charts. A null signal means it was
    // unavailable, not zero; do not let typed-only sessions depress a camera
    // metric that they never attempted to collect.
    const textScoresFor = (session) => session.ai_feedback?.feedback?.scores || {};
    const practiceModeFor = (session) => session.ai_feedback?.feedback?.mode || 'browser-media';
    const typedSessions = sessions.filter((session) => practiceModeFor(session) === 'typed-practice');
    const trend = sessions.map((s, i) => ({
      session: i + 1,
      date: s.conducted_at,
      overall: s.overall_score,
      eyeContact: s.eye_contact_score,
      confidence: s.confidence_score,
      attention: s.attention_score,
      stress: s.stress_score,
      practiceMode: practiceModeFor(s),
      textScores: textScoresFor(s),
    }));

    const avg = (values) => {
      const numbers = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
      return numbers.length ? Math.round(numbers.reduce((sum, value) => sum + value, 0) / numbers.length) : null;
    };
    // Text-only metrics intentionally use only native typed sessions. Do not
    // relabel values from browser speech/camera sessions as typed feedback.
    const typedScoreAverage = (key) => avg(typedSessions.map((s) => textScoresFor(s)[key]));

    const averages = {
      // Existing browser consumers retain these historic aggregate fields.
      overall: avg(sessions.map((s) => s.overall_score)),
      eyeContact: avg(sessions.map((s) => s.eye_contact_score)),
      confidence: avg(sessions.map((s) => s.confidence_score)),
      attention: avg(sessions.map((s) => s.attention_score)),
      stress: avg(sessions.map((s) => s.stress_score)),
      // Additive, explicitly text-only fields for the native practice UI.
      typedSessions: typedSessions.length,
      typedOverall: avg(typedSessions.map((s) => s.overall_score)),
      content: typedScoreAverage('content'),
      fluency: typedScoreAverage('fluency'),
      structure: typedScoreAverage('structure'),
      relevance: typedScoreAverage('relevance'),
      wording: typedScoreAverage('confidence'),
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