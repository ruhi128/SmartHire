#!/usr/bin/env node

/**
 * Network-free contract test for routes/interview.js.
 *
 * It loads the real Express route with small in-process substitutes for Express,
 * auth and Supabase. This verifies the server payload mapping without requiring
 * credentials, a database, or installed backend dependencies.
 */
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function createSupabase(seedSessions = []) {
  const sessions = seedSessions.map(clone);
  let sequence = 0;

  function filteredRows(filters) {
    return sessions.filter((session) => filters.every(({ field, value }) => session[field] === value));
  }

  return {
    sessions,
    from(table) {
      assert.equal(table, 'interview_sessions');
      const filters = [];
      let insertPayload = null;
      let insertedSession = null;
      const query = {
        insert(payload) {
          insertPayload = clone(payload);
          return query;
        },
        select() {
          return query;
        },
        eq(field, value) {
          filters.push({ field, value });
          return query;
        },
        order(column, { ascending = true } = {}) {
          const rows = filteredRows(filters).map(clone).sort((left, right) => {
            const comparison = String(left[column] || '').localeCompare(String(right[column] || ''));
            return ascending ? comparison : -comparison;
          });
          return Promise.resolve({ data: rows, error: null });
        },
        single() {
          if (insertPayload) {
            if (!insertedSession) {
              insertedSession = {
                id: `test-interview-${++sequence}`,
                conducted_at: '2026-10-11T12:00:00.000Z',
                ...insertPayload,
              };
              sessions.push(insertedSession);
            }
            return Promise.resolve({ data: clone(insertedSession), error: null });
          }
          const found = filteredRows(filters)[0] || null;
          return Promise.resolve({ data: found ? clone(found) : null, error: found ? null : { message: 'not found' } });
        },
      };
      return query;
    },
  };
}

function loadRoute(supabaseAdmin) {
  const router = {
    postHandlers: {},
    getHandlers: {},
    post(routePath, ...handlers) {
      this.postHandlers[routePath] = handlers[handlers.length - 1];
      return this;
    },
    get(routePath, ...handlers) {
      this.getHandlers[routePath] = handlers[handlers.length - 1];
      return this;
    },
  };
  const originalLoad = Module._load;
  const target = path.resolve(__dirname, '../routes/interview.js');

  Module._load = function mockedLoad(request, parent, isMain) {
    if (request === 'express') return { Router: () => router };
    if (request === '../config/supabase' && parent?.filename === target) return supabaseAdmin;
    if (request === '../middleware/auth' && parent?.filename === target) return (_req, _res, next) => next?.();
    if (request === '../middleware/roles' && parent?.filename === target) return () => (_req, _res, next) => next?.();
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    delete require.cache[target];
    const loaded = require(target);
    assert.equal(loaded, router);
    return router;
  } finally {
    Module._load = originalLoad;
    delete require.cache[target];
  }
}

async function run() {
  const supabase = createSupabase([
    {
      id: 'browser-session-1',
      student_id: 'student-1',
      duration_seconds: 120,
      overall_score: 60,
      eye_contact_score: 55,
      confidence_score: 61,
      attention_score: 57,
      stress_score: 42,
      conducted_at: '2026-10-10T12:00:00.000Z',
      ai_feedback: {
        feedback: {
          scores: { overall: 60, content: 25, fluency: 50, confidence: 61, structure: 48, relevance: 42 },
        },
      },
    },
  ]);
  const router = loadRoute(supabase);
  const user = { id: 'student-1', role: 'student' };

  const saveResponse = createResponse();
  await router.postHandlers['/save']({
    user,
    body: {
      durationSeconds: 137,
      overallScore: 82,
      // All legacy camera/behavioural values must remain null for a native
      // typed-answer session; the text wording score lives under feedback.
      eyeContactScore: null,
      confidenceScore: null,
      attentionScore: null,
      stressScore: null,
      transcript: [{ question: 'Describe a project.', answer: 'I built a tested dashboard.', timestamp: 137 }],
      expressionLog: [],
      aiFeedback: {
        mode: 'typed-practice',
        summary: 'Text-only feedback.',
        strengths: ['Concrete project detail.'],
        improvements: ['Add an outcome.'],
        tips: ['Use Situation–Action–Result.'],
        scores: { overall: 82, content: 80, fluency: 90, confidence: 76, structure: 78, relevance: 84 },
      },
    },
  }, saveResponse);

  assert.equal(saveResponse.statusCode, 201);
  assert.equal(saveResponse.body.summary.overallScore, 82);
  assert.equal(saveResponse.body.summary.confidenceScore, null);
  const saved = supabase.sessions.find((session) => session.id === saveResponse.body.sessionId);
  assert.ok(saved);
  assert.deepEqual(
    {
      eyeContact: saved.eye_contact_score,
      confidence: saved.confidence_score,
      attention: saved.attention_score,
      stress: saved.stress_score,
    },
    { eyeContact: null, confidence: null, attention: null, stress: null },
  );
  assert.equal(saved.ai_feedback.feedback.mode, 'typed-practice');
  assert.equal(saved.ai_feedback.feedback.scores.confidence, 76);
  assert.deepEqual(saved.ai_feedback.expressionLog, []);

  const historyResponse = createResponse();
  await router.getHandlers['/history']({ user }, historyResponse);
  assert.equal(historyResponse.statusCode, 200);
  assert.equal(historyResponse.body.history[0].practiceMode, 'typed-practice');
  assert.equal(historyResponse.body.history[0].textScores.content, 80);
  assert.equal(historyResponse.body.history[1].practiceMode, 'browser-media');

  const detailResponse = createResponse();
  await router.getHandlers['/session/:id']({ user, params: { id: saved.id } }, detailResponse);
  assert.equal(detailResponse.statusCode, 200);
  assert.equal(detailResponse.body.session.practiceMode, 'typed-practice');
  assert.equal(detailResponse.body.session.confidenceScore, null);
  assert.equal(detailResponse.body.session.feedback.scores.structure, 78);

  const analyticsResponse = createResponse();
  await router.getHandlers['/analytics']({ user }, analyticsResponse);
  assert.equal(analyticsResponse.statusCode, 200);
  assert.equal(analyticsResponse.body.totalSessions, 2);
  assert.equal(analyticsResponse.body.averages.overall, 71);
  assert.equal(analyticsResponse.body.averages.confidence, 61);
  assert.deepEqual(
    (({ typedSessions, typedOverall, content, fluency, structure, relevance, wording }) => ({
      typedSessions, typedOverall, content, fluency, structure, relevance, wording,
    }))(analyticsResponse.body.averages),
    { typedSessions: 1, typedOverall: 82, content: 80, fluency: 90, structure: 78, relevance: 84, wording: 76 },
  );

  console.log('Interview route typed-practice contract: PASS');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
