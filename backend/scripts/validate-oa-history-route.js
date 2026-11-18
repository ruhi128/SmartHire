#!/usr/bin/env node
// Network-free contract test: completed OA results must be scoped to their
// student owner and must never return stored answers or private grading cases.
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

function loadRoute(name, db) {
  const target = path.resolve(__dirname, `../routes/${name}.js`);
  const originalLoad = Module._load;
  const router = { gets: {}, posts: {}, patches: {}, deletes: {},
    get(route, ...handlers) { this.gets[route] = handlers; return this; },
    post(route, ...handlers) { this.posts[route] = handlers; return this; },
    patch(route, ...handlers) { this.patches[route] = handlers; return this; },
    delete(route, ...handlers) { this.deletes[route] = handlers; return this; },
  };
  const auth = (_req, _res, next) => next?.();
  Module._load = function mock(request, parent, isMain) {
    if (parent?.filename === target) {
      if (request === 'express') return { Router: () => router };
      if (request === '../middleware/auth') return auth;
      if (request === '../middleware/roles') return (...roles) => {
        assert(roles.includes('student') || roles.includes('admin') || roles.includes('recruiter'));
        return auth;
      };
      if (request === '../config/supabase') return name === 'mockoa' ? { supabaseAdmin: db } : db;
      if (request === '../utils/coderunner') return { execute: async () => ({ verdict: 'Accepted', stdout: '' }) };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    delete require.cache[target];
    assert.equal(require(target), router);
    return router;
  } finally {
    Module._load = originalLoad;
    delete require.cache[target];
  }
}

function createDb(table, rows) {
  const queries = [];
  return {
    queries,
    from(name) {
      const query = { name, conditions: [], projection: null };
      queries.push(query);
      const chain = {
        select(projection) { query.projection = projection; return this; },
        eq(column, value) { query.conditions.push([column, value]); return this; },
        order() { return Promise.resolve(read()); },
        maybeSingle() { const response = read(); return Promise.resolve({ ...response, data: response.data[0] || null }); },
      };
      function read() {
        if (name !== table) return { data: [], error: null };
        return { data: rows.filter((row) => query.conditions.every(([key, value]) => row[key] === value)), error: null };
      }
      return chain;
    },
  };
}

function response() {
  return { statusCode: 200, body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

async function testRoute(name, table, relation, fields) {
  const rows = [
    { id: 'attempt-mine', student_id: 'student-1', test_id: 'test-1', score: 7, pct: 70,
      max_score: 10, grade: 'B+', correct_count: 1, wrong_count: 1, skipped_count: 0,
      passed_mcq: 1, wrong_mcq: 1, skipped_mcq: 0, completed_at: '2026-10-12T00:00:00Z',
      answers: { privateExpected: 'DO NOT EXPOSE', correct_index: 2 },
      [relation]: { title: 'Sample assessment', type: 'technical', test_type: 'technical', total_marks: 10, companies: { name: 'Sample company' } } },
    { id: 'attempt-other', student_id: 'student-2', test_id: 'test-2', score: 5, pct: 50,
      max_score: 10, grade: 'C', completed_at: '2026-10-11T00:00:00Z',
      answers: { privateExpected: 'DO NOT EXPOSE' },
      [relation]: { title: 'Other student assessment', companies: { name: 'Other company' } } },
  ];
  const db = createDb(table, rows);
  const router = loadRoute(name, db);
  assert(router.gets['/history']);
  assert(router.gets['/history/:attemptId']);
  const req = (attemptId) => ({ user: { id: 'student-1', role: 'student' }, params: { attemptId } });

  let res = response();
  await router.gets['/history'].at(-1)(req(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.history.length, 1);
  assert.equal(res.body.history[0].id, 'attempt-mine');
  for (const field of fields) assert.equal(res.body.history[0][field] !== undefined, true, `${name}: ${field}`);
  assert(!JSON.stringify(res.body).includes('DO NOT EXPOSE'));
  assert(!db.queries[0].projection.includes('answers'), 'history query must not fetch raw answers');
  assert(db.queries[0].conditions.some(([key, value]) => key === 'student_id' && value === 'student-1'));

  res = response();
  await router.gets['/history/:attemptId'].at(-1)(req('attempt-mine'), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.attempt.id, 'attempt-mine');
  assert(!JSON.stringify(res.body).includes('DO NOT EXPOSE'));
  assert(!db.queries[1].projection.includes('answers'));

  res = response();
  await router.gets['/history/:attemptId'].at(-1)(req('attempt-other'), res);
  assert.equal(res.statusCode, 404, 'a cross-account attempt must not be accessible');
  assert(!JSON.stringify(res.body).includes('Other student assessment'));
  assert(db.queries[2].conditions.some(([key, value]) => key === 'student_id' && value === 'student-1'));
}

async function run() {
  await testRoute('mockoa', 'mock_oa_attempts', 'mock_oa_tests', ['testId', 'score', 'totalPossible', 'percentage', 'correct']);
  await testRoute('companyoa', 'company_oa_attempts', 'company_oa_tests', ['testId', 'score', 'maxScore', 'pct', 'grade']);
  console.log('Mock OA and Company OA history ownership/privacy contracts: PASS');
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
